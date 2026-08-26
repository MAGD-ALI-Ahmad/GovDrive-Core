const { body, param } = require("express-validator");
const validate = require("../middlewares/Validator");

const createAppointmentValidation = [
  body("applicationId")
    .isMongoId()
    .withMessage("Invalid application ID format"),
  body("testType")
    .isIn(["Vision", "Written", "Practical"])
    .withMessage("Test type must be Vision, Written, or Practical"),
  body("appointmentDate")
    .isISO8601()
    .withMessage("Appointment date must be a valid date format")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Appointment date must be in the future");
      }
      return true;
    }),
  validate,
];

const appointmentIdParamValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID format"),
  validate,
];

const updateResultValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID format"),
  body("result")
    .isBoolean()
    .withMessage("Result must be a boolean (true or false)"),
  validate,
];

module.exports = {
  createAppointmentValidation,
  appointmentIdParamValidation,
  updateResultValidation,
};
