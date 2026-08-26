const mongoose = require("mongoose");

const detainedLicenseSchema = new mongoose.Schema(
  {
    licenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "License",
      required: true,
      unique: true, // الرخصة لا يمكن حجزها مرتين في نفس الوقت
    },
    detainDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    fineFees: {
      type: Number,
      required: true, // قيمة غرامة الحجز
    },
    createdByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // الموظف الذي قام بالحجز
    },
    isReleased: {
      type: Boolean,
      default: false, // هل تم فك الحجز؟
    },
    releaseDate: {
      type: Date,
    },
    releasedByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الموظف الذي فك الحجز
    },
    releaseApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application", // طلب فك الحجز إن وجد
    },
  },
  { timestamps: true },
);

const DetainedLicense = mongoose.model(
  "DetainedLicense",
  detainedLicenseSchema,
);
module.exports = DetainedLicense;
