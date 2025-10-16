const mongoose = require("mongoose");

const QuizSchema = new mongoose.Schema({
  grade: { type: Number, required: true }, // 1–8
  subject: { type: String, enum: ["Matematika", "Srpski"], required: true },
  title: String, // npr. "Sabiranje i oduzimanje"
  description: String, // opis
  icon: String, // emoji ili putanja do ikonice
  questions: [
    {
      text: String,
      options: [String],
      correctAnswer: Number, // index tačnog odgovora
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Quiz", QuizSchema);
