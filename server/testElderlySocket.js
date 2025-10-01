// server/testElderlySocket.js
const { io } = require("socket.io-client");
const serverUrl = "http://localhost:8000";

const elderlyId = process.argv[2] || "elderly-test-id";
const socket = io(serverUrl, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("elderly client connected", socket.id);
  socket.emit("join", elderlyId);
  console.log("elderly emitted join", elderlyId);
});

socket.on("emergency", (payload) => {
  console.log("elderly received emergency:", JSON.stringify(payload, null, 2));
});

socket.on("emergency-update", (payload) => {
  console.log("elderly received emergency-update:", JSON.stringify(payload, null, 2));
});
