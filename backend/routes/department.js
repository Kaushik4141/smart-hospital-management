const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Patient = require('../models/Patient');

// Get all departments
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find();
        
        // Get counts for each department
        const departmentsWithCounts = await Promise.all(departments.map(async (dept) => {
            const waitingCount = await Patient.countDocuments({ 
                department: dept._id,
                status: 'Waiting'
            });
            
            const inProgressCount = await Patient.countDocuments({
                department: dept._id,
                status: 'In Progress'
            });
            
            const pendingTransfers = await Patient.countDocuments({
                department: dept._id,
                'transfer.status': 'Pending'
            });
            
            return {
                ...dept.toObject(),
                waitingCount,
                inProgressCount,
                pendingTransfers
            };
        }));
        
        res.json(departmentsWithCounts);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get system stats
router.get('/stats', async (req, res) => {
    try {
        const totalPatients = await Patient.countDocuments({
            status: { $ne: 'Completed' }
        });

        const activeDepartments = await Department.countDocuments({
            $or: [
                { 'waitingCount': { $gt: 0 } },
                { 'inProgressCount': { $gt: 0 } }
            ]
        });

        const pendingTransfers = await Patient.countDocuments({
            'transfer.status': 'Pending'
        });

        res.json({
            totalPatients,
            activeDepartments,
            pendingTransfers
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get department by ID with queue information
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ 
                error: 'Department not found',
                details: `No department exists with ID: ${req.params.id}`
            });
        }

        // Get current patient (if any)
        const currentPatient = await Patient.findOne({
            department: department._id,
            status: 'In Progress'
        }).sort({ updatedAt: -1 });

        // Get waiting patients
        const queue = await Patient.find({
            department: department._id,
            status: 'Waiting'
        }).sort({ priority: -1, createdAt: 1 });

        // Get counts
        const waitingCount = await Patient.countDocuments({
            department: department._id,
            status: 'Waiting'
        });

        const inProgressCount = await Patient.countDocuments({
            department: department._id,
            status: 'In Progress'
        });

        const pendingTransfers = await Patient.countDocuments({
            department: department._id,
            'transfer.status': 'Pending'
        });

        // Send response with consistent structure
        res.json({
            department: department.toObject(),
            currentPatient: currentPatient ? currentPatient.toObject() : null,
            queue: queue.map(p => p.toObject()),
            waitingCount,
            inProgressCount,
            pendingTransfers
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Update patient status and handle transfers
router.post('/patients/:id/update', async (req, res) => {
    try {
        const { status, description, transfer } = req.body;
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Update status
        patient.status = status;

        // Add to history
        patient.history.push({
            timestamp: new Date(),
            description: description || `Status changed to ${status}`,
            status
        });

        // Handle transfer if requested
        if (transfer) {
            patient.transfer = {
                type: transfer.type,
                targetId: transfer.targetId,
                status: 'Pending',
                requestedAt: new Date(),
                description: description || 'Transfer requested'
            };

            // Add transfer to history
            patient.history.push({
                timestamp: new Date(),
                description: `Transfer requested to ${transfer.type}: ${transfer.targetId}`,
                transfer: `${transfer.type}: ${transfer.targetId}`
            });
        }

        await patient.save();

        // Emit socket events
        req.app.io.emit('patientUpdated', patient);
        
        res.json(patient);
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 