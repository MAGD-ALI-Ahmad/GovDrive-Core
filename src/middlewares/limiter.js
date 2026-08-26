const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // حد عام ضخم جداً
  message: "Too many requests from this IP, please try again later",
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // السماح بـ 10,000 محاولة تسجيل دخول قبل أي حظر
  message: "Too many login attempts, please try again later",
});

module.exports = {
  limiter,
  limiterLogin,
};
