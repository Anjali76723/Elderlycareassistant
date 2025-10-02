const jwt = require('jsonwebtoken');

const isAuth = (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header first (more reliable for cross-domain)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log("Token found in Authorization header");
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log("Token found in cookies");
    }

    if (!token) {
      console.log("No token found in request");
      return res.status(401).json({ message: "token not found" });
    }

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verifyToken.id; // Token contains 'id', not 'userId'
    console.log("Token verified successfully for user:", req.userId);
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = isAuth;
