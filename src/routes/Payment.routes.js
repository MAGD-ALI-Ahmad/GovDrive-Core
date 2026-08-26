const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/Payment.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");
router.post("/", auth, paymentController.createPayment);
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
  roleMiddleware(["Employee", "Admin"]),
  paymentController.verifyPaymentByEmployee,
);

module.exports = router;
