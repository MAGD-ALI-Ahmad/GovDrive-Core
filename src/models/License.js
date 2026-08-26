const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema(
  {
    licenseId: {
      type: Number,
      unique: true, // رقم الرخصة التسلسلي المميز
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // صاحب الرخصة
    },
    licenseClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LicenseClass",
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true, // تُحسب بناءً على مدة الصلاحية الخاصة بالفئة
    },
    paidFees: {
      type: Number,
      required: true, // الرسوم المدفوعة عند إصدار الرخصة
    },
    notes: {
      type: String,
      default: "", // شروط الرخصة أو ملاحظات طبية (مثل: يجب ارتداء نظارة)
    },
    issueReason: {
      type: String,
      enum: ["New", "Renew", "ReplacementForLost", "ReplacementForDamaged"],
      default: "New",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDetained: {
      type: Boolean,
      default: false, // لخدمة حجز الرخص
    },
  },
  { timestamps: true },
);

// توليد رقم رخصة تسلسلي تلقائي
licenseSchema.pre("save", async function () {
  if (!this.licenseId) {
    const lastLicense = await this.constructor
      .findOne()
      .sort({ licenseId: -1 });
    this.licenseId =
      lastLicense && lastLicense.licenseId ? lastLicense.licenseId + 1 : 5000;
  }
  // تم إزالة next() تماماً
});

const License = mongoose.model("License", licenseSchema);
module.exports = License;
