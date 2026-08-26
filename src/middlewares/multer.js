const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/";
    if (file.mimetype.startsWith("image/")) {
      folder += "images/";
    } else if (file.mimetype.startsWith("application/")) {
      folder += "documents/";
    } else {
      folder += "others/";
    }
    // Create folder if it doesn't exist
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9); // 1023u023u4023u94
    const fileExtension = path.extname(file.originalname); // image.png => png
    const baseName = path.basename(file.originalname, fileExtension); // image.png => image
    const safeFileName = baseName.replace(/[^a-zA-Z0-9]/g, "_"); // A => _

    cb(null, safeFileName + "-" + uniqueSuffix + fileExtension); // image-1023u023u4023u94.png
  },
});
const uploadLocal = multer({
  storage,
  // fileFilter,
  limits: {
    files: 2,
    fileSize: 5 * 1024 * 1024,
  }, // الحد الأقصى لحجم الملف: 5 ميغابايت
});

module.exports = {
  uploadLocal,
};
