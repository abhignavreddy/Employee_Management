import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../lib/apiClient';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AlertCircle } from 'lucide-react';

export default function LeaveRequestModal({ 
  open, 
  onClose, 
  onSubmitted, 
  leaveBalances, 
  editingLeave,
  existingLeaves 
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    typeOfLeave: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (editingLeave) {
      setFormData({
        typeOfLeave: editingLeave.typeOfLeave || editingLeave.leaveType || '',
        fromDate: new Date(editingLeave.fromDate || editingLeave.from_date).toISOString().split('T')[0],
        toDate: new Date(editingLeave.toDate || editingLeave.to_date).toISOString().split('T')[0],
        reason: editingLeave.reason || ''
      });
    } else {
      setFormData({
        typeOfLeave: '',
        fromDate: '',
        toDate: '',
        reason: ''
      });
    }
    setError('');
  }, [editingLeave, open]);

  // Get tomorrow's date (minimum selectable date)
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Check if dates overlap with existing approved/pending leaves
  const checkDateOverlap = (fromDate, toDate) => {
    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);

    // Filter out the current editing leave (if editing)
    const leavesToCheck = existingLeaves.filter(leave => {
      // Exclude rejected leaves
      if ((leave.status || '').toUpperCase() === 'REJECTED') return false;
      
      // If editing, exclude the current leave being edited
      if (editingLeave && (leave._id === editingLeave._id || leave.id === editingLeave.id)) {
        return false;
      }
      
      return true;
    });

    for (const leave of leavesToCheck) {
      const existingFrom = new Date(leave.fromDate || leave.from_date);
      const existingTo = new Date(leave.toDate || leave.to_date);

      // Check for any overlap
      if (
        (newFrom >= existingFrom && newFrom <= existingTo) ||
        (newTo >= existingFrom && newTo <= existingTo) ||
        (newFrom <= existingFrom && newTo >= existingTo)
      ) {
        return {
          overlaps: true,
          conflictingLeave: leave
        };
      }
    }

    return { overlaps: false };
  };

  // Validate dates
  const validateDates = () => {
    const { fromDate, toDate, typeOfLeave } = formData;

    // Check if dates are filled
    if (!fromDate || !toDate) {
      setError('Please select both from and to dates');
      return false;
    }

    // Check if from date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedFrom = new Date(fromDate);
    
    if (selectedFrom < today) {
      setError('Cannot request leave for past dates');
      return false;
    }

    // Check if to date is after from date
    const selectedTo = new Date(toDate);
    if (selectedTo < selectedFrom) {
      setError('End date must be after start date');
      return false;
    }

    // Check for overlapping leaves
    const overlapCheck = checkDateOverlap(fromDate, toDate);
    if (overlapCheck.overlaps) {
      const conflictLeave = overlapCheck.conflictingLeave;
      const conflictFrom = new Date(conflictLeave.fromDate || conflictLeave.from_date).toLocaleDateString('en-IN');
      const conflictTo = new Date(conflictLeave.toDate || conflictLeave.to_date).toLocaleDateString('en-IN');
      setError(`This date range overlaps with your existing ${conflictLeave.status} leave (${conflictFrom} - ${conflictTo})`);
      return false;
    }

    // Check leave balance
    if (leaveBalances) {
      const days = Math.ceil((selectedTo - selectedFrom) / (1000 * 60 * 60 * 24)) + 1;
      const leaveType = typeOfLeave.toLowerCase();
      
      let available = 0;
      if (leaveType.includes('casual')) {
        available = leaveBalances.casual.remaining;
      } else if (leaveType.includes('sick')) {
        available = leaveBalances.sick.remaining;
      } else if (leaveType.includes('annual')) {
        available = leaveBalances.annual.remaining;
      }

      // If editing, add back the days from the original leave
      if (editingLeave) {
        const originalFrom = new Date(editingLeave.fromDate || editingLeave.from_date);
        const originalTo = new Date(editingLeave.toDate || editingLeave.to_date);
        const originalDays = Math.ceil((originalTo - originalFrom) / (1000 * 60 * 60 * 24)) + 1;
        available += originalDays;
      }

      if (days > available) {
        setError(`Insufficient ${typeOfLeave} balance. You have ${available} days remaining`);
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateDates()) {
      return;
    }

    if (!formData.typeOfLeave) {
      setError('Please select leave type');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        empId: user.empId,
        empName: user.name,
        typeOfLeave: formData.typeOfLeave,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason,
        status: 'Pending',
        empRole: user.role
      };

      if (editingLeave) {
        // Update existing leave
        await apiClient.put(`/leave-approvel/${editingLeave._id || editingLeave.id}`, payload);
        alert('Leave request updated successfully!');
      } else {
        // Create new leave
        await apiClient.post('/leave-approvel/apply', payload);
        alert('Leave request submitted successfully!');
      }

      onSubmitted();
    } catch (err) {
      console.error('Failed to submit leave request', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user makes changes
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingLeave ? 'Edit Leave Request' : 'Request Leave'}
          </DialogTitle>
          <DialogDescription>
            {editingLeave 
              ? 'Update your leave request details' 
              : 'Fill in the details to request time off'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="typeOfLeave">Leave Type *</Label>
            <Select 
              value={formData.typeOfLeave} 
              onValueChange={(val) => handleChange('typeOfLeave', val)}
              required
            >
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Casual Leave">
                  Casual Leave ({leaveBalances?.casual.remaining || 0} days left)
                </SelectItem>
                <SelectItem value="Sick Leave">
                  Sick Leave ({leaveBalances?.sick.remaining || 0} days left)
                </SelectItem>
                <SelectItem value="Annual Leave">
                  Annual Leave ({leaveBalances?.annual.remaining || 0} days left)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="space-y-2">
            <Label htmlFor="fromDate">From Date *</Label>
            <Input
              id="fromDate"
              type="date"
              value={formData.fromDate}
              onChange={(e) => handleChange('fromDate', e.target.value)}
              min={getTomorrowDate()}
              className="bg-gray-50"
              required
            />
            <p className="text-xs text-gray-500">Cannot select past dates</p>
          </div>

          {/* To Date */}
          <div className="space-y-2">
            <Label htmlFor="toDate">To Date *</Label>
            <Input
              id="toDate"
              type="date"
              value={formData.toDate}
              onChange={(e) => handleChange('toDate', e.target.value)}
              min={formData.fromDate || getTomorrowDate()}
              className="bg-gray-50"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Enter reason for leave (optional)"
              className="bg-gray-50 min-h-[80px]"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Submitting...' : (editingLeave ? 'Update Request' : 'Submit Request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
