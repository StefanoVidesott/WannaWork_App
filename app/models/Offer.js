import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employer'
    },
    position: {
        type: String,
        required: [true, 'Il titolo della posizione è obbligatorio'],
        minlength: 10,
        maxlength: 100,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'La descrizione è obbligatoria'],
        minlength: 50,
        maxlength: 2000,
        trim: true
    },
    desiredSkills: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Skill'
    }],
    workHours: {
        type: String,
        required: true
    },
    workLocation: {
        type: String,
        required: true
    },
    contactMethod: {
        type: String,
        required: true
    },
    salary: {
        type: String,
        required: false
    },
    contractType: {
        type: String,
        enum: ['determinato', 'indeterminato', 'stage', 'altro'],
        required: false
    },
    contractDuration: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['published', 'draft', 'expired'],
        default: 'published'
    },
}, { timestamps: true });

export default mongoose.model('Offer', offerSchema);
