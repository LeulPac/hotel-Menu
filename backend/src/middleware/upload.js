require('dotenv').config();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Configure Cloudinary SDK using your .env credentials
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key:    (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  secure:     true,
});

// Ensure local uploads directory exists for fallback (not applicable on Vercel — read-only filesystem)
const uploadDir = path.join(__dirname, '../../public/uploads');
try {
  if (!process.env.VERCEL && !process.env.NOW_REGION && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ Could not create uploads directory (read-only filesystem):', e.message);
}

// Memory storage for direct processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Helper function to upload to Cloudinary with local disk fallback
async function uploadImage(file) {
  const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );

  if (isCloudinaryConfigured) {
    try {
      const secureUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      });
      return secureUrl;
    } catch (cloudErr) {
      console.warn('⚠️ Cloudinary upload returned an error (403/Forbidden). Saving image to local disk /uploads as fallback:', cloudErr.message);
    }
  }

  // Fallback: Save buffer to local disk (dev only — Vercel filesystem is read-only)
  if (process.env.VERCEL || process.env.NOW_REGION) {
    console.warn('⚠️ No Cloudinary config and running on Vercel — cannot save image locally.');
    return null;
  }
  const ext = path.extname(file.originalname) || '.jpg';
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${uniqueName}`;
}

module.exports = {
  upload,
  uploadImage,
};
