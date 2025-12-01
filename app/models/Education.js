const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome dell\'istituto/facoltà è obbligatorio'],
    trim: true,
    unique: true
  },
  university: {
    type: Boolean
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual per self link
educationSchema.virtual('self').get(function() {
  return `/api/v1/educations/${this._id}`;
});

educationSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Education', educationSchema);