const express = require('express');
const router = express.Router();
const Patient = require('../models/patient.model');

// Store ward data (in a real app, this would be in a database)
const wards = [
    { _id: 'General', name: 'General Ward', capacity: 20, floor: 1 },
    { _id: 'ICU', name: 'Intensive Care Unit', capacity: 10, floor: 2 },
    { _id: 'Recovery', name: 'Recovery Ward', capacity: 15, floor: 1 },
    { _id: 'Pediatric', name: 'Pediatric Ward', capacity: 12, floor: 3 },
    { _id: 'Emergency', name: 'Emergency Ward', capacity: 8, floor: 1 }
];

// Store bed data (in a real app, this would be in a database)
let beds = [];

// Initialize beds for each ward
wards.forEach(ward => {
    for (let i = 1; i <= ward.capacity; i++) {
        beds.push({
            _id: `${ward._id}-${i}`,
            number: i,
            ward: ward._id,
            isOccupied: false,
            patient: null
        });
    }
});

// Get all wards
router.get('/', (req, res) => {
    res.json(wards);
});

// Get all beds
router.get('/beds', (req, res) => {
    res.json(beds);
});

// Get beds for a specific ward
router.get('/:wardId/beds', (req, res) => {
    const { wardId } = req.params;
    const wardBeds = beds.filter(bed => bed.ward === wardId);
    res.json(wardBeds);
});

// Admit a patient to a bed
router.post('/beds/:bedId/admit', async (req, res) => {
    try {
        const { bedId } = req.params;
        const { patientId } = req.body;

        // Find the bed
        const bedIndex = beds.findIndex(bed => bed._id === bedId);
        if (bedIndex === -1) {
            return res.status(404).json({ error: 'Bed not found' });
        }

        // Check if bed is already occupied
        if (beds[bedIndex].isOccupied) {
            return res.status(400).json({ error: 'Bed is already occupied' });
        }

        // Find the patient
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Update bed status
        beds[bedIndex].isOccupied = true;
        beds[bedIndex].patient = {
            _id: patient._id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            admissionDate: new Date(),
            department: patient.department,
            doctor: 'Assigned Doctor' // This would come from the patient record in a real app
        };

        // Update patient status
        patient.currentWard = beds[bedIndex].ward;
        patient.currentBed = beds[bedIndex]._id;
        patient.status = 'Admitted';
        
        // Clear transfer status if this was a transfer
        if (patient.transfer && patient.transfer.type === 'ward') {
            patient.transfer.status = 'Completed';
        }

        await patient.save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('bedUpdated', beds[bedIndex]);
            io.emit('patientUpdated', patient);
        }

        res.json(beds[bedIndex]);
    } catch (error) {
        console.error('Error admitting patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Discharge a patient from a bed
router.post('/beds/:bedId/discharge', async (req, res) => {
    try {
        const { bedId } = req.params;

        // Find the bed
        const bedIndex = beds.findIndex(bed => bed._id === bedId);
        if (bedIndex === -1) {
            return res.status(404).json({ error: 'Bed not found' });
        }

        // Check if bed is occupied
        if (!beds[bedIndex].isOccupied || !beds[bedIndex].patient) {
            return res.status(400).json({ error: 'Bed is not occupied' });
        }

        const patientId = beds[bedIndex].patient._id;

        // Find the patient
        const patient = await Patient.findById(patientId);
        if (patient) {
            // Update patient status
            patient.currentWard = null;
            patient.currentBed = null;
            patient.status = 'Discharged';
            await patient.save();
        }

        // Update bed status
        beds[bedIndex].isOccupied = false;
        beds[bedIndex].patient = null;

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('bedUpdated', beds[bedIndex]);
            if (patient) {
                io.emit('patientUpdated', patient);
            }
        }

        res.json(beds[bedIndex]);
    } catch (error) {
        console.error('Error discharging patient:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle transfers from OT to ward
router.post('/transfer/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { wardId, bedId } = req.body;

        // Find the patient
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Check if patient has a pending transfer
        if (!patient.transfer || patient.transfer.type !== 'ward' || patient.transfer.status !== 'Pending') {
            return res.status(400).json({ error: 'No pending ward transfer for this patient' });
        }

        // Find an available bed if bedId is not provided
        let selectedBedIndex = -1;
        if (bedId) {
            selectedBedIndex = beds.findIndex(bed => bed._id === bedId);
            if (selectedBedIndex === -1) {
                return res.status(404).json({ error: 'Bed not found' });
            }
            if (beds[selectedBedIndex].isOccupied) {
                return res.status(400).json({ error: 'Selected bed is already occupied' });
            }
        } else {
            // Find first available bed in the ward
            selectedBedIndex = beds.findIndex(bed => bed.ward === wardId && !bed.isOccupied);
            if (selectedBedIndex === -1) {
                return res.status(400).json({ error: 'No available beds in the selected ward' });
            }
        }

        // Update bed status
        beds[selectedBedIndex].isOccupied = true;
        beds[selectedBedIndex].patient = {
            _id: patient._id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            admissionDate: new Date(),
            department: patient.department,
            doctor: 'Assigned Doctor' // This would come from the patient record in a real app
        };

        // Update patient status
        patient.currentWard = beds[selectedBedIndex].ward;
        patient.currentBed = beds[selectedBedIndex]._id;
        patient.status = 'Admitted';
        patient.transfer.status = 'Completed';
        patient.transfer.completedAt = new Date();

        // Clear OT status if coming from OT
        if (patient.otStatus) {
            patient.otStatus = 'Completed';
            patient.currentOT = null;
        }

        await patient.save();

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            io.emit('bedUpdated', beds[selectedBedIndex]);
            io.emit('patientUpdated', patient);
            
            // If patient was in OT, emit OT update
            if (patient.otStatus === 'Completed') {
                try {
                    const { getOTData, getOTStats } = require('./ot.routes');
                    const otData = await getOTData(patient.currentOT);
                    const stats = await getOTStats();
                    
                    io.emit('otDataUpdate', { otId: patient.currentOT, ...otData });
                    io.emit('otStatsUpdate', stats);
                } catch (error) {
                    console.error('Error updating OT data after transfer:', error);
                }
            }
        }

        res.json({
            message: 'Transfer completed successfully',
            bed: beds[selectedBedIndex],
            patient
        });
    } catch (error) {
        console.error('Error processing transfer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = {
    router,
    beds,
    wards
};