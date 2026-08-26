const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nationalNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    birthDate: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    nationality: {
      type: String,
      required: true,
      default: "Syrian", // أو حسب الدولة
    },
    photoPath: {
      type: String, // رابط أو مسار الصورة الشخصية
    },
    role: {
      type: String,
      enum: ["customer", "employee", "admin"],
      default: "customer",
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
module.exports = User;
