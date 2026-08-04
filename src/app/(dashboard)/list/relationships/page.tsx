import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";

type Counts = {
  admin: number;
  student: number;
  guardian: number;
  teacher: number;
  parent: number;
  grade: number;
  class: number;
  subject: number;
  classSubject: number;
  exam: number;
  assignment: number;
  result: number;
  attendance: number;
  event: number;
  announcement: number;
  period: number;
  timetableSlot: number;
  lesson: number;
  logbook: number;
  staff: number;
  staffAttendance: number;
  staffPerformance: number;
  feeItem: number;
  invoice: number;
  payment: number;
  salary: number;
  expense: number;
  notification: number;
  notificationRead: number;
  message: number;
  inventoryItem: number;
  inventoryIssue: number;
  setting: number;
  auditLog: number;
  permission: number;
  rolePermission: number;
};

type Relation = {
  from: string;
  fromKey: keyof Counts;
  to: string;
  toKey: keyof Counts;
  via: string;
  href: string;
  hrefLabel: string;
};

const PEOPLE: Relation[] = [
  {
    from: "Parent",
    fromKey: "parent",
    to: "Student",
    toKey: "student",
    via: "One parent account manages many students",
    href: "/list/students",
    hrefLabel: "Students",
  },
  {
    from: "Student",
    fromKey: "student",
    to: "Guardian",
    toKey: "guardian",
    via: "Each student can have several emergency contacts",
    href: "/list/guardians",
    hrefLabel: "Guardians",
  },
  {
    from: "Student",
    fromKey: "student",
    to: "Class",
    toKey: "class",
    via: "Every student is enrolled in exactly one class",
    href: "/list/students",
    hrefLabel: "Students",
  },
  {
    from: "Student",
    fromKey: "student",
    to: "Grade",
    toKey: "grade",
    via: "Each student belongs to one grade level",
    href: "/list/students",
    hrefLabel: "Students",
  },
  {
    from: "Class",
    fromKey: "class",
    to: "Grade",
    toKey: "grade",
    via: "Classes roll up under a grade level",
    href: "/list/classes",
    hrefLabel: "Classes",
  },
  {
    from: "Class",
    fromKey: "class",
    to: "Supervisor",
    toKey: "teacher",
    via: "A class is supervised by one teacher",
    href: "/list/classes",
    hrefLabel: "Classes",
  },
  {
    from: "Teacher",
    fromKey: "teacher",
    to: "Subject",
    toKey: "subject",
    via: "Teachers can be assigned to many subjects",
    href: "/list/subjects",
    hrefLabel: "Subjects",
  },
  {
    from: "Class",
    fromKey: "class",
    to: "ClassSubject",
    toKey: "classSubject",
    via: "Each class studies a set of subjects",
    href: "/list/classSubjects",
    hrefLabel: "Class Subjects",
  },
  {
    from: "Subject",
    fromKey: "subject",
    to: "ClassSubject",
    toKey: "classSubject",
    via: "Each subject is taught in several classes",
    href: "/list/classSubjects",
    hrefLabel: "Class Subjects",
  },
  {
    from: "Teacher",
    fromKey: "teacher",
    to: "ClassSubject",
    toKey: "classSubject",
    via: "A teacher is assigned to the subjects they teach",
    href: "/list/classSubjects",
    hrefLabel: "Class Subjects",
  },
];

const ACADEMIC: Relation[] = [
  {
    from: "ClassSubject",
    fromKey: "classSubject",
    to: "Exam",
    toKey: "exam",
    via: "Each taught subject can have many exams",
    href: "/list/exams",
    hrefLabel: "Exams",
  },
  {
    from: "ClassSubject",
    fromKey: "classSubject",
    to: "Assignment",
    toKey: "assignment",
    via: "Each taught subject can have many assignments",
    href: "/list/assignments",
    hrefLabel: "Assignments",
  },
  {
    from: "ClassSubject",
    fromKey: "classSubject",
    to: "Attendance",
    toKey: "attendance",
    via: "Daily attendance is recorded per subject",
    href: "/list/attendance",
    hrefLabel: "Attendance",
  },
  {
    from: "ClassSubject",
    fromKey: "classSubject",
    to: "Lesson",
    toKey: "lesson",
    via: "Lesson plans are written per taught subject",
    href: "/list/lessons",
    hrefLabel: "Lesson Plans",
  },
  {
    from: "ClassSubject",
    fromKey: "classSubject",
    to: "Logbook",
    toKey: "logbook",
    via: "Class logbook entries are kept per taught subject",
    href: "/list/logbook",
    hrefLabel: "Logbook",
  },
  {
    from: "Exam",
    fromKey: "exam",
    to: "Result",
    toKey: "result",
    via: "A result can be attached to an exam",
    href: "/list/results",
    hrefLabel: "Results",
  },
  {
    from: "Assignment",
    fromKey: "assignment",
    to: "Result",
    toKey: "result",
    via: "A result can be attached to an assignment",
    href: "/list/results",
    hrefLabel: "Results",
  },
  {
    from: "Student",
    fromKey: "student",
    to: "Result",
    toKey: "result",
    via: "Every student can have many results",
    href: "/list/results",
    hrefLabel: "Results",
  },
  {
    from: "Student",
    fromKey: "student",
    to: "Attendance",
    toKey: "attendance",
    via: "Attendance is tracked per student",
    href: "/list/attendance",
    hrefLabel: "Attendance",
  },
  {
    from: "Period",
    fromKey: "period",
    to: "Timetable Slot",
    toKey: "timetableSlot",
    via: "Reusable time slots fill the timetable grid",
    href: "/list/timetable",
    hrefLabel: "Timetable",
  },
  {
    from: "Class",
    fromKey: "class",
    to: "Timetable Slot",
    toKey: "timetableSlot",
    via: "Each class has its own weekly timetable",
    href: "/list/timetable",
    hrefLabel: "Timetable",
  },
  {
    from: "ClassSubject",
    fromKey: "classSubject",
    to: "Timetable Slot",
    toKey: "timetableSlot",
    via: "Slots point to the subject taught at that time",
    href: "/list/timetable",
    hrefLabel: "Timetable",
  },
  {
    from: "Class",
    fromKey: "class",
    to: "Event",
    toKey: "event",
    via: "Events can be scoped to one class (or school-wide)",
    href: "/list/events",
    hrefLabel: "Events",
  },
  {
    from: "Class",
    fromKey: "class",
    to: "Announcement",
    toKey: "announcement",
    via: "Announcements can target one class",
    href: "/list/announcements",
    hrefLabel: "Announcements",
  },
];

const STAFF: Relation[] = [
  {
    from: "Staff",
    fromKey: "staff",
    to: "Staff Attendance",
    toKey: "staffAttendance",
    via: "Non-teaching staff clock attendance daily",
    href: "/list/staff/attendance",
    hrefLabel: "Staff Attendance",
  },
  {
    from: "Staff",
    fromKey: "staff",
    to: "Staff Performance",
    toKey: "staffPerformance",
    via: "Performance reviews are recorded per staff member",
    href: "/list/staff/performance",
    hrefLabel: "Staff Performance",
  },
  {
    from: "Staff",
    fromKey: "staff",
    to: "Salary",
    toKey: "salary",
    via: "Salaries are paid to staff members",
    href: "/list/salaries",
    hrefLabel: "Salaries",
  },
  {
    from: "Teacher",
    fromKey: "teacher",
    to: "Salary",
    toKey: "salary",
    via: "Salaries are paid to teachers too",
    href: "/list/salaries",
    hrefLabel: "Salaries",
  },
];

const FINANCE: Relation[] = [
  {
    from: "Class",
    fromKey: "class",
    to: "Fee Item",
    toKey: "feeItem",
    via: "Fees can be class-specific or school-wide",
    href: "/list/fees",
    hrefLabel: "Fees",
  },
  {
    from: "Fee Item",
    fromKey: "feeItem",
    to: "Invoice",
    toKey: "invoice",
    via: "An invoice bills a single fee item",
    href: "/list/invoices",
    hrefLabel: "Invoices",
  },
  {
    from: "Student",
    fromKey: "student",
    to: "Invoice",
    toKey: "invoice",
    via: "Invoices are issued to individual students",
    href: "/list/invoices",
    hrefLabel: "Invoices",
  },
  {
    from: "Invoice",
    fromKey: "invoice",
    to: "Payment",
    toKey: "payment",
    via: "An invoice is settled by one or more payments",
    href: "/list/payments",
    hrefLabel: "Payments",
  },
];

const COMMUNICATION: Relation[] = [
  {
    from: "Notification",
    fromKey: "notification",
    to: "Notification Read",
    toKey: "notificationRead",
    via: "Read state is tracked per user",
    href: "/list/notifications",
    hrefLabel: "Notifications",
  },
  {
    from: "Message",
    fromKey: "message",
    to: "Message",
    toKey: "message",
    via: "One-to-one internal conversations",
    href: "/list/messages",
    hrefLabel: "Messages",
  },
];

const INVENTORY: Relation[] = [
  {
    from: "Inventory Item",
    fromKey: "inventoryItem",
    to: "Issue & Return",
    toKey: "inventoryIssue",
    via: "Items are tracked through issues and returns",
    href: "/list/inventory/issues",
    hrefLabel: "Issue & Return",
  },
];

const SYSTEM: Relation[] = [
  {
    from: "Permission",
    fromKey: "permission",
    to: "Role Permission",
    toKey: "rolePermission",
    via: "Permissions are granted to roles",
    href: "/list/permissions",
    hrefLabel: "Permissions",
  },
];

const SECTIONS: { title: string; relations: Relation[] }[] = [
  { title: "People", relations: PEOPLE },
  { title: "Academic", relations: ACADEMIC },
  { title: "Staff", relations: STAFF },
  { title: "Finance", relations: FINANCE },
  { title: "Communication", relations: COMMUNICATION },
  { title: "Inventory", relations: INVENTORY },
  { title: "System", relations: SYSTEM },
];

const RelationshipsPage = async () => {
  await requirePermission("relationships.view");

  const [
    admin,
    student,
    guardian,
    teacher,
    parent,
    grade,
    classCount,
    subject,
    classSubject,
    exam,
    assignment,
    result,
    attendance,
    event,
    announcement,
    period,
    timetableSlot,
    lesson,
    logbook,
    staff,
    staffAttendance,
    staffPerformance,
    feeItem,
    invoice,
    payment,
    salary,
    expense,
    notification,
    notificationRead,
    message,
    inventoryItem,
    inventoryIssue,
    setting,
    auditLog,
    permission,
    rolePermission,
  ] = await Promise.all([
    prisma.admin.count(),
    prisma.student.count(),
    prisma.guardian.count(),
    prisma.teacher.count(),
    prisma.parent.count(),
    prisma.grade.count(),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.classSubject.count(),
    prisma.exam.count(),
    prisma.assignment.count(),
    prisma.result.count(),
    prisma.attendance.count(),
    prisma.event.count(),
    prisma.announcement.count(),
    prisma.period.count(),
    prisma.timetableSlot.count(),
    prisma.lesson.count(),
    prisma.logbookEntry.count(),
    prisma.staff.count(),
    prisma.staffAttendance.count(),
    prisma.staffPerformance.count(),
    prisma.feeItem.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.salaryRecord.count(),
    prisma.expense.count(),
    prisma.notification.count(),
    prisma.notificationRead.count(),
    prisma.message.count(),
    prisma.inventoryItem.count(),
    prisma.inventoryIssue.count(),
    prisma.setting.count(),
    prisma.auditLog.count(),
    prisma.permission.count(),
    prisma.rolePermission.count(),
  ]);

  const counts: Counts = {
    admin,
    student,
    guardian,
    teacher,
    parent,
    grade,
    class: classCount,
    subject,
    classSubject,
    exam,
    assignment,
    result,
    attendance,
    event,
    announcement,
    period,
    timetableSlot,
    lesson,
    logbook,
    staff,
    staffAttendance,
    staffPerformance,
    feeItem,
    invoice,
    payment,
    salary,
    expense,
    notification,
    notificationRead,
    message,
    inventoryItem,
    inventoryIssue,
    setting,
    auditLog,
    permission,
    rolePermission,
  };

  const renderRelation = (relation: Relation) => (
    <div
      key={`${relation.from}-${relation.to}-${relation.via}`}
      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">{relation.from}</span>
        <span className="text-kamal-sky">→</span>
        <span className="text-sm font-semibold text-kamal-sky">{relation.to}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1 flex-1">{relation.via}</p>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xl font-bold text-gray-800">
          {counts[relation.fromKey].toLocaleString()}
        </span>
        <span className="text-xs text-gray-400">→</span>
        <span className="text-xl font-bold text-gray-800">
          {counts[relation.toKey].toLocaleString()}
        </span>
      </div>
      <Link
        href={relation.href}
        className="mt-3 text-xs font-medium text-kamal-sky hover:underline self-start"
      >
        View {relation.hrefLabel} →
      </Link>
    </div>
  );

  return (
    <div className="bg-[#F7F8FA] p-4 m-4 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Data Relationships</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every model relationship in the system with the current seeded record counts.
        </p>
      </div>
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {section.relations.map(renderRelation)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelationshipsPage;
