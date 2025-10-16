const mongoose = require('mongoose');

const PrivateLessonSchema = new mongoose.Schema({
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  grades: [{
    type: Number,
    min: 1,
    max: 8
  }],
  schedule: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // u minutima
    default: 60
  },
  contactPhone: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    default: ''
  },
  certificates: [{
    type: String
  }],
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
  rejectionReason: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Virtual za prosečnu ocenu
PrivateLessonSchema.virtual('averageRating').get(function() {
  if (this.reviews.length === 0) return 0;
  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / this.reviews.length).toFixed(1);
});

PrivateLessonSchema.set('toJSON', { virtuals: true });
PrivateLessonSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PrivateLesson', PrivateLessonSchema);