const express = require('express');
const { signUp, signIn, pinLogin, logout } = require('../controllers/auth.controllers');
const isAuth = require('../middlewares/isAuth');

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/pin-login", pinLogin);
router.get("/logout", isAuth, logout);

module.exports = router;
