"use client";

import React, { useState } from "react";
import Menu from "./Menu";
import type { PermissionKey } from "@/lib/permissions";
import { MenuToggleIcon } from "./icons/SidebarIcons";

interface SidebarContainerProps {
  permissions: PermissionKey[];
  schoolName?: string;
  schoolLogo?: string;
  children: React.ReactNode;
}

export default function SidebarContainer({
  permissions,
  schoolName = "Everest College",
  schoolLogo,
  children,
}: SidebarContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="h-screen flex w-full overflow-hidden bg-slate-50">
      {/* BACKDROP OVERLAY FOR MOBILE */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Menu
          permissions={permissions}
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          onToggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
        />
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F8FA]">
        {/* MOBILE TOP BAR (when sidebar is hidden on small screens) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <MenuToggleIcon className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">{schoolName}</span>
        </div>

        {children}
      </div>
    </div>
  );
}
