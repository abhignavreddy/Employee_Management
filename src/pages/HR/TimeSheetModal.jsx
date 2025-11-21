
import React, { useMemo, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "../../components/ui/table";
import apiClient from "../../lib/apiClient";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

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
      // Determine status and handle incomplete records (missing checkout)
      let status = rec?.status || "Absent";
      if (!rec && (dayOfWeek === 6 || dayOfWeek === 0)) {
        status = "Weekoff";
      }

      // Calculate hours and overtime. If checkIn exists but checkOut missing, mark as Incomplete and do NOT count hours/overtime.
      let hours = 0;
      let overtime = 0;
      let incomplete = false;

      if (rec) {
        if (rec.workHours !== undefined && rec.workHours !== null) {
          hours = rec.workHours;
        } else if (rec.checkIn && rec.checkOut) {
          hours = (new Date(rec.checkOut) - new Date(rec.checkIn)) / (1000 * 60 * 60);
        } else if (rec.checkIn && !rec.checkOut) {
          // Missing checkout — treat as incomplete and do not count hours to avoid accidental overtime
          incomplete = true;
          hours = 0;
          status = "Incomplete";
        }
      }

      overtime = !incomplete && hours > 9 ? hours - 9 : 0;

      days.push({
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
        day: d.toLocaleDateString("en-IN", { weekday: "long" }),
        status,
        checkIn: rec?.checkIn || null,
        checkOut: rec?.checkOut || null,
        workMode: rec?.workMode || "—",
        hours,
        overtime,
        incomplete,
        recordId: rec?.id || rec?._id || null
      });
    }
    return days;
  }, [records, baseWeek]);

  const weeklyHours = weekData.reduce((sum, d) => sum + (d.hours || 0), 0);
  const isWeeklyOvertime = weeklyHours > 45;

  // Fix modal state
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [fixRecord, setFixRecord] = useState(null);
  const [fixDateObj, setFixDateObj] = useState(null);
  const [fixTime, setFixTime] = useState("");
  const [fixReason, setFixReason] = useState("");
  const [confirmOvertimeChecked, setConfirmOvertimeChecked] = useState(false);
  const [savingFix, setSavingFix] = useState(false);

  const openFixModal = (d) => {
    if (!d.recordId) return;
    setFixRecord(d.recordId);
    setFixDateObj(d.dateObj || new Date());
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setFixTime(`${hh}:${mm}`);
    setFixReason("");
    setConfirmOvertimeChecked(false);
    setFixModalOpen(true);
  };

  const closeFixModal = () => {
    setFixModalOpen(false);
    setFixRecord(null);
    setFixDateObj(null);
    setFixTime("");
    setFixReason("");
    setConfirmOvertimeChecked(false);
    setSavingFix(false);
  };

  const computeHoursForFix = () => {
    if (!fixDateObj || !fixTime) return 0;
    const [hh, mm] = fixTime.split(":");
    const checkout = new Date(fixDateObj.getFullYear(), fixDateObj.getMonth(), fixDateObj.getDate(), Number(hh), Number(mm));
    const rec = records.find(r => (r.id || r._id) === fixRecord || r.id === fixRecord || r._id === fixRecord);
    if (!rec || !rec.checkIn) return 0;
    const checkIn = new Date(rec.checkIn);
    const diff = (checkout - checkIn) / (1000 * 60 * 60);
    return diff;
  };

  const handleSaveFix = async () => {
    if (!fixRecord) return toast.error('No record selected');
    if (!fixTime) return toast.error('Please select a time');
    const hours = computeHoursForFix();
    const overtime = hours > 9 ? hours - 9 : 0;
    if (overtime > 0 && !confirmOvertimeChecked) {
      return toast.error('Please confirm overtime before saving');
    }
    setSavingFix(true);
    try {
      const [hh, mm] = fixTime.split(":");
      const checkoutIso = new Date(fixDateObj.getFullYear(), fixDateObj.getMonth(), fixDateObj.getDate(), Number(hh), Number(mm)).toISOString();
      await apiClient.patch(`/attendance/checkout/${fixRecord}`, { checkOut: checkoutIso, status: "Present", reason: fixReason || undefined });
      toast.success('Checkout fixed');
      closeFixModal();
      if (typeof onFixed === 'function') {
        onFixed();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fix checkout');
    } finally {
      setSavingFix(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw]">
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
              <SelectContent className="min-w-[180px] z-9999 bg-white">
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
              <TableCell>
                {d.incomplete ? (
                  <span className="text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded">Incomplete checkout</span>
                ) : (
                  d.status
                )}
              </TableCell>
              <TableCell>{d.checkIn ? new Date(d.checkIn).toLocaleTimeString("en-IN", { hour:'2-digit', minute:'2-digit' }) : "—"}</TableCell>
              <TableCell>
                {d.checkOut
                  ? new Date(d.checkOut).toLocaleTimeString("en-IN", { hour:'2-digit', minute:'2-digit' })
                  : (d.incomplete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded">Missing checkout</span>
                        {d.recordId && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => openFixModal(d)}
                          >
                            Fix
                          </Button>
                        )}
                      </div>
                    ) : "—")}
              </TableCell>
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

        {/* Fix Checkout Modal */}
        <Dialog open={fixModalOpen} onOpenChange={(val) => { if (!val) closeFixModal(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Fix Checkout</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Checkout time</label>
                <input type="time" value={fixTime} onChange={(e) => setFixTime(e.target.value)} className="mt-1 border rounded px-2 py-1 w-full" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Reason (optional)</label>
                <input type="text" value={fixReason} onChange={(e) => setFixReason(e.target.value)} placeholder="Reason for manual fix" className="mt-1 border rounded px-2 py-1 w-full" />
              </div>
              <div>
                <p className="text-sm text-gray-700">Estimated hours after fix: <strong>{computeHoursForFix().toFixed(2)}</strong></p>
                {computeHoursForFix() > 9 && (
                  <div className="mt-2">
                    <p className="text-red-600 text-sm">This checkout will create overtime. Please confirm to proceed.</p>
                    <label className="inline-flex items-center mt-2">
                      <input type="checkbox" checked={confirmOvertimeChecked} onChange={(e) => setConfirmOvertimeChecked(e.target.checked)} className="mr-2" />
                      <span className="text-sm">I confirm overtime for this day</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button className="bg-gray-100" onClick={closeFixModal}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveFix} disabled={savingFix}>{savingFix ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
