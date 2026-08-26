const Payment = require("../models/Payment");
const Application = require("../models/Application");
const TestAppointment = require("../models/TestAppointment");

class PaymentController {
  createPayment = async (req, res) => {
    const {
      applicationId,
      appointmentId,
      amount,
      paymentMethod,
      transactionId,
    } = req.body;
    const userId = req.user.id;

    if (!amount || !paymentMethod || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Amount, payment method, and transaction ID are required.",
      });
    }

    // التأكد من عدم تكرار رقم العملية مسبقاً لمنع الاحتيال
    const existingTransaction = await Payment.findOne({ transactionId });
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "This transaction ID has already been used.",
      });
    }

    const payment = await Payment.create({
      userId,
      applicationId: applicationId || null,
      appointmentId: appointmentId || null,
      amount,
      paymentMethod,
      transactionId,
      paymentStatus: "Pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Payment submitted successfully and is pending employee verification.",
      data: payment,
    });
  };
  verifyPaymentByEmployee = async (req, res) => {
    const { paymentId } = req.params;
    const { paymentStatus } = req.body; // "Verified" أو "Rejected"
    const employeeId = req.user.id;

    if (!["Verified", "Rejected"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'Verified' or 'Rejected'.",
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found." });
    }

    if (payment.paymentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This payment has already been processed (${payment.paymentStatus}).`,
      });
    }

    payment.paymentStatus = paymentStatus;
    payment.verifiedByEmployeeId = employeeId;
    await payment.save();

    // 💡 التعديل هنا: إذا تم اعتماد الدفع وكان مرتبطاً بطلب أساسي (Application)
    if (paymentStatus === "Verified" && payment.applicationId) {
      const application = await Application.findById(payment.applicationId);
      if (application && application.applicationStatus === "New") {
        // نقوم بتحديث حالة الطلب ليصبح معتمداً وجاهزاً لمرحلة الامتحانات
        application.applicationStatus = "Approved"; // أو يمكن اعتماد اسم حالة يناسب نظامك مثل "In_Progress" أو "Paid"
        await application.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payment has been ${paymentStatus.toLowerCase()} successfully and application status updated.`,
      data: payment,
    });
  };
  getAllPaymentsForEmployee = async (req, res) => {
    const { status } = req.query;
    let filter = {};
    if (status) filter.paymentStatus = status;

    const payments = await Payment.find(filter)
      .populate("userId", "firstName lastName email phone")
      .sort({ createdAt: -1 });
    if (!payments) {
      return res.status(404).json({
        message: "not found",
      });
    }
    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  };
  getMyPayments = async (req, res) => {
    const userId = req.user.id;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    if (!payments) {
      return res.status(404).json({
        message: "not found",
      });
    }
    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  };
}
module.exports = new PaymentController();
