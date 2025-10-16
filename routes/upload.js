const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// [POST] /api/upload
router.post('/', upload.single('image'), (req, res) => {
  try {
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
