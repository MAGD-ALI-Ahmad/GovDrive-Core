const { body } = require("express-validator");
const validate = require("../middlewares/Validator");
const { param } = require("express-validator");
const IDUserValidation = [
  param("id").isMongoId().withMessage("Invalid user ID"),
  validate,
];

module.exports = {
  IDUserValidation,
};
