// server/routes/reminder.routes.js
const express = require("express");
const {
  createReminder,
  listRemindersForCaregiver,
  listRemindersForElderly,
  acknowledgeReminder,
  triggerReminder
} = require("../controllers/reminder.controllers.js");
const isAuth = require("../middlewares/isAuth.js");

const router = express.Router();

router.post("/create", isAuth, createReminder);        // caregiver creates
router.get("/caregiver", isAuth, listRemindersForCaregiver);
router.get("/elderly", isAuth, listRemindersForElderly);
router.post("/ack/:id", isAuth, acknowledgeReminder);  // body: {action:'taken'|'snooze', snoozeMinutes}
router.post("/trigger/:id", isAuth, triggerReminder);  // manual trigger for testing
router.get("/debug/:id", isAuth, (req, res) => require("../controllers/reminder.controllers.js").getReminderById(req, res));


module.exports = router;
