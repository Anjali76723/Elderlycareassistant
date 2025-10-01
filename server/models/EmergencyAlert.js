const mongoose = require("mongoose");

const emergencyAlertSchema = new mongoose.Schema({
  elderlyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caregiverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // optional: targeted caregivers
  message: { type: String, required: true },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  sentVia: { type: String, enum: ["app","voice","button","auto"], default: "app" },
  status: { type: String, enum: ["open","acknowledged","resolved"], default: "open" },
  notified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("EmergencyAlert", emergencyAlertSchema);
