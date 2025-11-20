import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppShell from "./components/Layout/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "sonner"; 

// Auth Pages
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import RoleRedirect from "./pages/RoleRedirect";
import RegistrationForm from "./pages/RegistrationForm";

// Manager Pages
import ClientIntakePage from "./pages/Manager/ClientRequirement";
import ProjectsPage from "./pages/Manager/Projectspage";
import EmployeesPage from "./pages/Manager/EmployeesPage";
import AssignTaskPage from "./pages/Manager/AssignTaskPage";
import AllTasksPage from "./pages/Manager/AllTasksPage";
import TaskHistoryPage from "./pages/Manager/TaskHistoryPage";
import ProjectFieldsPage from "./pages/Manager/ProjectFieldsPage";
import ProjectSpacesPage from "./pages/Spaces/ProjectSpacesPage";
import SpacesPage from "./pages/SpacesPage";


// Employee Pages
import MyTasksPage from "./pages/Employee/MyTasksPage";
import EmployeeBoardPage from "./pages/Employee/EmployeeBoard";
import MyAttendancePage from "./pages/Employee/MyAttendancePage";
import MySalaryPage from "./pages/Employee/MySalaryPage.jsx";

// HR Pages
import PayrollPage from "./pages/HR/PayrollPage";
import LeaveRequestsPage from "./pages/HR/LeaveRequestsPage";
import EmployeeDirectoryPage from "./pages/HR/EmployeeDirectoryPage";
import AttendanceManagementPage from "./pages/HR/AttendanceManagementPage";
import DocumentManagementPage from "./pages/HR/DocumentManagementpage.jsx";
import OnboardingPage from "./pages/HR/OnboardingPage";

// CEO Pages
import CEODashboardPage from "./pages/CEO/CEODashboardPage";
import DepartmentReportsPage from "./pages/CEO/DepartmentReportsPage";
import SalariesOverviewPage from "./pages/CEO/SalariesOverviewPage";
import TopPerformersPage from "./pages/CEO/TopPerformersPage";
import TaskAnalyticsPage from "./pages/CEO/TaskAnalyticsPage";
import ProfilePage from "./pages/Employee/ProfilePage.jsx";
import ManagerBoard from "./pages/Manager/ManagerBoard.jsx";


// Placeholder Page
const PlaceholderPage = ({ title }) => (
  <div className="p-6">
    <div className="max-w-4xl mx-auto text-center py-20">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">🚧</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
      <p className="text-gray-600">This page is under construction and will be available soon.</p>
    </div>
  </div>
);

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ---------- Public Routes ---------- */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} /> 

            {/* ---------- Root (Auto Role Redirect) ---------- */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <RoleRedirect />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* ---------- Manager Routes ---------- */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <ProjectsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/fields"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <ProjectFieldsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-intake"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <ClientIntakePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <EmployeesPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager-board"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <ManagerBoard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assign-task"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <AssignTaskPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO" ,"HR"]}>

                  <AppShell>
                    <AttendanceManagementPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-tasks"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <AllTasksPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/task-history"
              element={
                <ProtectedRoute allowedRoles={["Manager", "CEO"]}>
                  <AppShell>
                    <TaskHistoryPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* ---------- HR Routes ---------- */}
            <Route
              path="/employee-directory"
              element={
                <ProtectedRoute allowedRoles={["HR"]}>
                  <AppShell>
                    <EmployeeDirectoryPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={["HR"]}>
                  <AppShell>
                    <AttendanceManagementPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowedRoles={["HR"]}>
                  <AppShell>
                    <OnboardingPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave-requests"
              element={
                <ProtectedRoute allowedRoles={["HR", "Manager", "CEO"]}>
                  <AppShell>
                    <LeaveRequestsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents-management"
              element={
                <ProtectedRoute allowedRoles={["HR", "Manager", "CEO"]}>
                  <AppShell>
                    <DocumentManagementPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute allowedRoles={["HR"]}>
                  <AppShell>
                    <PayrollPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* ---------- CEO Routes ---------- */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <AppShell>
                    <PlaceholderPage title="Dashboard" />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/department-reports"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <AppShell>
                    <PlaceholderPage title="Department Reports" />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries-overview"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <AppShell>
                    <PlaceholderPage title="Salaries Overview" />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/top-performers"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <AppShell>
                    <PlaceholderPage title="Top Performers" />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/task-analytics"
              element={
                <ProtectedRoute allowedRoles={["CEO"]}>
                  <AppShell>
                    <PlaceholderPage title="Task Analytics" />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* ---------- Employee Routes ---------- */}
            <Route
              path="/my-tasks"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <AppShell>
                    <MyTasksPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-board"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <AppShell>
                    <EmployeeBoardPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-attendance"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <AppShell>
                    <MyAttendancePage />

                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-salary"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <AppShell>
                    <MySalaryPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-salary"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <AppShell>
                    <PlaceholderPage title="My Salary" />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["Employee"]}>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* ---------- SPACES ROUTE (NEW) ---------- */}
            <Route
              path="/spaces/:projectId/board"
              element={
                <ProtectedRoute allowedRoles={["Manager", "Employee", "CEO"]}>
                  <AppShell>
                    <ProjectSpacesPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route path="/register" element={<RegistrationForm />} />
          </Routes>
        </BrowserRouter>

        {/* ✅ Add Toaster globally so toast notifications appear everywhere */}
        <Toaster richColors position="top-right" />

      </AuthProvider>
    </div>
  );
}

export default App;
