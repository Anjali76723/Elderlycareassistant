// server/utils/twilio.js
const twilio = require("twilio");

const SID = process.env.TWILIO_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;

const client = SID && TOKEN ? twilio(SID, TOKEN) : null;

async function sendMessage(to, body) {
  if (!client) {
    throw new Error("Twilio not configured. Set TWILIO_SID and TWILIO_AUTH_TOKEN.");
  }
  if (!to) throw new Error("Missing 'to' phone number");
  return client.messages.create({
    body,
    from: FROM,
    to,
  });
}

module.exports = { sendMessage, client };
