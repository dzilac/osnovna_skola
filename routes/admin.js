// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const PrivateLesson = require('../models/PrivateLesson');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcrypt');
const upload = require('../middleware/upload');

// Middleware za proveru da li je korisnik admin ili domar
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Domar') {
    return res.status(403).json({ message: 'Pristup dozvoljen samo administratorima' });
  }
  next();
};

// ==========================================
// KORISNICI
// ==========================================

// GET /api/admin/pending-users - Vrati sve korisnike koji čekaju verifikaciju
router.get('/pending-users', authMiddleware, isAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching pending users...');
    
    const pendingUsers = await User.find({ 
      isVerified: false,
      role: { $ne: 'Admin' }
    })
    .populate('parentId', 'firstName lastName email')
    .sort({ createdAt: -1 });

    console.log(`✅ Found ${pendingUsers.length} pending users`);

    res.json(pendingUsers);
  } catch (error) {
    console.error('❌ Error fetching pending users:', error);
    res.status(500).json({ 
      message: 'Greška pri učitavanju', 
      error: error.message 
    });
  }
});

// GET /api/admin/all-users - Vrati SVE verifikovane korisnike
router.get('/all-users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isVerified: true })
      .select('-password')
      .populate('parentId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: 'Greška pri učitavanju', error: error.message });
  }
});

// POST /api/admin/verify-user/:userId - Verifikuj ili odbij korisnika
router.post('/verify-user/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { approve, note } = req.body;

    console.log(`🔍 Verifikacija korisnika ${userId}: ${approve ? 'Odobri' : 'Odbij'}`);

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    if (approve) {
      // Odobri korisnika
      user.isVerified = true;
      user.verifiedBy = req.user._id;
      user.verifiedAt = new Date();
      user.verificationNote = note || 'Odobreno';
      
      await user.save();
      
      console.log(`✅ Korisnik ${user.firstName} ${user.lastName} je verifikovan`);
      
      res.json({ 
        message: 'Korisnik uspešno verifikovan',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          isVerified: user.isVerified
        }
      });
    } else {
      // Odbij korisnika - obriši ga iz baze
      await User.findByIdAndDelete(userId);
      
      console.log(`❌ Korisnik ${user.firstName} ${user.lastName} je odbijen i obrisan`);
      
      res.json({ 
        message: 'Korisnik odbijen i obrisan iz sistema',
        deletedUser: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    }

  } catch (error) {
    console.error('❌ Greška pri verifikaciji:', error);
    res.status(500).json({ message: 'Greška pri verifikaciji', error: error.message });
  }
});

// DELETE /api/admin/delete-user/:userId - Obriši korisnika
router.delete('/delete-user/:userId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    // Ne dozvoli brisanje admina
    if (user.role === 'Admin') {
      return res.status(403).json({ message: 'Ne možete obrisati administratora' });
    }

    await User.findByIdAndDelete(userId);
    
    console.log(`🗑️ Korisnik obrisan: ${user.firstName} ${user.lastName}`);
    
    res.json({ 
      message: 'Korisnik je uspešno obrisan',
      deletedUser: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Greška pri brisanju korisnika:', error);
    res.status(500).json({ message: 'Greška pri brisanju korisnika' });
  }
});

// POST /api/admin/add-user - Admin dodaje novog korisnika
router.post('/add-user', authMiddleware, isAdmin, upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, grade } = req.body;

    console.log('👤 Admin dodaje korisnika:', { firstName, lastName, email, role, grade });

    // Proveri da li email već postoji
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email je već registrovan' });
    }

    // Hash lozinku
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Uzmi sliku ako postoji
    const profileImage = req.file?.path || '';

    // Kreiraj korisnika - automatski verifikovan jer ga dodaje admin
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: role,
      grade: role === 'Dete' ? parseInt(grade) : (grade ? parseInt(grade) : 0),
      isVerified: true,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      profileImage: profileImage
    });

    console.log('✅ Korisnik kreiran:', newUser._id);

    res.status(201).json({
      message: 'Korisnik uspešno dodat',
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        grade: newUser.grade,
        isVerified: newUser.isVerified,
        profileImage: newUser.profileImage
      }
    });

  } catch (error) {
    console.error('❌ Greška pri dodavanju korisnika:', error);
    res.status(500).json({ error: 'Server greška pri dodavanju korisnika' });
  }
});

// ==========================================
// AKTIVNOSTI
// ==========================================

// GET /api/admin/activities - Vrati sve aktivnosti
router.get('/activities', authMiddleware, isAdmin, async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('createdBy', 'firstName lastName')
      .populate('enrolled', 'firstName lastName grade email')
      .sort({ createdAt: -1 });

    res.json(activities);
  } catch (error) {
    console.error('Greška pri učitavanju aktivnosti:', error);
    res.status(500).json({ message: 'Greška pri učitavanju aktivnosti' });
  }
});

// POST /api/admin/add-activity - Dodaj novu aktivnost
router.post('/add-activity', authMiddleware, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, instructor, day, time, location, capacity, price, ageMin, ageMax } = req.body;

    const image = req.file?.path || '';

    const activity = await Activity.create({
      title,
      description,
      category,
      instructor,
      schedule: {
        day,
        time
      },
      location,
      capacity: parseInt(capacity),
      price: parseInt(price),
      ageGroup: {
        min: parseInt(ageMin),
        max: parseInt(ageMax)
      },
      image,
      createdBy: req.user._id
    });

    console.log('✅ Aktivnost kreirana:', activity._id);

    res.status(201).json({
      message: 'Aktivnost uspešno dodata',
      activity
    });

  } catch (error) {
    console.error('❌ Greška pri dodavanju aktivnosti:', error);
    res.status(500).json({ error: 'Server greška' });
  }
});

// DELETE /api/admin/delete-activity/:activityId - Obriši aktivnost
router.delete('/delete-activity/:activityId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await Activity.findById(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: 'Aktivnost nije pronađena' });
    }

    await Activity.findByIdAndDelete(activityId);
    
    console.log(`🗑️ Aktivnost obrisana: ${activity.title}`);
    
    res.json({ 
      message: 'Aktivnost je uspešno obrisana',
      deletedActivity: {
        id: activity._id,
        title: activity.title
      }
    });

  } catch (error) {
    console.error('Greška pri brisanju aktivnosti:', error);
    res.status(500).json({ message: 'Greška pri brisanju aktivnosti' });
  }
});

// ==========================================
// PRIVATNI ČASOVI
// ==========================================

// GET /api/admin/professors - Vrati sve profesore
router.get('/professors', authMiddleware, isAdmin, async (req, res) => {
  try {
    const professors = await User.find({ 
      role: 'Profesor',
      isVerified: true 
    })
    .select('firstName lastName email')
    .sort({ firstName: 1 });

    res.json(professors);
  } catch (error) {
    console.error('❌ Error fetching professors:', error);
    res.status(500).json({ error: 'Greška pri učitavanju profesora' });
  }
});

// GET /api/admin/private-lessons - Vrati sve privatne časove
router.get('/private-lessons', authMiddleware, isAdmin, async (req, res) => {
  try {
    const lessons = await PrivateLesson.find()
      .populate('professor', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(lessons);
  } catch (error) {
    console.error('Greška pri učitavanju privatnih časova:', error);
    res.status(500).json({ message: 'Greška pri učitavanju privatnih časova' });
  }
});

// POST /api/admin/add-private-lesson - Dodaj novi privatni čas
router.post('/add-private-lesson', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { professorId, subject, description, grades, schedule, location, price, duration, contactPhone, contactEmail, experience } = req.body;

    const privateLesson = await PrivateLesson.create({
      professor: professorId,
      subject,
      description,
      grades: grades.map(g => parseInt(g)),
      schedule,
      location,
      price: parseInt(price),
      duration: parseInt(duration),
      contactPhone,
      contactEmail,
      experience,
      isVerified: true,
      verifiedBy: req.user._id,
      verifiedAt: new Date()
    });

    console.log('✅ Privatni čas kreiran:', privateLesson._id);

    res.status(201).json({
      message: 'Privatni čas uspešno dodat',
      privateLesson
    });

  } catch (error) {
    console.error('❌ Greška pri dodavanju privatnog časa:', error);
    res.status(500).json({ error: 'Server greška' });
  }
});

// DELETE /api/admin/delete-private-lesson/:lessonId - Obriši privatni čas
router.delete('/delete-private-lesson/:lessonId', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await PrivateLesson.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }

    await PrivateLesson.findByIdAndDelete(lessonId);
    
    console.log(`🗑️ Privatni čas obrisan: ${lesson.subject}`);
    
    res.json({ 
      message: 'Privatni čas je uspešno obrisan',
      deletedLesson: {
        id: lesson._id,
        subject: lesson.subject
      }
    });

  } catch (error) {
    console.error('Greška pri brisanju privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri brisanju privatnog časa' });
  }
});

// ==========================================
// STATISTIKA
// ==========================================

// GET /api/admin/stats - Statistika za admin
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalParents = await User.countDocuments({ role: 'Roditelj' });
    const totalChildren = await User.countDocuments({ role: 'Dete' });
    const verifiedChildren = await User.countDocuments({ role: 'Dete', isVerified: true });
    const pendingChildren = await User.countDocuments({ role: 'Dete', isVerified: false });

    res.json({
      totalUsers,
      totalParents,
      totalChildren,
      verifiedChildren,
      pendingChildren
    });
  } catch (error) {
    console.error('❌ Greška pri učitavanju statistike:', error);
    res.status(500).json({ message: 'Greška pri učitavanju', error: error.message });
  }
});

module.exports = router;