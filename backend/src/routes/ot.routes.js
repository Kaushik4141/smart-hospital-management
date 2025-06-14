const express = require('express');
const router = express.Router();
const Patient = require('../models/patient.model');
const Department = require('../models/department.model');

// Helper function to get OT data
async function getOTData(otId) {
    console.log(`Getting OT data for ${otId}`);
    
    // Get current surgery in progress
    const current = await Patient.findOne({
        currentOT: otId,
        otStatus: 'In Progress',
        $or: [
            { surgeryStage: { $exists: false } },
            { surgeryStage: null },
            { surgeryStage: { $ne: 'Pre-operative' } }
        ]
    }).lean();
    console.log(`Current surgery for ${otId}:`, current ? current.name : 'None', current ? `Stage: ${current.surgeryStage}` : '');

    // Get pre-operative patient (if any)
    const preOperative = await Patient.findOne({
        currentOT: otId,
        otStatus: 'In Progress',
        surgeryStage: 'Pre-operative'
    }).lean();
    console.log(`Pre-operative patient for ${otId}:`, preOperative ? preOperative.name : 'None', preOperative ? `Stage: ${preOperative.surgeryStage}` : '');

    // Get waiting queue including both direct OT patients and pending transfers
    const queue = await Patient.find({
        $or: [
            // Patients already in OT queue
            {
                currentOT: otId,
                otStatus: 'Waiting'
            },
            // Patients with pending OT transfers
            {
                'transfer.type': 'ot',
                'transfer.targetId': otId,
                'transfer.status': 'Pending'
            }
        ]
    }).sort({ priority: -1, scheduledTime: 1 }).lean();

    console.log(`Found for ${otId}:`, { 
        current: current ? 'Yes' : 'No', 
        preOperative: preOperative ? 'Yes' : 'No',
        queueLength: queue.length,
        queuePatients: queue.map(p => ({
            name: p.name,
            status: p.otStatus,
            transfer: p.transfer,
            surgeryStage: p.surgeryStage
        }))
    });
    return { current, preOperative, queue };
}

// Helper function to get OT stats
async function getOTStats() {
    console.log('Getting OT stats');
    
    const [totalScheduled, inProgress, completedToday] = await Promise.all([
        // Count both direct OT patients and pending transfers
        Patient.countDocuments({
            $or: [
                { otStatus: { $in: ['Waiting', 'In Progress'] } },
                {
                    'transfer.type': 'ot',
                    'transfer.status': 'Pending'
                }
            ]
        }),
        Patient.countDocuments({ otStatus: 'In Progress' }),
        Patient.countDocuments({
            otStatus: 'Completed',
            'history.timestamp': {
                $gte: new Date().setHours(0, 0, 0, 0)
            }
        })
    ]);

    const stats = { totalScheduled, inProgress, completedToday };
    console.log('OT stats:', stats);
    return stats;
}

// Get all OT data
router.get('/data', async (req, res) => {
    try {
        console.log('Fetching all OT data');
        const otData = {
            OT1: await getOTData('OT1'),
            OT2: await getOTData('OT2'),
            OT3: await getOTData('OT3')
        };

        const stats = await getOTStats();
        
        console.log('Sending OT data:', { otData, stats });
        res.json({ otData, stats });
    } catch (error) {
        console.error('Error fetching OT data:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Get specific OT data
router.get('/data/:otId', async (req, res) => {
    try {
        const { otId } = req.params;
        console.log(`Fetching data for ${otId}`);
        const data = await getOTData(otId);
        console.log(`OT data for ${otId}:`, data);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching data for ${req.params.otId}:`, error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Update surgery stage
router.put('/patient/:patientId/stage', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { stage, notes } = req.body;
        console.log(`Updating surgery stage for patient ${patientId}:`, { stage, notes });

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Update surgery stage
        patient.surgeryStage = stage;
        
        // Add stage notes
        patient.stageNotes.push({
            stage,
            notes,
            timestamp: new Date()
        });

        // History tracking is disabled as per requirement
        // No need to add to history

        await patient.save();
        console.log('Patient stage updated:', patient);

        // Emit socket events
        const io = req.app.get('io');
        if (!io) {
            console.error('Socket.io instance not found');
            return res.status(500).json({ error: 'Socket.io configuration error' });
        }

        const otData = await getOTData(patient.currentOT);
        const stats = await getOTStats();
        
        console.log('Emitting OT updates:', { otId: patient.currentOT, otData, stats });
        io.emit('otDataUpdate', { otId: patient.currentOT, ...otData });
        io.emit('otStatsUpdate', stats);

        res.json({ message: 'Surgery stage updated successfully' });
    } catch (error) {
        console.error('Error updating surgery stage:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Complete surgery
router.put('/patient/:patientId/complete', async (req, res) => {
    try {
        const { patientId } = req.params;
        console.log(`Completing surgery for patient ${patientId}`);

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const currentOT = patient.currentOT;

        // Update patient status
        patient.otStatus = 'Completed';
        patient.surgeryStage = 'Recovery';
        patient.currentOT = null;

        // Add to history
        patient.history.push({
            timestamp: new Date(),
            description: 'Surgery completed',
            status: 'Completed',
            surgeryStage: 'Recovery'
        });

        await patient.save();
        console.log('Surgery completed:', patient);

        // Emit socket events
        const io = req.app.get('io');
        if (!io) {
            console.error('Socket.io instance not found');
            return res.status(500).json({ error: 'Socket.io configuration error' });
        }

        const otData = await getOTData(currentOT);
        const stats = await getOTStats();
        
        io.emit('otDataUpdate', { otId: currentOT, ...otData });
        io.emit('otStatsUpdate', stats);

        res.json({ message: 'Surgery completed successfully' });
    } catch (error) {
        console.error('Error completing surgery:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Transfer patient to ward
router.put('/patient/:patientId/transfer', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { wardId } = req.body;
        console.log(`Transferring patient ${patientId} to ward ${wardId}`);

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const currentOT = patient.currentOT;

        // Update transfer status
        patient.transfer = {
            type: 'ward',
            targetId: wardId,
            status: 'Completed', // Mark as completed immediately
            requestedAt: new Date(),
            completedAt: new Date()
        };

        // Add to history
        patient.history.push({
            timestamp: new Date(),
            description: `Transferred to ${wardId}`,
            status: patient.otStatus,
            transfer: `Ward: ${wardId}`
        });

        // Update patient status
        patient.currentWard = wardId;
        patient.status = 'Admitted';
        
        // Clear OT status
        patient.otStatus = 'Completed';
        patient.currentOT = null;

        await patient.save();
        console.log('Transfer completed:', patient);

        // Find an available bed in the ward
        let wardModule;
        try {
            wardModule = require('./ward.routes');
            console.log('Ward module loaded:', wardModule);
        } catch (err) {
            console.error('Error loading ward module:', err);
            return res.status(500).json({ error: 'Error loading ward module' });
        }
        
        if (!wardModule || !wardModule.beds) {
            console.error('Ward beds not found in module:', wardModule);
            return res.status(500).json({ error: 'Ward beds not available' });
        }
        
        const beds = wardModule.beds;
        console.log(`Looking for available bed in ward ${wardId}. Total beds:`, beds.length);
        const selectedBedIndex = beds.findIndex(bed => bed.ward === wardId && !bed.isOccupied);
        
        if (selectedBedIndex !== -1) {
            // Update bed status
            beds[selectedBedIndex].isOccupied = true;
            beds[selectedBedIndex].patient = {
                _id: patient._id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                admissionDate: new Date(),
                department: patient.department,
                doctor: 'Assigned Doctor'
            };
            
            // Update patient with bed info
            patient.currentBed = beds[selectedBedIndex]._id;
            await patient.save();
        }

        // Emit socket events
        const io = req.app.get('io');
        if (!io) {
            console.error('Socket.io instance not found');
            return res.status(500).json({ error: 'Socket.io configuration error' });
        }

        const otData = await getOTData(currentOT);
        const stats = await getOTStats();
        
        io.emit('otDataUpdate', { otId: currentOT, ...otData });
        io.emit('otStatsUpdate', stats);
        
        // Emit bed update if a bed was assigned
        if (selectedBedIndex !== -1) {
            io.emit('bedUpdated', beds[selectedBedIndex]);
        }
        
        // Emit patient update for ward display
        io.emit('patientUpdated', patient);

        res.json({ message: 'Patient transferred successfully to ward' });
    } catch (error) {
        console.error('Error transferring patient:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

module.exports = {
    router,
    getOTData,
    getOTStats
};