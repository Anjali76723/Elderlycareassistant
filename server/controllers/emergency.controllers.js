// server/controllers/emergency.controllers.js
const EmergencyAlert = require("../models/EmergencyAlert");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const { sendMessage, client: twClient } = require("../utils/twilio");

/**
 * createAlert - called by elderly client or caregiver
 * body: { message, location, sentVia }
 *
 * Behavior:
 * - Save alert
 * - Emit to caregivers room + elderly personal room
 * - Notify via SMS/WhatsApp only for emergency sends (voice/button/auto) and only if Twilio configured
 */
const createAlert = async (req, res) => {
  try {
    const { message, location, sentVia } = req.body;
    const elderlyId = req.userId;

    if (!message) return res.status(400).json({ message: "message required" });

    const alert = await EmergencyAlert.create({
      elderlyId,
      message,
      location,
      sentVia,
    });

    // Emit to caregivers room and to elderly personal room
    const io = req.app.get("io");
    if (io) {
      io.to("caregivers").emit("emergency", { alert });
      io.to(String(elderlyId)).emit("emergency", { alert });
    }

    // Build recipients list from elderly record: emergencyContacts + linked caregivers with phone
    const elderly = await User.findById(elderlyId).lean();
    const recipients = [];
    if (elderly) {
      if (Array.isArray(elderly.emergencyContacts)) {
        elderly.emergencyContacts.forEach((c) => {
          if (c && c.phone) recipients.push({ to: c.phone, reason: `Family contact (${c.name || "unknown"})` });
        });
      }

      if (Array.isArray(elderly.caregivers) && elderly.caregivers.length > 0) {
        const cgUsers = await User.find({ _id: { $in: elderly.caregivers }, phone: { $exists: true, $ne: null } }).lean();
        cgUsers.forEach((cu) => {
          if (cu.phone) recipients.push({ to: cu.phone, reason: `Linked caregiver (${cu.email || cu.name || "unknown"})` });
        });
      } else {
        // fallback - be conservative: don't SMS everyone by default in production.
        const allCaregivers = await User.find({ role: "caregiver", phone: { $exists: true, $ne: null } }).lean();
        allCaregivers.forEach((cu) => {
          if (cu.phone) recipients.push({ to: cu.phone, reason: `All caregiver (${cu.email || cu.name || "unknown"})` });
        });
      }
    }

    // Deduplicate recipients
    const uniqueTo = [...new Map(recipients.map(r => [r.to, r])).values()];

    // Prepare SMS body
    const when = new Date(alert.createdAt || Date.now()).toLocaleString();
    const body = `EMERGENCY: ${message}\nFrom: ${elderly?.name || "Unknown"}\nLocation: ${location?.address || "not provided"}\nTime: ${when}`;

    // Send messages only for emergency sends (voice/button/auto) and only if twilio configured.
    const sendResults = [];
    if (twClient && ["voice", "button", "auto"].includes((sentVia || "").toLowerCase())) {
      for (const rec of uniqueTo) {
        try {
          const to = rec.to;
          const result = await sendMessage(to, body);
          sendResults.push({ to, sid: result.sid });
        } catch (err) {
          console.warn("Twilio send error to", rec.to, err.message || err);
        }
      }
    } else {
      // Twilio not configured or not an emergency-type send - skip SMS
      if (!twClient) console.log("Twilio not configured — skipping SMS notifications for emergency alert");
    }

    return res.status(201).json({ message: "alert created", alert, sent: sendResults });
  } catch (err) {
    console.error("createAlert error:", err);
    return res.status(500).json({ message: "create alert error", error: err.message });
  }
};

const listAlerts = async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find().sort({ createdAt: -1 }).limit(200);
    return res.json(alerts);
  } catch (err) {
    console.error("listAlerts error:", err);
    return res.status(500).json({ message: "list alerts error" });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "invalid id" });

    const alert = await EmergencyAlert.findById(id);
    if (!alert) return res.status(404).json({ message: "alert not found" });

    alert.status = "acknowledged";
    await alert.save();

    const io = req.app.get("io");
    if (io) {
      io.to("caregivers").emit("emergency-update", { alert });
      io.to(String(alert.elderlyId)).emit("emergency-update", { alert });
    }

    return res.json({ message: "acknowledged", alert });
  } catch (err) {
    console.error("acknowledgeAlert error:", err);
    return res.status(500).json({ message: "acknowledge error" });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "invalid id" });

    const alert = await EmergencyAlert.findById(id);
    if (!alert) return res.status(404).json({ message: "alert not found" });

    alert.status = "resolved";
    await alert.save();

    const io = req.app.get("io");
    if (io) {
      io.to("caregivers").emit("emergency-update", { alert });
      io.to(String(alert.elderlyId)).emit("emergency-update", { alert });
    }

    return res.json({ message: "resolved", alert });
  } catch (err) {
    console.error("resolveAlert error:", err);
    return res.status(500).json({ message: "resolve error" });
  }
};

module.exports = { createAlert, listAlerts, acknowledgeAlert, resolveAlert };
