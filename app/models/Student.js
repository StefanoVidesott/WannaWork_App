import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	surname: {
		type: String,
		required: true,
		trim: true
	},
	email: {
		type: String,
		required: [true, 'Email è obbligatoria'],
		unique: true,
		lowercase: true,
		trim: true,
		match: [/^\S+@\S+\.\S+$/, 'Email non valida']
	},
	education: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Education'
	},
	educationYear: {
		type: Number,
		required: true,
	},
	password: {
		type: String,
		required: [true, 'Password è obbligatoria'],
		minlength: [12, 'Password deve essere almeno 12 caratteri'],
		select: false
	},
	isVerified: {
		type: Boolean,
		default: false
	},
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);