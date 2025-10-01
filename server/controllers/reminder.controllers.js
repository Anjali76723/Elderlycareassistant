// server/controllers/reminder.controllers.js
const mongoose = require("mongoose");
const Reminder = require("../models/Reminder.js");
const User = require("../models/user.model.js");

/**
 * caregiver creates a reminder
 * body: { elderlyId?, elderlyEmail?, message, time, repeat, meta }
 */
const createReminder = async (req, res) => {
  try {
    const { elderlyId, elderlyEmail, message, time, repeat, meta } = req.body;

    const caller = await User.findById(req.userId);
    if (!caller) return res.status(401).json({ message: "invalid user" });
    if (caller.role !== "caregiver") {
      return res.status(403).json({ message: "only caregivers can create reminders" });
    }

    // resolve elderlyId from email if provided
    let targetElderlyId = elderlyId;
    if (!targetElderlyId && elderlyEmail) {
      const elderly = await User.findOne({ email: elderlyEmail, role: "elderly" });
      if (!elderly) return res.status(404).json({ message: "elderly not found" });
      targetElderlyId = elderly._id;
    }

    if (!targetElderlyId || !message || !time) {
      return res.status(400).json({ message: "elderlyId or elderlyEmail, message and time required" });
    }

    if (!mongoose.Types.ObjectId.isValid(String(targetElderlyId))) {
      return res.status(400).json({ message: "invalid elderlyId format" });
    }

    const reminder = await Reminder.create({
      elderlyId: targetElderlyId,
      caregiverId: req.userId,
      message,
      time: new Date(time),
      repeat: repeat || "none",
      meta
    });

    console.log("createReminder -> created:", reminder._id.toString());
    return res.status(201).json(reminder);
  } catch (err) {
    console.error("createReminder error:", err);
    return res.status(500).json({ message: "create reminder error", error: err.message });
  }
};

/**
 * caregiver list
 */
const listRemindersForCaregiver = async (req, res) => {
  try {
    const reminders = await Reminder.find({ caregiverId: req.userId }).sort({ time: 1 });
    return res.json(reminders);
  } catch (err) {
    console.error("listRemindersForCaregiver error:", err);
    return res.status(500).json({ message: "list reminders error", error: err.message });
  }
};

/**
 * elderly list (active)
 */
const listRemindersForElderly = async (req, res) => {
  try {
    const reminders = await Reminder.find({ elderlyId: req.userId, active: true }).sort({ time: 1 });
    return res.json(reminders);
  } catch (err) {
    console.error("listRemindersForElderly error:", err);
    return res.status(500).json({ message: "list reminders error", error: err.message });
  }
};

/**
 * acknowledge (taken or snooze)
 * POST /api/reminder/ack/:id
 * body: { action: 'taken'|'snooze', snoozeMinutes? }
 */
const acknowledgeReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, snoozeMinutes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "invalid reminder id format" });
    }

    const r = await Reminder.findById(id);
    if (!r) return res.status(404).json({ message: "reminder not found" });

    // authorization: elderly target or caregiver creator may act
    if (String(r.elderlyId) !== String(req.userId) && String(r.caregiverId) !== String(req.userId)) {
      return res.status(403).json({ message: "not authorized for this reminder" });
    }

    if (action === "taken") {
      if (r.repeat === "daily") {
        r.time = new Date(r.time.getTime() + 24 * 60 * 60 * 1000);
      } else if (r.repeat === "weekly") {
        r.time = new Date(r.time.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        r.active = false;
      }
      await r.save();
      console.log("acknowledgeReminder -> taken:", id);
      return res.json({ message: "marked taken", reminder: r });
    }

    if (action === "snooze") {
      const mins = parseInt(snoozeMinutes, 10) || 10;
      r.time = new Date(Date.now() + mins * 60 * 1000);
      r.active = true;
      await r.save();
      console.log(`acknowledgeReminder -> snoozed ${mins}m:`, id);
      return res.json({ message: `snoozed ${mins} minutes`, reminder: r });
    }

    return res.status(400).json({ message: "invalid action" });
  } catch (err) {
    console.error("acknowledgeReminder error:", err);
    return res.status(500).json({ message: "acknowledge error", error: err.message });
  }
};

/**
 * manual trigger for testing
 * POST /api/reminder/trigger/:id
 * requires io available on app (app.set('io', io))
 */
const triggerReminder = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔔 triggerReminder called, id:", id);

    // Validate id format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("  -> invalid ObjectId format:", id);
      return res.status(400).json({ message: "invalid reminder id format" });
    }

    const r = await Reminder.findById(id);
    console.log("  -> found reminder?", !!r);
    if (!r) {
      console.log("  -> reminder not found for id:", id);
      return res.status(404).json({ message: "reminder not found" });
    }

    console.log("  -> reminder summary:", {
      id: String(r._id),
      elderlyId: String(r.elderlyId),
      message: r.message,
      time: r.time
    });

    const io = req.app.get("io");
    console.log("  -> req.app.get('io') ->", !!io);
    if (!io) {
      return res.status(500).json({ message: "io not available on server (req.app.get('io') returned falsy)" });
    }

    io.to(String(r.elderlyId)).emit("reminder", {
      id: r._id,
      message: r.message,
      meta: r.meta,
      time: r.time
    });

    console.log("  -> emitted 'reminder' to room:", String(r.elderlyId));
    return res.json({ message: "triggered" });
  } catch (err) {
    console.error("triggerReminder error:", err);
    return res.status(500).json({ message: "trigger error", error: err.message });
  }
};

module.exports = {
  createReminder,
  listRemindersForCaregiver,
  listRemindersForElderly,
  acknowledgeReminder,
  triggerReminder
};

