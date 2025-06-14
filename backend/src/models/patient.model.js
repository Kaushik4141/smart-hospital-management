const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Waiting', 'In Progress', 'Completed', 'Transferred']
    },
    transfer: {
        type: String
    }
});

const transferSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['department', 'ward', 'ot'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.Mixed,
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
    name: {
        type: String,
        required: true,
        trim: true
    },
    tokenNumber: {
        type: String,
        unique: true
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
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Waiting', 'In Progress', 'Completed', 'Transferred'],
        default: 'Waiting'
    },
    priority: {
        type: String,
        required: true,
        enum: ['Normal', 'Urgent', 'Emergency'],
        default: 'Normal'
    },
    contactNumber: {
        type: String,
        required: true
    },
    otStatus: {
        type: String,
        enum: ['Waiting', 'In Progress', 'Completed', null],
        default: null
    },
    currentOT: {
        type: String,
        enum: ['OT1', 'OT2', 'OT3', null],
        default: null
    },
    surgeryType: {
        type: String,
        default: null
    },
    scheduledTime: {
        type: Date,
        default: null
    },
    surgeryStage: {
        type: String,
        default: null
    },
    stageNotes: {
        type: Array,
        default: [],
    },
    transfer: transferSchema,
    // History field made optional as per requirement to not save patient history
    history: {
        type: Array,
        default: [],
        required: false
    },
    transferHistory: [historyEntrySchema]
}, {
    timestamps: true
});

// Auto-generate token number before saving
patientSchema.pre('save', async function(next) {
    if (!this.tokenNumber) {
        const date = new Date();
        const prefix = date.getFullYear().toString().substr(-2) +
                      (date.getMonth() + 1).toString().padStart(2, '0') +
                      date.getDate().toString().padStart(2, '0');
        
        const lastPatient = await this.constructor.findOne({
            tokenNumber: new RegExp(`^${prefix}`)
        }).sort({ tokenNumber: -1 });

        let sequence = '001';
        if (lastPatient) {
            const lastSequence = parseInt(lastPatient.tokenNumber.slice(-3));
            sequence = (lastSequence + 1).toString().padStart(3, '0');
        }

        this.tokenNumber = `${prefix}${sequence}`;
    }
    next();
});

module.exports = mongoose.model('Patient', patientSchema);