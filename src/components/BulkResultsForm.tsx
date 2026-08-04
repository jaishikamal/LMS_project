"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { saveBulkResults } from "@/lib/actions";
import { gradeFromScore } from "@/lib/grades";

type AssessmentOption = {
  value: string;
  label: string;
  classId: number;
};

type StudentOption = {
  id: string;
  label: string;
  classId: number;
};

const BulkResultsForm = ({
  assessments,
  students,
}: {
  assessments: AssessmentOption[];
  students: StudentOption[];
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assessmentValue, setAssessmentValue] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});

  const selected = assessments.find((assessment) => assessment.value === assessmentValue);
  const roster = selected ? students.filter((student) => student.classId === selected.classId) : [];

  const handleSubmit = () => {
    const assessment = selected;
    if (!assessment) {
      toast.error("Pick an exam or assignment first.");
      return;
    }
    const [type, id] = assessment.value.split(":");

    const marks = roster
      .map((student) => ({
        studentId: student.id,
        score: Number(scores[student.id]),
      }))
      .filter((mark) => scores[mark.studentId] !== undefined && scores[mark.studentId] !== "");

    if (marks.length === 0) {
      toast.error("Enter at least one score.");
      return;
    }

    startTransition(async () => {
      const result = await saveBulkResults(
        { success: false, error: null },
        {
          examId: type === "exam" ? Number(id) : undefined,
          assignmentId: type === "assignment" ? Number(id) : undefined,
          marks,
        }
      );
      if (result.success) {
        toast.success("Results saved!");
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Exam or Assignment
          <select
            value={assessmentValue}
            onChange={(e) => setAssessmentValue(e.target.value)}
            className="text-sm px-3 py-2 rounded-md border border-gray-300"
          >
            <option value="">Select an assessment</option>
            {assessments.map((assessment) => (
              <option key={assessment.value} value={assessment.value}>
                {assessment.label}
              </option>
            ))}
          </select>
        </label>
        <div className="self-end text-sm text-gray-500">
          {roster.length} student{roster.length === 1 ? "" : "s"} in this class
        </div>
      </div>

      {selected && (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-kamal-sky text-white">
                <th className="p-3 text-left">Student</th>
                <th className="p-3 text-center w-32">Score (0-100)</th>
                <th className="p-3 text-center w-24">Grade</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const rawScore = scores[student.id];
                const score = rawScore !== undefined ? Number(rawScore) : NaN;
                const valid = Number.isFinite(score) && score >= 0 && score <= 100;
                return (
                  <tr key={student.id} className="border-t border-gray-200">
                    <td className="p-3">{student.label}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rawScore ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({ ...prev, [student.id]: e.target.value }))
                        }
                        className="w-24 text-sm px-2 py-1 border border-gray-300 rounded-md"
                      />
                    </td>
                    <td className="p-3 text-center font-medium">
                      {valid ? gradeFromScore(score) : "—"}
                    </td>
                  </tr>
                );
              })}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">
                    No students in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60 self-start px-6"
      >
        {isPending ? "Saving..." : "Save all scores"}
      </button>
    </div>
  );
};

export default BulkResultsForm;
