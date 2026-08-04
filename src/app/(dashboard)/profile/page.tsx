import Image from "next/image";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { roleLabel } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

const fieldClass = "flex flex-col gap-1 bg-kamal-sky-light p-4 rounded-md";
const fieldLabel = "text-xs text-gray-500 font-medium";
const fieldValue = "text-sm font-semibold text-gray-800";

type Profile =
  | {
      role: "admin";
      username: string;
    }
  | {
      role: "teacher";
      username: string;
      name: string;
      surname: string;
      email: string | null;
      phone: string | null;
      address: string;
      bloodType: string;
      sex: string;
      birthday: Date;
    }
  | {
      role: "student";
      username: string;
      name: string;
      surname: string;
      email: string | null;
      phone: string | null;
      address: string;
      bloodType: string;
      sex: string;
      birthday: Date;
      className: string;
      gradeLevel: number;
      parentName: string;
      parentPhone: string;
    }
  | {
      role: "parent";
      username: string;
      name: string;
      surname: string;
      email: string | null;
      phone: string;
      address: string;
      children: { name: string; surname: string; className: string }[];
    };

const ProfilePage = async () => {
  const { userId, role } = await requirePermission("profile.view");

  const profile: Profile | null = await (async () => {
    switch (role) {
      case "admin": {
        const row = await prisma.admin.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        return row ? { role: "admin" as const, username: row.username } : null;
      }
      case "teacher": {
        const row = await prisma.teacher.findUnique({
          where: { id: userId },
          select: {
            username: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            address: true,
            bloodType: true,
            sex: true,
            birthday: true,
          },
        });
        return row
          ? {
              role: "teacher" as const,
              username: row.username,
              name: row.name,
              surname: row.surname,
              email: row.email,
              phone: row.phone,
              address: row.address,
              bloodType: row.bloodType,
              sex: String(row.sex),
              birthday: row.birthday,
            }
          : null;
      }
      case "student": {
        const row = await prisma.student.findUnique({
          where: { id: userId },
          select: {
            username: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            address: true,
            bloodType: true,
            sex: true,
            birthday: true,
            class: { select: { name: true } },
            grade: { select: { level: true } },
            parent: { select: { name: true, surname: true, phone: true } },
          },
        });
        return row
          ? {
              role: "student" as const,
              username: row.username,
              name: row.name,
              surname: row.surname,
              email: row.email,
              phone: row.phone,
              address: row.address,
              bloodType: row.bloodType,
              sex: String(row.sex),
              birthday: row.birthday,
              className: row.class.name,
              gradeLevel: row.grade.level,
              parentName: `${row.parent.name} ${row.parent.surname}`,
              parentPhone: row.parent.phone,
            }
          : null;
      }
      case "parent": {
        const row = await prisma.parent.findUnique({
          where: { id: userId },
          select: {
            username: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            address: true,
            students: {
              select: {
                name: true,
                surname: true,
                class: { select: { name: true } },
              },
            },
          },
        });
        return row
          ? {
              role: "parent" as const,
              username: row.username,
              name: row.name,
              surname: row.surname,
              email: row.email,
              phone: row.phone,
              address: row.address,
              children: row.students.map((s) => ({
                name: s.name,
                surname: s.surname,
                className: s.class.name,
              })),
            }
          : null;
      }
      default:
        return null;
    }
  })();

  if (!profile) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-sm text-gray-400">Profile not found.</p>
      </div>
    );
  }

  const dateFormat = new Intl.DateTimeFormat("en-US");

  const renderFields = () => {
    if (profile.role === "admin") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={fieldClass}>
            <span className={fieldLabel}>Username</span>
            <span className={fieldValue}>{profile.username}</span>
          </div>
        </div>
      );
    }

    if (profile.role === "teacher" || profile.role === "student") {
      const isStudent = profile.role === "student";
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={fieldClass}>
            <span className={fieldLabel}>Full Name</span>
            <span className={fieldValue}>
              {profile.name} {profile.surname}
            </span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Username</span>
            <span className={fieldValue}>{profile.username}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Email</span>
            <span className={fieldValue}>{profile.email ?? "—"}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Phone</span>
            <span className={fieldValue}>{profile.phone ?? "—"}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Address</span>
            <span className={fieldValue}>{profile.address}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Blood Type</span>
            <span className={fieldValue}>{profile.bloodType}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Gender</span>
            <span className={`${fieldValue} capitalize`}>
              {profile.sex.toLowerCase()}
            </span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Birthday</span>
            <span className={fieldValue}>
              {dateFormat.format(profile.birthday)}
            </span>
          </div>
          {isStudent && (
            <>
              <div className={fieldClass}>
                <span className={fieldLabel}>Class</span>
                <span className={fieldValue}>{profile.className}</span>
              </div>
              <div className={fieldClass}>
                <span className={fieldLabel}>Grade</span>
                <span className={fieldValue}>Grade {profile.gradeLevel}</span>
              </div>
              <div className={fieldClass}>
                <span className={fieldLabel}>Parent</span>
                <span className={fieldValue}>
                  {profile.parentName} · {profile.parentPhone}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    // parent
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={fieldClass}>
            <span className={fieldLabel}>Full Name</span>
            <span className={fieldValue}>
              {profile.name} {profile.surname}
            </span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Username</span>
            <span className={fieldValue}>{profile.username}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Email</span>
            <span className={fieldValue}>{profile.email ?? "—"}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Phone</span>
            <span className={fieldValue}>{profile.phone}</span>
          </div>
          <div className={fieldClass}>
            <span className={fieldLabel}>Address</span>
            <span className={fieldValue}>{profile.address}</span>
          </div>
        </div>
        {profile.children.length > 0 && (
          <div className={fieldClass}>
            <span className={fieldLabel}>Children</span>
            <span className={fieldValue}>
              {profile.children
                .map((c) => `${c.name} ${c.surname} (${c.className})`)
                .join(", ")}
            </span>
          </div>
        )}
      </div>
    );
  };

  const displayName =
    profile.role === "admin"
      ? profile.username
      : profile.role === "parent"
        ? `${profile.name} ${profile.surname}`
        : `${profile.name} ${profile.surname}`;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center gap-4">
        <Image
          src="/avatar.png"
          alt="Profile"
          width={64}
          height={64}
          className="rounded-full"
        />
        <div>
          <h1 className="text-xl font-semibold">{displayName}</h1>
          <p className="text-sm text-gray-500 capitalize">
            {roleLabel(role as Role)}
          </p>
          <p className="text-xs text-gray-400 mt-1">ID: {userId}</p>
        </div>
      </div>
      <div className="mt-6">{renderFields()}</div>
    </div>
  );
};

export default ProfilePage;
