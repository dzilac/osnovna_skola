const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'profileImages',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 600, height: 600, crop: 'limit' }],
  },
});

const upload = multer({ storage });

module.exports = upload;
