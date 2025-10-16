const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  kind: { type: String, enum: ['LOST', 'FOUND'], required: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['open','claimed','returned'], default: 'open' },
  location: String,
  when: Date,
  images: [String],
  postedBy: String,  // za sada samo ime dok ne uvedemo User model
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
