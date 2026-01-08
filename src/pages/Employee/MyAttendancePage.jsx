import React, { useEffect, useState, useMemo } from "react";
import apiClient from "../../lib/apiClient";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import LeaveRequestModal from "./LeaveRequestModal";
import TimesheetModal from "./TimesheetModal";
import { getHolidayByDate, ensureHolidays } from "../../lib/publicHolidays";
import {
  LogIn,
  LogOut,
  Home,
  Building2,
  Download,
  CheckCircle,
  Calendar,
  BarChart3,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const AttendanceAPI = {
  getByEmpId: (empId) =>
    apiClient.get(`/attendance/employee/${empId}`).then((r) => r.data),
  checkIn: (payload) =>
    apiClient.post("/attendance/checkin", payload).then((r) => r.data),
  deleteRecord: (id) =>
    apiClient.delete(`/attendance/${id}`).then((r) => r.data),
  checkOut: (id, checkOutTime = new Date().toISOString()) =>
    apiClient
      .patch(`/attendance/checkout/${id}`, {
        checkOut: checkOutTime,
        status: "Present",
      })
      .then((r) => r.data),
  getWeeklyTimesheet: (empId, weekStart) =>
    apiClient
      .get(`/attendance/employee/${empId}/week?weekStart=${weekStart}`)
      .then((r) => r.data),
};

export default function MyAttendancePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const empId = user?.identifier || user?.empId || "";
  const empName =
    user?.name ||
    user?.additionalData?.name ||
    (user?.additionalData?.firstName && user?.additionalData?.lastName
      ? `${user.additionalData.firstName} ${user.additionalData.lastName}`
      : "") ||
    user?.email ||
    "User";
  const empRole = user?.role || user?.additionalData?.role || "Employee";

  const [records, setRecords] = useState([]);
  const [workMode, setWorkMode] = useState("Office");
  const [todayRecord, setTodayRecord] = useState(null);
  const [isOnLeaveToday, setIsOnLeaveToday] = useState(false);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [todayHoliday, setTodayHoliday] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() =>
    new Date().getMonth()
  );
  const [currentYear, setCurrentYear] = useState(() =>
    new Date().getFullYear()
  );
  const PAGE_SIZE = 31;
  const [page, setPage] = useState(1);

  useEffect(() => {
    console.log("🔍 MyAttendance - USER OBJECT:", user);
    console.log("🔍 MyAttendance - Extracted empId:", empId);
    console.log("🔍 MyAttendance - Extracted empName:", empName);
    console.log("🔍 MyAttendance - Extracted empRole:", empRole);
  }, [user, empId]);

  const displayTime = (timeString) => {
    if (!timeString) return "—";
    return new Date(timeString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  const isSameMonthYear = (dateStr, year, monthIndex) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  };

  const load = async () => {
    if (!empId) {
      console.warn("❌ No empId found, cannot load attendance");
      return;
    }

    console.log("🔍 Loading attendance for empId:", empId);
    setLoading(true);
    try {
      await ensureHolidays(new Date().getFullYear());

      const [attendanceData, leaveResponse] = await Promise.all([
        AttendanceAPI.getByEmpId(empId),
        apiClient
          .get(`/leave-approvel/employee/${empId}`)
          .catch((err) => {
            console.error(
              "Failed to load leave data:",
              err?.response?.data || err
            );
            return { data: [] };
          }),
      ]);

      console.log("✅ Attendance data loaded:", attendanceData);
      console.log("✅ Leave data loaded:", leaveResponse.data);

      const fetchedLeaves = leaveResponse.data || [];
      const today = new Date().toISOString().split("T")[0];

      const onLeaveToday = fetchedLeaves.some((l) => {
        const status = String(l.status || "").trim().toUpperCase();
        if (status !== "APPROVED") return false;
        const fromDate = new Date(l.fromDate).toISOString().split("T")[0];
        const toDate = new Date(l.toDate).toISOString().split("T")[0];
        return today >= fromDate && today <= toDate;
      });

      setLeaves(fetchedLeaves);
      setIsOnLeaveToday(onLeaveToday);

      const holiday = getHolidayByDate(today);
      setTodayHoliday(holiday);

      const todayDateObj = new Date(today);
      const updatedRecords = attendanceData.map((r) => {
        if (!r.date) return r;
        const recordDateObj = new Date(r.date);
        const recordDateStr = recordDateObj.toISOString().split("T")[0];

        const hasApprovedLeave = fetchedLeaves.some((l) => {
          const status = String(l.status || "").trim().toUpperCase();
          if (status !== "APPROVED") return false;
          const fromStr = new Date(l.fromDate).toISOString().split("T")[0];
          const toStr = new Date(l.toDate).toISOString().split("T")[0];
          return recordDateStr >= fromStr && recordDateStr <= toStr;
        });

        let finalStatus = r.status;
        if (hasApprovedLeave) {
          finalStatus = "Leave";
        } else if (finalStatus === "Leave" || finalStatus === "OnLeave") {
          if (r.checkIn) {
            finalStatus = "Present";
          } else if (recordDateObj < todayDateObj) {
            finalStatus = "Absent";
          } else {
            finalStatus = "—";
          }
        }
        return { ...r, status: finalStatus };
      });

      setRecords(updatedRecords.filter((r) => r.status !== "—"));
      setTodayRecord(updatedRecords.find((r) => r.date === today) || null);
    } catch (err) {
      console.error("❌ Error loading attendance data:", err);
      if (err.response)
        console.error("❌ Load error response:", err.response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empId) {
      console.log("✅ empId found, loading attendance...");
      load();
      const interval = setInterval(() => {
        load();
      }, 30000);
      const handleFocus = () => load();
      window.addEventListener("focus", handleFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
      };
    } else {
      console.warn("❌ No empId, skipping attendance load");
    }
  }, [empId]);

  const handleCheckIn = async () => {
    if (isOnLeaveToday)
      return alert("Check-in disabled: You are on approved leave today.");
    if (todayHoliday)
      return alert(
        `Check-in disabled: Public holiday — ${todayHoliday.name}`
      );
    if (todayRecord && todayRecord.checkIn)
      return alert("You have already checked in today!");

    setLoading(true);
    try {
      const now = new Date();
      const payload = {
        empId: empId,
        empName: empName,
        date: now.toISOString().split("T")[0],
        checkIn: now.toISOString(),
        workMode,
        status: "Present",
        empRole: empRole,
      };
      console.log(
        "📤 Submitting check-in payload:",
        JSON.stringify(payload)
      );

      if (todayRecord && todayRecord.id && !todayRecord.checkIn) {
        await AttendanceAPI.deleteRecord(todayRecord.id);
      }

      await AttendanceAPI.checkIn(payload);
      console.log("✅ Checked in successfully");
      await load();
    } catch (err) {
      console.error("❌ Check-in failed:", err);
      if (err.response)
        console.error("❌ Server response:", err.response.data);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Check-in failed";
      alert(`Check-in failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (isOnLeaveToday)
      return alert("Check-out disabled: You are on approved leave today.");
    if (todayHoliday)
      return alert(
        `Check-out disabled: Public holiday — ${todayHoliday.name}`
      );
    if (!todayRecord || !todayRecord.id)
      return alert("No check-in found for today.");
    if (todayRecord.checkOut)
      return alert("You have already checked out today!");

    setLoading(true);
    try {
      await AttendanceAPI.checkOut(todayRecord.id);
      console.log("✅ Checked out successfully");
      await load();

      try {
        toast &&
          toast({
            title: "Checked out",
            description: "You will be logged out now.",
          });
      } catch (e) {
        console.warn("Toast failed:", e);
      }

      const logoutNow = () => {
        console.log("⏲️ Auto-logout triggered (attendance checkout)");
        try {
          logout();
          console.log("✅ logout() executed");
        } catch (e) {
          console.error("Error during logout():", e);
        }
        window.location.assign("/login");
      };

      const _t = setTimeout(logoutNow, 1200);
      try {
        window.__autoLogoutTimeout = _t;
      } catch (e) {}
    } catch (err) {
      console.error("❌ Check-out failed:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Check-out failed";
      alert(`Check-out failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const canCheckIn =
    !isOnLeaveToday &&
    !todayHoliday &&
    (!todayRecord || (!todayRecord.checkIn && !todayRecord.checkOut));
  const canCheckOut =
    !isOnLeaveToday &&
    !todayHoliday &&
    todayRecord &&
    todayRecord.checkIn &&
    !todayRecord.checkOut;

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      ),
    [records]
  );

  const monthlyRecords = useMemo(
    () =>
      sortedRecords
        .filter((r) => r.checkIn)
        .filter((r) => isSameMonthYear(r.date, currentYear, currentMonth)),
    [sortedRecords, currentYear, currentMonth]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(monthlyRecords.length / PAGE_SIZE)),
    [monthlyRecords.length]
  );

  useEffect(() => {
    setPage(1);
  }, [currentMonth, currentYear]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return monthlyRecords.slice(start, end);
  }, [monthlyRecords, page]);

  // LIFETIME total hours: latest record that has totalWorkingHours
  const lifetimeTotalHours = useMemo(() => {
    const withTotal = records
      .filter((r) => r.totalWorkingHours != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest → newest
    if (!withTotal.length) return 0;
    return withTotal[withTotal.length - 1].totalWorkingHours || 0;
  }, [records]);

  // ✅ UPDATED: Attendance summary based on monthly records
   // ✅ Attendance summary: monthly stats + monthly total hours from backend workHours
const summary = useMemo(() => {
  // records already filtered to current month in monthlyRecords
  const total = monthlyRecords.length;
  const present = monthlyRecords.filter(r => r.checkIn && r.checkOut).length;
  const leave = monthlyRecords.filter(r => r.status === "Leave").length;
  const absent = monthlyRecords.filter(r => r.status === "Absent").length;
  const rate = total ? Math.round((present / total) * 100) : 0;

  // ✅ Sum backend workHours for all completed days in this month
  const monthlyHours = monthlyRecords.reduce((sum, r) => {
    const h = r.workHours;
    if (h == null) return sum;      // no checkout yet
    if (h <= 0) return sum;         // ignore invalid/zero
    return sum + h;                 // h is double from backend
  }, 0);

  const hours = Math.floor(monthlyHours);
  const minutes = Math.round((monthlyHours - hours) * 60);

  return {
    total,
    present,
    leave,
    absent,
    rate,
    totalHoursDisplay: `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`,
  };
}, [monthlyRecords]);



  const downloadCSV = () => {
    if (!monthlyRecords.length)
      return alert("No records to download");
    const rows = monthlyRecords.map((r) => {
      const checkIn = r.checkIn ? displayTime(r.checkIn) : "-";
      const checkOut = r.checkOut ? displayTime(r.checkOut) : "-";
      const workHours =
        r.workHours && r.workHours > 0
          ? r.workHours.toFixed(2)
          : "0.00";
      return [
        displayDate(r.date),
        checkIn,
        checkOut,
        workHours,
        r.status,
        r.workMode || "-",
      ].join(",");
    });
    const csvContent =
      "Date,Check In,Check Out,Hours,Status,Work Mode\n" +
      rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Attendance.csv";
    a.click();
  };

  const downloadPDF = () => {
    if (!monthlyRecords.length)
      return alert("No records to download");
    const doc = new jsPDF();
    doc.text("Attendance Records", 14, 15);
    const tableData = monthlyRecords.map((r) => {
      const checkIn = r.checkIn ? displayTime(r.checkIn) : "-";
      const checkOut = r.checkOut ? displayTime(r.checkOut) : "-";
      const workHours =
        r.workHours && r.workHours > 0
          ? r.workHours.toFixed(2)
          : "0.00";
      return [
        displayDate(r.date),
        checkIn,
        checkOut,
        workHours,
        r.status,
        r.workMode || "-",
      ];
    });
    autoTable(doc, {
      head: [["Date", "Check In", "Check Out", "Hours", "Status", "Mode"]],
      body: tableData,
      startY: 30,
    });
    doc.save("Attendance.pdf");
  };

  const getStatusColor = (status) => {
    const colors = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Leave: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const changeMonth = (delta) => {
    setPage(1);
    setCurrentMonth((prevMonth) => {
      let newMonth = prevMonth + delta;
      let newYear = currentYear;

      if (newMonth < 0) {
        newMonth = 11;
        newYear = currentYear - 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear = currentYear + 1;
      }

      setCurrentYear(newYear);
      return newMonth;
    });
  };

  if (!empId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">
              No Employee ID Found
            </h2>
            <p className="text-gray-600 mb-4">
              Please ensure you are logged in correctly.
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(user, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Attendance
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Logged in as {empName} ({empId})
          </p>
        </div>
      </div>

      {/* Employee Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.present}
              </p>
            </div>
            <CheckCircle className="text-green-500 w-8 h-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Leave Days</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.leave}
              </p>
            </div>
            <Calendar className="text-yellow-500 w-8 h-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">
                Attendance Rate
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.rate}%
              </p>
            </div>
            <BarChart3 className="text-blue-500 w-8 h-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-purple-600">
                {summary.totalHoursDisplay}
              </p>
            </div>
            <Clock className="text-purple-400 w-8 h-8" />
          </CardContent>
        </Card>
      </div>

      {/* LEAVE WARNING */}
      {isOnLeaveToday && (
        <div className="p-3 mb-2 bg-yellow-100 text-yellow-800 rounded-md border border-yellow-300">
          You are on approved leave today. Check-In/Check-Out is
          disabled.
        </div>
      )}

      {todayHoliday && (
        <div className="p-3 mb-2 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-300">
          Today is a public holiday:{" "}
          <strong>{todayHoliday.name}</strong>. Check-In/Check-Out is
          disabled.
        </div>
      )}

      {/* CHECK-IN / CHECK-OUT */}
      <div className="flex items-center gap-3 mt-2">
        <Select
          value={workMode}
          onValueChange={setWorkMode}
          disabled={loading}
        >
          <SelectTrigger className="w-[130px] bg-gray-50">
            <SelectValue placeholder="Work Mode" />
          </SelectTrigger>
          <SelectContent className="bg-gray-50">
            <SelectItem value="Office">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>Office</span>
              </div>
            </SelectItem>
            <SelectItem value="WFH">
              <div className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>WFH</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleCheckIn}
          disabled={!canCheckIn || loading}
          className={`text-white ${
            canCheckIn && !loading
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          <LogIn className="w-4 h-4 mr-1" />
          {loading ? "Processing..." : "Check In"}
        </Button>
        <Button
          onClick={handleCheckOut}
          disabled={!canCheckOut || loading}
          className={`text-white ${
            canCheckOut && !loading
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          <LogOut className="w-4 h-4 mr-1" />
          {loading ? "Processing..." : "Check Out"}
        </Button>
      </div>

      {/* MONTH SELECTOR */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium">
            {new Date(currentYear, currentMonth).toLocaleString(
              "en-IN",
              {
                month: "long",
                year: "numeric",
              }
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ATTENDANCE TABLE */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            Current month records (checked-in days only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No attendance records for this month
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Work Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map((r) => {
                  const checkIn = r.checkIn
                    ? new Date(r.checkIn)
                    : null;
                  const checkOut = r.checkOut
                    ? new Date(r.checkOut)
                    : null;
                  return (
                    <TableRow key={r.id || r._id}>
                      <TableCell>{displayDate(r.date)}</TableCell>
                      <TableCell>
                        {checkIn ? displayTime(r.checkIn) : "—"}
                      </TableCell>
                      <TableCell>
                        {checkOut ? displayTime(r.checkOut) : "—"}
                      </TableCell>
                      <TableCell>
                      {r.workHours != null && r.workHours > 0
                        ? (() => {
                            const hours = Math.floor(r.workHours);
                            const minutes = Math.round((r.workHours - hours) * 60);
                            return `${hours}h ${minutes}m`;
                          })()
                        : "—"}
                    </TableCell>

                      <TableCell>
                        {r.status === "—" || !r.status ? (
                          <span className="text-gray-400">
                            —
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className={getStatusColor(
                              r.status
                            )}
                          >
                            {r.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.workMode || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* TIMESHEET BUTTON & DOWNLOAD */}
      <div className="flex justify-end gap-3 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              <Download size={18} className="mr-1" /> Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white">
            <DropdownMenuItem onClick={downloadCSV}>
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadPDF}>
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={() => setIsTimesheetOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
        >
          Timesheet
        </Button>
      </div>

      {/* MODALS */}
      <TimesheetModal
        open={isTimesheetOpen}
        onClose={() => setIsTimesheetOpen(false)}
        records={monthlyRecords}
      />
      <LeaveRequestModal
        open={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          load();
        }}
        leaveBalances={undefined}
        editingLeave={undefined}
        existingLeaves={leaves}
        onSubmitted={load}
      />
    </div>
  );
}
