const { body, param } = require("express-validator");
const validate = require("../middlewares/Validator");

const createApplicationValidation = [
  body("licenseType")
    .optional()
    .isIn(["NEW_LICENSE", "RENEWAL", "LOST_REPLACEMENT"])
    .withMessage("Invalid license type"),
  validate,
];

const applicationIdParamValidation = [
  param("applicationId")
    .isMongoId()
    .withMessage("Invalid application ID format"),
  validate,
];

const updateStatusValidation = [
  param("applicationId")
    .isMongoId()
    .withMessage("Invalid application ID format"),
  body("applicationStatus")
    .isIn(["Approved", "Completed", "Cancelled"])
    .withMessage("Invalid application status"),
  validate,
];

module.exports = {
  createApplicationValidation,
  applicationIdParamValidation,
  updateStatusValidation,
};
