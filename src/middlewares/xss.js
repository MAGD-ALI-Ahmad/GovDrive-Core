const xss = require("xss");

// دالة التطهير الممتازة الخاصة بك
const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return xss(input, {
      whiteList: {}, // مسح كافة وسوم الـ HTML والـ Script
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    }).trim();
  }
  return input;
};

// الـ Middleware المطور والآمن سيبرانياً وبنيوياً
const xssSanitize = (req, res, next) => {
  // 1. تطهير الـ Body (آمن دائماً لأن Express يتيح تعديله بالكامل)
  if (req.body && typeof req.body === "object") {
    Object.keys(req.body).forEach((key) => {
      req.body[key] = sanitizeInput(req.body[key]);
    });
  }

  // 2. 🛡️ تطهير الـ Query بأمان (تجنب الـ Getter/Setter الانهياري)
  if (req.query && typeof req.query === "object") {
    const sanitizedQuery = {};
    Object.keys(req.query).forEach((key) => {
      sanitizedQuery[key] = sanitizeInput(req.query[key]);
    });

    // استبدال الكائن القديم بكائن مطهر بالكامل بطريقة آمنة
    Object.defineProperty(req, "query", {
      value: sanitizedQuery,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  // 3. 🛡️ تطهير الـ Params بأمان
  if (req.params && typeof req.params === "object") {
    const sanitizedParams = {};
    Object.keys(req.params).forEach((key) => {
      sanitizedParams[key] = sanitizeInput(req.params[key]);
    });

    Object.defineProperty(req, "params", {
      value: sanitizedParams,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  next();
};

module.exports = xssSanitize;
