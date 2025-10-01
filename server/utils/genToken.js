const jwt = require("jsonwebtoken");

const genToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

module.exports = genToken;
