import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome della skill è obbligatorio'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  }
}, {timestamps: true,});

module.exports = mongoose.model('Skill', skillSchema);