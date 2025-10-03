const express = require("express");
const router = express.Router();
const isAuth = require("../middlewares/isAuth");
const {
  addCaregiver,
  getCaregivers,
  updateCaregiver,
  deleteCaregiver,
  sendTestSMS,
  sendAlert
} = require("../controllers/caregiver.controllers");

// All routes are protected and require authentication
router.use(isAuth);

// Get all caregivers for the logged-in elderly user
router.get("/", getCaregivers);

// Add a new caregiver
router.post("/", addCaregiver);

// Update a caregiver
router.put("/:id", updateCaregiver);

// Delete a caregiver
router.delete("/:id", deleteCaregiver);

// Send test SMS to a caregiver
router.post("/:id/test-sms", sendTestSMS);

// Send alert to all caregivers (SOS/Help)
router.post("/send-alert", sendAlert);

module.exports = router;
