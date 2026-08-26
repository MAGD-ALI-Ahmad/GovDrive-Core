const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    applicantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationType: {
      type: String,
      enum: [
        "NEW_LICENSE",
        "RENEW_LICENSE",
        "REPLACEMENT_FOR_LOST", // تعديلها لتوحيد الأسماء مع الكونترولر
        "REPLACEMENT_FOR_DAMAGED", // تعديلها لتوحيد الأسماء مع الكونترولر
        "INTERNATIONAL_LICENSE",
        "RELEASE_DETAINED_LICENSE",
      ],
      required: true,
    },
    applicationStatus: {
      type: String,
      enum: ["New", "Cancelled", "Completed"],
      default: "New",
    },
    paidFees: {
      type: Number,
      required: true, // رسوم الطلب الأساسية (عادة 5 دولار حسب الوثيقة)
    },
    licenseClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LicenseClass",
      default: null, // مطلوب فقط في حال كان الطلب إصدار رخصة جديدة
    },
    createdByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الموظف الذي قام بإنشاء الطلب أو مراجعته
    },
  },
  { timestamps: true },
);

// توليد رقم طلب تسلسلي بسيط قبل الحفظ (اختياري احترافي)
// applicationSchema.pre("save", async function (next) {
//   if (!this.applicationId) {
//     const lastApp = await this.constructor
//       .findOne()
//       .sort({ applicationId: -1 });
//     this.applicationId =
//       lastApp && lastApp.applicationId ? lastApp.applicationId + 1 : 1000;
//   }
//   next();
// });
applicationSchema.index({ applicantUserId: 1 });
applicationSchema.index({ applicationStatus: 1 });
const Application = mongoose.model("Application", applicationSchema);
module.exports = Application;
