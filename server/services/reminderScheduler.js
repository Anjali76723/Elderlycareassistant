// server/services/reminderScheduler.js
const cron = require("node-cron");
const Reminder = require("../models/Reminder.js");
const User = require("../models/user.model.js");
const twilio = require("twilio");

let twClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.warn("Twilio client init failed:", err && err.message ? err.message : err);
    twClient = null;
  }
}

/**
 * startReminderScheduler(io)
 *
 * - Emits reminder events to the elderly user's personal socket room.
 * - By default: DOES NOT send SMS to caregivers or anyone.
 * - Optional: to enable SMS to elderly emergency contacts, set env SEND_REMINDER_SMS=true
 *   and ensure TWILIO_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are configured.
 */
const startReminderScheduler = (io) => {
  // run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const inOneMinute = new Date(now.getTime() + 60 * 1000);

      // find due reminders (<= next minute)
      const due = await Reminder.find({
        active: true,
        time: { $lte: inOneMinute }
      });

      if (!due || due.length === 0) return;

      console.log(`Reminder scheduler: found ${due.length} due reminders at ${now.toISOString()}`);

      for (const r of due) {
        try {
          // always emit to elderly personal room
          if (io) {
            io.to(String(r.elderlyId)).emit("reminder", {
              id: r._id,
              message: r.message,
              meta: r.meta,
              time: r.time
            });
            console.log(`Emitted reminder ${r._id} to room ${String(r.elderlyId)}`);
          } else {
            console.warn("Reminder scheduler: io not available on server, cannot emit socket event.");
          }

          // Optional SMS sending: only to elderly.emergencyContacts (family), never to caregivers
          const sendSmsEnabled = String(process.env.SEND_REMINDER_SMS || "false").toLowerCase() === "true";
          if (sendSmsEnabled && twClient) {
            const elderly = await User.findById(r.elderlyId).lean();
            const contacts = (elderly && elderly.emergencyContacts) || [];

            for (const c of contacts) {
              if (!c || !c.phone) continue;
              try {
                const body = `Reminder for ${elderly?.name || "your loved one"}: ${r.message} at ${new Date(r.time).toLocaleString()}`;
                await twClient.messages.create({
                  body,
                  from: process.env.TWILIO_FROM,
                  to: c.phone
                });
                console.log(`Reminder SMS sent to ${c.phone} for reminder ${r._id}`);
              } catch (err) {
                console.warn(`Twilio send error for ${c.phone}:`, err && err.message ? err.message : err);
              }
            }
          } else if (sendSmsEnabled && !twClient) {
            console.warn("SEND_REMINDER_SMS=true but Twilio not configured (TWILIO_SID/TWILIO_AUTH_TOKEN missing).");
          }

          // update next occurrence or deactivate
          if (r.repeat === "daily") {
            r.time = new Date(r.time.getTime() + 24 * 60 * 60 * 1000);
          } else if (r.repeat === "weekly") {
            r.time = new Date(r.time.getTime() + 7 * 24 * 60 * 60 * 1000);
          } else {
            r.active = false;
          }
          await r.save();
        } catch (innerErr) {
          console.error("Error handling one reminder in scheduler:", innerErr && innerErr.message ? innerErr.message : innerErr);
        }
      }
    } catch (err) {
      console.error("reminder scheduler error:", err && err.message ? err.message : err);
    }
  });

  console.log("Reminder scheduler started (runs every minute). SMS to family is " +
    (String(process.env.SEND_REMINDER_SMS || "false").toLowerCase() === "true" ? "ENABLED" : "DISABLED") +
    ". Reminders will NOT be sent to caregiver phone numbers.");
};

module.exports = startReminderScheduler;
