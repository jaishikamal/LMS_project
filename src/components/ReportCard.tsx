"use client";

import { useRouter } from "next/navigation";
import { gradeFromScore } from "@/lib/grades";

type ReportRow = {
  subject: string;
  average: number | null;
  attendancePct: number | null;
};

const ReportCard = ({
  schoolName,
  studentName,
  className,
  canSelect,
  classes,
  students,
  selectedStudentId,
  rows,
  overallAverage,
}: {
  schoolName: string;
  studentName: string;
  className: string;
  canSelect: boolean;
  classes: { id: number; name: string }[];
  students: {
    id: string;
    name: string;
    surname: string;
    classId: number;
    className: string;
  }[];
  selectedStudentId?: string;
  rows: ReportRow[];
  overallAverage: number | null;
}) => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      {canSelect && (
        <div className="no-print flex flex-col md:flex-row items-start md:items-center gap-3">
          <label className="text-sm font-medium flex items-center gap-2">
            Student
            <select
              value={selectedStudentId ?? ""}
              onChange={(e) => router.push(`/list/reports?studentId=${e.target.value}`)}
              className="text-sm px-3 py-2 rounded-md border border-gray-300"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.surname} · {student.className}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-kamal-yellow text-gray-800 text-sm px-4 py-2 rounded-md md:ml-auto"
          >
            Print report card
          </button>
        </div>
      )}
      {!canSelect && (
        <div className="no-print flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-kamal-yellow text-gray-800 text-sm px-4 py-2 rounded-md"
          >
            Print report card
          </button>
        </div>
      )}

      <div className="border-2 border-gray-300 rounded-lg p-6">
        <div className="text-center border-b-2 border-gray-300 pb-4">
          <div className="text-xl font-bold text-kamal-sky">{schoolName}</div>
          <div className="text-sm text-gray-500">Student Progress Report</div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 py-4 border-b border-gray-200">
          <div className="flex-1">
            <span className="text-gray-500 text-sm">Student</span>
            <div className="font-medium">{studentName}</div>
          </div>
          <div className="flex-1">
            <span className="text-gray-500 text-sm">Class</span>
            <div className="font-medium">{className}</div>
          </div>
        </div>

        <table className="w-full border-collapse text-sm mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Subject</th>
              <th className="p-2 text-center">Average Score</th>
              <th className="p-2 text-center">Grade</th>
              <th className="p-2 text-center">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.subject} className="border-t border-gray-200">
                <td className="p-2">{row.subject}</td>
                <td className="p-2 text-center">
                  {row.average === null ? "—" : row.average}
                </td>
                <td className="p-2 text-center font-medium">
                  {row.average === null ? "—" : gradeFromScore(row.average)}
                </td>
                <td className="p-2 text-center">
                  {row.attendancePct === null ? "—" : `${row.attendancePct}%`}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  No subjects found for this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end items-center gap-6 mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">Overall Average</span>
          <span className="text-xl font-bold text-kamal-sky">
            {overallAverage === null ? "—" : overallAverage}
          </span>
          <span className="text-xl font-bold text-kamal-sky">
            {overallAverage === null ? "" : gradeFromScore(overallAverage)}
          </span>
        </div>
      </div>

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

export default ReportCard;
