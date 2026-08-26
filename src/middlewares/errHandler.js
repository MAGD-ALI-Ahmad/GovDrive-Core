/*const errHandler = (err, req, res, next) => {
  console.error("🚨 Error details:", err.message || err);

  return res.status(500).json({
    message: "Internal Server Error",
    error: err.message, // اختياري: لكي تظهر لك تفاصيل المشكلة مباشرة في Postman أثناء البرمجة
  });
};
module.exports = errHandler;
*/

const errHandler = (err, req, res, next) => {
  // 🎯 التعديل السحري: طباعة err.stack لمعرفة اسم الملف والسطر الذي فجّر السيرفر
  console.error("🚨 Full Error Stack:", err.stack || err);

  return res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
};
module.exports = errHandler;
