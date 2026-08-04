import { z } from "zod";

// These mirror the `UserSex` enum in prisma/schema.prisma. It's duplicated
// rather than imported from the generated client on purpose: this module is
// consumed by client components, and importing the Prisma client drags its
// Node-only runtime into the browser bundle.
const USER_SEX = ["MALE", "FEMALE"] as const;

// Shared field builders -------------------------------------------------

const username = z
  .string()
  .trim()
  .min(3, { message: "Username must be at least 3 characters long!" })
  .max(20, { message: "Username must be at most 20 characters long!" });

// Optional on update: an empty password means "keep the existing one".
const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long!" })
  .optional()
  .or(z.literal(""));

const name = z.string().trim().min(1, { message: "First name is required!" });
const surname = z.string().trim().min(1, { message: "Last name is required!" });

// `email` is nullable+unique in Prisma, so treat blank as "not provided".
const optionalEmail = z
  .union([z.literal(""), z.email({ message: "Invalid email address!" })])
  .optional();

const optionalPhone = z.string().trim().optional().or(z.literal(""));
const address = z.string().trim().min(1, { message: "Address is required!" });
const bloodType = z.string().trim().min(1, { message: "Blood type is required!" });
const birthday = z.coerce.date({ message: "Birthday is required!" });
const sex = z.enum(USER_SEX, { message: "Sex is required!" });
const optionalImg = z.string().trim().optional().or(z.literal(""));

// Teacher ---------------------------------------------------------------

export const teacherSchema = z.object({
  // Present only when updating an existing row.
  id: z.string().optional(),
  username,
  password,
  name,
  surname,
  email: optionalEmail,
  phone: optionalPhone,
  address,
  bloodType,
  birthday,
  sex,
  img: optionalImg,
  // Multi-select of subject ids; RHF gives strings from <select multiple>.
  subjects: z.array(z.coerce.number()).optional(),
});

// Coerced fields (dates, numeric ids) have a different *input* type to their
// parsed output, so react-hook-form needs both: the input type describes the
// raw string values the DOM produces, the output type what the action receives.
export type TeacherInput = z.input<typeof teacherSchema>;
export type TeacherSchema = z.output<typeof teacherSchema>;

// Student ---------------------------------------------------------------

export const studentSchema = z.object({
  id: z.string().optional(),
  username,
  password,
  name,
  surname,
  email: optionalEmail,
  phone: optionalPhone,
  address,
  bloodType,
  birthday,
  sex,
  img: optionalImg,
  gradeId: z.coerce.number({ message: "Grade is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
  parentId: z.string().trim().min(1, { message: "Parent is required!" }),
});

export type StudentInput = z.input<typeof studentSchema>;
export type StudentSchema = z.output<typeof studentSchema>;

// Subject ---------------------------------------------------------------

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()).optional(),
});

export type SubjectInput = z.input<typeof subjectSchema>;
export type SubjectSchema = z.output<typeof subjectSchema>;

// Class -----------------------------------------------------------------

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Class name is required!" }),
  capacity: z.coerce
    .number({ message: "Capacity is required!" })
    .int({ message: "Capacity must be a whole number!" })
    .positive({ message: "Capacity must be greater than zero!" }),
  gradeId: z.coerce.number({ message: "Grade is required!" }),
  supervisorId: z.string().trim().optional().or(z.literal("")),
});

export type ClassInput = z.input<typeof classSchema>;
export type ClassSchema = z.output<typeof classSchema>;

// Parent ----------------------------------------------------------------

export const parentSchema = z.object({
  id: z.string().optional(),
  username,
  password,
  name,
  surname,
  email: optionalEmail,
  // Parent.phone is required and unique in Prisma, unlike Student/Teacher.
  phone: z.string().trim().min(1, { message: "Phone is required!" }),
  address,
});

export type ParentInput = z.input<typeof parentSchema>;
export type ParentSchema = z.output<typeof parentSchema>;

// ClassSubject -----------------------------------------------------------

export const classSubjectSchema = z.object({
  id: z.coerce.number().optional(),
  subjectId: z.coerce.number({ message: "Subject is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
  teacherId: z.string().trim().min(1, { message: "Teacher is required!" }),
});

export type ClassSubjectInput = z.input<typeof classSubjectSchema>;
export type ClassSubjectSchema = z.output<typeof classSubjectSchema>;

// Exam ------------------------------------------------------------------

export const examSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().trim().min(1, { message: "Title is required!" }),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    classSubjectId: z.coerce.number({ message: "Class subject is required!" }),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after the start time!",
    path: ["endTime"],
  });

export type ExamInput = z.input<typeof examSchema>;
export type ExamSchema = z.output<typeof examSchema>;

// Assignment ------------------------------------------------------------

export const assignmentSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().trim().min(1, { message: "Title is required!" }),
    startDate: z.coerce.date({ message: "Start date is required!" }),
    dueDate: z.coerce.date({ message: "Due date is required!" }),
    classSubjectId: z.coerce.number({ message: "Class subject is required!" }),
  })
  .refine((data) => data.dueDate > data.startDate, {
    message: "Due date must be after the start date!",
    path: ["dueDate"],
  });

export type AssignmentInput = z.input<typeof assignmentSchema>;
export type AssignmentSchema = z.output<typeof assignmentSchema>;

// Attendance ------------------------------------------------------------

export const attendanceSchema = z.object({
  id: z.coerce.number().optional(),
  date: z.coerce.date({ message: "Date is required!" }),
  present: z
    .enum(["true", "false"], { message: "Status is required!" })
    .transform((val) => val === "true"),
  classSubjectId: z.coerce.number({ message: "Class subject is required!" }),
  studentId: z.string().trim().min(1, { message: "Student is required!" }),
});

export type AttendanceInput = z.input<typeof attendanceSchema>;
export type AttendanceSchema = z.output<typeof attendanceSchema>;

// Result ----------------------------------------------------------------

export const resultSchema = z
  .object({
    id: z.coerce.number().optional(),
    score: z.coerce
      .number({ message: "Score is required!" })
      .int({ message: "Score must be a whole number!" })
      .min(0, { message: "Score cannot be negative!" })
      .max(100, { message: "Score cannot exceed 100!" }),
    studentId: z.string().trim().min(1, { message: "Student is required!" }),
    examId: z.coerce.number().optional(),
    assignmentId: z.coerce.number().optional(),
  })
  // A result hangs off exactly one of exam/assignment (both are nullable FKs).
  .refine((data) => Boolean(data.examId) !== Boolean(data.assignmentId), {
    message: "Pick either an exam or an assignment, not both!",
    path: ["examId"],
  });

export type ResultSchema = z.infer<typeof resultSchema>;

// Event -----------------------------------------------------------------

export const eventSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().trim().min(1, { message: "Title is required!" }),
    description: z.string().trim().min(1, { message: "Description is required!" }),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    // Blank means a school-wide event (Event.classId is nullable).
    classId: z.coerce.number().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after the start time!",
    path: ["endTime"],
  });

export type EventSchema = z.infer<typeof eventSchema>;
export type EventInput = z.input<typeof eventSchema>;

// Announcement ----------------------------------------------------------

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().trim().min(1, { message: "Title is required!" }),
  description: z.string().trim().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  // Blank means a school-wide announcement (Announcement.classId is nullable).
  classId: z.coerce.number().optional(),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;
export type AnnouncementInput = z.input<typeof announcementSchema>;

// Period (timetable timeslot) --------------------------------------------

export const periodSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  order: z.coerce.number({ message: "Order is required!" }),
});

export type PeriodInput = z.input<typeof periodSchema>;
export type PeriodSchema = z.output<typeof periodSchema>;

// Timetable slot ---------------------------------------------------------

export const timetableSlotSchema = z.object({
  id: z.coerce.number().optional(),
  classId: z.coerce.number({ message: "Class is required!" }),
  dayOfWeek: z.coerce
    .number({ message: "Day is required!" })
    .min(1, { message: "Day must be between 1 and 5!" })
    .max(5, { message: "Day must be between 1 and 5!" }),
  periodId: z.coerce.number({ message: "Period is required!" }),
  classSubjectId: z.coerce.number().optional(),
});

export type TimetableSlotInput = z.input<typeof timetableSlotSchema>;
export type TimetableSlotSchema = z.output<typeof timetableSlotSchema>;

// Lesson planning --------------------------------------------------------

export const lessonSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().trim().min(1, { message: "Title is required!" }),
    topic: z.string().trim().optional().or(z.literal("")),
    objectives: z.string().trim().optional().or(z.literal("")),
    materials: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().optional().or(z.literal("")),
    startDate: z.coerce.date({ message: "Start date is required!" }),
    endDate: z.coerce.date().optional(),
    classSubjectId: z.coerce.number({ message: "Class subject is required!" }),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date!",
    path: ["endDate"],
  });

export type LessonInput = z.input<typeof lessonSchema>;
export type LessonSchema = z.output<typeof lessonSchema>;

// Teaching logbook -------------------------------------------------------

export const logbookEntrySchema = z.object({
  id: z.coerce.number().optional(),
  date: z.coerce.date({ message: "Date is required!" }),
  topic: z.string().trim().min(1, { message: "Topic is required!" }),
  summary: z.string().trim().min(1, { message: "Summary is required!" }),
  homework: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  classSubjectId: z.coerce.number({ message: "Class subject is required!" }),
});

export type LogbookEntryInput = z.input<typeof logbookEntrySchema>;
export type LogbookEntrySchema = z.output<typeof logbookEntrySchema>;

// Guardian (emergency contact) -------------------------------------------

export const guardianSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Name is required!" }),
  relationship: z.string().trim().min(1, { message: "Relationship is required!" }),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  isPrimary: z.coerce.boolean().optional(),
  studentId: z.string().trim().min(1, { message: "Student is required!" }),
});

export type GuardianInput = z.input<typeof guardianSchema>;
export type GuardianSchema = z.output<typeof guardianSchema>;

// Staff (non-teaching) ---------------------------------------------------

export const staffSchema = z.object({
  id: z.string().trim().min(1, { message: "Staff ID is required!" }),
  name: z.string().trim().min(1, { message: "Name is required!" }),
  surname: z.string().trim().min(1, { message: "Surname is required!" }),
  email: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().min(1, { message: "Address is required!" }),
  role: z.string().trim().min(1, { message: "Role is required!" }),
  department: z.string().trim().min(1, { message: "Department is required!" }),
  joinDate: z.coerce.date({ message: "Join date is required!" }),
  birthday: z.coerce.date().optional(),
  sex: z.enum(["MALE", "FEMALE"]).optional(),
  img: z.string().trim().optional().or(z.literal("")),
});

export type StaffInput = z.input<typeof staffSchema>;
export type StaffSchema = z.output<typeof staffSchema>;

// Staff attendance -------------------------------------------------------

export const staffAttendanceSchema = z.object({
  id: z.coerce.number().optional(),
  staffId: z.string().trim().min(1, { message: "Staff member is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  present: z.coerce.boolean().optional(),
  status: z.enum(["Present", "Absent", "Leave"], {
    message: "Status is required!",
  }),
});

export type StaffAttendanceInput = z.input<typeof staffAttendanceSchema>;
export type StaffAttendanceSchema = z.output<typeof staffAttendanceSchema>;

// Staff performance ------------------------------------------------------

export const staffPerformanceSchema = z.object({
  id: z.coerce.number().optional(),
  staffId: z.string().trim().min(1, { message: "Staff member is required!" }),
  reviewDate: z.coerce.date({ message: "Review date is required!" }),
  rating: z.coerce
    .number({ message: "Rating is required!" })
    .min(1, { message: "Rating must be between 1 and 5!" })
    .max(5, { message: "Rating must be between 1 and 5!" }),
  comments: z.string().trim().optional().or(z.literal("")),
});

export type StaffPerformanceInput = z.input<typeof staffPerformanceSchema>;
export type StaffPerformanceSchema = z.output<typeof staffPerformanceSchema>;

// Fee item ---------------------------------------------------------------

export const feeItemSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Name is required!" }),
  amount: z.coerce
    .number({ message: "Amount is required!" })
    .nonnegative({ message: "Amount cannot be negative!" }),
  // Blank means the fee applies to the whole school.
  classId: z.coerce.number().optional(),
});

export type FeeItemInput = z.input<typeof feeItemSchema>;
export type FeeItemSchema = z.output<typeof feeItemSchema>;

// Invoice ----------------------------------------------------------------

export const invoiceSchema = z.object({
  id: z.coerce.number().optional(),
  invoiceNo: z.string().trim().min(1, { message: "Invoice number is required!" }),
  studentId: z.string().trim().min(1, { message: "Student is required!" }),
  feeItemId: z.coerce.number({ message: "Fee item is required!" }),
  amount: z.coerce
    .number({ message: "Amount is required!" })
    .nonnegative({ message: "Amount cannot be negative!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
});

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceSchema = z.output<typeof invoiceSchema>;

// Payment ----------------------------------------------------------------

export const paymentSchema = z.object({
  id: z.coerce.number().optional(),
  invoiceId: z.coerce.number({ message: "Invoice is required!" }),
  amount: z.coerce
    .number({ message: "Amount is required!" })
    .positive({ message: "Amount must be greater than zero!" }),
  method: z.enum(["Cash", "Bank Transfer", "Card", "Mobile"], {
    message: "Method is required!",
  }),
  date: z.coerce.date({ message: "Date is required!" }),
  reference: z.string().trim().optional().or(z.literal("")),
});

export type PaymentInput = z.input<typeof paymentSchema>;
export type PaymentSchema = z.output<typeof paymentSchema>;

// Salary record ----------------------------------------------------------

export const salaryRecordSchema = z.object({
  id: z.coerce.number().optional(),
  recipientType: z.enum(["Staff", "Teacher"], {
    message: "Recipient type is required!",
  }),
  staffId: z.string().trim().optional().or(z.literal("")),
  teacherId: z.string().trim().optional().or(z.literal("")),
  month: z.coerce.date({ message: "Month is required!" }),
  amount: z.coerce
    .number({ message: "Amount is required!" })
    .nonnegative({ message: "Amount cannot be negative!" }),
  paid: z.coerce.boolean().optional(),
  paidDate: z.coerce.date().optional(),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SalaryRecordInput = z.input<typeof salaryRecordSchema>;
export type SalaryRecordSchema = z.output<typeof salaryRecordSchema>;

// Expense ----------------------------------------------------------------

export const expenseSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().trim().min(1, { message: "Title is required!" }),
  category: z.string().trim().min(1, { message: "Category is required!" }),
  amount: z.coerce
    .number({ message: "Amount is required!" })
    .nonnegative({ message: "Amount cannot be negative!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseSchema = z.output<typeof expenseSchema>;

// Notification -----------------------------------------------------------

export const notificationSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().trim().min(1, { message: "Title is required!" }),
  message: z.string().trim().min(1, { message: "Message is required!" }),
  role: z.enum(["admin", "teacher", "student", "parent"], {
    message: "Audience is required!",
  }),
});

export type NotificationInput = z.input<typeof notificationSchema>;
export type NotificationSchema = z.output<typeof notificationSchema>;

// Message ----------------------------------------------------------------

export const messageSchema = z.object({
  id: z.coerce.number().optional(),
  recipientId: z.string().trim().min(1, { message: "Recipient is required!" }),
  recipientRole: z.enum(["admin", "teacher", "student", "parent"], {
    message: "Recipient type is required!",
  }),
  subject: z.string().trim().min(1, { message: "Subject is required!" }),
  body: z.string().trim().min(1, { message: "Message body is required!" }),
});

export type MessageInput = z.input<typeof messageSchema>;
export type MessageSchema = z.output<typeof messageSchema>;

// Inventory item ----------------------------------------------------------

export const inventoryItemSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Name is required!" }),
  category: z.enum(["Books", "Supplies", "Equipment"], {
    message: "Category is required!",
  }),
  quantity: z.coerce
    .number({ message: "Quantity is required!" })
    .int({ message: "Quantity must be a whole number!" })
    .min(0, { message: "Quantity cannot be negative!" }),
  location: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
});

export type InventoryItemInput = z.input<typeof inventoryItemSchema>;
export type InventoryItemSchema = z.output<typeof inventoryItemSchema>;

// Inventory issue ---------------------------------------------------------

export const inventoryIssueSchema = z.object({
  id: z.coerce.number().optional(),
  itemId: z.coerce.number({ message: "Item is required!" }),
  borrowerType: z.enum(["Student", "Teacher", "Staff"], {
    message: "Borrower type is required!",
  }),
  borrowerName: z.string().trim().min(1, { message: "Borrower is required!" }),
  issuedDate: z.coerce.date({ message: "Issue date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  returnedDate: z.coerce.date().optional(),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type InventoryIssueInput = z.input<typeof inventoryIssueSchema>;
export type InventoryIssueSchema = z.output<typeof inventoryIssueSchema>;

// Settings (key/value pairs) ------------------------------------------------

export const settingsSchema = z.record(z.string(), z.string());

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsSchema = z.output<typeof settingsSchema>;
