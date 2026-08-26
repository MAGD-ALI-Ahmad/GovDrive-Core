const express = require("express");
const router = express.Router();
const LicenseController = require("../controllers/License.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");
router.get(
  "/my-licenses",
  [auth, roleMiddleware(["customer", "admin", "employee"])],
  asyncHandler(LicenseController.getMyLicenses),
);
router.get(
  "/",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(LicenseController.getAllLicenses),
);
router.get(
  "/:id",
  [auth, roleMiddleware(["admin", "employee", "customer"])],
  asyncHandler(LicenseController.getLicenseById),
);
router.patch(
  "/:id/status",
  [auth, roleMiddleware(["admin", "employee"])],
  asyncHandler(LicenseController.updateLicenseStatus),
);
module.exports = router;
