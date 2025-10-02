// Quick SMS test script
require('dotenv').config();

console.log('\n=== SMS Configuration Test ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   TWILIO_SID:', process.env.TWILIO_SID ? '✓ Set' : '✗ Missing');
console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing');
console.log('   TWILIO_FROM:', process.env.TWILIO_FROM || '✗ Missing');

if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) {
  console.error('\n❌ Twilio credentials are missing!');
  process.exit(1);
}

// Test Twilio client initialization
console.log('\n2. Testing Twilio Client:');
const twilio = require('twilio');
let client;

try {
  client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('   ✓ Twilio client initialized successfully');
} catch (error) {
  console.error('   ✗ Failed to initialize Twilio client:', error.message);
  process.exit(1);
}

// Test sending SMS
console.log('\n3. Testing SMS Send:');
console.log('   Enter test phone number (with country code, e.g., +919773689336):');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('   Phone: ', async (phone) => {
  if (!phone || !phone.trim()) {
    console.log('   ✗ No phone number provided');
    rl.close();
    process.exit(1);
  }

  const testPhone = phone.trim();
  console.log(`\n   Sending test SMS to: ${testPhone}`);
  console.log('   From: ' + process.env.TWILIO_FROM);

  try {
    const message = await client.messages.create({
      body: '🚨 TEST: This is a test message from your Elderly Care App. If you received this, SMS is working correctly!',
      from: process.env.TWILIO_FROM,
      to: testPhone
    });

    console.log('\n   ✅ SMS SENT SUCCESSFULLY!');
    console.log('   Message SID:', message.sid);
    console.log('   Status:', message.status);
    console.log('   To:', message.to);
    console.log('   From:', message.from);
    console.log('\n   Check the phone to confirm receipt.');
    
  } catch (error) {
    console.error('\n   ❌ FAILED TO SEND SMS');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   More info:', error.moreInfo);
    
    if (error.code === 21608) {
      console.error('\n   💡 This is a TRIAL ACCOUNT issue!');
      console.error('   You can only send SMS to VERIFIED phone numbers.');
      console.error('   Solution:');
      console.error('   1. Go to https://console.twilio.com/');
      console.error('   2. Navigate to Phone Numbers → Verified Caller IDs');
      console.error('   3. Add and verify: ' + testPhone);
      console.error('   OR upgrade to a paid Twilio account');
    } else if (error.code === 21211) {
      console.error('\n   💡 Invalid phone number format!');
      console.error('   Make sure to include country code (e.g., +919773689336)');
    }
  }
  
  rl.close();
});
