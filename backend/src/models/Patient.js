const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
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
        required: true,
        enum: ['Male', 'Female', 'Other']
    },
    tokenNumber: {
        type: String,
        required: true,
        unique: true
    },
    priority: {
        type: String,
        required: true,
        enum: ['Emergency', 'Urgent', 'Normal'],
        default: 'Normal'
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    currentOT: {
        type: String,
        enum: ['OT1', 'OT2', 'OT3', null],
        default: null
    },
    otStatus: {
        type: String,
        enum: ['Waiting', 'In Progress', 'Completed', null],
        default: null
    },
    surgeryType: {
        type: String,
        default: null
    },
    surgeryStage: {
        type: String,
        enum: ['Pre-operative', 'Anaesthetic', 'Surgical', 'Recovery', null],
        default: null
    },
    stageNotes: [{
        stage: {
            type: String,
            enum: ['Pre-operative', 'Anaesthetic', 'Surgical', 'Recovery']
        },
        notes: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    scheduledTime: {
        type: Date,
        default: null
    },
    transfer: {
        type: {
            type: String,
            enum: ['ot', 'ward', 'department'],
            default: null
        },
        targetId: String,
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Cancelled'],
            default: 'Pending'
        },
        requestedAt: {
            type: Date,
            default: Date.now
        },
        completedAt: Date
    },
    // History field made optional as per requirement to not save patient history
    history: {
        type: Array,
        default: [],
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for better query performance
patientSchema.index({ currentOT: 1, otStatus: 1 });
patientSchema.index({ 'transfer.type': 1, 'transfer.status': 1 });
patientSchema.index({ otStatus: 1, 'history.timestamp': 1 });
patientSchema.index({ surgeryStage: 1 });

// Export the model only if it hasn't been compiled yet
module.exports = mongoose.models.Patient || mongoose.model('Patient', patientSchema);