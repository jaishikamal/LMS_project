"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { saveResult } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import InputField from "../InputField";
import SelectField from "../SelectField";
import type { AssessmentOption, ResultStudentOption } from "../FormModal";

type ResultFormValues = {
  assessment: string;
  studentId: string;
  score: string;
};

const ResultForm = ({
  type,
  data,
  relatedData,
  onSuccess,
}: {
  type: "create" | "update";
  data?: any;
  /**
   * `assessments` is every exam/assignment the current user may grade (teacher
   * → their own class subjects, admin → all), and `resultStudents` the
   * students they may grade, each carrying the class it belongs to so the
   * student options can be narrowed to the selected assessment's class.
   */
  relatedData?: {
    assessments?: AssessmentOption[];
    resultStudents?: ResultStudentOption[];
  };
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({
    success: false,
    error: null,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResultFormValues>({
    defaultValues: {
      assessment: data?.examId
        ? `exam:${data.examId}`
        : data?.assignmentId
          ? `assignment:${data.assignmentId}`
          : "",
      studentId: data?.studentId ?? "",
      score: data?.score !== undefined ? String(data.score) : "",
    },
  });

  const selectedAssessment = watch("assessment");
  const assessments = relatedData?.assessments ?? [];
  const resultStudents = relatedData?.resultStudents ?? [];

  const selectedClassId = assessments.find(
    (item) => item.value === selectedAssessment
  )?.classId;

  // Narrow the students to the assessment's class once one is picked.
  const studentOptions = selectedClassId
    ? resultStudents.filter((item) => item.classId === selectedClassId)
    : resultStudents;

  const onSubmit = handleSubmit((values) => {
    if (!values.assessment) {
      setState({ success: false, error: "Pick an exam or assignment." });
      return;
    }
    const match = /^(exam|assignment):(\d+)$/.exec(values.assessment);
    if (!match) {
      setState({ success: false, error: "Pick an exam or assignment." });
      return;
    }
    if (!values.studentId) {
      setState({ success: false, error: "Pick a student." });
      return;
    }

    const score = Number(values.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setState({
        success: false,
        error: "Score must be a whole number between 0 and 100.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveResult(state, {
        id: data?.id,
        score,
        studentId: values.studentId,
        ...(match[1] === "exam"
          ? { examId: Number(match[2]) }
          : { assignmentId: Number(match[2]) }),
      });
      setState(result);

      if (result.success) {
        toast.success(
          type === "create" ? "Result recorded!" : "Result updated!"
        );
        router.refresh();
        onSuccess?.();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Record a result" : "Update result"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {assessments.length > 0 ? (
          <SelectField
            label="Assessment"
            name="assessment"
            register={register}
            options={assessments}
            defaultValue={data?.examId
              ? `exam:${data.examId}`
              : data?.assignmentId
                ? `assignment:${data.assignmentId}`
                : undefined}
            error={errors.assessment}
            placeholder="Select an exam or assignment"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            No assessments available.
          </p>
        )}
        {studentOptions.length > 0 ? (
          <SelectField
            label="Student"
            name="studentId"
            register={register}
            options={studentOptions}
            defaultValue={data?.studentId}
            error={errors.studentId}
            placeholder="Select a student"
          />
        ) : (
          <p className="text-xs text-gray-400 self-end mb-2">
            {selectedAssessment
              ? "No students in this class."
              : "Pick an assessment to see its students."}
          </p>
        )}
        <InputField
          label="Score (0-100)"
          name="score"
          type="number"
          inputProps={{ min: 0, max: 100 }}
          defaultValue={
            data?.score !== undefined ? String(data.score) : undefined
          }
          register={register}
          error={errors.score}
        />
      </div>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60"
      >
        {isPending ? "Saving..." : type === "create" ? "Save" : "Update"}
      </button>
    </form>
  );
};

export default ResultForm;
