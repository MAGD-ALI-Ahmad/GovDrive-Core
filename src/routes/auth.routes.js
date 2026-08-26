const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const asyncHandler = require("../utils/asyncHandler");
const auth = require("../middlewares/auth");
const { limiterLogin, limiter } = require("../middlewares/limiter");
const {
  validateUserRegistration,
  loginValidation,
} = require("../validations/auth.validate");

router.post(
  "/signup",
  [validateUserRegistration, limiter],
  asyncHandler(authController.signup),
);

router.post(
  "/login",
  [loginValidation, limiterLogin],
  asyncHandler(authController.login),
);
router.put("/refresh_Token", asyncHandler(authController.refreshToken));

router.post("/logout", auth, asyncHandler(authController.logout));

router.get("/profile", auth, asyncHandler(authController.Profile));

module.exports = router;
