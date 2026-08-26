const express = require("express");
const router = express.Router();
const DetainedLicenseController = require("../controllers/DetainedLicense.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");

// جلب كل الرخص المحجوزة (أدمن وموظف)
router.get(
  "/",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(DetainedLicenseController.getAllDetainedLicenses),
);

// حجز رخصة (أدمن وموظف)
router.post(
  "/:licenseId/detain",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(DetainedLicenseController.detainLicense),
);

// فك حجز رخصة (أدمن وموظف)
router.patch(
  "/:licenseId/release",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(DetainedLicenseController.releaseLicense),
);

module.exports = router;
