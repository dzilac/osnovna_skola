const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Umetnost', 'Sport', 'Nauka', 'Muzika', 'Tehnologija', 'Jezik', 'Ostalo'],
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  schedule: {
    day: {
      type: String,
      enum: ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'],
      required: true
    },
    time: {
      type: String,
      required: true
    }
  },
  location: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    default: 20
  },
  enrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  image: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    default: 0
  },
  ageGroup: {
    min: {
      type: Number,
      default: 6
    },
    max: {
      type: Number,
      default: 15
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);