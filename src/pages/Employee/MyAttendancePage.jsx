import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../contexts/AuthContext";
import LeaveRequestModal from "./LeaveRequestModal";
import TimesheetModal from "./TimesheetModal";
import { getHolidayByDate, isPublicHoliday, ensureHolidays } from "../../lib/publicHolidays";

import { LogIn, LogOut, Home, Building2, Plus, Download } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

// API Config
const api = axios.create({ baseURL: "/", headers: { "Content-Type": "application/json" } });

const AttendanceAPI = {
  getByEmpId: (empId) => api.get(`/api/attendance/employee/${empId}`).then((r) => r.data),
  checkIn: (payload) => api.post("/api/attendance/checkin", payload).then((r) => r.data),
  deleteRecord: (id) => api.delete(`/api/attendance/${id}`).then((r) => r.data),
  checkOut: (id) => api.patch(`/api/attendance/checkout/${id}`, { checkOut: new Date().toISOString(), status: "Present" }).then((r) => r.data),
};

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [workMode, setWorkMode] = useState("Office");
  const [todayRecord, setTodayRecord] = useState(null);
  const [isOnLeaveToday, setIsOnLeaveToday] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [todayHoliday, setTodayHoliday] = useState(null);

  // Helper functions for consistent IST date/time formatting
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

  // Load attendance and leave data
  const load = async () => {
    if (!user?.empId) return;

    try {
      // Ensure holiday list for this year is loaded (Google Calendar or fallback)
      await ensureHolidays(new Date().getFullYear());

      const data = await AttendanceAPI.getByEmpId(user.empId);

      // Fetch leave requests
      let leaves = [];
      try {
        const leaveRes = await api.get(`/api/leave-approvel/employee/${user.empId}`);
        leaves = leaveRes.data || [];
        console.log("📋 Fetched Leave Requests:", leaves);
      } catch (err) {
        console.error("Failed to load leave data:", err);
        leaves = [];
      }

      const today = new Date().toISOString().split("T")[0];

      // Check if employee is on leave today (boolean) - ONLY for APPROVED leaves
      const onLeaveToday = leaves.some((l) => {
        const status = l.status?.toUpperCase() || "";
        console.log("🔍 Checking leave:", {
          fromDate: l.fromDate,
          toDate: l.toDate,
          status: status,
          originalStatus: l.status,
          isApproved: status === "APPROVED"
        });
        
        if (status !== "APPROVED") {
          console.log("❌ Leave not approved, skipping:", l);
          return false;
        }
        
        const fromDate = new Date(l.fromDate).toISOString().split("T")[0];
        const toDate = new Date(l.toDate).toISOString().split("T")[0];
        
        const isInRange = today >= fromDate && today <= toDate;
        console.log("📅 Date check:", { today, fromDate, toDate, isInRange });
        
        return isInRange;
      });
      setIsOnLeaveToday(onLeaveToday);
      
      console.log("✅ Final Leave Status - Today:", today, "On Leave:", onLeaveToday);

      // Check if today is a public holiday
      const holiday = getHolidayByDate(today);
      setTodayHoliday(holiday);

      // Map attendance records: reflect approved leave, otherwise revert previous leave markers intelligently
      const todayDateObj = new Date(today);
      const updatedRecords = data.map(r => {
        if (!r.date) return r;
        const recordDateObj = new Date(r.date);
        const recordDateStr = recordDateObj.toISOString().split("T")[0];

        // Determine if this date is covered by an APPROVED leave
        const hasApprovedLeave = leaves.some(l => {
          const status = l.status?.toUpperCase();
          if (status !== "APPROVED") return false;
          const fromStr = new Date(l.fromDate).toISOString().split("T")[0];
          const toStr = new Date(l.toDate).toISOString().split("T")[0];
          return recordDateStr >= fromStr && recordDateStr <= toStr;
        });

        let finalStatus = r.status;
        if (hasApprovedLeave) {
          finalStatus = "Leave";
        } else if (finalStatus === "Leave" || finalStatus === "OnLeave") {
          // Previously marked as leave but leave was revoked/rejected.
          if (r.checkIn) {
            finalStatus = "Present"; // user actually checked in later
          } else if (recordDateObj < todayDateObj) {
            // Past day with no check in -> Absent
            finalStatus = "Absent";
          } else {
            // Today or future: show blank placeholder instead of Absent
            finalStatus = "—"; // will render as hyphen
          }
        }
        return { ...r, status: finalStatus };
      });

      console.log("📊 Updated Records with Leave Status (employee page):", updatedRecords);

      setRecords(updatedRecords);

      // Optional: set today's record for check-in/out buttons logic
      const todayRec = updatedRecords.find(r => r.date === today);
      setTodayRecord(todayRec || null);
      
      console.log("📌 Today's Record:", todayRec);
      console.log("📌 Can Check In:", !isOnLeaveToday && !todayHoliday && (!todayRec || (!todayRec.checkIn && !todayRec.checkOut)));
      console.log("📌 Can Check Out:", !isOnLeaveToday && !todayHoliday && todayRec && todayRec.checkIn && !todayRec.checkOut);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
    
    // Refresh when window gains focus (user comes back to tab)
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const onLeaveRequestSubmitted = () => {
    load(); // Refresh attendance and leave data on leave submission
  };

  // Check-In / Check-Out buttons enable/disable conditions
  const canCheckIn = !isOnLeaveToday && !todayHoliday && (!todayRecord || (!todayRecord.checkIn && !todayRecord.checkOut));
  const canCheckOut = !isOnLeaveToday && !todayHoliday && todayRecord && todayRecord.checkIn && !todayRecord.checkOut;

  const handleCheckIn = async () => {
    if (isOnLeaveToday) return alert("Check-in disabled: You are on approved leave today.");
    if (todayHoliday) return alert(`Check-in disabled: Public holiday — ${todayHoliday.name}`);
    
    // Check if already checked in today
    if (todayRecord && todayRecord.checkIn) {
      return alert("You have already checked in today!");
    }
    
    console.log("🔵 Attempting check-in...", { 
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
      
      console.log("📤 Sending check-in payload:", payload);
      
      let response;
      // If today's record exists with status "Absent" (due to rejected leave), DELETE it first
      if (todayRecord && todayRecord.id && !todayRecord.checkIn) {
        console.log("🗑️ Deleting old Absent record:", todayRecord.id);
        try {
          await AttendanceAPI.deleteRecord(todayRecord.id);
          console.log("✅ Old record deleted");
        } catch (delErr) {
          console.warn("⚠️ Could not delete old record, will try to create new one anyway");
        }
      }
      
      // Now CREATE a new record
      console.log("➕ Creating new check-in record");
      response = await AttendanceAPI.checkIn(payload);
      
      console.log("✅ Check-in response:", response);
      
      alert("Checked in successfully!");
      load();
    } catch (err) {
      console.error("❌ Check-in error:", err);
      console.error("❌ Error response:", err.response?.data);
      console.error("❌ Full error object:", JSON.stringify(err.response, null, 2));
      
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Check-in failed";
      alert(`Check-in failed: ${errorMsg}`);
    }
  };

  const handleCheckOut = async () => {
    if (isOnLeaveToday) return alert("Check-out disabled: You are on approved leave today.");
    if (todayHoliday) return alert(`Check-out disabled: Public holiday — ${todayHoliday.name}`);
    if (!todayRecord) return alert("No check-in found for today.");
    
    console.log("🔴 Attempting check-out...", { recordId: todayRecord.id, empId: user.empId });
    
    try {
      console.log("📤 Sending check-out request for record ID:", todayRecord.id);
      const response = await AttendanceAPI.checkOut(todayRecord.id);
      console.log("✅ Check-out response:", response);
      
      alert("Checked out successfully!");
      load();
    } catch (err) {
      console.error("❌ Check-out error:", err);
      console.error("❌ Error response:", err.response?.data);
      alert(err.response?.data?.message || err.message || "Check-out failed");
    }
  };

  // Sort records by date descending for table display
  const sortedRecords = useMemo(() => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)), [records]);

  // CSV / PDF Download functions with IST formatting
  const downloadCSV = () => {
    if (!sortedRecords.length) return alert("No records to download");
    const rows = sortedRecords.map(r => {
      const checkIn = r.checkIn ? displayTime(r.checkIn) : "-";
      const checkOut = r.checkOut ? displayTime(r.checkOut) : "-";
      const workHours = r.checkIn && r.checkOut ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2) : 0;
      return [displayDate(r.date), checkIn, checkOut, workHours, r.status, r.workMode || "-"].join(",");
    });
    const csvContent = "Date,Check In,Check Out,Hours,Status,Work Mode\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Attendance.csv"; a.click();
  };

  const downloadPDF = () => {
    if (!sortedRecords.length) return alert("No records to download");
    const doc = new jsPDF();
    doc.text("Attendance Records", 14, 15);
    const tableData = sortedRecords.map(r => {
      const checkIn = r.checkIn ? displayTime(r.checkIn) : "-";
      const checkOut = r.checkOut ? displayTime(r.checkOut) : "-";
      const workHours = r.checkIn && r.checkOut ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2) : 0;
      return [displayDate(r.date), checkIn, checkOut, workHours, r.status, r.workMode || "-"];
    });
    autoTable(doc, { head: [["Date", "Check In", "Check Out", "Hours", "Status", "Mode"]], body: tableData, startY: 30 });
    doc.save("Attendance.pdf");
  };

  // Status color for badges
  const getStatusColor = (status) => {
    const colors = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Leave: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
        </div>
        <Button onClick={() => setIsLeaveModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Request Leave
        </Button>
      </div>

      {/* LEAVE WARNING */}
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

      {/* CHECK-IN / CHECK-OUT */}
      <div className="flex items-center gap-3 mt-2">
        <Select value={workMode} onValueChange={setWorkMode}>
          <SelectTrigger className="w-[130px] bg-gray-50"><SelectValue placeholder="Work Mode" /></SelectTrigger>
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
        <Button onClick={handleCheckIn} disabled={!canCheckIn} className={`text-white ${canCheckIn ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}>
          <LogIn className="w-4 h-4 mr-1" />Check In
        </Button>
        <Button onClick={handleCheckOut} disabled={!canCheckOut} className={`text-white ${canCheckOut ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"}`}>
          <LogOut className="w-4 h-4 mr-1" />Check Out
        </Button>
      </div>

      {/* ATTENDANCE TABLE */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>All records</CardDescription>
        </CardHeader>
        <CardContent>
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
              {sortedRecords.map((r) => {
                const checkIn = r.checkIn ? new Date(r.checkIn) : null;
                const checkOut = r.checkOut ? new Date(r.checkOut) : null;
                const workHours = checkIn && checkOut ? ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2) : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{displayDate(r.date)}</TableCell>
                    <TableCell>{checkIn ? displayTime(r.checkIn) : "—"}</TableCell>
                    <TableCell>{checkOut ? displayTime(r.checkOut) : "—"}</TableCell>
                    <TableCell>{r.workHours !== undefined && r.workHours !== null
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
                        <Badge variant="outline" className={getStatusColor(r.status)}>{r.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.workMode || "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* TIMESHEET BUTTON & DOWNLOAD */}
      <div className="flex justify-end gap-3 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className=" bg-grey-50">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download size={18} className="mr-1" /> Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white">
            <DropdownMenuItem onClick={downloadCSV}>Download CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={downloadPDF}>Download PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={() => setIsTimesheetOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          Timesheet
        </Button>
      </div>

      <TimesheetModal open={isTimesheetOpen} onClose={() => setIsTimesheetOpen(false)} records={sortedRecords} />

      <LeaveRequestModal open={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} />
    </div>
  );
}
