const mongoose = require("mongoose");

const testAppointmentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    testType: {
      type: String,
      enum: ["Vision", "Written", "Practical"],
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
    paidFees: {
      type: Number,
      required: true, // رسوم الفحص (نظر: 10، نظري: 20، عملي حسب الفئة)
    },
    result: {
      type: Boolean,
      default: null, // null يعني لم يتم إجراء الفحص بعد، true ناجح، false راسب
    },
    isLocked: {
      type: Boolean,
      default: false, // لمنع تحديد موعدين لنفس الفحص إذا كان بانتظار إعادته
    },
    createdByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الموظف الذي حدد الموعد
    },
  },
  { timestamps: true },
);
testAppointmentSchema.index({ applicationId: 1 });
testAppointmentSchema.index({ applicationId: 1, testType: 1 }); // فهرس مركب ممتاز للبحث عن فحص معين لطلب محدد
const TestAppointment = mongoose.model(
  "TestAppointment",
  testAppointmentSchema,
);
module.exports = TestAppointment;
