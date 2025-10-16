// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Glavni middleware za autentifikaciju
const authMiddleware = async (req, res, next) => {
  try {
    // Uzmi token iz headera
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Pristup odbijen. Token nije pronađen.' });
    }

    // Verifikuj token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tvoj_secret_key');
    
    // Pronađi korisnika
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Korisnik nije pronađen.' });
    }

    // Dodaj korisnika u request - VAŽNO: dodaj i userId property za kompatibilnost
    req.user = user;
    req.user.userId = user._id; // Dodajemo userId property
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token nije validan.', error: error.message });
  }
};

// Middleware za proveru admin privilegija
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Pristup odbijen. Potrebne su admin privilegije.' });
  }
  next();
};

// Middleware za proveru roditelj privilegija
const requireParent = (req, res, next) => {
  if (!req.user || req.user.role !== 'Roditelj') {
    return res.status(403).json({ message: 'Pristup odbijen. Ova funkcionalnost je dostupna samo roditeljima.' });
  }
  next();
};

// Middleware za proveru verifikovanog korisnika
const requireVerified = (req, res, next) => {
  if (!req.user || !req.user.isVerified) {
    return res.status(403).json({ message: 'Pristup odbijen. Vaš nalog mora biti verifikovan.' });
  }
  next();
};


// Export kao pojedinačne funkcije i kao default
module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireParent = requireParent;
module.exports.requireVerified = requireVerified;