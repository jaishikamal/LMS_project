// 7-grade marking scale used to auto-calculate a grade from a 0-100 score.
// Shared by server (display) and client (bulk entry preview), so it lives in
// its own module without any Prisma dependency.

export const GRADES = ["A1", "A2", "B1", "B2", "C1", "C2", "D"] as const;
export type Grade = (typeof GRADES)[number];

const GRADE_SCALE: { grade: Grade; min: number }[] = [
  { grade: "A1", min: 91 },
  { grade: "A2", min: 81 },
  { grade: "B1", min: 71 },
  { grade: "B2", min: 61 },
  { grade: "C1", min: 51 },
  { grade: "C2", min: 41 },
  { grade: "D", min: 0 },
];

/** Returns the 7-grade letter for a 0-100 score (clamped). */
export const gradeFromScore = (score: number): Grade => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const band of GRADE_SCALE) {
    if (clamped >= band.min) return band.grade;
  }
  return "D";
};
