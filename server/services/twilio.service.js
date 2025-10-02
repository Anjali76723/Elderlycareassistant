const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_FROM;

// Initialize Twilio client only if credentials are available
let client = null;
if (accountSid && authToken) {
  try {
    client = require('twilio')(accountSid, authToken);
    console.log('✓ Twilio client initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize Twilio client:', error.message);
  }
} else {
  console.warn('⚠ Twilio credentials not found in environment variables');
  console.warn('  Required: TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM');
}

/**
 * Send an SMS message using Twilio
 * @param {string} to - Recipient phone number (E.164 format: +1234567890)
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Twilio message object
 */
const sendSMS = async (to, message) => {
  try {
    if (!client) {
      throw new Error('Twilio client not initialized. Check TWILIO_SID and TWILIO_AUTH_TOKEN.');
    }

    if (!to || !message) {
      throw new Error('Recipient and message are required');
    }

    if (!twilioPhoneNumber) {
      throw new Error('TWILIO_FROM phone number not configured');
    }

    // Ensure phone number is in E.164 format
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    console.log(`📤 Sending SMS to ${formattedTo} from ${twilioPhoneNumber}`);

    const response = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedTo
    });

    console.log(`✓ SMS sent successfully. SID: ${response.sid}, Status: ${response.status}`);

    return {
      success: true,
      sid: response.sid,
      status: response.status,
      to: response.to,
      dateCreated: response.dateCreated,
      error: null
    };
  } catch (error) {
    console.error('✗ Twilio SMS Error:', error.message);
    console.error('  Code:', error.code);
    console.error('  Details:', error.moreInfo || 'N/A');
    return {
      success: false,
      error: error.message,
      code: error.code || 'SMS_SEND_FAILED'
    };
  }
};

/**
 * Send an emergency alert to multiple recipients
 * @param {Array<string>} recipients - Array of phone numbers
 * @param {Object} user - User object containing user details
 * @param {string} alertType - Type of alert (e.g., 'emergency', 'test')
 * @returns {Promise<Array>} - Array of send results
 */
const sendEmergencyAlert = async (recipients, user, alertType = 'emergency') => {
  try {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('No recipients provided');
    }

    const userName = user?.name || 'a user';
    const userPhone = user?.phoneNumber || 'Unknown';
    
    let message = '';
    
    switch (alertType) {
      case 'test':
        message = `[TEST ALERT] This is a test message from ${userName}'s Elderly Care App. This is not a real emergency.`;
        break;
      case 'emergency':
      default:
        message = `🚨 EMERGENCY ALERT! ${userName} (${userPhone}) needs immediate assistance! ` +
                 `This is an automated alert from Elderly Care App. Please respond immediately.`;
        break;
    }

    // Send to all recipients in parallel
    const sendPromises = recipients.map(phone => 
      sendSMS(phone, message).then(result => ({
        phone,
        ...result
      }))
    );

    const results = await Promise.all(sendPromises);
    return results;
  } catch (error) {
    console.error('Emergency alert error:', error);
    throw error;
  }
};

module.exports = {
  sendSMS,
  sendEmergencyAlert
};
