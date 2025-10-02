// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDb = require('./config/connectDb');

// routers
const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const emergencyRouter = require('./routes/emergency.routes');
const assistantRouter = require('./routes/assistant.routes');
const reminderRouter = require('./routes/reminder.routes');
const caregiverRouter = require('./routes/caregiver.routes'); // Add caregiver routes

// services
const startReminderScheduler = require('./services/reminderScheduler');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ["https://elderlycareassistant.vercel.app", "http://localhost:5173"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
};

// Apply CORS with options (handles preflight OPTIONS requests automatically)
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// helpful JSON parse error handler
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  next(err);
});

// mount routers
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/reminder", reminderRouter);
app.use("/api/caregivers", caregiverRouter); // Mount caregiver routes

// simple health check
app.get("/", (req, res) => res.json({ message: "Server OK" }));

// create HTTP server and socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// attach io to express app so controllers can access it via req.app.get("io")
app.set("io", io);

// socket.io connection handling
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  // join personal room (userId must be emitted by client after login)
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(String(userId));
    console.log("socket joined personal room", userId);
  });

  // caregiver room
  socket.on("join-caregiver", (caregiverId) => {
    socket.join("caregivers");
    console.log("caregiver socket joined room caregivers", caregiverId);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

// start server and connect DB
const PORT = process.env.PORT || 8000;

const startServer = async (port) => {
  return new Promise((resolve, reject) => {
    const serverInstance = server.listen(port)
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying port ${Number(port) + 1}...`);
          startServer(Number(port) + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      })
      .on('listening', async () => {
        const actualPort = serverInstance.address().port;
        console.log(`Server listening on port ${actualPort}`);
        
        try {
          await connectDb();
          // start the reminder scheduler if available (pass io so it can emit)
          if (startReminderScheduler && typeof startReminderScheduler === "function") {
            startReminderScheduler(io);
          }
          resolve(serverInstance);
        } catch (err) {
          console.error("Startup error:", err && err.message ? err.message : err);
          serverInstance.close();
          reject(err);
        }
      });
  });
};

// Start the server
startServer(PORT).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
