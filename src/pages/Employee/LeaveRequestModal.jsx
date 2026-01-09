// src/components/leave/LeaveRequestModal.jsx
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
  const { user, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    typeOfLeave: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ COMPREHENSIVE USER DATA EXTRACTION
  const getUserData = () => {
    if (!user) {
      console.error('❌ No user object found');
      return { empId: '', empName: '', empRole: '' };
    }

    console.log('=== LeaveRequestModal User Data Extraction ===');
    console.log('Full user object:', user);

    // Extract empId with multiple fallbacks
    const empId = user.empId 
      || user.employeeId 
      || user.identifier 
      || user.emp_id 
      || user.id 
      || user._id 
      || user.user?.empId 
      || user.data?.empId 
      || '';

    // Extract name with multiple fallbacks
    const firstName = user.firstName || user.first_name || user.user?.firstName || user.data?.firstName || '';
    const lastName = user.lastName || user.last_name || user.user?.lastName || user.data?.lastName || '';
    const empName = firstName && lastName 
      ? `${firstName} ${lastName}`.trim()
      : user.name || user.fullName || user.full_name || user.user?.name || user.data?.name || '';

    // Extract role with multiple fallbacks
    const empRole = user.role 
      || user.empRole 
      || user.userType 
      || user.user?.role 
      || user.data?.role 
      || 'EMPLOYEE';

    console.log('✅ Extracted data:');
    console.log('  - empId:', empId);
    console.log('  - empName:', empName);
    console.log('  - empRole:', empRole);
    console.log('===========================================');

    return { empId, empName, empRole };
  };

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

  // Check authentication when modal opens
  useEffect(() => {
    if (open) {
      if (!isAuthenticated) {
        setError('You must be logged in to request leave');
      } else {
        const { empId, empName, empRole } = getUserData();
        if (!empId || !empName || !empRole) {
          console.warn('⚠️ Missing user data:', { empId, empName, empRole });
          setError('User data incomplete. Please log in again.');
        }
      }
    }
  }, [open, isAuthenticated, user]);

  // Get tomorrow's date (minimum selectable date)
  // Get today's date (minimum selectable date)
const getTodayDate = () => {
  const today = new Date();               // local time
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;       // yyyy-mm-dd
};


  // Check for date overlap
  const checkDateOverlap = (fromDate, toDate) => {
    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);
    const sourceLeaves = Array.isArray(existingLeaves) ? existingLeaves : [];

    const leavesToCheck = sourceLeaves.filter(leave => {
      if ((leave.status || '').toUpperCase() === 'REJECTED') return false;
      if (editingLeave && (leave._id === editingLeave._id || leave.id === editingLeave.id)) return false;
      return true;
    });

    for (const leave of leavesToCheck) {
      const existingFrom = new Date(leave.fromDate || leave.from_date);
      const existingTo = new Date(leave.toDate || leave.to_date);
      if (isNaN(existingFrom.getTime()) || isNaN(existingTo.getTime())) continue;
      if (
        (newFrom >= existingFrom && newFrom <= existingTo) ||
        (newTo >= existingFrom && newTo <= existingTo) ||
        (newFrom <= existingFrom && newTo >= existingTo)
      ) {
        return { overlaps: true, conflictingLeave: leave };
      }
    }
    return { overlaps: false };
  };

  // Validate dates and leave balance
  const validateDates = () => {
    const { fromDate, toDate, typeOfLeave } = formData;

    if (!fromDate || !toDate) {
      setError('Please select both from and to dates');
      return false;
    }

    const today = new Date(getTodayDate()); // same date used by min()
    const selectedFrom = new Date(fromDate);

  if (selectedFrom < today) {
    setError('Cannot request leave for past dates');
    return false;
  }

    const selectedTo = new Date(toDate);
    if (selectedTo < selectedFrom) {
      setError('End date must be after start date');
      return false;
    }

    const overlapCheck = checkDateOverlap(fromDate, toDate);
    if (overlapCheck.overlaps) {
      const conflictLeave = overlapCheck.conflictingLeave;
      const conflictFrom = new Date(
        conflictLeave.fromDate || conflictLeave.from_date
      ).toLocaleDateString('en-IN');
      const conflictTo = new Date(
        conflictLeave.toDate || conflictLeave.to_date
      ).toLocaleDateString('en-IN');
      setError(
        `This date range overlaps with your existing ${conflictLeave.status} leave (${conflictFrom} - ${conflictTo})`
      );
      return false;
    }

    // Check leave balance – only warn, don't block
    if (leaveBalances) {
      const days =
        Math.ceil(
          (selectedTo - selectedFrom) / (1000 * 60 * 60 * 24)
        ) + 1;
      const leaveType = (typeOfLeave || '').toLowerCase();
      let available = 0;

      if (leaveType.includes('casual'))
        available = leaveBalances.casual?.remaining || 0;
      else if (leaveType.includes('sick'))
        available = leaveBalances.sick?.remaining || 0;
      else if (leaveType.includes('annual'))
        available = leaveBalances.annual?.remaining || 0;

      if (editingLeave) {
        const originalFrom = new Date(
          editingLeave.fromDate || editingLeave.from_date
        );
        const originalTo = new Date(
          editingLeave.toDate || editingLeave.to_date
        );
        const originalDays =
          Math.ceil(
            (originalTo - originalFrom) / (1000 * 60 * 60 * 24)
          ) + 1;
        available += originalDays;
      }

      if (days > available) {
        setError(
          `You are exceeding your ${typeOfLeave} balance (${available} days). ` +
            `Extra days will be treated as loss-of-pay.`
        );
        // Warning only - don't block submission
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🚀 ========== LEAVE REQUEST SUBMISSION ==========');

    // Check authentication
    if (!isAuthenticated || !user) {
      console.error('❌ Not authenticated');
      setError('You must be logged in to submit a leave request');
      return;
    }

    if (!validateDates()) {
      console.error('❌ Date validation failed');
      return;
    }
    
    if (!formData.typeOfLeave) {
      console.error('❌ No leave type selected');
      setError('Please select leave type');
      return;
    }

    setLoading(true);
    try {
      // ✅ Get user data with comprehensive fallbacks
      const { empId, empName, empRole } = getUserData();

      // ✅ Validate required fields
      if (!empId) {
        throw new Error('Employee ID not found. Please log in again.');
      }
      if (!empName) {
        throw new Error('Employee name not found. Please log in again.');
      }
      if (!empRole) {
        throw new Error('Employee role not found. Please log in again.');
      }

      // ✅ Build payload with validated data
      const payload = {
        empId: String(empId).trim(),
        empName: String(empName).trim(),
        empRole: String(empRole).trim(),
        typeOfLeave: String(formData.typeOfLeave).trim(),
        fromDate: String(formData.fromDate).trim(),
        toDate: String(formData.toDate).trim(),
        reason: String(formData.reason || 'N/A').trim()
      };

      console.log('📤 Submitting payload:', payload);

      // ✅ Final validation - ensure no empty strings
      for (const [key, value] of Object.entries(payload)) {
        if (!value || value === '') {
          throw new Error(`Field "${key}" is required and must not be blank`);
        }
      }

      let response;
      if (editingLeave) {
        const leaveId = editingLeave._id || editingLeave.id;
        if (!leaveId) {
          throw new Error('Leave ID not found for editing');
        }
        
        console.log('✏️ Updating leave:', leaveId);
        response = await apiClient.put(`/leave-approvel/${leaveId}`, payload);
        console.log('✅ Update response:', response.data);
        alert('Leave request updated successfully!');
      } else {
        console.log('➕ Creating new leave request');
        response = await apiClient.post('/leave-approvel/apply', payload);
        console.log('✅ Create response:', response.data);
        alert('Leave request submitted successfully!');
      }
      
      console.log('===============================================');
      
      if (typeof onSubmitted === 'function') {
        onSubmitted();
      }
      onClose();
      
    } catch (err) {
      console.error('❌ ========== LEAVE REQUEST FAILED ==========');
      console.error('Error object:', err);
      console.error('Response:', err.response?.data);
      console.error('Status:', err.response?.status);
      console.error('===========================================');
      
      // ✅ Enhanced error handling
      let msg = 'Failed to submit leave request';
      
      if (err?.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (data.message) {
          msg = data.message;
        } else if (data.error) {
          msg = data.error;
        } else if (data.details) {
          msg = data.details;
        } else {
          msg = JSON.stringify(data);
        }
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // ✅ Enhanced authentication check
  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Authentication Required</DialogTitle>
            <DialogDescription>
              Please log in to request leave
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.location.href = '/login'}
            >
              Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ✅ Check if user data is complete
  const { empId, empName, empRole } = getUserData();
  const hasCompleteData = empId && empName && empRole;

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

        {/* ✅ Show warning if user data incomplete */}
        {!hasCompleteData && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Incomplete User Data</p>
              <p className="mt-1">Missing: {!empId && 'Employee ID '}{!empName && 'Name '}{!empRole && 'Role'}</p>
              <p className="mt-1">Please refresh the page and log in again.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="typeOfLeave">Leave Type *</Label>
            <Select
              id="typeOfLeave"
              value={formData.typeOfLeave}
              onValueChange={val => handleChange('typeOfLeave', val)}
              required
              disabled={!hasCompleteData}
            >
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Casual Leave">
                  Casual Leave ({leaveBalances?.casual?.remaining || 0} days left)
                </SelectItem>
                <SelectItem value="Sick Leave">
                  Sick Leave ({leaveBalances?.sick?.remaining || 0} days left)
                </SelectItem>
                <SelectItem value="Annual Leave">
                  Annual Leave ({leaveBalances?.annual?.remaining || 0} days left)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fromDate">From Date *</Label>
            <Input
              id="fromDate"
              type="date"
              value={formData.fromDate}
              onChange={e => handleChange('fromDate', e.target.value)}
              min={getTodayDate()}
              className="bg-gray-50"
              required
              disabled={!hasCompleteData}
            />
            <p className="text-xs text-gray-500">Cannot select past dates</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="toDate">To Date *</Label>
            <Input
              id="toDate"
              type="date"
              value={formData.toDate}
              onChange={e => handleChange('toDate', e.target.value)}
              min={formData.fromDate || getTodayDate()}
              className="bg-gray-50"
              required
              disabled={!hasCompleteData}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={e => handleChange('reason', e.target.value)}
              placeholder="Enter reason for leave (optional)"
              className="bg-gray-50 min-h-20"
              rows={3}
              disabled={!hasCompleteData}
            />
          </div>
          
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
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
              disabled={loading || !hasCompleteData}
            >
              {loading ? 'Submitting...' : (editingLeave ? 'Update Request' : 'Submit Request')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
