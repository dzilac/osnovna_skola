const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware za proveru da li je korisnik roditelj
const isParent = (req, res, next) => {
  console.log('🔍 Proveravam role:', req.user.role);
  if (req.user.role !== 'Roditelj') {
    return res.status(403).json({ message: 'Pristup dozvoljen samo roditeljima' });
  }
  next();
};

// GET - Dobavi svu decu roditelja
router.get('/my-children', authMiddleware, isParent, async (req, res) => {
  try {
    console.log('👤 Parent ID:', req.user._id);
    console.log('📧 Parent email:', req.user.email);
    
    const children = await User.find({
      parentId: req.user._id,
      role: 'Dete'
    }).select('-password');
    
    console.log('👶 Pronađena deca:', children.length);
    console.log('👶 Deca:', children);
    
    res.json(children);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ message: 'Greška pri učitavanju dece', error: error.message });
  }
});

// GET - Dobavi detalje o jednom detetu sa svim rezultatima kvizova
router.get('/child/:childId', authMiddleware, isParent, async (req, res) => {
  try {
    console.log('🔍 Tražim dete ID:', req.params.childId);
    console.log('👤 Parent ID:', req.user._id);
    
    const child = await User.findOne({
      _id: req.params.childId,
      parentId: req.user._id,
      role: 'Dete'
    })
    .select('-password')
    .populate('completedQuizzes.quizId', 'title subject grade');

    if (!child) {
      console.log('❌ Dete nije pronađeno');
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }

    console.log('✅ Dete pronađeno:', child.firstName);
    res.json(child);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ message: 'Greška pri učitavanju deteta', error: error.message });
  }
});

// GET - Dobavi rezultate kvizova za dete
router.get('/child/:childId/quizzes', authMiddleware, isParent, async (req, res) => {
  try {
    const child = await User.findOne({
      _id: req.params.childId,
      parentId: req.user._id,
      role: 'Dete'
    })
    .select('completedQuizzes firstName lastName')
    .populate('completedQuizzes.quizId', 'title subject grade maxScore');

    if (!child) {
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }

    res.json({
      childName: `${child.firstName} ${child.lastName}`,
      quizzes: child.completedQuizzes
    });
  } catch (error) {
    res.status(500).json({ message: 'Greška pri učitavanju rezultata', error: error.message });
  }
});

module.exports = router;