const LicenseClass = require("../models/LicenseClass");
class LicenseClassController {
  getallLicenseClasses = async (req, res) => {
    const allLicenseClasses = await LicenseClass.find();
    if (!allLicenseClasses) {
      return res.status(404).json({ message: "No License Classes found" });
    }
    res.status(200).json({
      message: " This All License Class ",
      data: allLicenseClasses,
    });
  };
  addLicenseClass = async (req, res) => {
    const {
      className,
      classDescription,
      minimumAllowedAge,
      validityLength,
      classFees,
    } = req.body;
    if (
      !className ||
      !classDescription ||
      !minimumAllowedAge ||
      !validityLength ||
      !classFees
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const newLicenseClass = await LicenseClass.create({
      className,
      classDescription,
      minimumAllowedAge,
      validityLength,
      classFees,
    });
    res.status(201).json({
      message: "License Class added successfully",
      data: newLicenseClass,
    });
  };
  UpdateLicenseClass = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data provided for update" });
    }

    const updatedLicenseClass = await LicenseClass.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );
    if (!updatedLicenseClass) {
      return res.status(404).json({ message: "License Class not found" });
    }
    res.status(200).json({
      message: "License Class updated successfully",
      data: updatedLicenseClass,
    });
  };
}
module.exports = new LicenseClassController();
