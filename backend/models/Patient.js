const mongoose = require('mongoose');

// History schema removed as per requirement to not save patient history

const transferSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['department', 'ward', 'ot'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    description: {
        type: String
    }
});

const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    priority: {
        type: String,
        enum: ['Emergency', 'Urgent', 'Normal'],
        default: 'Normal'
    },
    status: {
        type: String,
        enum: ['Waiting', 'In Progress', 'Completed', 'Transferred'],
        default: 'Waiting'
    },
    transfer: transferSchema,
    // History field made optional as per requirement to not save patient history
    history: {
        type: Array,
        default: [],
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);