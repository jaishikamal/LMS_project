"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { toast } from "react-toastify";
import {
  deleteAssignment,
  deleteAttendance,
  deleteClass,
  deleteClassSubject,
  deleteExam,
  deleteExpense,
  deleteFeeItem,
  deleteGuardian,
  deleteInvoice,
  deleteInventoryIssue,
  deleteInventoryItem,
  deleteLesson,
  deleteLogbookEntry,
  deleteNotification,
  deleteParent,
  deletePayment,
  deletePeriod,
  deleteResult,
  deleteSalaryRecord,
  deleteStaff,
  deleteStaffAttendance,
  deleteStaffPerformance,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteTimetableSlot,
  deleteEvent,
  deleteAnnouncement,
} from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import type { SelectOption } from "./SelectField";

// USE LAZY LOADING

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassSubjectForm = dynamic(() => import("./forms/ClassSubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});
const PeriodForm = dynamic(() => import("./forms/PeriodForm"), {
  loading: () => <h1>Loading...</h1>,
});
const TimetableSlotForm = dynamic(() => import("./forms/TimetableSlotForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LogbookForm = dynamic(() => import("./forms/LogbookForm"), {
  loading: () => <h1>Loading...</h1>,
});
const GuardianForm = dynamic(() => import("./forms/GuardianForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StaffForm = dynamic(() => import("./forms/StaffForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StaffAttendanceForm = dynamic(() => import("./forms/StaffAttendanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StaffPerformanceForm = dynamic(() => import("./forms/StaffPerformanceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const FeeItemForm = dynamic(() => import("./forms/FeeItemForm"), {
  loading: () => <h1>Loading...</h1>,
});
const InvoiceForm = dynamic(() => import("./forms/InvoiceForm"), {
  loading: () => <h1>Loading...</h1>,
});
const PaymentForm = dynamic(() => import("./forms/PaymentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SalaryForm = dynamic(() => import("./forms/SalaryForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExpenseForm = dynamic(() => import("./forms/ExpenseForm"), {
  loading: () => <h1>Loading...</h1>,
});
const NotificationForm = dynamic(() => import("./forms/NotificationForm"), {
  loading: () => <h1>Loading...</h1>,
});
const InventoryItemForm = dynamic(() => import("./forms/InventoryItemForm"), {
  loading: () => <h1>Loading...</h1>,
});
const InventoryIssueForm = dynamic(() => import("./forms/InventoryIssueForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});

export type AssessmentOption = {
  value: string;
  label: string;
  classId: number;
};

export type ResultStudentOption = {
  value: string;
  label: string;
  classId: number;
};

export type RelatedData = {
  subjects?: SelectOption[];
  teachers?: SelectOption[];
  grades?: SelectOption[];
  classes?: SelectOption[];
  classSubjects?: SelectOption[];
  parents?: SelectOption[];
  students?: SelectOption[];
  assessments?: AssessmentOption[];
  resultStudents?: ResultStudentOption[];
  periods?: SelectOption[];
  staff?: SelectOption[];
  feeItems?: SelectOption[];
  invoices?: SelectOption[];
  inventoryItems?: SelectOption[];
};

type FormRenderProps = {
  type: "create" | "update";
  data?: any;
  relatedData?: RelatedData;
  onSuccess: () => void;
};

const forms: {
  [key: string]: (props: FormRenderProps) => React.JSX.Element;
} = {
  teacher: (props) => <TeacherForm {...props} />,
  student: (props) => <StudentForm {...props} />,
  subject: (props) => <SubjectForm {...props} />,
  class: (props) => <ClassForm {...props} />,
  classSubject: (props) => <ClassSubjectForm {...props} />,
  parent: (props) => <ParentForm {...props} />,
  exam: (props) => <ExamForm {...props} />,
  assignment: (props) => <AssignmentForm {...props} />,
  attendance: (props) => <AttendanceForm {...props} />,
  result: (props) => <ResultForm {...props} />,
  period: (props) => <PeriodForm {...props} />,
  timetableSlot: (props) => <TimetableSlotForm {...props} />,
  lesson: (props) => <LessonForm {...props} />,
  logbook: (props) => <LogbookForm {...props} />,
  guardian: (props) => <GuardianForm {...props} />,
  staff: (props) => <StaffForm {...props} />,
  staffAttendance: (props) => <StaffAttendanceForm {...props} />,
  staffPerformance: (props) => <StaffPerformanceForm {...props} />,
  feeItem: (props) => <FeeItemForm {...props} />,
  invoice: (props) => <InvoiceForm {...props} />,
  payment: (props) => <PaymentForm {...props} />,
  salary: (props) => <SalaryForm {...props} />,
  expense: (props) => <ExpenseForm {...props} />,
  notification: (props) => <NotificationForm {...props} />,
  inventoryItem: (props) => <InventoryItemForm {...props} />,
  inventoryIssue: (props) => <InventoryIssueForm {...props} />,
  event: (props) => <EventForm {...props} />,
  announcement: (props) => <AnnouncementForm {...props} />,
};

/** Delete actions keyed by table; ids are numeric for everything but people. */
const deleteActions: {
  [key: string]: (id: any) => Promise<ActionState>;
} = {
  teacher: (id: string) => deleteTeacher(id),
  student: (id: string) => deleteStudent(id),
  parent: (id: string) => deleteParent(id),
  subject: (id: number) => deleteSubject(Number(id)),
  class: (id: number) => deleteClass(Number(id)),
  classSubject: (id: number) => deleteClassSubject(Number(id)),
  exam: (id: number) => deleteExam(Number(id)),
  assignment: (id: number) => deleteAssignment(Number(id)),
  attendance: (id: number) => deleteAttendance(Number(id)),
  result: (id: number) => deleteResult(Number(id)),
  period: (id: number) => deletePeriod(Number(id)),
  timetableSlot: (id: number) => deleteTimetableSlot(Number(id)),
  lesson: (id: number) => deleteLesson(Number(id)),
  logbook: (id: number) => deleteLogbookEntry(Number(id)),
  guardian: (id: number) => deleteGuardian(Number(id)),
  staff: (id: string) => deleteStaff(id),
  staffAttendance: (id: number) => deleteStaffAttendance(Number(id)),
  staffPerformance: (id: number) => deleteStaffPerformance(Number(id)),
  feeItem: (id: number) => deleteFeeItem(Number(id)),
  invoice: (id: number) => deleteInvoice(Number(id)),
  payment: (id: number) => deletePayment(Number(id)),
  salary: (id: number) => deleteSalaryRecord(Number(id)),
  expense: (id: number) => deleteExpense(Number(id)),
  notification: (id: number) => deleteNotification(Number(id)),
  inventoryItem: (id: number) => deleteInventoryItem(Number(id)),
  inventoryIssue: (id: number) => deleteInventoryIssue(Number(id)),
  event: (id: number) => deleteEvent(Number(id)),
  announcement: (id: number) => deleteAnnouncement(Number(id)),
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: {
  table:
  | "teacher"
  | "student"
  | "parent"
  | "subject"
  | "class"
  | "classSubject"
  | "exam"
  | "assignment"
  | "result"
  | "attendance"
  | "period"
  | "timetableSlot"
  | "lesson"
  | "logbook"
  | "guardian"
  | "staff"
  | "staffAttendance"
  | "staffPerformance"
  | "feeItem"
  | "invoice"
  | "payment"
  | "salary"
  | "expense"
  | "notification"
  | "inventoryItem"
  | "inventoryIssue"
  | "event"
  | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: string | number;
  relatedData?: RelatedData;
}) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-kamal-yellow"
      : type === "update"
        ? "bg-kamal-sky"
        : "bg-kamal-purple";

  const [open, setOpen] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const DeleteForm = () => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const action = deleteActions[table];

    if (!action) {
      return (
        <div className="p-4 text-center text-gray-500">
          Deleting a {table} is not supported yet.
        </div>
      );
    }

    const handleDelete = () => {
      startTransition(async () => {
        const result = await action(id);
        if (result.success) {
          toast.success(`${table.charAt(0).toUpperCase()}${table.slice(1)} deleted!`);
          setOpen(false);
          router.refresh();
        } else {
          setError(result.error);
          if (result.error) toast.error(result.error);
        }
      });
    };

    return (
      <div className="p-4 flex flex-col gap-4">
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        {error && <p className="text-sm text-center text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center disabled:opacity-60"
        >
          {isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  };

  const Form = () => {
    if (type === "delete") {
      return id ? <DeleteForm /> : <>Missing id!</>;
    }

    const render = forms[table];
    if (!render) {
      return (
        <div className="p-4 text-center text-gray-500">
          Form for {table} is not implemented yet.
        </div>
      );
    }

    return render({
      type,
      data,
      relatedData,
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
        aria-label={`${type} ${table}`}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div
          className="w-screen h-screen fixed left-0 top-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl relative w-full max-w-3xl my-8 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end p-4 border-b border-gray-100 shrink-0">
              <button
                className="cursor-pointer hover:bg-gray-100 rounded-full p-2 transition-all duration-200 hover:rotate-90"
                onClick={() => setOpen(false)}
                aria-label="Close modal"
              >
                <Image src="/close.png" alt="" width={20} height={20} />
              </button>
            </div>

            {/* Form content */}
            <div className="px-8 pb-8 pt-4 overflow-y-auto">
              <Form />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
