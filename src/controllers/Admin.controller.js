const User = require("../models/Users");
const Application = require("../models/Application");
const Payment = require("../models/Payment");
const TestAppointment = require("../models/TestAppointment");
class AdminController {
  getDashboardStats = async (req, res) => {
    const [
      totalUsers,
      pendingApplications,
      approvedApplications,
      completedLicenses,
      pendingPayments,
      verifiedPaymentsTotal,
      pendingAppointments,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Application.countDocuments({ applicationStatus: "New" }),
      Application.countDocuments({ applicationStatus: "Approved" }),
      Application.countDocuments({ applicationStatus: "Completed" }),
      Payment.countDocuments({ paymentStatus: "Pending" }),
      Payment.aggregate([
        { $match: { paymentStatus: "Verified" } },
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
      ]),
      TestAppointment.countDocuments({ appointmentStatus: "Pending" }),
    ]);

    // استخراج إجمالي المبالغ المالية المحققة
    const totalRevenue =
      verifiedPaymentsTotal.length > 0
        ? verifiedPaymentsTotal[0].totalRevenue
        : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        applications: {
          pending: pendingApplications,
          approved: approvedApplications,
          completed: completedLicenses,
        },
        payments: {
          pending: pendingPayments,
          totalRevenue,
        },
        appointments: {
          pendingRequests: pendingAppointments,
        },
      },
    });
  };
}
module.exports = new AdminController();
