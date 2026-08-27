const User = require("../models/Users");
const cookiesService = require("../utils/cookiesService");
const passwordservice = require("../utils/PasswordSrevice");
const Jwt = require("../utils/jwtService"); // 🎯 استخدام المكتبة مباشرة لحل مشكلة الـ Secret Key نهائياً

class authContoller {
  handelFailedLogin = async (user) => {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.blocked = true;
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // قفل الحساب لمدة 30 دقيقة
    }
    await user.save();
  };
  resetFailedLogin = async (user) => {
    user.failedLoginAttempts = 0;
    user.blocked = false;
    user.lockedUntil = null;
    await user.save();
  };

  // 1️⃣ تسجيل مستخدم جديد
  signup = async (req, res) => {
    try {
      const {
        nationalNumber,
        fullName,
        email,
        password,
        birthDate,
        address,
        phone,
        nationality,
        photoPath,
        role,
      } = req.body;

      // التأكد من عدم تكرار الرقم الوطني أو الإيميل
      const userExists = await User.findOne({
        $or: [{ email }, { nationalNumber }],
      });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "البريد الإلكتروني أو الرقم الوطني مسجل بالفعل",
        });
      }

      const hashedPassword = await passwordservice.hashPassword(password);

      const user = await User.create({
        nationalNumber,
        fullName,
        email,
        password: hashedPassword,
        birthDate,
        address,
        phone,
        nationality: nationality || "Syrian",
        photoPath,
        role: role || "customer", // الافتراضي زبون/مواطن
      });

      // إخفاء الباسورد من الاستجابة
      const userObj = user.toObject();
      delete userObj.password;

      return res.status(201).json({
        success: true,
        status: "success",
        data: { user: userObj },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // 2️⃣ تسجيل الدخول
  // 2️⃣ تسجيل الدخول (الإصدار القياسي النظيف)
  login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "invalid data" });
    }
    if (user.blocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return res.status(403).json({
          success: false,
          message: "Account is temporarily locked. Please try again later.",
        });
      } else {
        // رفع الحظر إذا انتهت فترة القفل
        await this.resetFailedLogin(user);
      }
    }

    const isVerifed = await passwordservice.comparePassword(
      password,
      user.password,
    );
    if (!isVerifed) {
      await this.handelFailedLogin(user);
      return res.status(400).json({ success: false, message: "invalid data" });
    }

    await this.resetFailedLogin(user);

    const userObj = user.toObject();
    delete userObj.password;

    // 🎯 العودة للأسلوب الأصلي: توقيع التوكن عبر الـ Service الموحدة للتأسك
    const token = Jwt.generateAccessToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = Jwt.generateRefreshToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // حفظ التوكن في الكوكيز
    cookiesService.setAccessToken(res, token);
    cookiesService.setRefreshToken(res, refreshToken);

    return res.status(200).json({
      success: true,
      data: { role: userObj.role },
    });
  };
  refreshToken = async (req, res) => {
    const refreshToken = cookiesService.getRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh Token Required" });
    }

    const decoded = Jwt.verifyRefreshToken(refreshToken);

    const data = {
      _id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    const token = Jwt.generateAccessToken(data);
    const refToken = Jwt.generateRefreshToken(data);
    cookiesService.setAccessToken(res, token);
    cookiesService.setRefreshToken(res, refToken);

    res.status(200).json({ message: "Refreshed Token Successfully" });
  };
  // 3️⃣ تسجيل الخروج
  logout = async (req, res) => {
    cookiesService.clearTokenData(res);
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  };

  // 4️⃣ عرض الملف الشخصي
  Profile = async (req, res) => {
    // 🎯 حزام أمان: منع انهيار السيرفر إذا كان ميدل وير الـ auth لم يمرر البيانات
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized, please login" });
    }

    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  };
}

module.exports = new authContoller();
