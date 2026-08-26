const DetainedLicense = require("../models/DetainedLicense");
const License = require("../models/License");
class DetainedLicenseController {
  detainLicense = async (req, res) => {
    const { licenseId } = req.params;
    const { fineFees } = req.body;
    const employeeId = req.user._id;

    if (!fineFees) {
      return res
        .status(400)
        .json({ success: false, message: "Fine fees are required." });
    }

    // التأكد من أن الرخصة موجودة
    const license = await License.findById(licenseId);
    if (!license) {
      return res
        .status(404)
        .json({ success: false, message: "License not found." });
    }

    if (license.isDetained) {
      return res
        .status(400)
        .json({ success: false, message: "License is already detained." });
    }

    // إنشاء سجل الحجز
    const detainedRecord = await DetainedLicense.create({
      licenseId: license._id,
      fineFees,
      createdByEmployeeId: employeeId,
    });

    // تحديث حالة الرخصة لتصبح محجوزة
    license.isDetained = true;
    await license.save();

    return res.status(201).json({
      success: true,
      message: "License detained successfully.",
      data: detainedRecord,
    });
  };

  releaseLicense = async (req, res) => {
    const { licenseId } = req.params;
    const employeeId = req.user._id;

    const license = await License.findById(licenseId);
    if (!license) {
      return res
        .status(404)
        .json({ success: false, message: "License not found." });
    }

    if (!license.isDetained) {
      return res
        .status(400)
        .json({ success: false, message: "License is not detained." });
    }

    // البحث عن سجل الحجز النشط لهذه الرخصة
    const detainRecord = await DetainedLicense.findOne({
      licenseId: license._id,
      isReleased: false,
    });
    if (!detainRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Active detain record not found." });
    }

    // تحديث سجل الحجز
    detainRecord.isReleased = true;
    detainRecord.releaseDate = new Date();
    detainRecord.releasedByEmployeeId = employeeId;
    await detainRecord.save();

    // تحديث حالة الرخصة لتصبح غير محجوزة
    license.isDetained = false;
    await license.save();

    return res.status(200).json({
      success: true,
      message: "License released successfully.",
      data: detainRecord,
    });
  };
  getAllDetainedLicenses = async (req, res) => {
    const detainedLicenses = await DetainedLicense.find()
      .populate({
        path: "licenseId",
        populate: { path: "userId", select: "fullName nationalNumber phone" },
      })
      .populate("createdByEmployeeId", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: detainedLicenses.length,
      message: "Detained licenses retrieved successfully.",
      data: detainedLicenses,
    });
  };
}
module.exports = new DetainedLicenseController();
