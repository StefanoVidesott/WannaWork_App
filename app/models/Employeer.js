import mongoose from 'mongoose';

const employerSchema = new mongoose.Schema({
	companyName: {
		type: String,
		required: [true, 'Nome azienda è obbligatorio'],
		trim: true
	},
	email: {
		type: String,
		required: [true, 'Email aziendale è obbligatoria'],
		unique: true,
		match: [/^\S+@\S+\.\S+$/, 'Email non valida']
	},
	password: {
		type: String,
		required: true,
		minlength: 12,
		select: false
	},
	headquarters: {
		type: String,
		required: [true, 'Sede principale obbligatoria'],
		minlength: 10
	},
	website: {
		type: String,
		match: [/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'URL non valido']
	},
	isVerified: {
		type: Boolean,
		default: false
	},
}, { timestamps: true });

export default mongoose.model('Employee', employerSchema);
