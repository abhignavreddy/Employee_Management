import React, { useMemo, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "../../components/ui/table";

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

// Helper to extract local date string ("yyyy-mm-dd") using local date parts
const toLocalDateString = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function TimesheetModal({ open, onClose, records = [] }) {
  const weeksList = getWeeksList();
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  const baseWeek = selectedWeekIdx !== null ? weeksList[selectedWeekIdx] : weeksList[0];
  const weekLabel = selectedWeekIdx !== null ? weeksList[selectedWeekIdx].label : "Select Week Range";

  // Attendance mapped for each Monday–Sunday in IST
  const weekData = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseWeek.start);
      d.setDate(baseWeek.start.getDate() + i);
      // Get ISO string in IST for comparison
      // Compare by local date (yyyy-mm-dd) to avoid timezone-shifts
      const dayISO = toLocalDateString(d);
      const rec = records.find((r) => toLocalDateString(new Date(r.date)) === dayISO);
      const dayOfWeek = d.getDay();

      let status = rec?.status || "Absent";
      if (!rec && (dayOfWeek === 6 || dayOfWeek === 0)) {
        status = "Weekoff";
      }

      const hours = rec?.workHours !== undefined && rec?.workHours !== null
        ? rec.workHours
        : (rec?.checkIn && rec?.checkOut
          ? ((new Date(rec.checkOut) - new Date(rec.checkIn)) / (1000 * 60 * 60))
          : 0);

      const overtime = hours > 9 ? hours - 9 : 0;

      days.push({
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
        day: d.toLocaleDateString("en-IN", { weekday: "long" }),
        status,
        checkIn: rec?.checkIn || null,
        checkOut: rec?.checkOut || null,
        workMode: rec?.workMode || "—",
        hours,
        overtime
      });
    }
    return days;
  }, [records, baseWeek]);

  const weeklyHours = weekData.reduce((sum, d) => sum + (d.hours || 0), 0);
  const isWeeklyOvertime = weeklyHours > 45;

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
              <TableHead>Day</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Mode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weekData.map((d, idx) => (
              <TableRow key={idx}>
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.day}</TableCell>
                <TableCell>{d.status}</TableCell>
                <TableCell>{d.checkIn ? new Date(d.checkIn).toLocaleTimeString("en-IN", { hour:'2-digit', minute:'2-digit' }) : "—"}</TableCell>
                <TableCell>{d.checkOut ? new Date(d.checkOut).toLocaleTimeString("en-IN", { hour:'2-digit', minute:'2-digit' }) : "—"}</TableCell>
                <TableCell>{d.hours ? d.hours.toFixed(2) : "0.00"}</TableCell>
                <TableCell>
                  {d.overtime > 0
                    ? <span className="text-red-600 font-bold">{d.overtime.toFixed(2)}</span>
                    : d.overtime.toFixed(2)}
                </TableCell>
                <TableCell>{d.workMode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end mt-4">
          <span>
            Weekly Hours:&nbsp;
            <span className={isWeeklyOvertime ? "text-red-600 font-bold" : ""}>
              {weeklyHours.toFixed(2)}
            </span>
            {isWeeklyOvertime && (
              <span className="ml-2 text-red-600 font-bold">Overtime</span>
            )}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
