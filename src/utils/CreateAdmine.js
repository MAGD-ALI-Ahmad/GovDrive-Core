require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/Users"); // عدل المسار حسب مكان ملف المودل لديك
const passwordservice = require("./utils/PasswordSrevice"); // عدل المسار حسب مكان خدمة التشفير لديك

const runSeeder = async () => {
  try {
    // 1. الاتصال بقاعدة البيانات مؤقتاً لتنفيذ المهمة
    console.log("⏳ Connecting to MongoDB for seeding...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(" Connected to MongoDB successfully.");

    // 2. التحقق مما إذا كان الأدمن موجوداً مسبقاً (عبر الإيميل أو الصلاحية)
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });

    if (adminExists) {
      console.log(" Admin account already exists. No action needed.");
      process.exit(0); // إيقاف السكريبت بنجاح
    }

    // 3. تشفير كلمة المرور القادمة من الـ .env
    const hashedPassword = await passwordservice.hashPassword(
      process.env.ADMIN_PASSWORD,
    );

    // 4. إنشاء حساب الأدمن بالبيانات الكاملة
    await User.create({
      nationalNumber: process.env.ADMIN_NATIONAL_NUMBER || "00000000000",
      fullName: process.env.ADMIN_FULL_NAME || "System Admin",
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      birthDate: new Date(process.env.ADMIN_BIRTH_DATE || "1990-01-01"),
      address: process.env.ADMIN_ADDRESS || "Main Branch",
      phone: process.env.ADMIN_PHONE || "0000000000",
      nationality: "Syrian",
      role: "admin",
      blocked: false,
    });

    console.log(" Default Admin account created successfully via Seeder!");
    process.exit(0); // إنهاء السكريبت بعد الانتهاء
  } catch (error) {
    console.error(" Error during admin seeding:", error.message);
    process.exit(1); // إنهاء السكريبت مع وجود خطأ
  }
};

// تشغيل الدالة فوراً عند تنفيذ الملف
runSeeder();
