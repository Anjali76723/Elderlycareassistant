const Caregiver = require("../models/Caregiver");
const User = require("../models/user.model");
const { sendSMS } = require("../services/twilio.service");

// Add a new caregiver
const addCaregiver = async (req, res) => {
  try {
    console.log('\n=== addCaregiver called ===');
    console.log('Request body:', req.body);
    console.log('Elderly user ID:', req.user._id);
    console.log('Elderly user email:', req.user.email);
    
    const { name, email, phone, receiveSMS = true, receiveEmail = true, isPrimary = false } = req.body;
    const elderlyId = req.user._id;

    // Validate required fields
    if (!name || !email || !phone) {
      console.log('Missing required fields:', { name: !!name, email: !!email, phone: !!phone });
      return res.status(400).json({ message: "Name, email, and phone are required" });
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    console.log('Original phone:', phone);
    console.log('Cleaned phone:', cleanedPhone);

    // Validate phone number format (more lenient - just check it has digits and optional +)
    if (!/^\+?\d{8,15}$/.test(cleanedPhone)) {
      console.log('Invalid phone number format:', cleanedPhone);
      return res.status(400).json({ 
        message: "Invalid phone number format. Use format: +countrycode followed by number (e.g., +919876543210)" 
      });
    }
    console.log('Phone number validation passed');

    // Check if this phone number is already registered as a caregiver for this elderly
    // Check both original and cleaned phone
    const existingCaregiverByPhone = await Caregiver.findOne({ 
      elderlyId, 
      $or: [
        { phone: phone },
        { phone: cleanedPhone }
      ]
    });
    console.log('Existing caregiver check (phone):', existingCaregiverByPhone ? 'Found duplicate' : 'No duplicate');

    if (existingCaregiverByPhone) {
      console.log('Duplicate caregiver found (phone):', existingCaregiverByPhone);
      console.log('!!! RETURNING 400 ERROR - DUPLICATE PHONE !!!');
      return res.status(400).json({ 
        success: false,
        message: `A caregiver with phone number ${existingCaregiverByPhone.phone} is already registered. Please use a different phone number or update the existing caregiver.`,
        existingCaregiver: {
          name: existingCaregiverByPhone.name,
          email: existingCaregiverByPhone.email,
          phone: existingCaregiverByPhone.phone
        }
      });
    }

    // Also check for duplicate email
    const existingCaregiverByEmail = await Caregiver.findOne({ 
      elderlyId, 
      email: email.toLowerCase()
    });
    console.log('Existing caregiver check (email):', existingCaregiverByEmail ? 'Found duplicate' : 'No duplicate');

    if (existingCaregiverByEmail) {
      console.log('Duplicate caregiver found (email):', existingCaregiverByEmail);
      console.log('!!! RETURNING 400 ERROR - DUPLICATE EMAIL !!!');
      return res.status(400).json({ 
        success: false,
        message: `A caregiver with email ${existingCaregiverByEmail.email} is already registered. Please use a different email or update the existing caregiver.`,
        existingCaregiver: {
          name: existingCaregiverByEmail.name,
          email: existingCaregiverByEmail.email,
          phone: existingCaregiverByEmail.phone
        }
      });
    }

    // If setting as primary, unset any existing primary
    if (isPrimary) {
      await Caregiver.updateOne(
        { elderlyId, isPrimary: true },
        { $set: { isPrimary: false } }
      );
    }

    console.log('Creating new caregiver with data:', { elderlyId, name, email, phone: cleanedPhone, receiveSMS, receiveEmail, isPrimary });
    
    const newCaregiver = new Caregiver({
      elderlyId,
      name,
      email: email.toLowerCase(), // Normalize email to lowercase
      phone: cleanedPhone, // Use cleaned phone number
      receiveSMS,
      receiveEmail,
      isPrimary
    });

    await newCaregiver.save();
    console.log('Caregiver saved successfully:', newCaregiver._id);

    // Add to user's caregivers array if not already present
    await User.findByIdAndUpdate(
      elderlyId,
      { $addToSet: { caregivers: newCaregiver._id } }
    );
    console.log('Added caregiver to user caregivers array');

    // Fetch current count
    const totalCaregivers = await Caregiver.countDocuments({ elderlyId });
    console.log('Total caregivers for this elderly:', totalCaregivers);
    console.log('=== addCaregiver completed successfully ===\n');

    res.status(201).json({ 
      success: true,
      message: 'Caregiver added successfully',
      caregiver: newCaregiver 
    });
  } catch (error) {
    console.error('=== Error adding caregiver ===');
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Error adding caregiver", error: error.message });
  }
};

// Get all caregivers for an elderly user
const getCaregivers = async (req, res) => {
  try {
    const caregivers = await Caregiver.find({ elderlyId: req.user._id }).sort({ isPrimary: -1, name: 1 });
    res.json(caregivers);
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    res.status(500).json({ message: "Error fetching caregivers" });
  }
};

// Update a caregiver
const updateCaregiver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, receiveSMS, receiveEmail, isPrimary } = req.body;

    // Check if phone is being updated and if it's already used by another caregiver
    if (phone) {
      const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
      const existingCaregiverByPhone = await Caregiver.findOne({
        elderlyId: req.user._id,
        _id: { $ne: id }, // Exclude current caregiver
        $or: [
          { phone: phone },
          { phone: cleanedPhone }
        ]
      });

      if (existingCaregiverByPhone) {
        return res.status(400).json({
          success: false,
          message: `Phone number ${cleanedPhone} is already used by another caregiver (${existingCaregiverByPhone.name})`
        });
      }
    }

    // Check if email is being updated and if it's already used by another caregiver
    if (email) {
      const existingCaregiverByEmail = await Caregiver.findOne({
        elderlyId: req.user._id,
        _id: { $ne: id }, // Exclude current caregiver
        email: email.toLowerCase()
      });

      if (existingCaregiverByEmail) {
        return res.status(400).json({
          success: false,
          message: `Email ${email} is already used by another caregiver (${existingCaregiverByEmail.name})`
        });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (phone) updates.phone = phone.replace(/[\s\-\(\)]/g, '');
    if (receiveSMS !== undefined) updates.receiveSMS = receiveSMS;
    if (receiveEmail !== undefined) updates.receiveEmail = receiveEmail;
    
    // Handle primary caregiver change
    if (isPrimary) {
      // Unset existing primary
      await Caregiver.updateOne(
        { elderlyId: req.user._id, isPrimary: true },
        { $set: { isPrimary: false } }
      );
      updates.isPrimary = true;
    }

    const updatedCaregiver = await Caregiver.findOneAndUpdate(
      { _id: id, elderlyId: req.user._id },
      { $set: updates },
      { new: true }
    );

    if (!updatedCaregiver) {
      return res.status(404).json({ 
        success: false,
        message: "Caregiver not found" 
      });
    }

    res.json({ 
      success: true,
      message: 'Caregiver updated successfully',
      caregiver: updatedCaregiver 
    });
  } catch (error) {
    console.error("Error updating caregiver:", error);
    res.status(500).json({ message: "Error updating caregiver" });
  }
};

// Delete a caregiver
const deleteCaregiver = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedCaregiver = await Caregiver.findOneAndDelete({
      _id: id,
      elderlyId: req.user._id
    });

    if (!deletedCaregiver) {
      return res.status(404).json({ message: "Caregiver not found" });
    }

    // Remove from user's caregivers array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { caregivers: id } }
    );

    res.json({ message: "Caregiver removed successfully" });
  } catch (error) {
    console.error("Error deleting caregiver:", error);
    res.status(500).json({ message: "Error deleting caregiver" });
  }
};

// Send test SMS to a caregiver
const sendTestSMS = async (req, res) => {
  try {
    const { id } = req.params;
    const caregiver = await Caregiver.findOne({
      _id: id,
      elderlyId: req.user._id,
      receiveSMS: true
    });

    if (!caregiver) {
      return res.status(404).json({ message: "Caregiver not found or SMS not enabled" });
    }

    const user = await User.findById(req.user._id);
    const message = `Test message from Vocamate: This is a test SMS from ${user.name}'s emergency contact system.`;
    
    await sendSMS(caregiver.phone, message);
    
    res.json({ message: "Test SMS sent successfully" });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    res.status(500).json({ message: "Error sending test SMS" });
  }
};

// Send alert to all caregivers
const sendAlert = async (req, res) => {
  try {
    const elderlyId = req.user._id;
    const { message = 'Help! I need assistance!' } = req.body;

    // Get all caregivers for this elderly user
    const caregivers = await Caregiver.find({ elderlyId });
    
    if (!caregivers || caregivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No caregivers found for this user'
      });
    }

    // Send alerts to all caregivers who should receive them
    const alertPromises = caregivers.map(async (caregiver) => {
      const alertMessage = `🚨 SOS ALERT! ${req.user.name || 'Elderly User'} needs help: ${message}. Please respond immediately.`;

      try {
        if (caregiver.receiveSMS) {
          await sendSMS(caregiver.phone, alertMessage);
        }
        
        // You can add email notification here if needed
        // if (caregiver.receiveEmail && caregiver.email) {
        //   await sendEmail(...);
        // }
        
        return { 
          caregiverId: caregiver._id, 
          status: 'success',
          message: caregiver.receiveSMS ? 'SMS sent' : 'SMS notifications disabled'
        };
      } catch (error) {
        console.error(`Failed to send alert to ${caregiver.phone}:`, error);
        return { 
          caregiverId: caregiver._id, 
          status: 'error',
          message: error.message 
        };
      }
    });

    const results = await Promise.all(alertPromises);
    
    res.status(200).json({
      success: true,
      message: 'Alerts sent to caregivers',
      results
    });

  } catch (error) {
    console.error('Error sending alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending alerts to caregivers',
      error: error.message
    });
  }
};

module.exports = {
  addCaregiver,
  getCaregivers,
  updateCaregiver,
  deleteCaregiver,
  sendTestSMS,
  sendAlert
};
