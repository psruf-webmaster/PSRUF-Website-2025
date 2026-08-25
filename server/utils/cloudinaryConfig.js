// server/utils/cloudinaryConfig.js
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'psruf-uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar', '7z', 'bmp', 'tiff', 'svg', 'heic'], 
  },
});

const upload = multer({ storage: storage });

function getCloudinaryFileUrl(file) {
  if (!file) return '';
  return file.path || file.secure_url || file.url || '';
}

module.exports = { upload, storage, getCloudinaryFileUrl };