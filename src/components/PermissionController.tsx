"use client";

import { Fragment, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { toggleRolePermission } from "@/lib/actions";
import type { PermissionKey } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import {
  ShieldIcon,
  TeacherIcon,
  StudentIcon,
  ParentIcon,
  UsersIcon,
  ClassIcon,
  DollarIcon,
  SubjectIcon,
  GenericFileIcon,
  SettingsIcon,
} from "./icons/SidebarIcons";

type PermissionRow = {
  key: PermissionKey;
  label: string;
  category: string;
};

const ROLE_CONFIG: Record<
  Role,
  {
    label: string;
    description: string;
    bgGradient: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    accentBg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  admin: {
    label: "Admin",
    description: "Full system administration and override access.",
    bgGradient: "from-purple-500/10 via-indigo-500/5 to-transparent",
    badgeBg: "bg-purple-600",
    badgeText: "text-purple-700 bg-purple-50 border-purple-200",
    border: "border-purple-200",
    accentBg: "bg-purple-600",
    icon: ShieldIcon,
  },
  teacher: {
    label: "Teacher",
    description: "Academic management, grades, assignments & attendance.",
    bgGradient: "from-sky-500/10 via-blue-500/5 to-transparent",
    badgeBg: "bg-sky-500",
    badgeText: "text-sky-700 bg-sky-50 border-sky-200",
    border: "border-sky-200",
    accentBg: "bg-sky-500",
    icon: TeacherIcon,
  },
  student: {
    label: "Student",
    description: "View results, timetables, submissions & announcements.",
    bgGradient: "from-amber-500/10 via-yellow-500/5 to-transparent",
    badgeBg: "bg-amber-500",
    badgeText: "text-amber-700 bg-amber-50 border-amber-200",
    border: "border-amber-200",
    accentBg: "bg-amber-500",
    icon: StudentIcon,
  },
  parent: {
    label: "Parent",
    description: "View children progress, fee receipts, reports & events.",
    bgGradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    badgeBg: "bg-emerald-500",
    badgeText: "text-emerald-700 bg-emerald-50 border-emerald-200",
    border: "border-emerald-200",
    accentBg: "bg-emerald-500",
    icon: ParentIcon,
  },
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  System: SettingsIcon,
  Academic: ClassIcon,
  People: UsersIcon,
  Finance: DollarIcon,
  Communication: SubjectIcon,
  Inventory: GenericFileIcon,
};

const PermissionController = ({
  roles,
  categories,
  permissions,
  assignments,
}: {
  roles: Role[];
  categories: string[];
  permissions: PermissionRow[];
  assignments: Record<string, PermissionKey[]>;
}) => {
  const [state, setState] = useState<Record<string, PermissionKey[]>>(
    Object.fromEntries(roles.map((role) => [role, assignments[role] ?? []]))
  );
  const [pending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"matrix" | "role">("matrix");
  const [selectedRole, setSelectedRole] = useState<Role>("teacher");

  const toggle = (role: Role, key: PermissionKey, checked: boolean) => {
    if (role === "admin") return;

    setState((prev) => {
      const next = { ...prev, [role]: [...(prev[role] ?? [])] };
      if (checked && !next[role].includes(key)) next[role].push(key);
      if (!checked) next[role] = next[role].filter((k) => k !== key);
      return next;
    });

    startTransition(async () => {
      const result = await toggleRolePermission(role, key, checked);
      if (!result.success) {
        setState((prev) => {
          const next = { ...prev, [role]: [...(prev[role] ?? [])] };
          if (!checked && !next[role].includes(key)) next[role].push(key);
          if (checked) next[role] = next[role].filter((k) => k !== key);
          return next;
        });
        toast.error(result.error ?? "Could not update permission.");
      } else {
        toast.success(
          `Permission ${checked ? "granted to" : "revoked from"} ${ROLE_CONFIG[role]?.label || role}`
        );
      }
    });
  };

  const toggleAllCategoryForRole = (role: Role, category: string, grant: boolean) => {
    if (role === "admin") return;
    const catPerms = permissions.filter((p) => p.category === category);
    
    catPerms.forEach((p) => {
      const isCurrentlyGranted = has(role, p.key);
      if (grant && !isCurrentlyGranted) {
        toggle(role, p.key, true);
      } else if (!grant && isCurrentlyGranted) {
        toggle(role, p.key, false);
      }
    });
  };

  const has = (role: Role, key: PermissionKey) =>
    role === "admin" || (state[role] ?? []).includes(key);

  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch =
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalCount = permissions.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* PAGE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Background glow graphics */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldIcon className="w-4 h-4 text-indigo-400" />
              Security & Access Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Roles & Permissions Controller
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Configure system capability matrix, grant or revoke feature access, and scope security controls per user role.
            </p>
          </div>

          {/* VIEW MODE TOGGLE BUTTONS */}
          <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 flex items-center gap-1 shadow-inner shrink-0">
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Matrix Grid View
            </button>
            <button
              onClick={() => setViewMode("role")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "role"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Role Inspector View
            </button>
          </div>
        </div>

        {/* ROLE OVERVIEW SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 relative z-10">
          {roles.map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const grantedCount =
              role === "admin"
                ? totalCount
                : (state[role] ?? []).filter((k) => permissions.some((p) => p.key === k)).length;
            const percentage = Math.round((grantedCount / totalCount) * 100);

            return (
              <div
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setViewMode("role");
                }}
                className={`bg-slate-800/60 backdrop-blur-md border ${
                  viewMode === "role" && selectedRole === role
                    ? "border-indigo-400 ring-2 ring-indigo-500/50"
                    : "border-slate-700/60 hover:border-slate-600"
                } rounded-2xl p-4 transition-all cursor-pointer group`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.badgeBg} text-white shadow-md`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {percentage}% Access
                  </span>
                </div>
                <div className="mt-3">
                  <h4 className="font-semibold text-white text-base group-hover:text-indigo-300 transition-colors">
                    {config.label}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {role === "admin" ? "All Permissions" : `${grantedCount} / ${totalCount} Capabilities`}
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full ${config.badgeBg} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* SEARCH INPUT */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search permission name or key (e.g. students.view)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>

        {/* CATEGORY FILTER CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            All Categories ({totalCount})
          </button>
          {categories.map((cat) => {
            const catCount = permissions.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                {cat} ({catCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* MATRIX VIEW */}
      {viewMode === "matrix" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="p-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-slate-500 min-w-[280px]">
                    Permission Name & Key
                  </th>
                  {roles.map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    return (
                      <th
                        key={r}
                        className="p-4 font-bold text-xs uppercase tracking-wider text-slate-700 text-center min-w-[130px]"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${cfg.badgeBg}`}
                          />
                          <span>{cfg.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => {
                  const catPerms = filteredPermissions.filter(
                    (p) => p.category === category
                  );
                  if (catPerms.length === 0) return null;

                  const CategoryIcon = CATEGORY_ICONS[category] || GenericFileIcon;

                  return (
                    <Fragment key={category}>
                      {/* CATEGORY SECTION HEADER ROW */}
                      <tr className="bg-slate-50/50">
                        <td
                          colSpan={roles.length + 1}
                          className="px-6 py-3 border-y border-slate-200/60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <CategoryIcon className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                {category}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                                {catPerms.length} items
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium">
                              Toggle individual access below
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* PERMISSION ROWS */}
                      {catPerms.map((p) => {
                        const isManage = p.key.endsWith(".manage") || p.key.endsWith(".send");
                        return (
                          <tr
                            key={p.key}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="p-4 sm:px-6">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                                    {p.label}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                      isManage
                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : "bg-sky-50 text-sky-700 border border-sky-200"
                                    }`}
                                  >
                                    {isManage ? "Write / Action" : "Read / View"}
                                  </span>
                                </div>
                                <span className="text-xs font-mono text-slate-400">
                                  {p.key}
                                </span>
                              </div>
                            </td>

                            {/* TOGGLE SWITCH CELLS FOR EACH ROLE */}
                            {roles.map((r) => {
                              const isGranted = has(r, p.key);
                              const isAdmin = r === "admin";
                              const cfg = ROLE_CONFIG[r];

                              return (
                                <td key={r} className="p-4 text-center">
                                  <div className="flex items-center justify-center">
                                    {isAdmin ? (
                                      <div
                                        title="Admin holds full system access permanently"
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200"
                                      >
                                        <ShieldIcon className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Full Access</span>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => toggle(r, p.key, !isGranted)}
                                        aria-label={`${p.label} for ${cfg.label}`}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                          isGranted ? cfg.accentBg : "bg-slate-200"
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                            isGranted ? "translate-x-5" : "translate-x-0"
                                          }`}
                                        />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROLE INSPECTOR CARD VIEW */}
      {viewMode === "role" && (
        <div className="space-y-6">
          {/* ROLE SELECTOR BANNER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {roles.map((r) => {
              const cfg = ROLE_CONFIG[r];
              const Icon = cfg.icon;
              const isSelected = selectedRole === r;
              const count =
                r === "admin"
                  ? totalCount
                  : (state[r] ?? []).filter((k) => permissions.some((p) => p.key === k)).length;

              return (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-md"
                      : "bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.badgeBg} text-white shadow-sm`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badgeText}`}
                    >
                      {count} / {totalCount}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-slate-800 text-sm">{cfg.label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {cfg.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE ROLE PERMISSIONS BOARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${ROLE_CONFIG[selectedRole].badgeBg}`}
                  />
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Configuring Permissions for {ROLE_CONFIG[selectedRole].label}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {ROLE_CONFIG[selectedRole].description}
                </p>
              </div>

              {selectedRole !== "admin" && (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Quick Actions:</span>
                  <button
                    onClick={() => {
                      categories.forEach((cat) =>
                        toggleAllCategoryForRole(selectedRole, cat, true)
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Grant All
                  </button>
                  <button
                    onClick={() => {
                      categories.forEach((cat) =>
                        toggleAllCategoryForRole(selectedRole, cat, false)
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Revoke All
                  </button>
                </div>
              )}
            </div>

            {/* CATEGORIES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map((cat) => {
                const catPerms = filteredPermissions.filter((p) => p.category === cat);
                if (catPerms.length === 0) return null;

                const CategoryIcon = CATEGORY_ICONS[cat] || GenericFileIcon;
                const activeInCat = catPerms.filter((p) => has(selectedRole, p.key)).length;

                return (
                  <div
                    key={cat}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3"
                  >
                    {/* CATEGORY CARD HEADER */}
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <CategoryIcon className="w-4 h-4" />
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{cat}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {activeInCat} / {catPerms.length} Active
                        </span>

                        {selectedRole !== "admin" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                toggleAllCategoryForRole(selectedRole, cat, true)
                              }
                              className="text-[10px] font-bold text-indigo-600 hover:underline px-1"
                              title="Enable all items in category"
                            >
                              All
                            </button>
                            <span className="text-slate-300 text-[10px]">|</span>
                            <button
                              onClick={() =>
                                toggleAllCategoryForRole(selectedRole, cat, false)
                              }
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1"
                              title="Disable all items in category"
                            >
                              None
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ITEMS LIST */}
                    <div className="space-y-2">
                      {catPerms.map((p) => {
                        const isGranted = has(selectedRole, p.key);
                        const isAdmin = selectedRole === "admin";

                        return (
                          <div
                            key={p.key}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              isGranted
                                ? "bg-white border-slate-200/90 shadow-2xs"
                                : "bg-slate-100/50 border-transparent opacity-75"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">
                                {p.label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {p.key}
                              </span>
                            </div>

                            {isAdmin ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                Granted
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggle(selectedRole, p.key, !isGranted)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                  isGranted
                                    ? ROLE_CONFIG[selectedRole].accentBg
                                    : "bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    isGranted ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionController;
