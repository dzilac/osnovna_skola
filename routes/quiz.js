const Quiz = require('../models/Quiz'); 
const express = require('express');
const router = express.Router();
const User = require("../models/User");
const mongoose = require('mongoose');

// 📌 Vrati sve kvizove za određeni razred
router.get("/kvizovi/:grade", async (req, res) => {
  try {
    const { grade } = req.params;
    const kvizovi = await Quiz.find({ grade });
    res.json(kvizovi);
  } catch (err) {
    console.error("Greška pri čitanju kvizova:", err);
    res.status(500).json({ error: "Greška pri čitanju kvizova" });
  }
});

// 📌 Vrati jedan kviz po ID-ju
router.get("/kviz/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Nevaljani ID" });
    }

    const kviz = await Quiz.findById(id);
    if (!kviz) {
      return res.status(404).json({ error: "Kviz nije pronađen" });
    }
    res.json(kviz);
  } catch (err) {
    console.error("Greška pri čitanju kviza:", err);
    res.status(500).json({ error: "Greška pri čitanju kviza" });
  }
});

// 📌 Vrati sve završene kvizove za korisnika
router.get("/user/:userId/completed", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Nevaljani ID korisnika" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Korisnik nije pronađen" });
    }

    res.json(user.completedQuizzes);
  } catch (err) {
    console.error("Greška pri čitanju završenih kvizova:", err);
    res.status(500).json({ error: "Greška pri čitanju" });
  }
});

// 📌 Submit kviza i snimi rezultat - ISPRAVLJENO
router.post("/kviz/:id/submit", async (req, res) => {
  try {
    const { userId, score } = req.body;
    const { id } = req.params;
    
    console.log("📥 Stiže rezultat: userId =", userId, ", kvizId =", id, ", score =", score);

    // Validacija
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Nevaljani ID" });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: "Nevaljana vrednost za score" });
    }

    // Pronađi korisnika
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Korisnik nije pronađen" });
    }

    // Pronađi kviz da bi dobio broj pitanja (maxScore)
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: "Kviz nije pronađen" });
    }

    const maxScore = quiz.questions.length; // ← OVO JE KLJUČNO!

    // Proveri da li je dete već radilo kviz
    const alreadyDone = user.completedQuizzes.some(
      (q) => q.quizId.toString() === id
    );

    if (alreadyDone) {
      return res.status(400).json({ error: "Dete je već uradilo ovaj kviz" });
    }

    // Dodaj u completedQuizzes SA maxScore
    user.completedQuizzes.push({ 
      quizId: id, 
      score: score,
      maxScore: maxScore,  // ← DODATO!
      completedAt: new Date()
    });
    
    await user.save();

    console.log(`✅ Rezultat snimljen! Score: ${score}/${maxScore} (${((score/maxScore)*100).toFixed(0)}%)`);
    
    res.json({ 
      message: "Kviz uspešno završen i snimljen", 
      score: score,
      maxScore: maxScore,
      percentage: ((score / maxScore) * 100).toFixed(2),
      completedQuizzes: user.completedQuizzes 
    });
  } catch (err) {
    console.error("Greška pri snimanju kviza:", err);
    res.status(500).json({ error: "Greška pri snimanju kviza" });
  }
});

module.exports = router;