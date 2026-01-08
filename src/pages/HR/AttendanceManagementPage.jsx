
import React, { useEffect, useState, useMemo } from "react";
import apiClient from "../../lib/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import LeaveRequestModal from "../Employee/LeaveRequestModal";
import TimesheetModal from "../Employee/TimesheetModal";
import { Plus, Calendar, CheckCircle, AlertTriangle, BarChart3, Search, LogIn, LogOut, Building2, Home, Download, } from "lucide-react";
import { Input } from "../../components/ui/input";
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

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getHolidayByDate, ensureHolidays } from "../../lib/publicHolidays";

// Helper functions for local date/time formatting (use user's local timezone)
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

const AttendanceAPI = {
  getAll: () =>
    apiClient.get(`/attendance?page=0&size=500`).then((r) => r.data.content),
  getByEmpId: (empId) => apiClient.get(`/attendance/employee/${empId}`).then((r) => r.data),
  checkIn: (payload) => apiClient.post(`/attendance/checkin`, payload).then((r) => r.data),
  deleteRecord: (id) => apiClient.delete(`/attendance/${id}`).then((r) => r.data),
  checkOut: (id) =>
    apiClient
      .patch(`/attendance/checkout/${id}`, { checkOut: new Date().toISOString() })
      .then((r) => r.data),
};

export default function AttendanceManagementPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [todayHoliday, setTodayHoliday] = useState(null);
  const [isOnLeaveToday, setIsOnLeaveToday] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [workMode, setWorkMode] = useState("Office");
  const [todayRecord, setTodayRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [selectedEmpName, setSelectedEmpName] = useState("");
  const [selectedEmpRecords, setSelectedEmpRecords] = useState([]);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);

  const isManagerView = ["HR", "Manager", "CEO"].includes(user?.role);

  // Filter helper by date ignoring timestamps
  const filterByDate = (records, targetDate) => {
    return records.filter((r) => {
      if (!r.date) return false;
      const recDate = new Date(r.date);
      const selDate = new Date(targetDate);
      return (
        recDate.getFullYear() === selDate.getFullYear() &&
        recDate.getMonth() === selDate.getMonth() &&
        recDate.getDate() === selDate.getDate()
      );
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const selfRecords = await AttendanceAPI.getByEmpId(user.empId);

      // Fetch leave requests for the current user
      let leaves = [];
      try {
        const leaveRes = await apiClient.get(`/leave-approvel/employee/${user.empId}`);
        leaves = leaveRes.data || [];
        console.log("📋 [HR/Manager] Fetched Leave Requests:", leaves);
      } catch (err) {
        console.error("Failed to load leave data:", err);
        leaves = [];
      }

      // Find today's record for self
      const today = new Date().toISOString().split("T")[0];
      const personalToday = selfRecords.find((rec) => {
        const recDate = new Date(rec.date);
        const tDate = new Date(today);
        return (
          recDate.getFullYear() === tDate.getFullYear() &&
          recDate.getMonth() === tDate.getMonth() &&
          recDate.getDate() === tDate.getDate()
        );
      }) || null;
      setTodayRecord(personalToday);

      // Check if current user is on APPROVED leave today - ONLY for APPROVED leaves
      const onLeaveToday = leaves.some((l) => {
        const status = l.status?.toUpperCase() || "";
        console.log("🔍 [HR/Manager] Checking leave:", {
          fromDate: l.fromDate,
          toDate: l.toDate,
          status: status,
          originalStatus: l.status,
          isApproved: status === "APPROVED"
        });
        
        if (status !== "APPROVED") {
          console.log("❌ [HR/Manager] Leave not approved, skipping");
          return false;
        }
        
        const fromDate = new Date(l.fromDate).toISOString().split("T")[0];
        const toDate = new Date(l.toDate).toISOString().split("T")[0];
        
        const isInRange = today >= fromDate && today <= toDate;
        console.log("📅 [HR/Manager] Date check:", { today, fromDate, toDate, isInRange });
        
        return isInRange;
      });
      setIsOnLeaveToday(onLeaveToday);
      
      console.log("✅ [HR/Manager] Final Leave Status - Today:", today, "On Leave:", onLeaveToday);

      if (isManagerView) {
        // Get all without date filter
        const allRecords = await AttendanceAPI.getAll();

        // Fetch all employees' leave requests to update attendance status
        let allLeaves = [];
        try {
          const allLeavesRes = await apiClient.get("/leave-approvel/view", {
            params: { role: user.role?.toUpperCase() }
          });
          allLeaves = allLeavesRes.data || [];
          console.log("📋 [HR/Manager] Fetched ALL leave requests:", allLeaves);
        } catch (err) {
          console.error("Failed to load all leave data:", err);
        }

        // Update attendance records with correct leave status using refined rules
        const todayDateObj = new Date(today);
        const enrichedRecords = allRecords.map(record => {
          if (!record.date) return record;
          const recordDateObj = new Date(record.date);
          const recordDateStr = recordDateObj.toISOString().split("T")[0];

          const hasApprovedLeave = allLeaves.some(l => {
            const status = l.status?.toUpperCase();
            if (status !== "APPROVED") return false;
            const empId = l.empId || l.emp_id || l.employeeId;
            if (empId !== record.empId) return false;
            const fromStr = new Date(l.fromDate).toISOString().split("T")[0];
            const toStr = new Date(l.toDate).toISOString().split("T")[0];
            return recordDateStr >= fromStr && recordDateStr <= toStr;
          });

          let finalStatus = record.status;
          if (hasApprovedLeave) {
            finalStatus = "Leave";
          } else if (finalStatus === "Leave" || finalStatus === "OnLeave") {
            if (record.checkIn) {
              finalStatus = "Present";
            } else if (recordDateObj < todayDateObj) {
              finalStatus = "Absent";
            } else {
              finalStatus = "—"; // show hyphen for today/future with revoked leave
            }
          }
          return { ...record, status: finalStatus };
        });

        // Build synthetic records for approved leaves that have NO attendance row for selected date
        const approvedLeavesForSelectedDate = allLeaves.filter(l => {
          const status = l.status?.toUpperCase();
          if (status !== "APPROVED") return false;
          const fromStr = new Date(l.fromDate).toISOString().split("T")[0];
          const toStr = new Date(l.toDate).toISOString().split("T")[0];
          return selectedDate >= fromStr && selectedDate <= toStr;
        });

        const attendanceForSelectedDate = filterByDate(enrichedRecords, selectedDate);
        const existingEmpIds = new Set(attendanceForSelectedDate.map(r => r.empId));

        const syntheticLeaveRecords = approvedLeavesForSelectedDate
          .filter(l => {
            const empId = l.empId || l.emp_id || l.employeeId;
            return empId && !existingEmpIds.has(empId);
          })
          .map(l => {
            const empId = l.empId || l.emp_id || l.employeeId;
            return {
              id: `synthetic-leave-${empId}-${selectedDate}`,
              empId,
              empName: l.empName || l.emp_name || "Unknown",
              date: selectedDate,
              status: "Leave",
              checkIn: null,
              checkOut: null,
              workHours: 0,
              workMode: "-",
            };
          });

        // Combine and filter out rows with hyphen status (rejected leaves)
        const combined = [...attendanceForSelectedDate, ...syntheticLeaveRecords].filter(r => r.status !== "—");
        console.log("📊 [HR/Manager] Enriched records with synthetic leave rows:", combined);
        setRecords(combined);
      } else {
        const filtered = filterByDate(selfRecords, selectedDate);
        setRecords(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // load attendance and ensure holidays for current year
    (async () => {
      await ensureHolidays(new Date().getFullYear());
      setTodayHoliday(getHolidayByDate(today));
      await load();
    })();
  }, [selectedDate, user]);

  const handleCheckIn = async () => {
    if (isOnLeaveToday) return alert("Check-in disabled: You are on approved leave today.");
    if (todayHoliday) return alert(`Check-in disabled: Public holiday — ${todayHoliday.name}`);
    
    // Check if already checked in today
    if (todayRecord && todayRecord.checkIn) {
      return alert("You have already checked in today!");
    }
    
    console.log("🔵 [HR/Manager] Attempting check-in...", { 
      empId: user.empId, 
      empName: user.name, 
      workMode,
      todayRecord,
      isOnLeaveToday,
      todayHoliday 
    });
    
    try {
      const now = new Date();
      const payload = {
        empId: user.empId,
        empName: user.name,
        date: now.toISOString().split("T")[0],
        checkIn: now.toISOString(),
        workMode,
        status: "Present",
        empRole: user.role,
      };
      
      console.log("📤 [HR/Manager] Sending check-in payload:", payload);
      
      let response;
      // If today's record exists with status "Absent" (due to rejected leave), DELETE it first
      if (todayRecord && todayRecord.id && !todayRecord.checkIn) {
        console.log("🗑️ [HR/Manager] Deleting old Absent record:", todayRecord.id);
        try {
          await AttendanceAPI.deleteRecord(todayRecord.id);
          console.log("✅ [HR/Manager] Old record deleted");
        } catch (delErr) {
          console.warn("⚠️ [HR/Manager] Could not delete old record, will try to create new one anyway");
        }
      }
      
      // Now CREATE a new record
      console.log("➕ [HR/Manager] Creating new check-in record");
      response = await AttendanceAPI.checkIn(payload);
      
      console.log("✅ [HR/Manager] Check-in response:", response);
      
      alert("Checked in successfully!");
      load();
    } catch (err) {
      console.error("❌ [HR/Manager] Check-in error:", err);
      console.error("❌ [HR/Manager] Error response:", err.response?.data);
      alert(err.response?.data?.message || err.message || "Check-in failed");
    }
  };

  const handleCheckOut = async () => {
    if (isOnLeaveToday) return alert("Check-out disabled: You are on approved leave today.");
    if (todayHoliday) return alert(`Check-out disabled: Public holiday — ${todayHoliday.name}`);
    if (!todayRecord) return alert("No check-in found for today.");
    
    console.log("🔴 [HR/Manager] Attempting check-out...", { recordId: todayRecord.id, empId: user.empId });
    
    try {
      await AttendanceAPI.checkOut(todayRecord.id);
      alert("Checked out successfully!");
      load();
    } catch (err) {
      console.error("❌ [HR/Manager] Check-out error:", err);
      console.error("❌ [HR/Manager] Error response:", err.response?.data);
      alert(err.response?.data?.message || err.message || "Check-out failed");
    }
  };

  const employeeRecords = (empId) => records.filter((rec) => rec.empId === empId);

  const handleDownloadCSV = (empId, empName) => {
    const empRecs = employeeRecords(empId);
    if (!empRecs.length) return alert("No records to download");
    const rows = empRecs.map((r) => {
      const checkIn = r.checkIn ? displayTime(r.checkIn) : "-";
      const checkOut = r.checkOut ? displayTime(r.checkOut) : "-";
      const workHours =
        r.checkIn && r.checkOut
          ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2)
          : 0;
      return [
        displayDate(r.date),
        checkIn,
        checkOut,
        workHours,
        r.status,
        r.workMode || "-",
      ].join(",");
    });
    const csvContent = "Date,Check In,Check Out,Hours,Status,Work Mode\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${empName}_Attendance.csv`;
    a.click();
  };

  const handleDownloadPDF = (empId, empName) => {
    const empRecs = employeeRecords(empId);
    if (!empRecs.length) return alert("No records to download");
    const doc = new jsPDF();
    doc.text(`Attendance Records: ${empName}`, 14, 15);
    const tableData = empRecs.map((r) => {
      const checkIn = r.checkIn ? displayTime(r.checkIn) : "-";
      const checkOut = r.checkOut ? displayTime(r.checkOut) : "-";
      const workHours =
        r.checkIn && r.checkOut
          ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2)
          : 0;
      return [displayDate(r.date), checkIn, checkOut, workHours, r.status, r.workMode || "-"];
    });
    autoTable(doc, { head: [["Date", "Check In", "Check Out", "Hours", "Status", "Mode"]], body: tableData, startY: 30 });
    doc.save(`${empName}_Attendance.pdf`);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.empName && r.empName.toLowerCase().includes(q));
  }, [records, searchQuery]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter((r) => r.status === "Present").length;
    const leave = filtered.filter((r) => r.status === "Leave").length;
    const absent = filtered.filter((r) => r.status === "Absent").length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { total, present, leave, absent, rate };
  }, [filtered]);

  const getStatusColor = (status) => {
    const colors = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Leave: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const canCheckIn = !todayRecord || (todayRecord && !todayRecord.checkIn && !todayRecord.checkOut);
  const canCheckOut = todayRecord && todayRecord.checkIn && !todayRecord.checkOut;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Track and manage employee attendance records</p>
        </div>

        {["HR", "Manager"].includes(user?.role) && (
          <div className="flex items-center space-x-3">
            {/* Work Mode */}
            <Select value={workMode} onValueChange={setWorkMode}>
              <SelectTrigger className="w-[130px] bg-white border-gray-300 text-gray-800">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
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

            {/* Check-in / Check-out */}
            <Button
              disabled={!canCheckIn || todayHoliday || isOnLeaveToday}
              onClick={handleCheckIn}
              className={`flex items-center text-white ${canCheckIn && !isOnLeaveToday && !todayHoliday ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Check In
            </Button>
            <Button
              disabled={!canCheckOut || todayHoliday || isOnLeaveToday}
              onClick={handleCheckOut}
              className={`flex items-center text-white ${canCheckOut && !isOnLeaveToday && !todayHoliday ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"}`}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Check Out
            </Button>

            {/* Request Leave */}
            <Button
              onClick={() => setIsLeaveModalOpen(true)}
              className="bg-blue-600 text-white flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" /> Request Leave
            </Button>
          </div>
        )}
      </div>

      {isOnLeaveToday && (
        <div className="p-3 mb-2 bg-yellow-100 text-yellow-800 rounded-md border border-yellow-300">
          You are on approved leave today. Check-In/Check-Out is disabled.
        </div>
      )}

      {todayHoliday && (
        <div className="p-3 mb-2 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-300">
          Today is a public holiday: <strong>{todayHoliday.name}</strong>. Check-In/Check-Out is disabled.
        </div>
      )}

      {/* Summary Cards */}
      {isManagerView && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{summary.present}</p>
              </div>
              <CheckCircle className="text-green-500 w-8 h-8" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-600">On Leave</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.leave}</p>
              </div>
              <Calendar className="text-yellow-500 w-8 h-8" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
              </div>
              <AlertTriangle className="text-red-500 w-8 h-8" />
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-600">{summary.rate}%</p>
              </div>
              <BarChart3 className="text-blue-500 w-8 h-8" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Picker + Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <Button onClick={load} variant="outline">
            Refresh
          </Button>
        </div>
        <div className="flex items-center relative">
          <Search className="absolute left-3 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <Card className="border bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Daily Attendance Records</CardTitle>
          <CardDescription>Viewing: {displayDate(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  {isManagerView && <TableHead>Employee</TableHead>}
                  {isManagerView && <TableHead>Employee ID</TableHead>}
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Work Mode</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.empId || r.id}>
                    {isManagerView && <TableCell>{r.empName}</TableCell>}
                    {isManagerView && <TableCell>{r.empId}</TableCell>}
                    <TableCell>
                      {r.checkIn ? displayTime(r.checkIn) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.checkOut ? displayTime(r.checkOut) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.workHours !== undefined && r.workHours !== null
                        ? (() => {
                            const hours = Math.floor(r.workHours);
                            const minutes = Math.round((r.workHours - hours) * 60);
                            return `${hours}h ${minutes}m`;
                          })()
                        : r.checkIn && r.checkOut
                        ? (() => {
                            const diffMs = new Date(r.checkOut) - new Date(r.checkIn);
                            const totalMinutes = Math.floor(diffMs / (1000 * 60));
                            const hours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            return `${hours}h ${minutes}m`;
                          })()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "—" || !r.status ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <Badge variant="outline" className={getStatusColor(r.status)}>
                          {r.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.workMode || "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="mr-2 bg-blue-600 hover:bg-blue-700 text-white w-[110px]"
                        onClick={async () => {
                          setSelectedEmpId(r.empId);
                          setSelectedEmpName(r.empName);
                          // fetch employee's full attendance records for timesheet
                          const allEmpRecords = await AttendanceAPI.getByEmpId(r.empId);
                          setSelectedEmpRecords(allEmpRecords);
                          setIsTimesheetOpen(true);
                        }}
                      >
                        Timesheet
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild className="w-[110px] bg-grey-50">
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Download size={18} className="mr-1" /> Download
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-[110px] z-9999 bg-white">
                          <DropdownMenuItem
                            onClick={() => handleDownloadCSV(r.empId, r.empName)}
                          >
                            Download CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(r.empId, r.empName)}
                          >
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                <p>No records found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TimesheetModal
        open={isTimesheetOpen}
        onClose={() => setIsTimesheetOpen(false)}
        records={selectedEmpRecords}
        empId={selectedEmpId}
        empName={selectedEmpName}
      />

      <LeaveRequestModal
        open={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />
    </div>
  );
}
