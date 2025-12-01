const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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
  password: {
    type: String,
    required: [true, 'Password è obbligatoria'],
    minlength: [12, 'Password deve essere almeno 12 caratteri'],
    select: false
  },
  education: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Education'
  },
  // skills: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Skill'
  // }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 6 * 60 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('Student', studentSchema);