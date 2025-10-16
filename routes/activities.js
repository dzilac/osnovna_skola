// routes/activities.js
const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET /api/activities - Dobavi sve aktivne aktivnosti
router.get('/', authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find({ isActive: true })
      .populate('createdBy', 'firstName lastName')
      .populate('enrolled', 'firstName lastName grade')
      .sort({ createdAt: -1 });
    
    res.json(activities);
  } catch (error) {
    console.error('Greška pri dobavljanju aktivnosti:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju aktivnosti' });
  }
});

// GET /api/activities/:id - Dobavi pojedinačnu aktivnost
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('enrolled', 'firstName lastName grade');
    
    if (!activity) {
      return res.status(404).json({ message: 'Aktivnost nije pronađena' });
    }
    
    res.json(activity);
  } catch (error) {
    console.error('Greška pri dobavljanju aktivnosti:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju aktivnosti' });
  }
});

// POST /api/activities/:id/enroll - Prijavi dete na aktivnost
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const { childId } = req.body;
    const activityId = req.params.id;
    
    // Proveri da li je korisnik roditelj
    if (req.user.role !== 'Roditelj') {
      return res.status(403).json({ message: 'Samo roditelji mogu prijavljivati decu' });
    }
    
    // Pronađi aktivnost
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Aktivnost nije pronađena' });
    }
    
    // Proveri da li je aktivnost aktivna
    if (!activity.isActive) {
      return res.status(400).json({ message: 'Aktivnost nije dostupna' });
    }
    
    // Proveri kapacitet
    if (activity.enrolled.length >= activity.capacity) {
      return res.status(400).json({ message: 'Aktivnost je popunjena' });
    }
    
    // Pronađi dete
    const child = await User.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }
    
    // Proveri da li je korisnik zaista roditelj ovog deteta
    if (child.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Nemate dozvolu da prijavite ovo dete' });
    }
    
    // Proveri da li je dete već prijavljeno
    if (activity.enrolled.includes(childId)) {
      return res.status(400).json({ message: 'Dete je već prijavljeno na ovu aktivnost' });
    }
    
    // Proveri starosnu granicu
    const childAge = calculateAge(child.grade);
    if (childAge < activity.ageGroup.min || childAge > activity.ageGroup.max) {
      return res.status(400).json({ 
        message: `Ova aktivnost je namenjena deci uzrasta ${activity.ageGroup.min}-${activity.ageGroup.max} godina` 
      });
    }
    
    // Prijavi dete
    activity.enrolled.push(childId);
    await activity.save();
    
    console.log(`✅ Dete ${child.firstName} ${child.lastName} prijavljeno na aktivnost ${activity.title}`);
    
    res.json({ 
      message: 'Dete je uspešno prijavljeno na aktivnost',
      activity 
    });
  } catch (error) {
    console.error('Greška pri prijavi na aktivnost:', error);
    res.status(500).json({ message: 'Greška pri prijavi na aktivnost' });
  }
});

// POST /api/activities/:id/unenroll - Odjavi dete sa aktivnosti
router.post('/:id/unenroll', authMiddleware, async (req, res) => {
  try {
    const { childId } = req.body;
    const activityId = req.params.id;
    
    // Proveri da li je korisnik roditelj
    if (req.user.role !== 'Roditelj') {
      return res.status(403).json({ message: 'Samo roditelji mogu odjavljivati decu' });
    }
    
    // Pronađi aktivnost
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Aktivnost nije pronađena' });
    }
    
    // Pronađi dete
    const child = await User.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }
    
    // Proveri da li je korisnik zaista roditelj ovog deteta
    if (child.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Nemate dozvolu da odjavite ovo dete' });
    }
    
    // Proveri da li je dete uopšte prijavljeno
    if (!activity.enrolled.includes(childId)) {
      return res.status(400).json({ message: 'Dete nije prijavljeno na ovu aktivnost' });
    }
    
    // Odjavi dete
    activity.enrolled = activity.enrolled.filter(id => id.toString() !== childId);
    await activity.save();
    
    console.log(`❌ Dete ${child.firstName} ${child.lastName} odjavljeno sa aktivnosti ${activity.title}`);
    
    res.json({ 
      message: 'Dete je uspešno odjavljeno sa aktivnosti',
      activity 
    });
  } catch (error) {
    console.error('Greška pri odjavi sa aktivnosti:', error);
    res.status(500).json({ message: 'Greška pri odjavi sa aktivnosti' });
  }
});

// Pomoćna funkcija za kalkulaciju uzrasta na osnovu razreda
function calculateAge(grade) {
  // Aproksimacija: 1. razred = ~7 godina, 8. razred = ~14 godina
  return 6 + grade;
}

module.exports = router;