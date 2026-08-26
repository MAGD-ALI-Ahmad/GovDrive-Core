const mongoose = require("mongoose");

const licenseClassSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    classDescription: {
      type: String,
      required: true,
    },
    minimumAllowedAge: {
      type: Number,
      required: true,
    },
    validityLength: {
      type: Number, // عدد سنوات الصلاحية (مثلاً 5 أو 10 سنوات)
      required: true,
    },
    classFees: {
      type: Number, // رسوم الفئة بالدولار
      required: true,
    },
  },
  { timestamps: true },
);

const LicenseClass = mongoose.model("LicenseClass", licenseClassSchema);
module.exports = LicenseClass;
