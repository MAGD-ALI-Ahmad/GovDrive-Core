const License = require("../models/License");
class LicenseController {
  getAllLicenses = async (req, res) => {
    const { search, isActive, isDetained } = req.query;
    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (isDetained !== undefined) {
      filter.isDetained = isDetained === "true";
    }

    const licenses = await License.find(filter)
      .populate("userId", "fullName nationalNumber email phone")
      .populate("licenseClassId")
      .populate("applicationId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: licenses.length,
      message: "Licenses retrieved successfully.",
      data: licenses,
    });
  };
  getLicenseById = async (req, res) => {
    const { licenseId } = req.params;
    const findLicense = await License.findById(licenseId);
    if (!findLicense) {
      return res.status(404).json({
        success: false,
        message: "License not found.",
      });
    }
    res.status(200).json({
      success: true,
      message: "License retrieved successfully.",
      data: findLicense,
    });
  };
  getMyLicenses = async (req, res) => {
    const userId = req.user.id;
    const userLicnse = await License.find({ userId })
      .populate("licenseClassId")
      .sort({ createdAt: -1 });
    if (!userLicnse) {
      return res.status(404).json({
        success: false,
        message: "You not have any Licnse",
      });
    }
    return res.status(200).json({
      success: true,
      count: userLicnse.length,
      message: "Your licenses retrieved successfully.",
      data: userLicnse,
    });
  };
  updateLicenseStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive, isDetained, notes } = req.body;

    const license = await License.findById(id);
    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found.",
      });
    }

    if (isActive !== undefined) license.isActive = isActive;
    if (isDetained !== undefined) license.isDetained = isDetained;
    if (notes !== undefined) license.notes = notes;

    await license.save();

    return res.status(200).json({
      success: true,
      message: "License updated successfully.",
      data: license,
    });
  };
}
module.exports = new LicenseController();
