const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/Payment.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");
const {
  createPaymentValidation,
  verifyPaymentValidation,
} = require("../validations/payment.validator");

router.post(
  "/",
  [auth, createPaymentValidation],
  paymentController.createPayment,
);
router.get("/my-payments", auth, paymentController.getMyPayments);

// للموظف/الأدمن: عرض كل المدفوعات وتأكيدها/رفضها
router.get(
  "/employee/all",
  auth,
  roleMiddleware(["Employee", "Admin"]),
  paymentController.getAllPaymentsForEmployee,
);
router.patch(
  "/employee/:paymentId/verify",
  auth,
  roleMiddleware(["Employee", "Admin"], verifyPaymentValidation),
  paymentController.verifyPaymentByEmployee,
);

module.exports = router;
