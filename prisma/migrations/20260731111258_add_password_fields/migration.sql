/*
  Warnings:

  - Added the required column `password` to the `Admin` table.
  - Added the required column `password` to the `Parent` table.
  - Added the required column `password` to the `Student` table.
  - Added the required column `password` to the `Teacher` table.

  A temporary default (bcrypt hash of "changeme123") backfills existing rows,
  then is dropped so future inserts must supply a real password.
*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$4hL8O5OCc0p0zVmv.anhe.mNJrVXw7rS4EbW07Nvx2PHHb9VdKeBi';
ALTER TABLE "Admin" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$4hL8O5OCc0p0zVmv.anhe.mNJrVXw7rS4EbW07Nvx2PHHb9VdKeBi';
ALTER TABLE "Parent" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$4hL8O5OCc0p0zVmv.anhe.mNJrVXw7rS4EbW07Nvx2PHHb9VdKeBi';
ALTER TABLE "Student" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$4hL8O5OCc0p0zVmv.anhe.mNJrVXw7rS4EbW07Nvx2PHHb9VdKeBi';
ALTER TABLE "Teacher" ALTER COLUMN "password" DROP DEFAULT;
