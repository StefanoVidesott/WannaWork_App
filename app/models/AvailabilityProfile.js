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
    }
}, { timestamps: true });

export default mongoose.model('AvailabilityProfile', availabilityProfileSchema);
