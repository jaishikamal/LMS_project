"use client";

import React, { useState } from "react";
import type { PermissionKey } from "@/lib/permissions";
import { usePathname } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import {
  SmsLogoIcon,
  MenuToggleIcon,
  CollegeBadgeIcon,
  DashboardIcon,
  UsersIcon,
  ShieldIcon,
  StudentIcon,
  ParentIcon,
  TeacherIcon,
  ClassIcon,
  SubjectIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DollarIcon,
  SettingsIcon,
  // New distinct icons
  ExamIcon,
  AssignmentIcon,
  ResultsIcon,
  LessonPlanIcon,
  LogbookIcon,
  TimetableIcon,
  StaffIcon,
  SalaryIcon,
  FeesIcon,
  InvoiceIcon,
  PaymentIcon,
  ExpensesIcon,
  InventoryIcon,
  IssueReturnIcon,
  EventsIcon,
  MessagesIcon,
  NotificationsIcon,
  AnnouncementsIcon,
  AuditIcon,
  RelationshipsIcon,
  LeaveIcon,
} from "./icons/SidebarIcons";

export interface MenuItemConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  permission: PermissionKey;
  subItems?: { label: string; href: string; permission: PermissionKey }[];
}

export interface MenuSectionConfig {
  title: string;
  items: MenuItemConfig[];
}

const menuSections: MenuSectionConfig[] = [
  {
    title: "MAIN",
    items: [
      {
        icon: DashboardIcon,
        label: "Dashboard",
        href: "/",
        permission: "home.view",
      },
    ],
  },
  {
    title: "USER MANAGEMENT",
    items: [
      {
        icon: ShieldIcon,
        label: "Roles & Permissions",
        href: "/list/permissions",
        permission: "permissions.manage",
      },
    ],
  },
  {
    title: "PEOPLES",
    items: [
      {
        icon: StudentIcon,
        label: "Students",
        href: "/list/students",
        permission: "students.view",
        subItems: [
          { label: "All Students", href: "/list/students", permission: "students.view" },
          { label: "Hall Tickets", href: "/list/hall-tickets", permission: "halltickets.view" },
          { label: "Reports", href: "/list/reports", permission: "reports.view" },
        ],
      },
      {
        icon: ParentIcon,
        label: "Parents",
        href: "/list/parents",
        permission: "parents.view",
        subItems: [
          { label: "All Parents", href: "/list/parents", permission: "parents.view" },
          { label: "Guardians", href: "/list/guardians", permission: "guardians.view" },
        ],
      },
      {
        icon: TeacherIcon,
        label: "Teachers",
        href: "/list/teachers",
        permission: "teachers.view",
        subItems: [
          { label: "All Teachers", href: "/list/teachers", permission: "teachers.view" },
          { label: "Staff", href: "/list/staff", permission: "staff.view" },
        ],
      },
    ],
  },
  {
    title: "ACADEMIC",
    items: [
      {
        icon: ClassIcon,
        label: "Classes",
        href: "/list/classes",
        permission: "classes.view",
        subItems: [
          { label: "All Classes", href: "/list/classes", permission: "classes.view" },
          { label: "Class Subjects", href: "/list/classSubjects", permission: "classSubjects.view" },
        ],
      },
      {
        icon: SubjectIcon,
        label: "Subject",
        href: "/list/subjects",
        permission: "subjects.view",
      },
      {
        icon: ExamIcon,
        label: "Exams",
        href: "/list/exams",
        permission: "exams.view",
      },
      {
        icon: AssignmentIcon,
        label: "Assignments",
        href: "/list/assignments",
        permission: "assignments.view",
      },
      {
        icon: ResultsIcon,
        label: "Results",
        href: "/list/results",
        permission: "results.view",
      },
      {
        icon: LessonPlanIcon,
        label: "Lesson Plans",
        href: "/list/lessons",
        permission: "lessons.view",
      },
      {
        icon: LogbookIcon,
        label: "Logbook",
        href: "/list/logbook",
        permission: "logbook.view",
      },
      {
        icon: TimetableIcon,
        label: "Timetable",
        href: "/list/timetable",
        permission: "timetable.view",
      },
    ],
  },
  {
    title: "HRM",
    items: [
      {
        icon: LeaveIcon,
        label: "Attendance",
        href: "/list/attendance",
        permission: "attendance.view",
      },
      {
        icon: StaffIcon,
        label: "Staff",
        href: "/list/staff",
        permission: "staff.view",
      },
      {
        icon: SalaryIcon,
        label: "Salaries",
        href: "/list/salaries",
        permission: "salaries.view",
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      {
        icon: FeesIcon,
        label: "Fees",
        href: "/list/fees",
        permission: "fees.view",
      },
      {
        icon: InvoiceIcon,
        label: "Invoices",
        href: "/list/invoices",
        permission: "invoices.view",
      },
      {
        icon: PaymentIcon,
        label: "Payments",
        href: "/list/payments",
        permission: "payments.view",
      },
      {
        icon: ExpensesIcon,
        label: "Expenses",
        href: "/list/expenses",
        permission: "expenses.view",
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: InventoryIcon,
        label: "Inventory",
        href: "/list/inventory",
        permission: "inventory.view",
      },
      {
        icon: IssueReturnIcon,
        label: "Issue & Return",
        href: "/list/inventory/issues",
        permission: "inventory.issue.manage",
      },
      {
        icon: EventsIcon,
        label: "Events",
        href: "/list/events",
        permission: "events.view",
      },
      {
        icon: MessagesIcon,
        label: "Messages",
        href: "/list/messages",
        permission: "messages.view",
      },
      {
        icon: NotificationsIcon,
        label: "Notifications",
        href: "/list/notifications",
        permission: "notifications.view",
      },
      {
        icon: AnnouncementsIcon,
        label: "Announcements",
        href: "/list/announcements",
        permission: "announcements.view",
      },
      {
        icon: ParentIcon,
        label: "Profile",
        href: "/profile",
        permission: "profile.view",
      },
      {
        icon: AuditIcon,
        label: "Audit Log",
        href: "/list/audit",
        permission: "audit.view",
      },
      {
        icon: RelationshipsIcon,
        label: "Relationships",
        href: "/list/relationships",
        permission: "relationships.view",
      },
      {
        icon: SettingsIcon,
        label: "Settings",
        href: "/settings",
        permission: "settings.manage",
      },
    ],
  },
];

interface MenuProps {
  permissions: PermissionKey[];
  schoolName?: string;
  schoolLogo?: string;
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

const Menu: React.FC<MenuProps> = ({
  permissions,
  schoolName = "Everest College",
  schoolLogo,
  onToggleSidebar,
  isCollapsed = false,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="w-full flex flex-col min-h-full bg-white select-none">
      {/* HEADER LOGO BAR */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 group">
          <SmsLogoIcon className="w-28 h-9" />
        </Link>
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Toggle Menu"
        >
          <MenuToggleIcon className="w-5 h-5" />
        </button>
      </div>

      {/* COLLEGE / SCHOOL SELECTOR CARD */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-xs flex items-center gap-3 transition-all hover:border-indigo-200">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
              {schoolLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={schoolLogo} alt="" className="w-6 h-6 object-contain rounded-sm" />
              ) : (
                <CollegeBadgeIcon className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-slate-800 text-sm truncate leading-tight">
                {schoolName}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* MENU CATEGORIES */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-4">
        {menuSections.map((section) => {
          // Filter items allowed by permissions
          const allowedItems = section.items.filter(
            (item) =>
              permissions.includes(item.permission) ||
              item.subItems?.some((sub) => permissions.includes(sub.permission))
          );

          if (allowedItems.length === 0) return null;

          return (
            <div key={section.title} className="flex flex-col gap-1">
              {/* CATEGORY HEADER WITH HORIZONTAL DIVIDER LINE */}
              {!isCollapsed && (
                <div className="flex items-center gap-2 mt-2 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    {section.title}
                  </span>
                  <div className="h-[1px] w-full bg-slate-200/80" />
                </div>
              )}

              {/* MENU ITEMS */}
              {allowedItems.map((item) => {
                const ItemIcon = item.icon;
                const active = isActive(item.href);
                const hasSub = !!(item.subItems && item.subItems.length > 0);
                const isExpanded = !!expandedItems[item.label];
                const activeChild = item.subItems?.some((sub) => isActive(sub.href));

                const allowedSubItems = item.subItems?.filter((sub) =>
                  permissions.includes(sub.permission)
                );

                return (
                  <div key={item.label} className="flex flex-col">
                    <div className="flex items-center">
                      <Link
                        href={item.href || "#"}
                        className={`group relative w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all ${
                          active || activeChild
                            ? "bg-indigo-50/90 text-indigo-600 font-semibold shadow-2xs"
                            : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                        }`}
                      >
                        {/* ICON CONTAINER */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            active || activeChild
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-slate-100/90 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>

                        {/* LABEL */}
                        {!isCollapsed && (
                          <span className="text-sm font-medium leading-none flex-1 truncate">
                            {item.label}
                          </span>
                        )}

                        {/* CHEVRON ARROW FOR EXPANDABLE ITEMS */}
                        {!isCollapsed && hasSub && (
                          <button
                            onClick={(e) => toggleExpand(item.label, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-4 h-4" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </Link>
                    </div>

                    {/* EXPANDABLE SUBMENU */}
                    {!isCollapsed && hasSub && isExpanded && allowedSubItems && (
                      <div className="ml-7 mt-1 pl-3 border-l border-slate-200/80 flex flex-col gap-1">
                        {allowedSubItems.map((sub) => {
                          const subActive = isActive(sub.href);
                          return (
                            <Link
                              key={sub.label}
                              href={sub.href}
                              className={`text-xs py-1.5 px-2 rounded-lg transition-colors ${
                                subActive
                                  ? "text-indigo-600 font-semibold bg-indigo-50/60"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* LOGOUT BUTTON IN OTHER SECTION */}
              {section.title === "OTHER" && (
                <LogoutButton className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full cursor-pointer group mt-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Menu;
