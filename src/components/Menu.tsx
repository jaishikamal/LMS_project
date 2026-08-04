import type { PermissionKey } from "@/lib/permissions";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

const menuItems: { title: string; items: { icon: string; label: string; href: string; permission: PermissionKey }[] }[] = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        permission: "home.view",
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        permission: "teachers.view",
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        permission: "students.view",
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        permission: "parents.view",
      },
      {
        icon: "/parent.png",
        label: "Guardians",
        href: "/list/guardians",
        permission: "guardians.view",
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        permission: "subjects.view",
      },
      {
        icon: "/subject.png",
        label: "Class Subjects",
        href: "/list/classSubjects",
        permission: "classSubjects.view",
      },
      {
        icon: "/staff.png",
        label: "Staff",
        href: "/list/staff",
        permission: "staff.view",
      },
      {
        icon: "/fee.png",
        label: "Fees",
        href: "/list/fees",
        permission: "fees.view",
      },
      {
        icon: "/invoice.png",
        label: "Invoices",
        href: "/list/invoices",
        permission: "invoices.view",
      },
      {
        icon: "/payment.png",
        label: "Payments",
        href: "/list/payments",
        permission: "payments.view",
      },
      {
        icon: "/salary.png",
        label: "Salaries",
        href: "/list/salaries",
        permission: "salaries.view",
      },
      {
        icon: "/expense.png",
        label: "Expenses",
        href: "/list/expenses",
        permission: "expenses.view",
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        permission: "classes.view",
      },
      {
        icon: "/exam.png",
        label: "Exams",
        href: "/list/exams",
        permission: "exams.view",
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/list/assignments",
        permission: "assignments.view",
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        permission: "results.view",
      },
      {
        icon: "/result.png",
        label: "Hall Tickets",
        href: "/list/hall-tickets",
        permission: "halltickets.view",
      },
      {
        icon: "/result.png",
        label: "Reports",
        href: "/list/reports",
        permission: "reports.view",
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        permission: "attendance.view",
      },
      {
        icon: "/calendar.png",
        label: "Timetable",
        href: "/list/timetable",
        permission: "timetable.view",
      },
      {
        icon: "/subject.png",
        label: "Lesson Plans",
        href: "/list/lessons",
        permission: "lessons.view",
      },
      {
        icon: "/assignment.png",
        label: "Logbook",
        href: "/list/logbook",
        permission: "logbook.view",
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        permission: "events.view",
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        permission: "messages.view",
      },
      {
        icon: "/notification.png",
        label: "Notifications",
        href: "/list/notifications",
        permission: "notifications.view",
      },
      {
        icon: "/inventory.png",
        label: "Inventory",
        href: "/list/inventory",
        permission: "inventory.view",
      },
      {
        icon: "/inventoryIssue.png",
        label: "Issue & Return",
        href: "/list/inventory/issues",
        permission: "inventory.issue.manage",
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        permission: "announcements.view",
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        permission: "profile.view",
      },
      {
        icon: "/audit.png",
        label: "Audit Log",
        href: "/list/audit",
        permission: "audit.view",
      },
      {
        icon: "/audit.png",
        label: "Relationships",
        href: "/list/relationships",
        permission: "relationships.view",
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        permission: "settings.manage",
      },
      {
        icon: "/setting.png",
        label: "Permissions",
        href: "/list/permissions",
        permission: "permissions.manage",
      },
    ],
  },
];

const itemClassName =
  "flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-kamal-sky-light";

const Menu = ({ permissions }: { permissions: PermissionKey[] }) => {
  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (permissions.includes(item.permission)) {
              return (
                <Link href={item.href} key={item.label} className={itemClassName}>
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              );
            }
            return null;
          })}
          {i.title === "OTHER" && (
            <LogoutButton className={`${itemClassName} cursor-pointer`} />
          )}
        </div>
      ))}
    </div>
  );
};

export default Menu;
