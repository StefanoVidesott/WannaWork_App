import mongoose from 'mongoose';

const availabilityProfileSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
    },
    phone: {
        type: String,
        required: false
    },
    skills: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Skill'
    }],
    experience: [{
        type: String
    }],
    workHours: {
        type: Number,
        required: false
    },
    availability: {
        type: Date,
        required: false
    },
    cvFile: {
        filename: { type: String },
        // originalName: { type: String },
        mimeType: { type: String, default: 'application/pdf' },
        size: { type: Number },
        path: { type: String },
       // uploadedAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });

export default mongoose.model('AvailabilityProfile', availabilityProfileSchema);
