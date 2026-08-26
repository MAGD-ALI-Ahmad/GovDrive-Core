const express = require("express");
const router = express.Router();
const LicenseClassController = require("../controllers/LicenseClass.controller");
const auth = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");
const roleMiddleware = require("../middlewares/role");
const { IDUserValidation } = require("../validations/users.validate");
router.get(
  "/",
  [auth],
  asyncHandler(LicenseClassController.getallLicenseClasses),
);
router.post(
  "/",
  [auth, roleMiddleware(["admin"])],
  asyncHandler(LicenseClassController.addLicenseClass),
);
router.put(
  "/:id",
  [auth, roleMiddleware(["admin"]), IDUserValidation],
  asyncHandler(LicenseClassController.UpdateLicenseClass),
);

module.exports = router;
