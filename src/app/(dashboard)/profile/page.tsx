import Image from "next/image";
import ProfileAvatarUpload from "@/components/ProfileAvatarUpload";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { roleLabel } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

const fieldLabel = "text-xs text-gray-400 font-medium";
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
      img: string | null;
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
      img: string | null;
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
            img: true,
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
              img: row.img,
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
            img: true,
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
              img: row.img,
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

  const FIELD_ICONS: Record<string, string> = {
    name: "/profile.png",
    username: "/profile.png",
    email: "/mail.png",
    phone: "/phone.png",
    address: "/singleBranch.png",
    blood: "/blood.png",
    gender: "/maleFemale.png",
    birthday: "/calendar.png",
    class: "/singleClass.png",
    grade: "/class.png",
    parent: "/parent.png",
    children: "/parent.png",
  };

  const Field = ({
    icon,
    label,
    value,
  }: {
    icon: string;
    label: string;
    value: string;
  }) => (
    <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-kamal-purple/50 hover:-translate-y-0.5 transition-all">
      <div className="w-11 h-11 rounded-xl bg-kamal-purple-light flex items-center justify-center shrink-0">
        <Image src={icon} alt="" width={22} height={22} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className={fieldLabel}>{label}</span>
        <span className={`${fieldValue} truncate`}>{value}</span>
      </div>
    </div>
  );

  const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  const renderFields = () => {
    if (profile.role === "admin") {
      return (
        <div className={gridClass}>
          <Field
            icon={FIELD_ICONS.username}
            label="Username"
            value={profile.username}
          />
        </div>
      );
    }

    if (profile.role === "teacher" || profile.role === "student") {
      const isStudent = profile.role === "student";
      const fields = [
        {
          icon: FIELD_ICONS.name,
          label: "Full Name",
          value: `${profile.name} ${profile.surname}`,
        },
        { icon: FIELD_ICONS.username, label: "Username", value: profile.username },
        { icon: FIELD_ICONS.email, label: "Email", value: profile.email ?? "—" },
        { icon: FIELD_ICONS.phone, label: "Phone", value: profile.phone ?? "—" },
        { icon: FIELD_ICONS.address, label: "Address", value: profile.address },
        { icon: FIELD_ICONS.blood, label: "Blood Type", value: profile.bloodType },
        {
          icon: FIELD_ICONS.gender,
          label: "Gender",
          value: profile.sex.toLowerCase(),
        },
        {
          icon: FIELD_ICONS.birthday,
          label: "Birthday",
          value: dateFormat.format(profile.birthday),
        },
        ...(isStudent
          ? [
              { icon: FIELD_ICONS.class, label: "Class", value: profile.className },
              {
                icon: FIELD_ICONS.grade,
                label: "Grade",
                value: `Grade ${profile.gradeLevel}`,
              },
              {
                icon: FIELD_ICONS.parent,
                label: "Parent",
                value: `${profile.parentName} · ${profile.parentPhone}`,
              },
            ]
          : []),
      ];

      return (
        <div className={gridClass}>
          {fields.map((f) => (
            <Field key={f.label} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      );
    }

    // parent
    const fields = [
      {
        icon: FIELD_ICONS.name,
        label: "Full Name",
        value: `${profile.name} ${profile.surname}`,
      },
      { icon: FIELD_ICONS.username, label: "Username", value: profile.username },
      { icon: FIELD_ICONS.email, label: "Email", value: profile.email ?? "—" },
      { icon: FIELD_ICONS.phone, label: "Phone", value: profile.phone },
      { icon: FIELD_ICONS.address, label: "Address", value: profile.address },
      ...(profile.children.length > 0
        ? [
            {
              icon: FIELD_ICONS.children,
              label: "Children",
              value: profile.children
                .map((c) => `${c.name} ${c.surname} (${c.className})`)
                .join(", "),
            },
          ]
        : []),
    ];

    return (
      <div className={gridClass}>
        {fields.map((f) => (
          <Field key={f.label} icon={f.icon} label={f.label} value={f.value} />
        ))}
      </div>
    );
  };

  const avatar =
    profile.role === "admin"
      ? "/avatar.png"
      : profile.role === "parent"
        ? "/avatar.png"
        : profile.img || "/avatar.png";

  const displayName =
    profile.role === "admin"
      ? profile.username
      : `${profile.name} ${profile.surname}`;

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-kamal-purple via-kamal-sky to-kamal-yellow p-7">
        <div className="absolute -top-12 -right-10 w-52 h-52 rounded-full bg-white/20" />
        <div className="absolute top-6 right-28 w-16 h-16 rounded-full bg-white/20" />
        <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <ProfileAvatarUpload
            avatar={avatar}
            editable={role === "teacher" || role === "student"}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{displayName}</h1>
            <p className="mt-2 inline-flex items-center text-sm font-medium bg-white/70 text-gray-700 px-3 py-1 rounded-full capitalize">
              {roleLabel(role as Role)}
            </p>
            <p className="mt-2 text-xs font-medium text-gray-600">
              Member ID · {userId}
            </p>
          </div>
          <div className="hidden sm:block shrink-0 text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-700/60">
              Role
            </p>
            <p className="mt-1 text-lg font-bold text-gray-700 capitalize">
              {roleLabel(role as Role)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Personal Information
        </h2>
        <div className="h-px flex-1 bg-gray-200 rounded-full" />
      </div>

      {renderFields()}
    </div>
  );
};

export default ProfilePage;
