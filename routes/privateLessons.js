const express = require('express');
const router = express.Router();
const PrivateLesson = require('../models/PrivateLesson');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET /api/private-lessons - Dobavi sve verifikovane privatne časove
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { subject, grade, minPrice, maxPrice } = req.query;
    
    // Kreiraj filter objekat
    let filter = { isVerified: true, isActive: true };
    
    if (subject) {
      filter.subject = subject;
    }
    
    if (grade) {
      filter.grades = parseInt(grade);
    }
    
    const lessons = await PrivateLesson.find(filter)
      .populate('professor', 'firstName lastName email')
      .populate('reviews.user', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Filtriraj po ceni ako je potrebno
    let filteredLessons = lessons;
    if (minPrice || maxPrice) {
      filteredLessons = lessons.filter(lesson => {
        if (minPrice && lesson.price < parseInt(minPrice)) return false;
        if (maxPrice && lesson.price > parseInt(maxPrice)) return false;
        return true;
      });
    }
    
    res.json(filteredLessons);
  } catch (error) {
    console.error('Greška pri dobavljanju privatnih časova:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju privatnih časova' });
  }
});

// GET /api/private-lessons/:id - Dobavi pojedinačan privatni čas
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const lesson = await PrivateLesson.findById(req.params.id)
      .populate('professor', 'firstName lastName email profileImage')
      .populate('reviews.user', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName');
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }
    
    res.json(lesson);
  } catch (error) {
    console.error('Greška pri dobavljanju privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju privatnog časa' });
  }
});

// POST /api/private-lessons - Kreiraj novi privatni čas
router.post('/', authMiddleware, async (req, res) => {
  try {
    const lessonData = {
      ...req.body,
      professor: req.user._id,
      isVerified: false, // Mora biti verifikovan od strane admina
      isActive: true
    };
    
    const lesson = new PrivateLesson(lessonData);
    await lesson.save();
    
    res.status(201).json({ 
      message: 'Zahtev za privatni čas je poslat. Čeka se verifikacija od strane admina.',
      lesson 
    });
  } catch (error) {
    console.error('Greška pri kreiranju privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri kreiranju privatnog časa' });
  }
});

// PUT /api/private-lessons/:id - Ažuriraj privatni čas
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const lesson = await PrivateLesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }
    
    // Proveri da li je korisnik profesor ovog časa ili admin
    if (lesson.professor.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Nemate dozvolu da ažurirate ovaj čas' });
    }
    
    // Ako profesor menja čas, mora biti ponovo verifikovan
    if (lesson.professor.toString() === req.user._id.toString()) {
      req.body.isVerified = false;
    }
    
    const updatedLesson = await PrivateLesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({ 
      message: 'Privatni čas je uspešno ažuriran',
      lesson: updatedLesson 
    });
  } catch (error) {
    console.error('Greška pri ažuriranju privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju privatnog časa' });
  }
});

// DELETE /api/private-lessons/:id - Obriši privatni čas
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const lesson = await PrivateLesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }
    
    // Proveri da li je korisnik profesor ovog časa ili admin
    if (lesson.professor.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Nemate dozvolu da obrišete ovaj čas' });
    }
    
    await PrivateLesson.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Privatni čas je uspešno obrisan' });
  } catch (error) {
    console.error('Greška pri brisanju privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri brisanju privatnog časa' });
  }
});

// POST /api/private-lessons/:id/verify - Verifikuj privatni čas (samo Admin)
router.post('/:id/verify', authMiddleware, authMiddleware.requireAdmin, async (req, res) => {
  try {
    const lesson = await PrivateLesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }
    
    lesson.isVerified = true;
    lesson.verifiedBy = req.user._id;
    lesson.verifiedAt = new Date();
    lesson.rejectionReason = '';
    
    await lesson.save();
    
    res.json({ 
      message: 'Privatni čas je uspešno verifikovan',
      lesson 
    });
  } catch (error) {
    console.error('Greška pri verifikaciji privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri verifikaciji privatnog časa' });
  }
});

// POST /api/private-lessons/:id/reject - Odbij privatni čas (samo Admin)
router.post('/:id/reject', authMiddleware, authMiddleware.requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Razlog odbijanja je obavezan' });
    }
    
    const lesson = await PrivateLesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }
    
    lesson.isVerified = false;
    lesson.isActive = false;
    lesson.rejectionReason = reason;
    
    await lesson.save();
    
    res.json({ 
      message: 'Privatni čas je odbijen',
      lesson 
    });
  } catch (error) {
    console.error('Greška pri odbijanju privatnog časa:', error);
    res.status(500).json({ message: 'Greška pri odbijanju privatnog časa' });
  }
});

// POST /api/private-lessons/:id/review - Dodaj recenziju
router.post('/:id/review', authMiddleware, authMiddleware.requireParent, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Ocena mora biti između 1 i 5' });
    }
    
    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({ message: 'Komentar mora imati najmanje 10 karaktera' });
    }
    
    const lesson = await PrivateLesson.findById(req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Privatni čas nije pronađen' });
    }
    
    // Proveri da li je korisnik već ostavio recenziju
    const existingReview = lesson.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );
    
    if (existingReview) {
      return res.status(400).json({ message: 'Već ste ostavili recenziju za ovaj čas' });
    }
    
    // Dodaj recenziju
    lesson.reviews.push({
      user: req.user._id,
      rating: parseInt(rating),
      comment: comment.trim()
    });
    
    await lesson.save();
    
    // Vrati ažurirani čas sa populisanim recenzijama
    const updatedLesson = await PrivateLesson.findById(req.params.id)
      .populate('reviews.user', 'firstName lastName');
    
    res.json({ 
      message: 'Recenzija je uspešno dodata',
      lesson: updatedLesson 
    });
  } catch (error) {
    console.error('Greška pri dodavanju recenzije:', error);
    res.status(500).json({ message: 'Greška pri dodavanju recenzije' });
  }
});

// GET /api/private-lessons/professor/:professorId - Dobavi časove određenog profesora
router.get('/professor/:professorId', authMiddleware, async (req, res) => {
  try {
    const lessons = await PrivateLesson.find({ 
      professor: req.params.professorId,
      isActive: true 
    })
      .populate('professor', 'firstName lastName email')
      .populate('reviews.user', 'firstName lastName');
    
    res.json(lessons);
  } catch (error) {
    console.error('Greška pri dobavljanju časova profesora:', error);
    res.status(500).json({ message: 'Greška pri dobavljanju časova profesora' });
  }
});

module.exports = router;