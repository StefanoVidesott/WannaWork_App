import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Offer'
    },
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employer'
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    history: [{
        status: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

applicationSchema.index({ student: 1, offer: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
