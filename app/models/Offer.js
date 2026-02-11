import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employee'
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
    requirements: [{
        type: String,
        trim: true
    }],
    desiredSkills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
    }],
    workHours: {
        type: String,
        required: true
    },
    salary: {
        type: String,
        required: true
    },
    contractType: {
        type: String,
        enum: ['determinato', 'indeterminato', 'stage', 'altro'],
        required: true
    },
    contractDuration: {
        type: String,
        required: false
    },
    workLocation: {
        type: String,
        required: true
    },
    contactMethod: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['published', 'draft', 'expired'],
        default: 'published'
    },
    expirationDate: {
        type: Date,
        default: () => new Date(+new Date() + 30*24*60*60*1000)
    }
}, { timestamps: true });

export default mongoose.model('Offer', offerSchema);
