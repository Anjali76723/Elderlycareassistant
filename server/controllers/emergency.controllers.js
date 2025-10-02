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
    console.log('\n=== createAlert called ===');
    console.log('Body:', req.body);
    console.log('elderlyId:', req.userId);
    
    const { message, location, sentVia } = req.body;
    const elderlyId = req.userId;

    if (!message) {
      console.log('Error: message is required');
      return res.status(400).json({ message: "message required" });
    }

    const alert = await EmergencyAlert.create({
      elderlyId,
      message,
      location,
      sentVia,
    });

    // Emit to elderly personal room
    const io = req.app.get("io");
    if (io) {
      io.to(String(elderlyId)).emit("emergency", { alert });
      console.log(`Emitted emergency alert to elderly room: ${elderlyId}`);
    }

    // Build recipients list from elderly record: emergencyContacts + linked caregivers + caregiver contacts
    console.log('Fetching elderly user data...');
    let elderly = null;
    try {
      elderly = await User.findById(elderlyId).populate('caregivers').lean();
      console.log('Elderly user found:', elderly ? 'Yes' : 'No');
    } catch (populateErr) {
      console.warn('Error populating caregivers, trying without populate:', populateErr.message);
      elderly = await User.findById(elderlyId).lean();
    }
    const recipients = [];
    
    if (elderly) {
      // 1. Add emergency contacts from user profile
      if (Array.isArray(elderly.emergencyContacts)) {
        elderly.emergencyContacts.forEach((c) => {
          if (c && c.phone) recipients.push({ 
            to: c.phone, 
            name: c.name || 'Emergency Contact',
            type: 'emergency_contact',
            priority: 1,
            reason: `Family contact (${c.name || "unknown"})` 
          });
        });
      }

      // 2. Add linked caregivers (users with accounts)
      if (Array.isArray(elderly.caregivers) && elderly.caregivers.length > 0) {
        const cgUsers = await User.find({ 
          _id: { $in: elderly.caregivers }, 
          phone: { $exists: true, $ne: null } 
        }).lean();
        
        cgUsers.forEach((cu) => {
          if (cu.phone) recipients.push({ 
            to: cu.phone, 
            name: cu.name || cu.email || 'Caregiver',
            type: 'linked_caregiver',
            priority: 2,
            reason: `Linked caregiver (${cu.email || cu.name || "unknown"})` 
          });
        });
      }

      // 3. Add caregiver contacts (from the new caregiver management system)
      console.log('Fetching caregiver contacts...');
      const Caregiver = require('../models/Caregiver');
      const caregiverContacts = await Caregiver.find({ 
        elderlyId,
        receiveSMS: true,
        phone: { $exists: true, $ne: '' }
      });
      console.log('Found', caregiverContacts.length, 'caregiver contacts');

      // Emit Socket.IO event to each assigned caregiver's personal room
      if (io && caregiverContacts.length > 0) {
        // Find caregiver User accounts by email/phone to get their userId
        const caregiverEmails = caregiverContacts.map(cg => cg.email).filter(Boolean);
        const caregiverPhones = caregiverContacts.map(cg => cg.phone).filter(Boolean);
        
        const caregiverUsers = await User.find({
          role: 'caregiver',
          $or: [
            { email: { $in: caregiverEmails } },
            { phone: { $in: caregiverPhones } }
          ]
        }).lean();

        console.log(`Found ${caregiverUsers.length} caregiver user accounts to notify`);
        
        // Emit to each caregiver's personal room
        caregiverUsers.forEach(cgUser => {
          io.to(String(cgUser._id)).emit("emergency", { alert });
          console.log(`Emitted emergency to caregiver room: ${cgUser._id} (${cgUser.email})`);
        });
      }

      caregiverContacts.forEach(cg => {
        if (!recipients.some(r => r.to === cg.phone)) {
          recipients.push({
            to: cg.phone,
            name: cg.name || 'Caregiver',
            type: 'caregiver_contact',
            isPrimary: cg.isPrimary,
            priority: cg.isPrimary ? 0 : 1.5, // Primary caregivers get highest priority
            reason: `Caregiver (${cg.name || cg.email || cg.phone})`
          });
        }
      });
    }

    // Sort recipients by priority (primary caregivers first, then emergency contacts, then others)
    const sortedRecipients = [...recipients].sort((a, b) => {
      // First sort by priority
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Then by name for same priority
      return (a.name || '').localeCompare(b.name || '');
    });

    // Deduplicate by phone number, keeping the first (highest priority) occurrence
    const uniqueTo = [...new Map(sortedRecipients.map(r => [r.to, r])).values()];

    // Prepare SMS body with more detailed information
    const when = new Date(alert.createdAt || Date.now()).toLocaleString();
    const userName = elderly?.name || 'Unknown User';
    const locationInfo = location?.address ? `\n📍 Location: ${location.address}` : '';
    const googleMapsLink = location?.lat && location?.lng 
      ? `\n\nView on map: https://www.google.com/maps?q=${location.lat},${location.lng}` 
      : '';
    
    const body = `🚨 EMERGENCY ALERT 🚨\n` +
      `From: ${userName}\n` +
      `Message: ${message}${locationInfo}\n` +
      `Time: ${when}${googleMapsLink}\n\n` +
      `Please respond when you receive this message.`;

    // Send messages only for emergency sends (voice/button/auto) and only if twilio configured.
    const sendResults = [];
    if (twClient && ["voice", "button", "auto"].includes((sentVia || "").toLowerCase())) {
      console.log(`Sending emergency alerts to ${uniqueTo.length} recipients`);
      
      // Process in parallel but limit concurrency to avoid rate limiting
      const BATCH_SIZE = 5;
      for (let i = 0; i < uniqueTo.length; i += BATCH_SIZE) {
        const batch = uniqueTo.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (rec) => {
          try {
            const result = await sendMessage(rec.to, body);
            console.log(`Sent alert to ${rec.name || 'unknown'} (${rec.to})`);
            sendResults.push({ 
              to: rec.to, 
              name: rec.name,
              type: rec.type,
              sid: result.sid,
              status: 'sent'
            });
          } catch (err) {
            console.warn(`Failed to send to ${rec.name || 'unknown'} (${rec.to}):`, err.message || err);
            sendResults.push({ 
              to: rec.to, 
              name: rec.name,
              type: rec.type,
              error: err.message || 'Failed to send',
              status: 'failed'
            });
          }
        }));
      }
    } else {
      console.log("SMS notifications skipped - " + 
        (!twClient ? "Twilio not configured" : `Non-emergency send type: ${sentVia}`));
    }

    return res.status(201).json({ message: "alert created", alert, sent: sendResults });
  } catch (err) {
    console.error("\n=== createAlert error ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "create alert error", error: err.message });
  }
};

const listAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user to check their role
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    let alerts = [];

    if (user.role === "caregiver") {
      // For caregivers: only show alerts from elderly users they are assigned to
      const Caregiver = require('../models/Caregiver');
      const assignments = await Caregiver.find({ 
        $or: [
          { email: user.email },  // Match by email
          { phone: user.phone }   // Or match by phone
        ]
      }).lean();

      // Get all elderly IDs this caregiver is assigned to
      const elderlyIds = assignments.map(a => a.elderlyId);
      
      if (elderlyIds.length > 0) {
        alerts = await EmergencyAlert.find({ 
          elderlyId: { $in: elderlyIds } 
        })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      }
      
      console.log(`Caregiver ${user.email} has access to ${elderlyIds.length} elderly users, showing ${alerts.length} alerts`);
    } else {
      // For elderly users: only show their own alerts
      alerts = await EmergencyAlert.find({ elderlyId: userId })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      
      console.log(`Elderly user ${user.email} viewing ${alerts.length} own alerts`);
    }

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
      // Emit to elderly's personal room
      io.to(String(alert.elderlyId)).emit("emergency-update", { alert });
      
      // Emit to assigned caregivers only
      const Caregiver = require('../models/Caregiver');
      const caregiverContacts = await Caregiver.find({ elderlyId: alert.elderlyId }).lean();
      
      if (caregiverContacts.length > 0) {
        const caregiverEmails = caregiverContacts.map(cg => cg.email).filter(Boolean);
        const caregiverPhones = caregiverContacts.map(cg => cg.phone).filter(Boolean);
        
        const caregiverUsers = await User.find({
          role: 'caregiver',
          $or: [
            { email: { $in: caregiverEmails } },
            { phone: { $in: caregiverPhones } }
          ]
        }).lean();
        
        caregiverUsers.forEach(cgUser => {
          io.to(String(cgUser._id)).emit("emergency-update", { alert });
        });
      }
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
      // Emit to elderly's personal room
      io.to(String(alert.elderlyId)).emit("emergency-update", { alert });
      
      // Emit to assigned caregivers only
      const Caregiver = require('../models/Caregiver');
      const caregiverContacts = await Caregiver.find({ elderlyId: alert.elderlyId }).lean();
      
      if (caregiverContacts.length > 0) {
        const caregiverEmails = caregiverContacts.map(cg => cg.email).filter(Boolean);
        const caregiverPhones = caregiverContacts.map(cg => cg.phone).filter(Boolean);
        
        const caregiverUsers = await User.find({
          role: 'caregiver',
          $or: [
            { email: { $in: caregiverEmails } },
            { phone: { $in: caregiverPhones } }
          ]
        }).lean();
        
        caregiverUsers.forEach(cgUser => {
          io.to(String(cgUser._id)).emit("emergency-update", { alert });
        });
      }
    }

    return res.json({ message: "resolved", alert });
  } catch (err) {
    console.error("resolveAlert error:", err);
    return res.status(500).json({ message: "resolve error" });
  }
};

module.exports = { createAlert, listAlerts, acknowledgeAlert, resolveAlert };
