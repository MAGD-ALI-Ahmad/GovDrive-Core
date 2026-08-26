const express = require("express");
const router = express.Router();
const TestAppointmentController = require("../controllers/TestAppointment.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");

// 1. العميل يطلب حجز موعد (Pending)
router.post(
  "/request",
  [auth, roleMiddleware(["customer", "admin", "employee"])],
  asyncHandler(TestAppointmentController.requestAppointment),
);

// 2. الموظف يوافق أو يرفض الموعد (Confirmed / Cancelled)
router.patch(
  "/:appointmentId/review",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(TestAppointmentController.updateAppointmentStatusByEmployee),
);

// 3. الموظف يسجل النتيجة ويقفل الموعد
router.patch(
  "/:appointmentId/result",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(TestAppointmentController.updateTestResult),
);

// 4. جلب مواعيد طلب معين
router.get(
  "/application/:applicationId",
  [auth, roleMiddleware(["admin", "employee", "customer"])],
  asyncHandler(TestAppointmentController.getAppointmentsByApplication),
);

// عرض جميع المواعيد للموظفين (مع تصفية اختيارية)
router.get(
  "/employee/all",
  auth,
  roleMiddleware(["Employee", "Admin"]),
  testAppointmentController.getAppointmentsForEmployee,
);

// إلغاء موعد (للعميل أو الموظف بشروط Pending)
router.patch(
  "/:appointmentId/cancel",
  auth,
  testAppointmentController.cancelAppointment,
);

// تعديل موعد (إعادة جدولة للمتقدم طالما أنه Pending)
router.patch(
  "/:appointmentId/reschedule",
  auth,
  testAppointmentController.rescheduleAppointment,
);

module.exports = router;
