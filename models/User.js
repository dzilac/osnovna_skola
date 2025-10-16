const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  profileImage: String,
  role: { 
    type: String, 
    enum: ["Roditelj", "Domar", "Dete", "Admin"],
    default: "Roditelj" 
  },
  grade: { 
    type: Number, 
    min: 0, 
    max: 8, 
    default: 0
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verificationNote: {
    type: String,
    default: ''
  },
  completedQuizzes: [
    {
      quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
      score: Number,
      maxScore: Number,
      completedAt: { type: Date, default: Date.now }
    }
  ],
  // NOVO: Lokacija (samo za decu)
  location: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    address: {
      type: String,
      default: ''
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  }
}, { timestamps: true });

// Virtual polje za proračun prosečnog rezultata
UserSchema.virtual('averageScore').get(function() {
  if (!this.completedQuizzes || !Array.isArray(this.completedQuizzes) || this.completedQuizzes.length === 0) {
    return 0;
  }
  const total = this.completedQuizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
  return (total / this.completedQuizzes.length).toFixed(2);
});

// Omogući virtuals u JSON output
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);