const express = require("express");
const { createAlert, listAlerts, acknowledgeAlert, resolveAlert } = require("../controllers/emergency.controllers");
const isAuth = require("../middlewares/isAuth");
const router = express.Router();

router.post("/alert", isAuth, createAlert);           // elderly triggers
router.get("/list", isAuth, listAlerts);              // caregivers fetch alerts
router.post("/ack/:id", isAuth, acknowledgeAlert);    // caregiver acknowledges
router.post("/resolve/:id", isAuth, resolveAlert);    // mark resolved

module.exports = router;
