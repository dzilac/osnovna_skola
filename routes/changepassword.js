// U tvoj users route fajl (npr. routes/users.js ili routes/auth.js)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Prilagodi putanju

router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validacija
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: "Trenutna i nova lozinka su obavezna polja" 
      });
    }

    // Proveri dužinu nove lozinke
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Nova lozinka mora imati najmanje 6 karaktera" 
      });
    }

    // Pronađi korisnika (već imamo iz authMiddleware - req.user)
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        message: "Korisnik nije pronađen" 
      });
    }

    // Proveri trenutnu lozinku
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: "Trenutna lozinka nije tačna" 
      });
    }

    // Proveri da li je nova lozinka ista kao stara
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: "Nova lozinka mora biti različita od trenutne" 
      });
    }

    // Hash novu lozinku
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Ažuriraj lozinku
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Lozinka promenjena za korisnika: ${user.email}`);

    res.status(200).json({ 
      message: "Lozinka je uspešno promenjena",
      success: true
    });

  } catch (error) {
    console.error('❌ Greška pri promeni lozinke:', error);
    res.status(500).json({ 
      message: "Greška na serveru pri promeni lozinke",
      error: error.message 
    });
  }
});