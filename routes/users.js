// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/users/children - Dobavi decu trenutno ulogovanog roditelja
router.get('/children', authMiddleware, async (req, res) => {
  try {
    // Proveri da li je korisnik roditelj
    if (req.user.role !== 'Roditelj') {
      return res.status(403).json({ message: 'Samo roditelji mogu pristupiti ovoj ruti' });
    }
    
    // Pronađi svu decu ovog roditelja
    const children = await User.find({ 
      parentId: req.user._id,
      role: 'Dete'
    }).select('firstName lastName grade profileImage');
    
    res.json(children);
  } catch (error) {
    console.error('Greška pri dobavljanju dece:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju dece' });
  }
});

// GET /api/users/profile - Dobavi profil trenutno ulogovanog korisnika
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Greška pri dobavljanju profila:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju profila' });
  }
});

// PUT /api/users/profile - Ažuriraj profil
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    
    // Ne dozvoli promenu važnih polja
    delete updates.password;
    delete updates.role;
    delete updates.isVerified;
    delete updates.verifiedBy;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }
    
    res.json({ 
      message: 'Profil je uspešno ažuriran',
      user 
    });
  } catch (error) {
    console.error('Greška pri ažuriranju profila:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju profila' });
  }
});

// PUT /api/users/change-password - Promena lozinke (koristi authMiddleware)
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

// GET /api/users/:id - Dobavi korisnika po ID-u (samo Admin ili sam korisnik)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Nemate dozvolu da pristupite ovom korisniku' });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Greška pri dobavljanju korisnika:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju korisnika' });
  }
});

module.exports = router;