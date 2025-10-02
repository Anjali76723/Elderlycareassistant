const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  console.log('\n=== protect middleware called ===');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  console.log('Has Authorization header:', !!req.headers.authorization);
  console.log('Has cookie:', !!req.cookies?.token);

  // Get token from Authorization header or cookies
  if (
    req.headers.authorization && 
    req.headers.authorization.startsWith('Bearer ')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
    console.log('Token from Authorization header');
  } else if (req.cookies && req.cookies.token) {
    // Get token from cookie
    token = req.cookies.token;
    console.log('Token from cookie');
  }

  if (!token) {
    console.log('❌ No token found');
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token provided' 
    });
  }
  console.log('✓ Token found');

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✓ Token verified, user ID:', decoded.id);
    
    // Get user from the token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    console.log('✓ User found:', user.email, 'Role:', user.role);
    
    // Attach user to request object
    req.user = user;
    console.log('✓ User attached to req.user');
    console.log('=== protect middleware complete ===\n');
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, token failed' 
    });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
