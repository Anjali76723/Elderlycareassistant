// Test script to verify Twilio SMS functionality
require('dotenv').config();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_FROM;

console.log('\n=== Twilio Configuration Test ===\n');

// Check environment variables
console.log('1. Checking environment variables:');
console.log(`   TWILIO_SID: ${accountSid ? '✓ Set (' + accountSid.substring(0, 10) + '...)' : '✗ Not set'}`);
console.log(`   TWILIO_AUTH_TOKEN: ${authToken ? '✓ Set (' + authToken.substring(0, 10) + '...)' : '✗ Not set'}`);
console.log(`   TWILIO_FROM: ${twilioPhoneNumber ? '✓ Set (' + twilioPhoneNumber + ')' : '✗ Not set'}`);

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.log('\n❌ ERROR: Missing Twilio credentials in .env file');
  console.log('\nPlease ensure your .env file contains:');
  console.log('   TWILIO_SID=your_account_sid');
  console.log('   TWILIO_AUTH_TOKEN=your_auth_token');
  console.log('   TWILIO_FROM=+your_phone_number');
  process.exit(1);
}

// Try to initialize Twilio client
console.log('\n2. Initializing Twilio client:');
try {
  const client = require('twilio')(accountSid, authToken);
  console.log('   ✓ Twilio client initialized successfully');

  // Optional: Send a test SMS
  // Uncomment and add your phone number to test
  /*
  const testPhoneNumber = '+1234567890'; // Replace with your phone number
  console.log('\n3. Sending test SMS:');
  console.log(`   Sending to: ${testPhoneNumber}`);
  
  client.messages
    .create({
      body: 'Test message from Vocamate Elderly Care Assistant. If you receive this, SMS functionality is working correctly!',
      from: twilioPhoneNumber,
      to: testPhoneNumber
    })
    .then(message => {
      console.log(`   ✓ Test SMS sent successfully!`);
      console.log(`   Message SID: ${message.sid}`);
      console.log(`   Status: ${message.status}`);
      console.log('\n✅ All checks passed! Twilio is configured correctly.\n');
    })
    .catch(error => {
      console.error(`   ✗ Failed to send test SMS:`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      if (error.moreInfo) {
        console.error(`   More info: ${error.moreInfo}`);
      }
      console.log('\n❌ Twilio configuration has issues. Check the error above.\n');
    });
  */

  console.log('\n✅ Twilio client initialization successful!');
  console.log('\nTo send a test SMS:');
  console.log('1. Uncomment the test SMS code in this file (lines 34-57)');
  console.log('2. Replace +1234567890 with your phone number');
  console.log('3. Run this script again: node testTwilio.js\n');

} catch (error) {
  console.error('   ✗ Failed to initialize Twilio client');
  console.error(`   Error: ${error.message}`);
  console.log('\n❌ Twilio initialization failed. Check your credentials.\n');
  process.exit(1);
}
