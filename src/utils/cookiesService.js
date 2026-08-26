const cookiesConfig = {
  httpOnly: true,
  maxAge: 15 * 60 * 1000, // 15 دقيقة للـ Access Token
  secure: false, // اتركه false طالما أنك تستخدم http عادي وليس https
  sameSite: "lax", // 🎯 التغيير إلى lax يسهل على Postman إرسال واستقبال الكوكيز محلياً
  path: "/", // 🎯 تحديد الـ path يضمن أن الكوكي متاحة لجميع المسارات بما فيها الـ refresh_Token
};
class cookiesService {
  clearData = (res, key) => {
    res.clearCookie(key);
  };

  setAccessToken = (res, value) => {
    res.cookie("Accesstoken", value, cookiesConfig);
  };

  setRefreshToken = (res, value) => {
    res.cookie("Refreshtoken", value, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: false,
      sameSite: "lax", // 🎯 مطابقة الـ sameSite
      path: "/", // 🎯 ضمان شمولية المسار
    });
  };
  getAccessToken = (req) => {
    return req.cookies["Accesstoken"];
  };

  getRefreshToken = (req) => {
    return req.cookies["Refreshtoken"];
  };
  clearTokenData = (res) => {
    this.clearData(res, "Accesstoken");
    this.clearData(res, "Refreshtoken");
  };
}
module.exports = new cookiesService();
