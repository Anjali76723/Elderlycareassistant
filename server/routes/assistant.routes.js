// server/routes/assistant.routes.js
const express = require("express");
const router = express.Router();
const isAuth = require("../middlewares/isAuth");
const { getNews, getWeather } = require("../controllers/assistant.controllers");

// GET /api/assistant/news?pageSize=5&country=in
router.get("/news", isAuth, getNews);

// GET /api/assistant/weather?city=Delhi
router.get("/weather", isAuth, getWeather);

module.exports = router;
