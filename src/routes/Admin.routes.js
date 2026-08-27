const express = require("express");
const router = express.Router();
const adminController = require("../controllers/Admin.controller");
const authMiddleware = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const asyncHandler = require("../utils/asyncHandler");
router.get(
  "/dashboard/stats",
  authMiddleware,
  roleMiddleware(["Admin", "Employee"]),
  asyncHandler(adminController.getDashboardStats),
);

module.exports = router;
