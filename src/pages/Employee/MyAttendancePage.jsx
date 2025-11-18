// src/pages/Employee/MyAttendancePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../contexts/AuthContext";
import LeaveRequestModal from "./LeaveRequestModal";
import TimesheetModal from "./TimesheetModal";

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
  checkOut: (id) => api.patch(`/api/attendance/checkout/${id}`, { checkOut: new Date().toISOString(), status: "Present" }).then((r) => r.data),
};

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [workMode, setWorkMode] = useState("Office");
  const [todayRecord, setTodayRecord] = useState(null);
  const [isOnLeaveToday, setIsOnLeaveToday] = useState(false);
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Load attendance and leave data
  const load = async () => {
    if (!user?.empId) return;
    try {
      const data = await AttendanceAPI.getByEmpId(user.empId);
      setRecords(data || []);

      // Load approved leave data
      try {
        const leaveRes = await api.get(`/api/leave/employee/${user.empId}`);
        const leaves = leaveRes.data || [];

        const today = new Date().toISOString().split("T")[0];

        // Check if today falls under any approved leave
        const onLeave = leaves.some(l =>
          l.status === "Approved" &&
          today >= l.startDate &&
          today <= l.endDate
        );

        setIsOnLeaveToday(onLeave);
      } catch (err) {
        console.error("Failed to load leave data:", err);
        setIsOnLeaveToday(false);
      }

      const today = new Date().toISOString().split("T")[0];
      const todayRec = data.find((r) => r.date === today);
      setTodayRecord(todayRec || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [user]);

  const onLeaveRequestSubmitted = () => {
    load(); // Refresh attendance and leave data
  };

  // Check-In / Check-Out conditions
  const canCheckIn = !isOnLeaveToday && (!todayRecord || (!todayRecord.checkIn && !todayRecord.checkOut));
  const canCheckOut = !isOnLeaveToday && todayRecord && todayRecord.checkIn && !todayRecord.checkOut;

  const handleCheckIn = async () => {
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
      await AttendanceAPI.checkIn(payload);
      alert("Checked in successfully!");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Check-in failed");
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return alert("No check-in found for today.");
    try {
      await AttendanceAPI.checkOut(todayRecord.id);
      alert("Checked out successfully!");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Check-out failed");
    }
  };

  // Sort records by date descending
  const sortedRecords = useMemo(() => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)), [records]);

  // CSV / PDF Download
  const downloadCSV = () => {
    if (!sortedRecords.length) return alert("No records to download");
    const rows = sortedRecords.map(r => {
      const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const workHours = r.checkIn && r.checkOut ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2) : 0;
      return [new Date(r.date).toLocaleDateString(), checkIn, checkOut, workHours, r.status, r.workMode || "-"].join(",");
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
      const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
      const workHours = r.checkIn && r.checkOut ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2) : 0;
      return [new Date(r.date).toLocaleDateString(), checkIn, checkOut, workHours, r.status, r.workMode || "-"];
    });
    autoTable(doc, { head: [["Date", "Check In", "Check Out", "Hours", "Status", "Mode"]], body: tableData, startY: 30 });
    doc.save("Attendance.pdf");
  };

  // Status color for badges
  const getStatusColor = (status) => {
    const colors = { Present: "bg-green-100 text-green-800 border-green-200", Leave: "bg-yellow-100 text-yellow-800 border-yellow-200", Absent: "bg-red-100 text-red-800 border-red-200" };
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
        <Button onClick={handleCheckIn} disabled={!canCheckIn} className={`text-white ${canCheckIn ? "bg-green-600 hover:bg-green-700":"bg-gray-400"}`}><LogIn className="w-4 h-4 mr-1"/>Check In</Button>
        <Button onClick={handleCheckOut} disabled={!canCheckOut} className={`text-white ${canCheckOut ? "bg-red-600 hover:bg-red-700":"bg-gray-400"}`}><LogOut className="w-4 h-4 mr-1"/>Check Out</Button>
      </div>

      {/* ATTENDANCE TABLE */}
      <Card className="mt-4">
        <CardHeader><CardTitle>Attendance History</CardTitle><CardDescription>All records</CardDescription></CardHeader>
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
                const workHours = checkIn && checkOut ? ((checkOut - checkIn)/(1000*60*60)).toFixed(2) : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>{checkIn ? checkIn.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "—"}</TableCell>
                    <TableCell>{checkOut ? checkOut.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "—"}</TableCell>
                    <TableCell>{workHours ? `${workHours} h` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={getStatusColor(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell>{r.workMode || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* TIMESHEET BUTTON & DOWNLOAD */}
      <div className="flex justify-end gap-3 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild  className=" bg-grey-50">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download size={18} className="mr-1"/> Download
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

      <LeaveRequestModal 
        open={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)} 
        user={user} 
        onSubmitSuccess={load}  // Refresh data after submission
      />
    </div>
  );
}
