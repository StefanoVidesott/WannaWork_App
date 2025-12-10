import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employee'
    },
    position: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    requirements: [{
        type: String,
        trim: true
    }],
    workHours: {
        type: Number,
        required: true
    },
    contractExpiration: {
        type: Date,
        required: false
    },
    workLocation: {
        type: String,
        required: true
    },
    contacts: [{
        type: String,
        required: true
    }]
}, { timestamps: true });

export default mongoose.model('Offer', offerSchema);
