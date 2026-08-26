const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null, // يُستخدم إذا كان الدفع خاص بفتح الطلب أو رسوم الرخصة
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAppointment",
      default: null, // يُستخدم إذا كان الدفع خاص برسوم حجز اختبار معين (مثل الإعادة)
    },
    amount: {
      type: Number,
      required: true, // قيمة الرسوم المدفوعة
    },
    paymentMethod: {
      type: String,
      enum: ["OnlineGateway", "Cash", "BankTransfer"],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true, // رقم العملية أو الإيصال القادم من بوابة الدفع أو البنك
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending", // بانتظار مراجعة واعتماد الموظف
    },
    verifiedByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الموظف الذي راجع واعتمد الدفع
      default: null,
    },
  },
  { timestamps: true },
);
paymentSchema.index({ userId: 1 });
paymentSchema.index({ applicationId: 1 });
const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
