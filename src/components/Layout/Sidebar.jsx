import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiGet } from "../../lib/api";
import {
  Users,
  ClipboardList,
  Calendar,
  DollarSign,
  History,
  LayoutDashboard,
  FileText,
  TrendingUp,
  Award,
  UserPlus,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  FolderOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

// ---------- Menu Configuration ----------
const menuConfig = {
  Manager: [
    { path: "/projects", label: "Projects", icon: Users },
    { path: "/employees", label: "Employees", icon: Users },
    { path: "/manager-board", label: "Manager Board", icon: Users },

    { path: "/attendance", label: "Attendance", icon: Calendar },
    { path: "/leave-requests", label: "Leave Requests", icon: FileText },
    { path: "/all-tasks", label: "All Tasks", icon: FileText },
    { path: "/task-history", label: "Task History", icon: History },
    { path: "/documents-management", label: "Document Management", icon: FolderPlus },
  ],
  HR: [
    { path: "/employee-directory", label: "Employee Directory", icon: Users },
    { path: "/attendance", label: "Attendance", icon: Calendar },
    { path: "/onboarding", label: "Onboarding", icon: UserPlus },
    { path: "/leave-requests", label: "Leave Requests", icon: FileText },
    { path: "/payroll", label: "Payroll", icon: DollarSign },
    { path: "/documents-management", label: "Document Management", icon: FolderPlus },
  ],
  CEO: [
    { path: "/projects", label: "Projects", icon: Users },
    { path: "/employees", label: "Employees", icon: Users },
    { path: "/attendance", label: "Attendance", icon: Calendar },
    { path: "/leave-requests", label: "Leave Requests", icon: FileText },
    { path: "/all-tasks", label: "All Tasks", icon: FileText },
    { path: "/task-history", label: "Task History", icon: History },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/department-reports", label: "Department Reports", icon: Building },
    { path: "/salaries-overview", label: "Salaries Overview", icon: DollarSign },
    { path: "/top-performers", label: "Top Performers", icon: Award },
    { path: "/task-analytics", label: "Task Analytics", icon: TrendingUp },
    { path: "/documents-management", label: "Document Management", icon: FolderPlus },
  ],
  Employee: [
    { path: "/my-tasks", label: "My Tasks", icon: ClipboardList }, 
    { path: "/my-attendance", label: "Attendance History", icon: Calendar },
    { path: "/my-salary", label: "Salary Details", icon: DollarSign },
    { path: "/profile", label: "Profile", icon: Users },
  ],
};

// ---------- Expandable Subsection ----------
function ExpandableSection({ title, projects, collapsed, location }) {
  const [open, setOpen] = useState(true); // auto-expanded by default

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        } px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg`}
      >
        <div className={`flex items-center ${collapsed ? "" : "space-x-2"}`}>
          <FolderOpen className="w-4 h-4" />
          {!collapsed && <span>{title}</span>}
        </div>
        {!collapsed && (
          <span className="text-xs text-slate-400">{projects.length}</span>
        )}
      </button>

      {open && (
        <ul className={`mt-1 ${collapsed ? "px-0" : "pl-4"}`}>
          {projects.length === 0 && (
            <li className="text-xs text-slate-500 px-3 py-1">No projects</li>
          )}
          {projects.map((p) => {
            const to = `/spaces/${p.id}/board`;
            const active = location.pathname.startsWith(to);
            return (
              <li key={p.id}>
                <Link
                  to={to}
                  className={`flex items-center ${
                    collapsed ? "justify-center" : "space-x-2"
                  } rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{p.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ---------- Main Sidebar ----------
const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const menuItems = menuConfig[user?.role] || [];

  useEffect(() => {
    let abort = false;

    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await apiGet("/client-onboard?page=0&size=500");
        if (!res.ok) throw new Error("Failed to load projects");
        const page = await res.json();

        if (abort) return;

        // normalize shape
        const data = Array.isArray(page?.content)
          ? page.content
          : Array.isArray(page)
          ? page
          : [];

        const normalized = data.map((p) => ({
          id: p.id || p.projectId,
          name:
            p.name ||
            p.clientInfo?.projectName ||
            p.clientInfo?.businessName ||
            "Untitled Project",
          description:
            p.description || p.clientInfo?.businessName || "No description",
          status: p.status || "ACTIVE",
        }));

        setProjects(normalized);
      } catch (err) {
        console.error("Failed to load projects", err);
        if (!abort) setProjects([]);
      } finally {
        if (!abort) setLoadingProjects(false);
      }
    };

    loadProjects();
    return () => {
      abort = true;
    };
  }, []);

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const hideSpaces = user?.role === "HR";

  return (
    <div
      className={`h-screen bg-linear-to-b from-slate-900 to-slate-800 text-white flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">CompanyHub</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-700"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-700">
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "space-x-3"}`}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-blue-600">
              {getInitials(user?.name || "U")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <ul className="space-y-1 px-2">
          {!hideSpaces && (
            <li className="pt-2">
              <button
                type="button"
                onClick={() => setSpacesOpen(!spacesOpen)}
                className={`w-full flex items-center ${
                  collapsed ? "justify-center" : "justify-between"
                } px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white`}
              >
                <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                  {spacesOpen ? (
                    <FolderOpen className="w-5 h-5" />
                  ) : (
                    <FolderPlus className="w-5 h-5" />
                  )}
                  {!collapsed && (
                    <span className="text-sm font-medium">Spaces</span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-xs text-slate-400">
                    {projects.length}
                  </span>
                )}
              </button>

              {spacesOpen && (
                <ul className={`mt-1 ${collapsed ? "px-0" : "px-2"}`}>
                  {loadingProjects ? (
                    <li
                      className={`px-3 py-2 text-xs text-slate-400 ${
                        collapsed ? "text-center" : ""
                      }`}
                    >
                      Loading…
                    </li>
                  ) : (
                    <>
                      <ExpandableSection
                        title="Active Projects"
                        projects={projects.filter(
                          (p) => !p.status || p.status.toUpperCase() !== "COMPLETED"
                        )}
                        collapsed={collapsed}
                        location={location}
                      />
                      <ExpandableSection
                        title="Closed Projects"
                        projects={projects.filter(
                          (p) => p.status && p.status.toUpperCase() === "COMPLETED"
                        )}
                        collapsed={collapsed}
                        location={location}
                      />
                    </>
                  )}
                </ul>
              )}
            </li>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <Button
          onClick={logout}
          variant="ghost"
          className={`w-full text-slate-300 hover:bg-red-600 hover:text-white ${
            collapsed ? "px-2" : ""
          }`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
