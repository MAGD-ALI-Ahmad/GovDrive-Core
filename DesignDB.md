👥 1. الفاعلين في النظام (Actors)

    الموظف (User): هو الشخص الذي يمتلك حساباً في النظام (موظف الدائرة) ويقوم بعمليات البحث، إصدار الرخص، تحديد المواعيد، وتفكيك حجز الرخص.

    المتقدم (Person): هو الشخص (المواطن) الذي يتم التعامل مع بياناته في النظام (الرقم الوطني، الاسم، العنوان، إلخ).

🎯 2. الأفعال الرئيسية (Main Actions)

    إدارة الأشخاص: إضافة مواطنين جدد للنظام أو البحث عنهم بالرقم الوطني.

    تقديم الطلبات: إنشاء طلب خدمة (إصدار، تجديد، بدل فاقد/تالف، رخصة دولية).

    إدارة المواعيد والاختبارات: حجز مواعيد للاختبارات (نظر، نظري، عملي) وتسجيل نتائجها.

    إدارة الرخص: إصدار الرخص بعد اجتياز الشروط، فك الحجز، وتجديدها.

🗄️ 3. الجداول المقترحة (Collections)

بما أننا نستخدم MongoDB، سنحتاج لهذه المجموعات لتغطية المتطلبات:

    Users: موظفي الدائرة الذين يدخلون للنظام.

    Persons: بيانات المواطنين الأساسية.

    LicenseClasses: فئات الرخص (ثابتة في النظام).

    Applications: الطلبات (التي تربط بين الشخص والخدمة).

    Tests/Appointments: المواعيد ونتائج الاختبارات.

    Licenses: الرخص المصدرة فعلياً.

    DetainedLicenses: سجل حجز الرخص (لخدمة فك الحجز).

    Collections :

    Person {

nationalNumber: String, // Unique
fullName: String,
birthDate: Date,
address: String,
phone: String,
email: String,
nationality: String,
photoPath: String
}

LicenseClass {
className: String, // مثلاً "الفئة الثالثة"
classDescription: String,
minimumAllowedAge: Number,
validityLength: Number, // سنوات
classFees: Number
}
Application {
applicationDate: Date,
personId: (REF: Person),
applicationType: String, // "NEW", "RENEWAL", "LOST", "DAMAGED", "INTERNATIONAL", etc.
applicationStatus: String, // [New, Cancelled, Completed]
paidFees: Number,
createdByUser: (REF: User) // الموظف المسؤول
}

TestAppointment {
applicationId: (REF: Application),
testType: String, // [Vision, Written, Practical]
appointmentDate: Date,
isPaid: Boolean,
result: Boolean, // Success/Fail
notes: String,
createdByUser: (REF: User)
}

License {
licenseId: Number, // متسلسل
applicationId: (REF: Application),
personId: (REF: Person),
licenseClassId: (REF: LicenseClass),
issueDate: Date,
expirationDate: Date,
notes: String,
issueReason: String, // [New, Replacement, Renewal]
isActive: Boolean
}

SystemLog {
userId: (REF: User),
action: String, // "CREATED_APPLICATION", "PASSED_TEST"
timestamp: Date,
details: Object // أي تفاصيل إضافية
}
