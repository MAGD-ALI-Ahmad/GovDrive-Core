const Jwt = require("../utils/jwtService"); // 🎯 استخدام المكتبة مباشرة
const cookiesService = require("../utils/cookiesService");

const auth = (req, res, next) => {
  try {
    // 1. جلب التوكن من الكوكيز
    const token = cookiesService.getAccessToken(req);

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No token provided" });
    }

    // 2. 🎯 التحقق المباشر باستخدام نفس السيكرت كي لضمان المطابقة والتوافق
    const decoded = Jwt.verifyAccessToken(token);

    // 3. ربط البيانات المفكوكة بكائن الـ request
    req.user = { ...decoded };

    next();
  } catch (err) {
    // 🚨 إذا كان التوكن منتهي الصلاحية أو تم التلاعب به، يرجع 401 بدلاً من 500 ليكون الـ Response منطقياً
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

module.exports = auth;
