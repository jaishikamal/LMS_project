"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState,useEffect } from "react";

// USE LAZY LOADING

// import TeacherForm from "./forms/TeacherForm";
// import StudentForm from "./forms/StudentForm";

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});

const forms: {
  [key: string]: (type: "create" | "update", data?: any) => React.JSX.Element;
} = {
  teacher: (type, data) => <TeacherForm type={type} data={data} />,
  student: (type, data) => <StudentForm type={type} data={data} />
};

const FormModal = ({
  table,
  type,
  data,
  id,
}: {
  table:
  | "teacher"
  | "student"
  | "parent"
  | "subject"
  | "class"
  | "lesson"
  | "exam"
  | "assignment"
  | "result"
  | "attendance"
  | "event"
  | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number;
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

  const Form = () => {
    return type === "delete" && id ? (
      <form action="" className="p-4 flex flex-col gap-4">
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center">
          Delete
        </button>
      </form>
    ) : type === "create" || type === "update" ? (
      forms[table] ? (
        forms[table](type, data)
      ) : (
        <div className="p-4 text-center text-gray-500">
          Form for {table} is not implemented yet.
        </div>
      )
    ) : (
      "Form not found!"
    );
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
          className="w-screen h-screen fixed left-0 top-0  bg-opacity-40 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            // Close when clicking backdrop
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl relative w-full max-w-3xl my-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end p-4 border-b border-gray-100">
              <button
                className="cursor-pointer hover:bg-gray-100 rounded-full p-2 transition-all duration-200 hover:rotate-90"
                onClick={() => setOpen(false)}
                aria-label="Close modal"
              >
                <Image src="/close.png" alt="" width={20} height={20} />
              </button>
            </div>

            {/* Form content */}
            <div className="px-8 pb-8 pt-4">
              <Form />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
