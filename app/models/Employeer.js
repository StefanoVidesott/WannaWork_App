const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

employerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

employerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

employerSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 6 * 60 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('Employer', employerSchema);