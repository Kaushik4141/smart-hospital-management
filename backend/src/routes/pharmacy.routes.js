const express = require('express');
const router = express.Router();
const Drug = require('../models/drug.model');
const PharmacyBill = require('../models/pharmacyBill.model');
const Patient = require('../models/patient.model');
const mongoose = require('mongoose');

// Get all drugs
router.get('/', async (req, res) => {
    try {
        const drugs = await Drug.find();
        res.json(drugs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new drug
router.post('/', async (req, res) => {
    try {
        const {
            name,
            code,
            category,
            manufacturer,
            description,
            unitPrice,
            stock,
            batchNumber,
            expiryDate,
            location
        } = req.body;

        const newDrug = new Drug({
            name,
            code,
            category,
            manufacturer,
            description,
            unitPrice,
            stock: {
                quantity: stock.quantity,
                unit: stock.unit,
                reorderLevel: stock.reorderLevel,
                criticalLevel: stock.criticalLevel
            },
            batchNumber,
            expiryDate,
            location: {
                shelf: location.shelf,
                bin: location.bin
            }
        });

        const savedDrug = await newDrug.save();
        res.status(201).json(savedDrug);
    } catch (error) {
        console.error('Error creating drug:', error);
        res.status(400).json({ message: error.message });
    }
});



// Get a single drug
router.get('/:id', async (req, res) => {
    try {
        const drug = await Drug.findById(req.params.id);


        if (!drug) {
            return res.status(404).json({ message: 'Drug not found' });
        }
        res.json(drug);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update drug stock
router.put('/:id/stock', async (req, res) => {
    try {
        const { quantity, type } = req.body;
        const drug = await Drug.findById(req.params.id);
        
        if (!drug) {
            return res.status(404).json({ message: 'Drug not found' });
        }

        // Convert quantities to numbers
        const numQuantity = parseInt(quantity);
        const currentStock = parseInt(drug.stock.quantity || 0);

        // Update stock based on transaction type
        if (type === 'Received') {
            drug.stock.quantity = currentStock + numQuantity;
        } else if (type === 'Dispensed') {
            if (currentStock < numQuantity) {
                return res.status(400).json({ message: 'Insufficient stock' });
            }
            drug.stock.quantity = currentStock - numQuantity;
        }

        // Update status based on stock levels
        if (drug.stock.quantity <= drug.stock.criticalLevel) {
            drug.status = 'Critical';
        } else if (drug.stock.quantity <= drug.stock.reorderLevel) {
            drug.status = 'Low Stock';
        } else {
            drug.status = 'Available';
        }

        const updatedDrug = await drug.save();
        res.json(updatedDrug);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create a new bill
router.post('/bills', async (req, res) => {
    try {
        const { patient, doctor, medicines, subtotal, tax, total } = req.body;
        
        // Generate a unique bill number
        const billCount = await PharmacyBill.countDocuments();
        const billNumber = `BILL-${(billCount + 1).toString().padStart(4, '0')}`;
        
        const newBill = new PharmacyBill({
            billNumber,
            patient,
            doctor,
            medicines,
            subtotal,
            tax,
            total
        });
        
        // Deduct medicines from inventory without using transactions
        // This approach is simpler and more compatible with various MongoDB setups
        for (const medicine of medicines) {
            const drug = await Drug.findById(medicine.drug);
            
            if (!drug) {
                throw new Error(`Drug with ID ${medicine.drug} not found`);
            }
            
            if (drug.stock.quantity < medicine.quantity) {
                throw new Error(`Insufficient stock for ${drug.name}. Available: ${drug.stock.quantity}, Requested: ${medicine.quantity}`);
            }
            
            // Deduct the quantity
            drug.stock.quantity -= medicine.quantity;
            
            // Add transaction record
            drug.transactions.push({
                type: 'Dispensed',
                quantity: medicine.quantity,
                patient: patient,
                timestamp: new Date()
            });
            
            await drug.save();
        }
        
        // Save the bill
        const savedBill = await newBill.save();
        
        // Populate patient and medicine information
        const populatedBill = await PharmacyBill.findById(savedBill._id)
            .populate('patient', 'name')
            .populate('medicines.drug', 'name code');
        
        res.status(201).json(populatedBill);
    } catch (error) {
        console.error('Error creating bill:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get all bills
router.get('/bills', async (req, res) => {
    try {
        const bills = await PharmacyBill.find()
            .populate('patient', 'name')
            .sort({ date: -1 });
        
        if (!bills || bills.length === 0) {
            console.log('No bills found, returning empty array');
            return res.json([]);
        }
        
        res.json(bills);
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ message: error.message });
    }
});

// Search for drugs
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.term;
        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        console.log(`Searching for drugs with term: ${searchTerm}`);
        
        const drugs = await Drug.find({
            name: { $regex: searchTerm, $options: 'i' }
        }).limit(10);

        console.log(`Found ${drugs.length} drugs matching search term`);
        
        // Return empty array instead of 500 error if no drugs found
        return res.json(drugs || []);
    } catch (error) {
        console.error('Error searching drugs:', error);
        return res.status(500).json({ message: 'An error occurred while searching for drugs', error: error.message });
    }
});

// Get a single bill
router.get('/bills/:id', async (req, res) => {
    try {
        const bill = await PharmacyBill.findById(req.params.id)
            .populate('patient', 'name')
            .populate('medicines.drug', 'name code');
        
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;