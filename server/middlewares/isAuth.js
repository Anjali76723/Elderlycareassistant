const jwt = require("jsonwebtoken");

const isAuth = (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "token not found" });
    }

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verifyToken.id; // Token contains 'id', not 'userId'
    next();
  } catch (error) {
    console.error("isAuth error", error);
    return res.status(401).json({ message: "invalid token" });
  }
};

module.exports = isAuth;
