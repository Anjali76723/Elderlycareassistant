const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const genToken = require("../utils/genToken.js");

/**
 * Sign up
 * Body: { name, email, password?, pin?, role }
 * - caregiver: require password
 * - elderly: require pin
 */
const signUp = async (req, res) => {
  try {
    const { name, email, password, pin, role } = req.body;

    if (!name || !email) return res.status(400).json({ message: "name and email required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "email already exists" });

    const userRole = role === "caregiver" ? "caregiver" : "elderly";

    const newUser = {
      name,
      email,
      role: userRole
    };

    if (userRole === "caregiver") {
      // caregiver must provide password
      if (!password || String(password).length < 6) {
        return res.status(400).json({ message: "password required (min 6 chars) for caregiver" });
      }
      newUser.password = await bcrypt.hash(String(password), 10);
    } else {
      // elderly: require pin (4+ digits recommended)
      if (!pin) return res.status(400).json({ message: "pin required for elderly" });
      newUser.pinHash = await bcrypt.hash(String(pin), 10);
    }

    const created = await User.create(newUser);

    // generate token and set cookie
    const token = genToken(created._id);
    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });

    // remove sensitive fields before returning
    const userSafe = created.toObject();
    delete userSafe.password;
    delete userSafe.pinHash;

    return res.status(201).json({ user: userSafe, token });
  } catch (err) {
    console.error("signup error:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "signup error" });
  }
};

/**
 * Sign in (email + password) for caregivers
 * Body: { email, password }
 */
const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "invalid credentials" });

    if (!user.password) return res.status(400).json({ message: "this account does not have a password login" });

    const match = await bcrypt.compare(String(password), user.password);
    if (!match) return res.status(400).json({ message: "invalid credentials" });

    const token = genToken(user._id);
    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });

    const userSafe = user.toObject();
    delete userSafe.password;
    delete userSafe.pinHash;

    return res.json({ user: userSafe, token });
  } catch (err) {
    console.error("signin error:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "signin error" });
  }
};

/**
 * PIN login for elderly
 * Body: { email, pin }
 */
const pinLogin = async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ message: "email and pin required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "invalid credentials" });

    if (!user.pinHash) return res.status(400).json({ message: "no pin set for this user" });

    const match = await bcrypt.compare(String(pin), user.pinHash);
    if (!match) return res.status(400).json({ message: "invalid pin" });

    const token = genToken(user._id);
    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });

    const userSafe = user.toObject();
    delete userSafe.password;
    delete userSafe.pinHash;

    return res.json({ user: userSafe, token });
  } catch (err) {
    console.error("pinLogin error:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "pin login error" });
  }
};

const logout = (req, res) => {
  try {
    res.clearCookie("token");
    return res.json({ message: "logged out" });
  } catch (err) {
    console.error("logout error:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "logout error" });
  }
};

module.exports = { signUp, signIn, pinLogin, logout };
