"use client";

import { useRouter } from "next/navigation";

type ClassOption = { id: number; name: string };
type ExamOption = {
  id: number;
  title: string;
  subject: string;
  className: string;
  classId: number;
  startTime: string;
  endTime: string;
};
type StudentOption = {
  id: string;
  name: string;
  surname: string;
  classId: number;
  className: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const HallTickets = ({
  classes,
  exams,
  students,
  selectedClassId,
  selectedExamId,
  schoolName,
}: {
  classes: ClassOption[];
  exams: ExamOption[];
  students: StudentOption[];
  selectedClassId: number | undefined;
  selectedExamId: number | undefined;
  schoolName: string;
}) => {
  const router = useRouter();

  const classExams = selectedClassId
    ? exams.filter((exam) => exam.classId === selectedClassId)
    : [];

  const exam = classExams.find((item) => item.id === selectedExamId) ?? classExams[0];
  const roster = selectedClassId
    ? students.filter((student) => student.classId === selectedClassId)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col md:flex-row items-start md:items-center gap-3">
        <label className="text-sm font-medium flex items-center gap-2">
          Class
          <select
            value={selectedClassId ?? ""}
            onChange={(e) =>
              router.push(`/list/hall-tickets?classId=${e.target.value}`)
            }
            className="text-sm px-3 py-2 rounded-md border border-gray-300"
          >
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium flex items-center gap-2">
          Exam
          <select
            value={exam?.id ?? ""}
            onChange={(e) =>
              router.push(
                `/list/hall-tickets?classId=${selectedClassId}&examId=${e.target.value}`
              )
            }
            className="text-sm px-3 py-2 rounded-md border border-gray-300"
          >
            {classExams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.subject}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => window.print()}
          className="bg-kamal-yellow text-gray-800 text-sm px-4 py-2 rounded-md md:ml-auto"
        >
          Print hall tickets
        </button>
      </div>

      {!exam || roster.length === 0 ? (
        <p className="text-sm text-gray-500">
          {classExams.length === 0
            ? "No exams scheduled for this class yet."
            : "No students in this class."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roster.map((student, index) => (
            <div
              key={student.id}
              className="border-2 border-kamal-sky rounded-lg p-4 flex flex-col gap-2 text-sm"
            >
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-2">
                <div className="font-bold text-base text-kamal-sky">{schoolName}</div>
                <div className="text-xs text-gray-500">ADMIT CARD</div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Student</span>
                <span className="font-medium">{student.name} {student.surname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Class</span>
                <span className="font-medium">{student.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seat No.</span>
                <span className="font-medium">
                  {student.classId}-{String(index + 1).padStart(3, "0")}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subject</span>
                  <span className="font-medium">{exam.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date &amp; Time</span>
                  <span className="font-medium">{formatDateTime(exam.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Venue</span>
                  <span className="font-medium">{exam.className}</span>
                </div>
              </div>
              <div className="text-center text-xs text-gray-400 mt-1">
                {exam.title}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HallTickets;
