import React, { useState } from 'react';
import { applyLeave } from '../../lib/leaveService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const LeaveRequestModal = ({ open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ typeOfLeave: 'Sick Leave', fromDate: '', toDate: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate || !form.reason.trim() || new Date(form.fromDate) > new Date(form.toDate)) {
      toast.error('Please fill all fields correctly');
      return;
    }
    setLoading(true);
    try {
      await applyLeave({
        empId: user.empId,
        empName: user.name,
        empRole: user.role,
        typeOfLeave: form.typeOfLeave,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
      });
      toast.success('Leave submitted!');
      onSuccess?.();
      onClose();
      setForm({ typeOfLeave: 'Sick Leave', fromDate: '', toDate: '', reason: '' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type of Leave</Label>
            <select name="typeOfLeave" value={form.typeOfLeave} onChange={handleChange} className="w-full border rounded p-2">
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Paid Leave">Paid Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>From</Label>
              <Input type="date" name="fromDate" value={form.fromDate} onChange={handleChange}/>
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" name="toDate" value={form.toDate} onChange={handleChange}/>
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea name="reason" value={form.reason} onChange={handleChange}/>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestModal;
