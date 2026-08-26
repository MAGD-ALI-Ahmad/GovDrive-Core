const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestAppointment",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true, // قيمة الرسوم (مثلاً 5 للطلب + 10 للفحص)
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "CreditCard", "BankTransfer", "USDT"],
      default: "Cash",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending", // بانتظار تأكيد الأدمن/الموظف
    },
    transactionId: {
      type: String, // رقم العملية لو وُجد
    },
    verifiedByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الموظف الذي أكد عملية الدفع
    },
  },
  { timestamps: true },
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
