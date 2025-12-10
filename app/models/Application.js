import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Offer'
    },
    date: {
        type: Date,
        required: true
    }
}, { timestamps: true });

export default mongoose.model('Application', applicationSchema);