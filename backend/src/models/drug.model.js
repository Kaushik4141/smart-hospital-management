const mongoose = require('mongoose');

const DrugSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    category: String,
    manufacturer: String,
    description: String,
    unitPrice: {
        type: Number,
        required: true
    },
    stock: {
        quantity: {
            type: Number,
            default: 0
        },
        unit: String,
        reorderLevel: Number,
        criticalLevel: Number
    },
    status: {
        type: String,
        enum: ['Available', 'Low Stock', 'Out of Stock'],
        default: 'Available'
    },
    batchNumber: String,
    expiryDate: Date,
    location: {
        shelf: String,
        bin: String
    },
    transactions: [{
        type: {
            type: String,
            enum: ['Received', 'Dispensed'],
            required: true
        },
        quantity: Number,
        timestamp: {
            type: Date,
            default: Date.now
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient'
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update stock status based on quantity
DrugSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    if (this.stock.quantity <= 0) {
        this.status = 'Out of Stock';
    } else if (this.stock.quantity <= this.stock.criticalLevel) {
        this.status = 'Low Stock';
    } else {
        this.status = 'Available';
    }
    
    next();
});

module.exports = mongoose.model('Drug', DrugSchema); 