import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome della skill è obbligatorio'],
        trim: true,
        unique: true
    },
    type: {
        type: String,
        required: [true, 'Nome della skill è obbligatorio'],
        trim: true,
    },
    description: {
        type: String,
        trim: true
    }
}, { timestamps: true, });

export default mongoose.model('Skill', skillSchema);
