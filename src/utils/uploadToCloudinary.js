require("dotenv").config();
const fs = require("fs");
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY_CLOUD,
  api_secret: process.env.API_SECRET_CLOUD,
});

const uploadToCloudinary = async (file) => {
  try {
    const filePath = __dirname + `/tmp/${file.originalname}`;

    // 🎯 السطر السحري: تحقق إذا كان المجلد غير موجود، قم بإنشائه تلقائياً
    if (!fs.existsSync(__dirname + "/tmp")) {
      fs.mkdirSync(__dirname + "/tmp", { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer); // الآن لن تضرب هذه الدالة أبداً!

    const result = await cloudinary.v2.uploader.upload(filePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(filePath);
    return result.secure_url;
  } catch (error) {
    console.error("الخطأ الحقيقي الظاهر في الـ Terminal هو: ", error.message);
    return null;
  }
};

module.exports = uploadToCloudinary;

// user => my server => cloudinary
