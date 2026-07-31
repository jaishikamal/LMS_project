import { z } from "zod";

// These mirror the `UserSex` / `Day` enums in prisma/schema.prisma. They're
// duplicated rather than imported from the generated client on purpose: this
// module is consumed by client components, and importing the Prisma client
// drags its Node-only runtime into the browser bundle.
const USER_SEX = ["MALE", "FEMALE"] as const;
const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

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

export type ParentSchema = z.infer<typeof parentSchema>;

// Lesson ----------------------------------------------------------------

export const lessonSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().trim().min(1, { message: "Lesson name is required!" }),
  day: z.enum(DAYS, { message: "Day is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  subjectId: z.coerce.number({ message: "Subject is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
  teacherId: z.string().trim().min(1, { message: "Teacher is required!" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

// Exam ------------------------------------------------------------------

export const examSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().trim().min(1, { message: "Title is required!" }),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    lessonId: z.coerce.number({ message: "Lesson is required!" }),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after the start time!",
    path: ["endTime"],
  });

export type ExamSchema = z.infer<typeof examSchema>;

// Assignment ------------------------------------------------------------

export const assignmentSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().trim().min(1, { message: "Title is required!" }),
    startDate: z.coerce.date({ message: "Start date is required!" }),
    dueDate: z.coerce.date({ message: "Due date is required!" }),
    lessonId: z.coerce.number({ message: "Lesson is required!" }),
  })
  .refine((data) => data.dueDate > data.startDate, {
    message: "Due date must be after the start date!",
    path: ["dueDate"],
  });

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

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
