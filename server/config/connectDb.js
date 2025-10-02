// server/config/connectDb.js
const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ DB connect error:", error.message);
    process.exit(1); // stop server if DB fails
  }
};

module.exports = connectDb;
