import React, { useMemo, useState } from "react";
import {  Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "../../components/ui/table";

// Helper: Get Monday of a week
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Generate recent week ranges (Monday to Sunday)
const getWeeksList = (n = 6) => {
  const today = new Date();
  const currMonday = getStartOfWeek(today);
  const weeks = [];
  for (let i = 0; i < n; i++) {
    const start = new Date(currMonday); 
    start.setDate(currMonday.getDate() - (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weeks.push({
      label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      start,
      end
    });
  }
  return weeks;
};


export default function TimesheetModal({ open, onClose, records = [] }) {
  const weeksList = getWeeksList();
  // null means user has not picked, table shows current week by default
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);

  // Table always shows present week data unless user selects one
  const baseWeek = selectedWeekIdx !== null ? weeksList[selectedWeekIdx] : weeksList[0];
  const weekLabel = selectedWeekIdx !== null ? weeksList[selectedWeekIdx].label : "Select Week Range";

  // Attendance rows for the week
  const weekData = useMemo(() => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseWeek.start); // baseWeek.start will be Monday
    d.setDate(baseWeek.start.getDate() + i);
    const formatted = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    const rec = records.find(r => (new Date(r.date).toISOString().split("T")[0]) === formatted);
    let status = rec?.status || "Absent";
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      status = "Weekoff";
    }
    days.push({
      date: formatted,
      status,
      checkIn: rec?.checkIn || null,
      checkOut: rec?.checkOut || null,
      workMode: rec?.workMode || "—",
      hours: rec?.workHours || 0
    });
  }
  return days;
}, [records, baseWeek]);


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Weekly Timesheet</h2>
              <p className="text-gray-500 text-sm">{weekLabel}</p>
            </div>
            <Select
              value={selectedWeekIdx !== null ? String(selectedWeekIdx) : ""}
              onValueChange={val => setSelectedWeekIdx(Number(val))}
            >
              <SelectTrigger className="w-[180px] bg-grey-50">
                <SelectValue placeholder="Select Week Range" />
              </SelectTrigger>
              <SelectContent className="min-w-[180px] z-[9999] bg-white">
                {weeksList.map((week, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Mode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weekData.map((d, idx) => (
              <TableRow key={idx}>
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.status}</TableCell>
                <TableCell>{d.checkIn ? new Date(d.checkIn).toLocaleTimeString() : "—"}</TableCell>
                <TableCell>{d.checkOut ? new Date(d.checkOut).toLocaleTimeString() : "—"}</TableCell>
                <TableCell>{d.hours.toFixed(2)}</TableCell>
                <TableCell>{d.workMode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
