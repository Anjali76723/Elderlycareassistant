const mongoose = require("mongoose");

const caregiverSchema = new mongoose.Schema({
  elderlyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  receiveSMS: {
    type: Boolean,
    default: true
  },
  receiveEmail: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure one primary caregiver per elderly user
caregiverSchema.index({ elderlyId: 1, isPrimary: 1 }, { unique: true, partialFilterExpression: { isPrimary: true } });

module.exports = mongoose.model("Caregiver", caregiverSchema);
