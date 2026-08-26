const express = require("express");
const router = express.Router();
const ApplicationController = require("../controllers/Application.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");
const {
  createApplicationValidation,
  applicationIdParamValidation,
  updateStatusValidation,
} = require("../validations/application.validator");
router.post(
  "/",
  [auth, roleMiddleware(["customer", "admin"]), createApplicationValidation], // يمكنك تعديل الأدوار حسب رغبتك
  asyncHandler(ApplicationController.createApplication),
);

router.get(
  "/",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(ApplicationController.getAllApplications), // ضع اسم الدالة لديك إن كانت مختلفة
);

router.get(
  "/:applicationId",
  [
    auth,
    roleMiddleware(["admin", "employee", "customer"]),
    applicationIdParamValidation,
  ],
  asyncHandler(ApplicationController.getApplicationById),
);
router.post(
  "/replacement",
  [auth, roleMiddleware(["customer", "admin", "employee"])],
  asyncHandler(ApplicationController.createReplacementApplication),
);
router.post(
  "/renew",
  [auth, roleMiddleware(["customer", "admin", "employee"])],
  asyncHandler(ApplicationController.createRenewalApplication),
);
router.put(
  "/:applicationId/status",
  [auth, roleMiddleware(["admin", "employee"]), updateStatusValidation],
  asyncHandler(ApplicationController.updateApplicationStatus),
);

router.patch(
  "/:applicationId/cancel",
  [auth, roleMiddleware(["admin", "employee", "customer"])], // حسب ما إذا كان السماح للمستخدم بإلغاء طلبه أو الموظف فقط
  asyncHandler(ApplicationController.cancelApplication),
);

// جلب تفاصيل الطلب مع رحلة الاختبارات والرخصة الكاملة
router.get(
  "/:applicationId/details",
  auth,
  ApplicationController.getApplicationDetailsWithJourney,
);

module.exports = router;
