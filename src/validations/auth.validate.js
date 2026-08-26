const { body } = require("express-validator");
const validate = require("../middlewares/Validator");

const validateUserRegistration = [
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Full name must be between 3-100 characters"),

  body("nationalNumber")
    .notEmpty()
    .withMessage("National number is required")
    .isString()
    .withMessage("National number must be a valid string"),

  body("email").isEmail().withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 8 })
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 8 characters and contain uppercase, lowercase, number, and symbol",
    ),

  body("birthDate")
    .notEmpty()
    .withMessage("Birth date is required")
    .isISO8601()
    .withMessage("Birth date must be a valid date format (YYYY-MM-DD)"),

  body("phone").notEmpty().withMessage("Phone number is required"),

  body("address").notEmpty().withMessage("Address is required"),

  body("nationality")
    .optional()
    .isString()
    .withMessage("Nationality must be a string"),

  body("role")
    .optional() // اختياري لأن الموديل يعطي قيمة افتراضية "customer"
    .isIn(["customer", "employee", "admin"])
    .withMessage("Role must be either 'customer', 'employee', or 'admin'"),

  validate,
];

const loginValidation = [
  body("email").isEmail().withMessage("Please provide a valid email"),

  body("password").isString().notEmpty().withMessage("Password is required"),

  validate,
];

module.exports = {
  validateUserRegistration,
  loginValidation,
};
