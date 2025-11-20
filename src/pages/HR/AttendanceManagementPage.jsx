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

const AttendanceAPI = {
  getAll: () =>
    apiClient.get(`/attendance?page=0&size=500`).then((r) => r.data.content),
  getByEmpId: (empId) => apiClient.get(`/attendance/employee/${empId}`).then((r) => r.data),
  checkIn: (payload) => apiClient.post(`/attendance/checkin`, payload).then((r) => r.data),
  checkOut: (id) =>
    apiClient
      .patch(`/attendance/checkout/${id}`, { checkOut: new Date().toISOString() })
      .then((r) => r.data),
};

export default function AttendanceManagementPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [workMode, setWorkMode] = useState("Office");
  const [todayRecord, setTodayRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [selectedEmpName, setSelectedEmpName] = useState("");
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);

  const isManagerView = ["HR", "Manager", "CEO"].includes(user?.role);

  // Helper to filter records by date ignoring timestamps
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

      // Get today's record for self
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

      if (isManagerView) {
        // Get all without date filter
        const allRecords = await AttendanceAPI.getAll();

        // Filter by selected date client side
        const filtered = filterByDate(allRecords, selectedDate);
        setRecords(filtered);
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
    load();
  }, [selectedDate, user]);

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

  // Filter all records (from all dates) for a given employee
  const employeeRecords = (empId) => records.filter((rec) => rec.empId === empId);

  const handleDownloadCSV = (empId, empName) => {
    const empRecs = employeeRecords(empId);
    if (!empRecs.length) return alert("No records to download");
    const rows = empRecs.map((r) => {
      // CHANGED: Format checkIn and checkOut in IST timezone
      const checkIn = r.checkIn
        ? new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
        : "-";
      const checkOut = r.checkOut
        ? new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
        : "-";
      const workHours =
        r.checkIn && r.checkOut
          ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2)
          : 0;
      return [
        new Date(r.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
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
      // CHANGED: Format checkIn and checkOut in IST timezone
      const checkIn = r.checkIn
        ? new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
        : "-";
      const checkOut = r.checkOut
        ? new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
        : "-";
      const workHours =
        r.checkIn && r.checkOut
          ? ((new Date(r.checkOut) - new Date(r.checkIn)) / (1000 * 60 * 60)).toFixed(2)
          : 0;
      return [
        new Date(r.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
        checkIn,
        checkOut,
        workHours,
        r.status,
        r.workMode || "-",
      ];
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
              disabled={!canCheckIn}
              onClick={handleCheckIn}
              className={`flex items-center text-white ${canCheckIn ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Check In
            </Button>
            <Button
              disabled={!canCheckOut}
              onClick={handleCheckOut}
              className={`flex items-center text-white ${canCheckOut ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"}`}
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
          <CardDescription>
            Viewing: {new Date(selectedDate).toLocaleDateString()}
          </CardDescription>
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
                    {/* CHANGED - checkIn in IST */}
                    <TableCell>
                      {r.checkIn
                        ? new Date(r.checkIn).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })
                        : "—"}
                    </TableCell>

                    {/* CHANGED - checkOut in IST */}
                    <TableCell>
                      {r.checkOut
                        ? new Date(r.checkOut).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })
                        : "—"}
                    </TableCell>

                    <TableCell>
                      {r.workHours !== undefined && r.workHours !== null
                        ? `${r.workHours.toFixed(2)} h`
                        : r.checkIn && r.checkOut
                        ? `${(
                            (new Date(r.checkOut) - new Date(r.checkIn)) /
                            (1000 * 60 * 60)
                          ).toFixed(2)} h`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.workMode || "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="mr-2 bg-blue-600 hover:bg-blue-700 text-white w-[110px]"
                        onClick={() => {
                          setSelectedEmpId(r.empId);
                          setSelectedEmpName(r.empName);
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
                          <DropdownMenuItem onClick={() => handleDownloadCSV(r.empId, r.empName)}>
                            Download CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(r.empId, r.empName)}>
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
        records={employeeRecords(selectedEmpId)}
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
