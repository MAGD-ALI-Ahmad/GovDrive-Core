const { body, param } = require("express-validator");
const validate = require("../middlewares/Validator");

const createPaymentValidation = [
  body("applicationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid application ID format"),
  body("appointmentId")
    .optional()
    .isMongoId()
    .withMessage("Invalid appointment ID format"),
  body("amount").isNumeric().withMessage("Amount must be a number").notEmpty(),
  body("paymentMethod")
    .isIn(["OnlineGateway", "Cash", "BankTransfer"])
    .withMessage("Invalid payment method"),
  body("transactionId")
    .trim()
    .notEmpty()
    .withMessage("Transaction ID is required"),
  validate,
];

const verifyPaymentValidation = [
  param("paymentId").isMongoId().withMessage("Invalid payment ID format"),
  body("paymentStatus")
    .isIn(["Verified", "Rejected"])
    .withMessage("Payment status must be Verified or Rejected"),
  validate,
];

module.exports = {
  createPaymentValidation,
  verifyPaymentValidation,
};
