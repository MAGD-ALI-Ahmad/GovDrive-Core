const Application = require("../models/Application");
const LicenseClass = require("../models/LicenseClass");
const User = require("../models/Users");
const License = require("../models/License");
class ApplicationController {
  createApplication = async (req, res) => {
    const applicantUserId = req.user.id;
    const { applicationType, licenseClassId } = req.body;

    // 1. Validate basic required fields
    if (!applicationType) {
      cls;
      return res.status(400).json({
        success: false,
        message: "Application type is required.",
      });
    }

    // 2. Check if the user already has an active/pending application of the same type
    const existingActiveApp = await Application.findOne({
      applicantUserId,
      applicationType,
      applicationStatus: "New",
    });

    if (existingActiveApp) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending application of this type.",
      });
    }

    let licenseClass = null;
    let paidFees = 5; // Default application fee

    // 3. Specific validations for New License applications
    if (applicationType === "NEW_LICENSE") {
      if (!licenseClassId) {
        return res.status(400).json({
          success: false,
          message: "License class is required for new license applications.",
        });
      }

      licenseClass = await LicenseClass.findById(licenseClassId);
      if (!licenseClass) {
        return res.status(404).json({
          success: false,
          message: "License class not found.",
        });
      }

      // Set fees from the license class fees
      paidFees = licenseClass.classFees;

      // 4. Age Verification based on User's Date of Birth
      const user = await User.findById(applicantUserId);
      if (!user || !user.birthDate) {
        return res.status(400).json({
          success: false,
          message:
            "User date of birth is missing in profile, required for age verification.",
        });
      }

      const birthDate = new Date(user.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() - birthDate.getDate())) {
        age--;
      }

      if (age < licenseClass.minimumAllowedAge) {
        return res.status(400).json({
          success: false,
          message: `You do not meet the minimum age requirement for this license class. Required age is ${licenseClass.minimumAllowedAge}.`,
        });
      }
    }

    // 5. Create the application
    const newApplication = await Application.create({
      applicantUserId,
      applicationType,
      paidFees,
      licenseClassId: licenseClassId || null,
      applicationStatus: "New",
    });

    return res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: newApplication,
    });
  };
  getAllApplications = async (req, res) => {
    const { status, type, search } = req.query;
    let filter = {};

    // 1. فلترة حسب الحالة (إذا وجدت)
    if (status) {
      filter.applicationStatus = status;
    }

    // 2. فلترة حسب نوع الطلب (إذا وجد)
    if (type) {
      filter.applicationType = type;
    }

    // 3. فلترة بحث متقدم (بالاسم أو الرقم الوطني للمستخدم)
    if (search) {
      // نبحث أولاً عن المستخدمين الذين تتطابق بياناتهم مع نص البحث
      const matchedUsers = await User.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { nationalNumber: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = matchedUsers.map((user) => user._id);

      // ربط الطلبات بالـ المستخدمين المطابقين للبحث
      filter.applicantUserId = { $in: userIds };
    }

    // تنفيذ الاستعلام مع تطبيق الفلتر وربط الجداول (populate)
    const allApplications = await Application.find(filter)
      .populate("applicantUserId", "fullName nationalNumber email birthDate")
      .populate("licenseClassId")
      .sort({ createdAt: -1 }); // ترتيب من الأحدث للأقدم

    return res.status(200).json({
      success: true,
      count: allApplications.length,
      message: "Applications retrieved successfully.",
      data: allApplications,
    });
  };
  getApplicationById = async (req, res) => {
    const { applicationId } = req.params;
    const application = await Application.findById(applicationId)
      .populate("applicantUserId")
      .populate("licenseClassId");
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }
    res.status(200).json({
      success: true,
      message: "Application retrieved successfully.",
      data: application,
    });
  };
  updateApplicationStatus = async (req, res) => {
    const { applicationId } = req.params;
    const { applicationStatus } = req.body;
    const employeeId = req.user.id;

    // 1. Check if status is provided
    if (!applicationStatus) {
      return res.status(400).json({
        success: false,
        message: "Application status is required.",
      });
    }

    // 2. Validate if status is within allowed values
    const validStatuses = ["New", "Cancelled", "Completed"];
    if (!validStatuses.includes(applicationStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid application status. Valid statuses are: ${validStatuses.join(", ")}`,
      });
    }

    // 3. Find the application and populate license class to know validity period
    const application =
      await Application.findById(applicationId).populate("licenseClassId");
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    // 4. Workflow Rule: Prevent changing status if the application is already Completed or Cancelled
    if (
      application.applicationStatus === "Completed" ||
      application.applicationStatus === "Cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot modify an application that is already ${application.applicationStatus}.`,
      });
    }

    // 🛡️ 5. التحقق الصارم قبل جعل الطلب "Completed" في حال كان إصدار رخصة جديدة (NEW_LICENSE)
    if (
      applicationStatus === "Completed" &&
      application.applicationType === "NEW_LICENSE"
    ) {
      const requiredTests = ["Vision", "Written", "Practical"];

      for (const testType of requiredTests) {
        const passedTest = await TestAppointment.findOne({
          applicationId: application._id,
          testType: testType,
          result: true,
          isLocked: true,
        });

        if (!passedTest) {
          return res.status(400).json({
            success: false,
            message: `Cannot complete application: The applicant has not successfully passed the ${testType} test yet.`,
          });
        }
      }
    }

    // 6. Update the application status
    application.applicationStatus = applicationStatus;
    await application.save();

    let createdLicense = null;

    // 7. 🚀 الإصدار التلقائي للرخصة عند اكتمال الطلب (جديد، تجديد، أو بدل فاقد/تالف)
    if (
      applicationStatus === "Completed" &&
      [
        "NEW_LICENSE",
        "RENEW_LICENSE",
        "REPLACEMENT_FOR_LOST",
        "REPLACEMENT_FOR_DAMAGED",
      ].includes(application.applicationType)
    ) {
      // التأكد من وجود فئة الرخصة
      if (application.licenseClassId) {
        const licenseClass = application.licenseClassId;

        let issueDate = new Date();
        let expirationDate = new Date();
        let issueReason = "New";
        let notes = "Issued automatically upon application completion.";

        // أ) إذا كان إصدار جديد
        if (application.applicationType === "NEW_LICENSE") {
          const validityYears = licenseClass.defaultValidityLength || 5;
          expirationDate.setFullYear(issueDate.getFullYear() + validityYears);
          issueReason = "New";
        }
        // ب) إذا كان تجديد رخصة
        else if (application.applicationType === "RENEW_LICENSE") {
          const validityYears = licenseClass.defaultValidityLength || 5;
          expirationDate.setFullYear(issueDate.getFullYear() + validityYears);
          issueReason = "Renew";
          notes = "Renewed license automatically.";

          // إلغاء تفعيل الرخصة القديمة للتجديد
          await License.updateMany(
            {
              userId: application.applicantUserId,
              licenseClassId: licenseClass._id,
              isActive: true,
            },
            { isActive: false },
          );
        }
        // ج) إذا كان بدل فاقد أو تالف
        else if (
          application.applicationType === "REPLACEMENT_FOR_LOST" ||
          application.applicationType === "REPLACEMENT_FOR_DAMAGED"
        ) {
          issueReason =
            application.applicationType === "REPLACEMENT_FOR_LOST"
              ? "ReplacementForLost"
              : "ReplacementForDamaged";

          notes = `Issued as a replacement (${issueReason}).`;

          // البحث عن أحدث رخصة سارية لنفس الفئة لجلب تاريخ انتهاءها الأصلي
          const activeOldLicense = await License.findOne({
            userId: application.applicantUserId,
            licenseClassId: licenseClass._id,
            isActive: true,
          });

          if (activeOldLicense) {
            expirationDate = activeOldLicense.expirationDate; // نورث نفس تاريخ الانتهاء القديم
            activeOldLicense.isActive = false; // إلغاء تفعيل الرخصة التالفة أو المفقودة
            await activeOldLicense.save();
          } else {
            const validityYears = licenseClass.defaultValidityLength || 5;
            expirationDate.setFullYear(issueDate.getFullYear() + validityYears);
          }
        }

        // إنشاء الرخصة الجديدة في قاعدة البيانات
        createdLicense = await License.create({
          applicationId: application._id,
          userId: application.applicantUserId,
          licenseClassId: licenseClass._id,
          issueDate: issueDate,
          expirationDate: expirationDate,
          paidFees: application.paidFees || licenseClass.classFees,
          issueReason: issueReason,
          notes: notes,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully.",
      data: {
        application,
        license: createdLicense, // إرجاع الرخصة المصدرة ضمن الرد للتحقق الفوري
      },
    });
  };
  deleteApplication = async (req, res) => {
    const { applicationId } = req.params;

    // 1. Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    // 2. Workflow Rule: Cannot cancel an application that is already completed
    if (application.applicationStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel an application that has already been completed.",
      });
    }

    // 3. If it's already cancelled, no need to do it again
    if (application.applicationStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Application is already cancelled.",
      });
    }

    // 4. Update status to Cancelled and preserve data
    application.applicationStatus = "Cancelled";
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application cancelled successfully (data preserved).",
      data: application,
    });
  };
  createRenewalApplication = async (req, res) => {
    const applicantUserId = req.user.id;
    const { oldLicenseId } = req.body;

    if (!oldLicenseId) {
      return res.status(400).json({
        success: false,
        message: "Old license ID is required for renewal.",
      });
    }

    // 1. التحقق من وجود الرخصة القديمة وملكية المستخدم لها
    const oldLicense = await License.findOne({
      _id: oldLicenseId,
      userId: applicantUserId,
    }).populate("licenseClassId");
    if (!oldLicense) {
      return res.status(404).json({
        success: false,
        message: "License not found or does not belong to you.",
      });
    }

    // 2. التحقق مما إذا كانت الرخصة مفعلة أم لا
    if (!oldLicense.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot renew an inactive license.",
      });
    }

    // 3. التحقق مما إذا كانت الرخصة محجوزة
    if (oldLicense.isDetained) {
      return res.status(400).json({
        success: false,
        message: "Cannot renew a detained license. Please release it first.",
      });
    }

    // (اختياري) التحقق هل الرخصة منتهية الصلاحية بالفعل؟
    const isExpired = new Date() > new Date(oldLicense.expirationDate);
    if (!isExpired) {
      return res
        .status(400)
        .json({ success: false, message: "License is not expired yet." });
    }

    // 4. التحقق من عدم وجود طلب معلق سابق من نفس النوع لنفس الرخصة
    const existingApp = await Application.findOne({
      applicantUserId,
      applicationType: "RENEW_LICENSE",
      applicationStatus: "New",
    });

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending renewal application.",
      });
    }

    const licenseClass = oldLicense.licenseClassId;
    const paidFees = licenseClass.classFees; // أو رسوم التجديد الخاصة

    // 5. إنشاء طلب التجديد
    const newApplication = await Application.create({
      applicantUserId,
      applicationType: "RENEW_LICENSE",
      paidFees,
      licenseClassId: licenseClass._id,
      applicationStatus: "New",
    });

    return res.status(201).json({
      success: true,
      message: "Renewal application created successfully.",
      data: newApplication,
    });
  };
  createReplacementApplication = async (req, res) => {
    const applicantUserId = req.user.id;
    const { oldLicenseId, replacementType } = req.body; // replacementType: "LOST" أو "DAMAGED"

    // 1. التحقق من المدخلات الأساسية
    if (!oldLicenseId || !replacementType) {
      return res.status(400).json({
        success: false,
        message: "Old license ID and replacement type are required.",
      });
    }

    const validTypes = ["LOST", "DAMAGED"];
    if (!validTypes.includes(replacementType)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid replacement type. Must be either 'LOST' or 'DAMAGED'.",
      });
    }

    // 2. التأكد من أن الرخصة القديمة موجودة وتخص المستخدم وسارية
    const oldLicense = await License.findOne({
      _id: oldLicenseId,
      userId: applicantUserId,
    }).populate("licenseClassId");

    if (!oldLicense) {
      return res.status(404).json({
        success: false,
        message: "License not found or does not belong to you.",
      });
    }

    if (!oldLicense.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot issue a replacement for an inactive license.",
      });
    }

    if (oldLicense.isDetained) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot issue a replacement for a detained license. Please release it first.",
      });
    }

    // 3. تحديد نوع الطلب في قاعدة البيانات بناءً على الاختيار
    const applicationType =
      replacementType === "LOST"
        ? "REPLACEMENT_FOR_LOST"
        : "REPLACEMENT_FOR_DAMAGED";

    // 4. التحقق من عدم وجود طلب معلق سابق من نفس النوع لنفس الرخصة
    const existingApp = await Application.findOne({
      applicantUserId,
      applicationType,
      applicationStatus: "New",
    });

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending replacement application.",
      });
    }

    const licenseClass = oldLicense.licenseClassId;
    const paidFees = licenseClass.classFees; // أو رسوم رمزية خاصة بالبدل إن وجدت

    // 5. إنشاء الطلب
    const newApplication = await Application.create({
      applicantUserId,
      applicationType,
      paidFees,
      licenseClassId: licenseClass._id,
      applicationStatus: "New",
    });

    return res.status(201).json({
      success: true,
      message: "Replacement application created successfully.",
      data: newApplication,
    });
  };
  getApplicationDetailsWithJourney = async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role; // للتأكد إن كان موظفاً أم صاحب الطلب

    // 1. البحث عن الطلب مع جلب بيانات فئة الرخصة والمستخدم
    const application = await Application.findById(applicationId)
      .populate("licenseClassId")
      .populate("applicantUserId", "firstName lastName email phone");

    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found." });
    }

    // 2. التحقق من الصلاحية (إذا لم يكن موظفاً، يجب أن يكون الطلب يخصه)
    if (
      userRole !== "Employee" &&
      userRole !== "Admin" &&
      application.applicantUserId._id.toString() !== userId.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    // 3. جلب جميع مواعيد واختبارات هذا الطلب لمعرفة رحلة المتقدم بالكامل
    const testAppointments = await TestAppointment.find({ applicationId }).sort(
      { createdAt: 1 },
    );

    // 4. جلب الرخصة المرتبطة بهذا الطلب إن وجدت (إذا تم إصداره)
    const issuedLicense = await License.findOne({ applicationId });
    if (!issuedLicense) {
      return res
        .status(404)
        .json({ success: false, message: "issuedLicense Haven't License." });
    }

    return res.status(200).json({
      success: true,
      data: {
        application,
        journey: {
          tests: testAppointments, // تظهر فيها حالة Vision, Written, Practical ونتائجها
          license: issuedLicense || null,
        },
      },
    });
  };
  cancelApplication = async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role; // مثال: "customer", "employee", "admin"

    // 1. البحث عن الطلب
    const application = await Application.findById(applicationId);
    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found." });
    }

    // 2. التحقق من الصلاحيات: إذا لم يكن موظفاً أو أدمن، يجب أن يكون المتقدم هو صاحب الطلب نفسه
    if (userRole !== "employee" && userRole !== "admin") {
      if (application.applicantUserId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only cancel your own applications.",
        });
      }
    }

    // 3. 🛡️ الشرط الصارم: لا يمكن إلغاء الطلب إذا كان Completed أو مكنسلاً مسبقاً
    if (application.applicationStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel an application that has already been completed and issued a license.",
      });
    }

    if (application.applicationStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This application is already cancelled.",
      });
    }

    // 4. تحديث حالة الطلب إلى Cancelled
    application.applicationStatus = "Cancelled";
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application cancelled successfully.",
      data: application,
    });
  };
}

module.exports = new ApplicationController();
