-- Remove the Lesson entity: exams/assignments re-anchor to Class,
-- attendance becomes daily per-student, and the Lessons UI is removed.

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_lessonId_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "lessonId";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "lessonId";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "lessonId";

-- DropTable
DROP TABLE "Lesson";

-- DropEnum
DROP TYPE "Day";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "classId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN "classId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
