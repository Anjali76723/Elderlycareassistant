// server/controllers/user.controllers.js
const User = require("../models/user.model.js");

// get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -pin");
    if (!user) return res.status(404).json({ message: "user not found" });
    return res.json(user);
  } catch (err) {
    console.error("get current user error", err);
    return res.status(500).json({ message: "error" });
  }
};

// update profile (phone, role, caregivers, emergencyContacts)
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId; // from isAuth middleware
    const updates = {};

    // allow phone, role, caregivers, emergencyContacts from body
    const { phone, role, caregivers, emergencyContacts } = req.body;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (caregivers !== undefined) updates.caregivers = caregivers;
    if (emergencyContacts !== undefined) updates.emergencyContacts = emergencyContacts;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "user not found" });
    return res.json(user);
  } catch (err) {
    console.error("updateProfile error", err);
    return res.status(500).json({ message: "update error" });
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
};
