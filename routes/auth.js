const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth'); // ← DODAJ OVO!
const User = require('../models/User');

// POST /api/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email nije pronađen." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Pogrešna lozinka." });

    if (!user.isVerified && user.role !== 'Admin') {
    return res.status(403).json({ 
    error: "Vaš nalog još uvek nije verifikovan od strane administratora. Molimo sačekajte odobrenje." 
  });
}

    // Generiši JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Vrati token SA user podacima
    return res.json({ 
      message: "Login uspešan",
      token: token,
      user: { 
        id: user._id, 
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
        grade: user.grade
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/register
router.post('/register', upload.single('profileImage'), async (req, res) => {
  console.log("📸 Primljen fajl:", req.file);
  console.log("📨 Primljeni podaci:", req.body);
  try {
    const { firstName, lastName, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email je već registrovan.' });

    const hashed = await bcrypt.hash(password, 10);
    const profileImage = req.file?.path || "";

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      profileImage,
      role: 'Roditelj',  // po defaultu
    });

    res.status(201).json({ message: 'Korisnik registrovan', user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Greška pri registraciji' });
  }
});

// POST /api/register-child - Roditelj registruje dete
router.post('/register-child', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    // Proveri da li je korisnik roditelj
    if (req.user.role !== 'Roditelj') {
      return res.status(403).json({ error: 'Samo roditelji mogu da registruju decu' });
    }

    const { firstName, lastName, email, password, grade, parentId } = req.body;

    console.log('👶 Registrujem dete:', { firstName, lastName, email, grade, parentId });
    console.log('📸 Slika:', req.file);

    // Proveri da li email već postoji
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email je već registrovan' });
    }

    // Hash lozinku
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Uzmi sliku ako postoji
    const profileImage = req.file?.path || '';

    // Kreiraj dete (isVerified = false po default-u za Dete role)
    const child = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'Dete',
      grade: parseInt(grade),
      parentId: parentId,
      isVerified: false,  // Čeka verifikaciju!
      profileImage: profileImage
    });

    console.log('✅ Dete kreirano, čeka verifikaciju:', child._id);

    res.status(201).json({
      message: 'Dete uspešno registrovano. Čeka verifikaciju od strane administratora.',
      child: {
        id: child._id,
        firstName: child.firstName,
        lastName: child.lastName,
        email: child.email,
        grade: child.grade,
        isVerified: child.isVerified,
        profileImage: child.profileImage
      }
    });

  } catch (error) {
    console.error('❌ Greška pri registraciji deteta:', error);
    res.status(500).json({ error: 'Server greška pri registraciji' });
  }
});

module.exports = router;