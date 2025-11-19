import React, { useMemo, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "../../components/ui/table";

// CHANGED: getStartOfWeek always returns Monday (using IST)
// Returns Monday of the week for the given date (always Monday-Sunday week)
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = (day === 0 ? -6 : 1 - day); // if Sunday, move back 6, if Monday, diff=0, else subtract
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

// Generate week ranges (Monday - Sunday)
function getWeeksList(n = 6) {
  const today = new Date();
  const currMonday = getMonday(today);
  const weeks = [];
  for (let i = 0; i < n; i++) {
    const start = new Date(currMonday);
    start.setDate(currMonday.getDate() - (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Always Sunday
    weeks.push({
      label: `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })} – ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
      start,
      end
    });
  }
  return weeks;
}

// CHANGED: Helper to extract date string in IST ("yyyy-mm-dd")
const toISTDateString = (date) => {
  const dateIST = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return dateIST.toISOString().slice(0, 10);
};

export default function TimesheetModal({ open, onClose, records = [] }) {
  const weeksList = getWeeksList();
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  const baseWeek = selectedWeekIdx !== null ? weeksList[selectedWeekIdx] : weeksList[0];
  const weekLabel = selectedWeekIdx !== null ? weeksList[selectedWeekIdx].label : "Select Week Range";

  // CHANGED: Attendance mapped for each Monday–Sunday in IST
  const weekData = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseWeek.start);
      d.setDate(baseWeek.start.getDate() + i);
      // Get ISO string in IST for comparison
      const dayISO = toISTDateString(d);

      // Find record for this day in IST
      const rec = records.find(r => toISTDateString(new Date(r.date)) === dayISO);

      // Get weekday in IST for weekend marking
      const dayOfWeek = new Date(d.getTime() + 5.5 * 60 * 60 * 1000).getDay();

      // CHANGED: Only mark "Weekoff" for missing Sat/Sun
      let status = rec?.status || "Absent";
      if (!rec && (dayOfWeek === 6 || dayOfWeek === 0)) {
        status = "Weekoff";
      }

      days.push({
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" }),
        status,
        checkIn: rec?.checkIn || null,
        checkOut: rec?.checkOut || null,
        workMode: rec?.workMode || "—",
        hours: rec?.workHours !== undefined && rec?.workHours !== null ? rec.workHours : (rec?.checkIn && rec?.checkOut ? ((new Date(rec.checkOut) - new Date(rec.checkIn)) / (1000 * 60 * 60)) : 0)
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
                {/* CHANGED: Always show IST date */}
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.status}</TableCell>
                {/* CHANGED: Always show IST time for check-in/check-out */}
                <TableCell>{d.checkIn ? new Date(d.checkIn).toLocaleTimeString("en-IN", { hour:'2-digit', minute:'2-digit', timeZone: "Asia/Kolkata" }) : "—"}</TableCell>
                <TableCell>{d.checkOut ? new Date(d.checkOut).toLocaleTimeString("en-IN", { hour:'2-digit', minute:'2-digit', timeZone: "Asia/Kolkata" }) : "—"}</TableCell>
                <TableCell>{d.hours ? d.hours.toFixed(2) : "0.00"}</TableCell>
                <TableCell>{d.workMode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
