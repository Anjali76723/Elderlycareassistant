// server/testCaregiverSocket.js
const { io } = require("socket.io-client");
const serverUrl = "http://localhost:8000";

const socket = io(serverUrl, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("caregiver client connected", socket.id);
  // simulate caregiver joining caregiver room
  socket.emit("join-caregiver", "caregiver-test-id");
  console.log("caregiver emitted join-caregiver");
});

socket.on("emergency", (payload) => {
  console.log("caregiver received emergency:", JSON.stringify(payload, null, 2));
});

socket.on("emergency-update", (payload) => {
  console.log("caregiver received emergency-update:", JSON.stringify(payload, null, 2));
});
