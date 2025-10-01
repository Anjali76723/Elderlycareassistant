// server/models/Reminder.js
const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  elderlyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String, required: true },
  time: { type: Date, required: true }, // next scheduled time
  repeat: { type: String, enum: ["none", "daily", "weekly"], default: "none" },
  active: { type: Boolean, default: true },
  meta: {
    medicationName: String,
    dose: String
  }
}, { timestamps: true });

const Reminder = mongoose.model("Reminder", reminderSchema);
module.exports = Reminder;
