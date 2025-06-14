const express = require('express');
const router = express.Router();
const Patient = require('../models/patient.model');
const Department = require('../models/department.model');

// Get recent patients (for counter display)
router.get('/recent', async (req, res) => {
    try {
        const patients = await Patient.find({ status: { $ne: 'Completed' } })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('department');
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all patients
router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find()
            .sort({ createdAt: -1 })
            .populate('department');
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search patients by name
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.term;
        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        console.log(`Searching for patients with term: ${searchTerm}`);
        
        const patients = await Patient.find({
            name: { $regex: searchTerm, $options: 'i' }
        })
        .limit(10)
        .populate('department');

        console.log(`Found ${patients.length} patients matching search term`);
        res.json(patients);
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create new patient
router.post('/', async (req, res) => {
    const patient = new Patient({
        name: req.body.name,
        age: req.body.age,
        gender: req.body.gender,
        department: req.body.departmentId,
        priority: req.body.priority || 'Normal',
        contactNumber: req.body.contactNumber
    });

    try {
        const newPatient = await patient.save();
        const populatedPatient = await Patient.findById(newPatient._id).populate('department');
        
        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('newPatient', populatedPatient);

        res.status(201).json(populatedPatient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update patient status and handle transfers
router.post('/:id/update', async (req, res) => {
    try {
        const { status, description, transfer } = req.body;
        console.log('Updating patient:', req.params.id, { status, description, transfer });
        
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Update status
        patient.status = status;

        // History tracking disabled as per requirement
        // No history entries will be saved

        // Handle transfer if requested
        if (transfer) {
            console.log('Processing transfer:', transfer);
            
            // Handle OT transfers specifically
            if (transfer.type === 'ot') {
                const otId = transfer.targetId;
                console.log('Processing OT transfer to:', otId);
                
                // Update patient's OT status
                patient.currentOT = otId;
                patient.otStatus = 'Waiting';
                patient.surgeryType = description || 'General Surgery';
                patient.scheduledTime = new Date();

                // History tracking disabled as per requirement
                // No history entries will be saved for OT transfers

                // Get updated OT data
                const io = req.app.get('io');
                if (!io) {
                    console.error('Socket.io instance not found');
                    return res.status(500).json({ error: 'Socket.io configuration error' });
                }

                try {
                    const { getOTData, getOTStats } = require('./ot.routes');
                    const otData = await getOTData(otId);
                    const stats = await getOTStats();

                    console.log('Emitting OT updates:', { otId, otData, stats });
                    io.emit('otDataUpdate', { otId, ...otData });
                    io.emit('otStatsUpdate', stats);
                } catch (error) {
                    console.error('Error processing OT data:', error);
                    // Continue with patient save even if OT update fails
                }
            } else {
                // Handle other types of transfers
                patient.transfer = {
                    type: transfer.type,
                    targetId: transfer.targetId,
                    status: 'Pending',
                    requestedAt: new Date(),
                    description: description || 'Transfer requested'
                };

                // For department transfers, update the patient's department immediately
                if (transfer.type === 'department') {
                    console.log('Updating patient department to:', transfer.targetId);
                    console.log('Previous department:', patient.department);
                    
                    // Convert string ID to ObjectId if needed
                    if (typeof transfer.targetId === 'string') {
                        try {
                            const targetIdObj = mongoose.Types.ObjectId(transfer.targetId);
                            patient.department = targetIdObj;
                            console.log('Converted string ID to ObjectId:', targetIdObj);
                        } catch (err) {
                            console.error('Error converting department ID to ObjectId:', err);
                            patient.department = transfer.targetId; // Fallback to string ID
                        }
                    } else {
                        patient.department = transfer.targetId;
                    }
                    
                    console.log('New department set:', patient.department);
                    patient.transfer.status = 'Completed';
                    patient.transfer.completedAt = new Date();
                    patient.status = 'Waiting'; // Reset status for the new department
                    console.log('Transfer completed, patient status reset to Waiting');
                }

                // Clear OT status if transferring elsewhere
                if (patient.currentOT) {
                    console.log('Clearing OT status due to transfer elsewhere');
                    patient.otStatus = null;
                    patient.currentOT = null;
                    patient.surgeryType = null;
                    patient.scheduledTime = null;
                }

                let transferDescription;
                switch(transfer.type) {
                    case 'department':
                        const targetDept = await Department.findById(transfer.targetId);
                        transferDescription = targetDept ? targetDept.name : 'Unknown Department';
                        break;
                    case 'ward':
                        const wardNames = {
                            'general': 'General Ward',
                            'icu': 'ICU',
                            'emergency': 'Emergency Ward',
                            'pediatric': 'Pediatric Ward'
                        };
                        transferDescription = wardNames[transfer.targetId] || transfer.targetId;
                        break;
                    default:
                        transferDescription = transfer.targetId;
                }

                // History tracking disabled as per requirement
                // No history entries will be saved for transfers
            }
        }

        await patient.save();
        console.log('Patient saved successfully');
        
        const populatedPatient = await Patient.findById(patient._id).populate('department');

        // Emit general patient update event
        const io = req.app.get('io');
        if (io) {
            io.emit('patientUpdated', populatedPatient);
        }
        
        res.json(populatedPatient);
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Update patient status
router.patch('/:id/status', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        patient.status = req.body.status;
        const updatedPatient = await patient.save();
        const populatedPatient = await Patient.findById(updatedPatient._id).populate('department');

        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('patientStatusUpdated', populatedPatient);

        res.json(populatedPatient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).populate('department');
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update patient
router.patch('/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        if (req.body.name) patient.name = req.body.name;
        if (req.body.age) patient.age = req.body.age;
        if (req.body.gender) patient.gender = req.body.gender;
        if (req.body.departmentId) patient.department = req.body.departmentId;
        if (req.body.priority) patient.priority = req.body.priority;
        if (req.body.contactNumber) patient.contactNumber = req.body.contactNumber;
        if (req.body.status) patient.status = req.body.status;

        const updatedPatient = await patient.save();
        const populatedPatient = await Patient.findById(updatedPatient._id).populate('department');

        // Emit socket event for real-time update
        const io = req.app.get('io');
        io.emit('patientUpdated', populatedPatient);

        res.json(populatedPatient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;