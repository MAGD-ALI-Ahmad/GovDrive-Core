const TestAppointment = require("../models/TestAppointment");
const Application = require("../models/Application");
class TestAppointmentController {
  getTestFees(testType) {
    const feesMap = { Vision: 10, Written: 20, Practical: 50 };
    return feesMap[testType] || 15;
  }

  requestAppointment = async (req, res) => {
    const { applicationId, testType, appointmentDate } = req.body;
    const applicantUserId = req.user._id;

    if (!applicationId || !testType || !appointmentDate) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // 1. التأكد من أن الطلب يخص المستخدم نفسه وأنه معتمد (Approved/Paid) وجاهز للامتحانات
    const application = await Application.findOne({
      _id: applicationId,
      applicantUserId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or does not belong to you.",
      });
    }

    // 🛡️ شرط المتابعة المالية: يجب أن يكون الطلب معتمداً بعد دفع الرسوم الأساسية
    if (application.applicationStatus === "New") {
      return res.status(400).json({
        success: false,
        message:
          "Your application is still pending payment verification by an employee. You cannot book tests yet.",
      });
    }

    if (
      application.applicationStatus === "Cancelled" ||
      application.applicationStatus === "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot book an appointment for an application that is ${application.applicationStatus}.`,
      });
    }

    // 🛡️ 2. شرط التحقق من الدفع الخاص بالامتحانات (إذا تطلب الأمر دفع رسوم مرتبطة بالامتحان)
    // نبحث عن سجل دفع يثبت أن المستخدم سدد رسوم هذا الامتحان أو لديه اعتماد مالي ساري
    const testPayment = await Payment.findOne({
      userId: applicantUserId,
      applicationId,
      paymentStatus: "Verified",
    });

    if (!testPayment) {
      return res.status(400).json({
        success: false,
        message:
          "No verified payment found for this application's tests. Please complete your payment first.",
      });
    }

    // 3. شرط التسلسل الهرمي للاختبارات (Prerequisite Check)
    // الترتيب: Vision -> Written -> Practical
    if (testType === "Written") {
      const visionTest = await TestAppointment.findOne({
        applicationId,
        testType: "Vision",
        result: true,
        isLocked: true,
      });
      if (!visionTest) {
        return res.status(400).json({
          success: false,
          message:
            "You must pass the Vision test before scheduling the Written test.",
        });
      }
    } else if (testType === "Practical") {
      const writtenTest = await TestAppointment.findOne({
        applicationId,
        testType: "Written",
        result: true,
        isLocked: true,
      });
      if (!writtenTest) {
        return res.status(400).json({
          success: false,
          message:
            "You must pass the Written test before scheduling the Practical test.",
        });
      }
    }

    // 4. شرط عدم السماح بالتسجيل لاختبار نجح فيه المتقدم مسبقاً
    const alreadyPassed = await TestAppointment.findOne({
      applicationId,
      testType,
      result: true,
      isLocked: true,
    });
    if (alreadyPassed) {
      return res.status(400).json({
        success: false,
        message: `You have already passed the ${testType} test for this application.`,
      });
    }

    // 5. شرط عدم وجود موعد نشط حالي لنفس الاختبار (Pending أو Confirmed ولم يُقفل)
    const existingActiveAppointment = await TestAppointment.findOne({
      applicationId,
      testType,
      isLocked: false,
      appointmentStatus: { $in: ["Pending", "Confirmed"] },
    });

    if (existingActiveAppointment) {
      return res.status(400).json({
        success: false,
        message: `You already have an active or pending appointment for the ${testType} test.`,
      });
    }

    // 6. شرط عدم تداخل المواعيد (حجز موعد لنفس الوقت تماماً لشخص آخر)
    const dateConflict = await TestAppointment.findOne({
      appointmentDate: new Date(appointmentDate),
      appointmentStatus: { $in: ["Pending", "Confirmed"] },
      isLocked: false,
    });

    if (dateConflict) {
      return res.status(400).json({
        success: false,
        message:
          "This time slot is already booked or requested by another applicant. Please choose another time.",
      });
    }

    const paidFees = this.getTestFees(testType);

    // إنشاء الموعد بحالة Pending
    const appointment = await TestAppointment.create({
      applicationId,
      testType,
      appointmentDate,
      paidFees,
      appointmentStatus: "Pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Test appointment requested successfully and is pending employee approval.",
      data: appointment,
    });
  };
  updateAppointmentStatusByEmployee = async (req, res) => {
    const { appointmentId } = req.params;
    const { appointmentStatus } = req.body; // "Confirmed" أو "Cancelled"

    if (!["Confirmed", "Cancelled"].includes(appointmentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'Confirmed' or 'Cancelled'.",
      });
    }

    const appointment = await TestAppointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify a locked/completed appointment.",
      });
    }

    // إذا أراد الموظف تأكيد الموعد، نتحقق مرة أخرى من عدم حجز هذا التاريخ لشخص آخر بالخطأ
    if (appointmentStatus === "Confirmed") {
      const dateConflict = await TestAppointment.findOne({
        _id: { $ne: appointmentId },
        appointmentDate: appointment.appointmentDate,
        appointmentStatus: "Confirmed",
        isLocked: false,
      });

      if (dateConflict) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot confirm: Another confirmed appointment already exists at this exact time.",
        });
      }
    }

    appointment.appointmentStatus = appointmentStatus;
    appointment.createdByEmployeeId = req.user.id; // تسجيل الموظف الذي راجع الموعد
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: `Appointment has been ${appointmentStatus.toLowerCase()} successfully.`,
      data: appointment,
    });
  };
  updateTestResult = async (req, res) => {
    const { appointmentId } = req.params;
    const { result } = req.body; // true = Pass, false = Fail

    if (result === undefined || result === null) {
      return res.status(400).json({
        success: false,
        message: "Test result (true/false) is required.",
      });
    }

    const appointment = await TestAppointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    if (appointment.appointmentStatus !== "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Can only record results for confirmed appointments.",
      });
    }

    if (appointment.isLocked) {
      return res.status(400).json({
        success: false,
        message: "This appointment is already locked.",
      });
    }

    appointment.result = result;
    appointment.isLocked = true; // قفل الموعد نهائياً
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Test result recorded and appointment locked successfully.",
      data: appointment,
    });
  };
  getAppointmentsByApplication = async (req, res) => {
    const { applicationId } = req.params;
    const appointments = await TestAppointment.find({ applicationId }).sort({
      createdAt: -1,
    });
    if (!appointments) {
      return res.status(200).json({
        message: "this appoiment not found",
      });
    }
    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  };
  getAppointmentsForEmployee = async (req, res) => {
    const { status, testType } = req.query;
    let filter = {};

    if (status) filter.appointmentStatus = status;
    if (testType) filter.testType = testType;

    const appointments = await TestAppointment.find(filter)
      .populate({
        path: "applicationId",
        populate: {
          path: "applicantUserId",
          select: "firstName lastName email phone",
        },
      })
      .sort({ appointmentDate: 1 });
    if (!appointments) {
      return res.status(404).json({
        message: "not found Any Appointments",
      });
    }
    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  };
  cancelAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role; // مثال: "Applicant", "Employee", "Admin"

    const appointment =
      await TestAppointment.findById(appointmentId).populate("applicationId");
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    // 1. التحقق من الصلاحيات: إذا لم يكن الموظف أو الأدمين، يجب أن يكون المتقدم صاحب الطلب نفسه هو من يقوم بالإلغاء
    if (userRole !== "Employee" && userRole !== "Admin") {
      if (
        appointment.applicationId.applicantUserId.toString() !==
        userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only cancel your own appointments.",
        });
      }
    }

    // 2. 🛡️ الشرط الصارم: لا يمكن إلغاء الحجز إلا إذا كان بحالة "Pending" فقط
    if (appointment.appointmentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel this appointment. Appointments can only be cancelled while they are in 'Pending' status (Current status: ${appointment.appointmentStatus}).`,
      });
    }

    // 3. تأكيد الإلغاء
    appointment.appointmentStatus = "Cancelled";
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      data: appointment,
    });
  };
  rescheduleAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const { newAppointmentDate } = req.body;
    const userId = req.user.id;

    if (!newAppointmentDate) {
      return res
        .status(400)
        .json({ success: false, message: "New appointment date is required." });
    }

    const appointment =
      await TestAppointment.findById(appointmentId).populate("applicationId");
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    // التأكد من أن الموعد يخص المستخدم
    if (
      appointment.applicationId.applicantUserId.toString() !== userId.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    // التعديل متاح فقط للمواعيد المعلقة Pending
    if (appointment.appointmentStatus !== "Pending" || appointment.isLocked) {
      return res.status(400).json({
        success: false,
        message:
          "Can only reschedule pending appointments that are not locked.",
      });
    }

    // فحص تداخل الموعد الجديد مع مواعيد أخرى
    const dateConflict = await TestAppointment.findOne({
      _id: { $ne: appointment._id }, // استبعاد الموعد الحالي نفسه
      appointmentDate: new Date(newAppointmentDate),
      appointmentStatus: { $in: ["Pending", "Confirmed"] },
      isLocked: false,
    });

    if (dateConflict) {
      return res.status(400).json({
        success: false,
        message:
          "This new time slot is already booked or requested. Please choose another time.",
      });
    }

    appointment.appointmentDate = newAppointmentDate;
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully.",
      data: appointment,
    });
  };
}
module.exports = new TestAppointmentController();
