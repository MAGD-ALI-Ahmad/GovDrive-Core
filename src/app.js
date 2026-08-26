require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookies = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
const path = require("path");

const notFoundHandler = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errHandler");
const xss = require("./middlewares/xss");
// const { limiter } = require("./middlewares/limiter");
const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookies());
app.use(hpp());
app.use(xss);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'"],
      },
    },
  }),
);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/v1/health", (_req, res) =>
  res
    .status(200)
    .json({ success: true, message: "MAGD MARKET API is healthy ✅" }),
);
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/uploads", require("./routes/uploads.route"));
app.use("/api/v1/LicenseClasses", require("./routes/LicenseClass.routes"));
app.use("/api/v1/Applications", require("./routes/Application.routes"));
app.use("/api/v1/licenses", require("./routes/License.routes"));
app.use(
  "/api/v1/detained-licenses",
  require("./routes/DetainedLicense.routes"),
);
app.use(notFoundHandler);
app.use(errorHandler);
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log("═══════════════════════════════════════════════");
      console.log(`  MongoDB connected`);
      console.log(`  Server running on port ${PORT}`);
      console.log(`  Open: http://localhost:${PORT}`);
      console.log("═══════════════════════════════════════════════");
    });
  })
  .catch((err) => {
    console.error("  MongoDB connection failed:", err.message);
    process.exit(1);
  });
