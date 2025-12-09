import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Nome dell\'istituto/facoltà è obbligatorio'],
		trim: true,
		unique: true
	},
	university: {
		type: Boolean,
		default: false
	}
}, {timestamps: true,});

module.exports = mongoose.model('Education', educationSchema);