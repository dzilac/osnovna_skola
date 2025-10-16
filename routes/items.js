const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const upload = require('../middleware/upload');

// GET /api/items - Svi oglasi
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('GET /items error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/items - Dodaj oglas
router.post('/', upload.single('image'), async (req, res) => {
  try {

    let imageUrl = null;

    if (req.file) {
      imageUrl = req.file.path;
    }

    const itemData = {
      kind: req.body.kind,
      title: req.body.title,
      description: req.body.description || '',
      location: req.body.location || '',
      when: req.body.when || new Date(),
      postedBy: req.body.postedBy,
      images: imageUrl ? [imageUrl] : []
    };


    const item = await Item.create(itemData);
    
    res.status(201).json(item);
    
  } catch (error) {
    console.error('❌ POST /items error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    
    const item = await Item.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Oglas nije pronađen' });
    }
    
    res.json({ message: 'Oglas je obrisan' });
    
  } catch (error) {
    console.error('❌ DELETE error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;