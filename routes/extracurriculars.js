const express = require("express");
const Extracurricular = require("../models/Extracurricular");

const router = express.Router();

// GET /api/vannastavne
router.get("/vannastavne", async (req, res) => {
  try {
    const activities = await Extracurricular.find();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/vannastavne/:id
router.get("/vannastavne/:id", async (req, res) => {
  try {
    const activity = await Extracurricular.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: "Aktivnost nije pronađena." });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/vannastavne
router.post("/vannastavne", async (req, res) => {
  try {
    const newActivity = new Extracurricular(req.body);
    await newActivity.save();
    res.status(201).json(newActivity);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
