const express = require('express');
const router = express.Router();
const Department = require('../models/department.model');
const Patient = require('../models/Patient');

// Get all departments
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true });
        
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

// Create new department
router.post('/', async (req, res) => {
    const department = new Department({
        name: req.body.name,
        description: req.body.description,
        floor: req.body.floor
    });

    try {
        const newDepartment = await department.save();
        res.status(201).json(newDepartment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update department
router.patch('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        if (req.body.name) department.name = req.body.name;
        if (req.body.description) department.description = req.body.description;
        if (req.body.floor) department.floor = req.body.floor;
        if (req.body.isActive !== undefined) department.isActive = req.body.isActive;

        const updatedDepartment = await department.save();
        res.json(updatedDepartment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete department (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        department.isActive = false;
        await department.save();
        res.json({ message: 'Department deactivated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;