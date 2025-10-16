const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware za proveru da li je korisnik roditelj
const isParent = (req, res, next) => {
  if (req.user.role !== 'Roditelj') {
    return res.status(403).json({ message: 'Pristup dozvoljen samo roditeljima' });
  }
  next();
};

// POST - Generiši AI analizu za dete
router.post('/analyze-child/:childId', authMiddleware, isParent, async (req, res) => {
  try {
    console.log('🤖 Započinjem AI analizu...');

    // Pronađi dete
    const child = await User.findOne({
      _id: req.params.childId,
      parentId: req.user._id,
      role: 'Dete'
    })
    .select('-password')
    .populate('completedQuizzes.quizId', 'title subject grade questions');

    if (!child) {
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }

    console.log(`👶 Analiziram dete: ${child.firstName} ${child.lastName}`);

    // Pripremi podatke za AI
    const quizData = child.completedQuizzes.map(quiz => {
      const percentage = quiz.maxScore ? ((quiz.score / quiz.maxScore) * 100).toFixed(0) : 0;
      return {
        subject: quiz.quizId?.subject || 'Nepoznat predmet',
        title: quiz.quizId?.title || 'Nepoznat naslov',
        score: quiz.score,
        maxScore: quiz.maxScore,
        percentage: percentage,
        date: new Date(quiz.completedAt).toLocaleDateString('sr-RS')
      };
    });

    // Kreiraj prompt
    const prompt = `Analiziraj rezultate kvizova za učenika ${child.firstName} ${child.lastName} koji pohađa ${child.grade}. razred osnovne škole.

REZULTATI KVIZOVA:
${JSON.stringify(quizData, null, 2)}

Prosečan skor: ${child.averageScore}
Ukupno kvizova: ${child.completedQuizzes.length}

Molim te da napišeš detaljnu analizu koja sadrži:

1. **PREGLED PERFORMANSI** (2-3 rečenice)
   - Opšti utisak o napretku učenika

2. **JAKA PODRUČJA** 
   - Predmeti gde učenik postiže odlične rezultate (90%+)
   - Konkretni primeri

3. **PROSTOR ZA NAPREDAK**
   - Predmeti gde učenik može da se poboljša (<75%)
   - Specifične oblasti koje zahtevaju vežbanje

4. **PREPORUKE ZA RODITELJE** (3-4 konkretne stvari)
   - Kako mogu da pomognu detetu
   - Praktični saveti za učenje kod kuće

5. **MOTIVACIONA PORUKA ZA DETE**
   - Ohrabrujuća poruka direktno upućena učeniku
   - Fokus na napredak i potencijal

Piši na srpskom jeziku, toplo i ohrabrujuće. Koristi emojije gde je prikladno. Budi konkretan i specifičan u preporukama.`;

    console.log('📤 Šaljem prompt OpenRouter AI...');

    // Pozovi OpenRouter API (radi sa BILO KOJIM modelom!)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000', // Optional
        'X-Title': 'Osnovna Skola AI' // Optional
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', // Besplatni Gemini model!
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter greška:', errorText);
      throw new Error(`OpenRouter API greška: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('✅ AI analiza generisana uspešno!');
    console.log(`📊 Dužina analize: ${analysis.length} karaktera`);

    res.json({
      childName: `${child.firstName} ${child.lastName}`,
      grade: child.grade,
      totalQuizzes: child.completedQuizzes.length,
      averageScore: child.averageScore,
      analysis: analysis,
      quizData: quizData
    });

  } catch (error) {
    console.error('❌ Greška pri AI analizi:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Greška pri generisanju AI analize', 
      error: error.message,
      details: error.toString()
    });
  }
});

module.exports = router;