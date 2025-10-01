const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  relation: String,
  primary: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },

  // Auth fields
  password: { type: String },   // hashed password for caregivers
  pinHash: { type: String },    // hashed pin for elderly (secure)

  role: { type: String, enum: ["elderly", "caregiver"], default: "elderly" },

  // Optional profile fields
  phone: { type: String }, // E.164 format if present
  caregivers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  emergencyContacts: [contactSchema],

  // Assistant customizations
  assistantName: { type: String },
  assistantImage: { type: String },
  history: [{ type: String }]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

module.exports = User;
