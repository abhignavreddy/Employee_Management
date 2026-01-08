// src/pages/MyLeavesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import LeaveRequestModal from './LeaveRequestModal';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Umbrella, 
  Heart, 
  Plane,
  Plus,
  Edit2,
  AlertCircle,
  DollarSign
} from 'lucide-react';


function mapToLeaveType(type) {
  if (!type) return "";
  const t = type.toUpperCase();
  if (t.includes("CASUAL")) return "CASUAL";
  if (t.includes("SICK")) return "SICK";
  if (t.includes("ANNUAL") || t.includes("VACATION")) return "ANNUAL";
  return t;
}


export default function MyLeavesPage() {
  const { user, isAuthenticated } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRejectReason, setCurrentRejectReason] = useState("");
  const [rejectPopupPos, setRejectPopupPos] = useState(null);
  const [leaveCounter, setLeaveCounter] = useState(null);
  const [counterLoading, setCounterLoading] = useState(false);


  // ✅ FIX: Get empId with proper fallback (use identifier first)
  const empId = user?.identifier || user?.empId || "";

  // ✅ DEBUG: Log user data
  useEffect(() => {
    console.log("🔍 MyLeavesPage - USER OBJECT:", user);
    console.log("🔍 MyLeavesPage - Extracted empId:", empId);
  }, [user, empId]);


  // Auto-close small popup after a few seconds
  useEffect(() => {
    if (!showRejectModal) return;
    const t = setTimeout(() => setShowRejectModal(false), 6000);
    return () => clearTimeout(t);
  }, [showRejectModal]);


  // Load leave requests
  const loadLeaves = async () => {
    if (!empId) {
      console.warn('⚠️ Cannot load leaves: empId not found');
      return;
    }
    
    console.log('🔍 Loading leaves for empId:', empId);
    setLoading(true);
    setError(null);
    
    try {
      const res = await apiClient.get(`/leave-approvel/employee/${empId}`);
      console.log('✅ Leaves loaded:', res.data);
      
      const normalized = (res.data || []).map((r) => ({
        ...r,
        id: r._id || r.id,
        fromDate: r.fromDate || r.from_date,
        toDate: r.toDate || r.to_date,
        status: (r.status || '').toUpperCase(),
        rejectReason:
          r.rejectReason ||
          r.reject_reason ||
          r.rejectionReason ||
          r.reject_reason_text ||
          r.reject_reason_message ||
          r.reject_reason_message_text ||
          "",
      }));
      setLeaves(normalized);
    } catch (err) {
      console.error('❌ Error loading leaves:', err);
      console.error('❌ Error response:', err.response?.data);
      
      const errorMsg = err.response?.data?.message || 
                       err.response?.data?.error || 
                       'Failed to load leave requests';
      setError(errorMsg);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };


  // Load leave counter from backend
  const loadLeaveCounter = async () => {
    if (!empId) {
      console.warn('⚠️ Cannot load leave counter: empId not found');
      return;
    }
    
    setCounterLoading(true);
    
    try {
      console.log('🔢 Loading leave counter for empId:', empId);
      const res = await apiClient.get(`/leave-counter/${empId}`);
      
      console.log('✅ Leave counter loaded:', res.data);
      setLeaveCounter(res.data);
    } catch (err) {
      console.error('❌ Error loading leave counter:', err);
      
      // Don't show error to user, just use defaults
      setLeaveCounter(null);
    } finally {
      setCounterLoading(false);
    }
  };


  useEffect(() => {
    if (isAuthenticated && empId) {
      console.log('✅ Loading leaves and counter...');
      loadLeaves();
      loadLeaveCounter();
    } else {
      console.warn('❌ Not loading: isAuthenticated=', isAuthenticated, 'empId=', empId);
    }
  }, [isAuthenticated, empId]);


  // Calculate all balances based on backend (never hardcoded)
  const leaveBalances = useMemo(() => {
    if (!leaveCounter) {
      return {
        casual: { total: 0, used: 0, remaining: 0, percentage: 0 },
        sick: { total: 0, used: 0, remaining: 0, percentage: 0 },
        annual: { total: 0, used: 0, remaining: 0, percentage: 0 }
      };
    }
    
    const approved = leaves.filter(
      l => (l.status || '').toUpperCase() === 'APPROVED'
    );
    
    const used = { casual: 0, sick: 0, annual: 0 };
    
    approved.forEach(leave => {
      const from = new Date(leave.fromDate || leave.from_date);
      const to = new Date(leave.toDate || leave.to_date);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return;
      
      const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      const type = mapToLeaveType(leave.typeOfLeave || leave.leaveType || '');
      
      if (type === 'CASUAL') used.casual += days;
      else if (type === 'SICK') used.sick += days;
      else if (type === 'ANNUAL') used.annual += days;
    });


    return {
      casual: {
        remaining: leaveCounter.casualLeaves || 0,
        used: used.casual,
        total: leaveCounter.casualLeaves || 4,
        percentage:
          (leaveCounter.casualLeaves || 0) + used.casual
            ? (used.casual / ((leaveCounter.casualLeaves || 0) + used.casual)) * 100
            : 0
      },
      sick: {
        remaining: leaveCounter.sickLeaves || 0,
        used: used.sick,
        total: 5,
        percentage:
          (leaveCounter.sickLeaves || 0) + used.sick
            ? (used.sick / ((leaveCounter.sickLeaves || 0) + used.sick)) * 100
            : 0
      },
      annual: {
        remaining: leaveCounter.annualLeaves || 0,
        used: used.annual,
        total: (leaveCounter.annualLeaves || 0) + used.annual,
        percentage:
          (leaveCounter.annualLeaves || 0) + used.annual
            ? (used.annual / ((leaveCounter.annualLeaves || 0) + used.annual)) * 100
            : 0
      }
    };
  }, [leaves, leaveCounter]);


  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter(
      l => (l.status || '').toUpperCase() === 'APPROVED'
    ).length;
    const rejected = leaves.filter(
      l => (l.status || '').toUpperCase() === 'REJECTED'
    ).length;
    const pending = leaves.filter(
      l => (l.status || '').toUpperCase() === 'PENDING'
    ).length;
    return { total, approved, rejected, pending };
  }, [leaves]);


  const onSubmitted = () => {
    setIsModalOpen(false);
    setEditingLeave(null);
    loadLeaves();
    loadLeaveCounter();
  };


  const handleEditLeave = (leave) => {
    if ((leave.status || '').toUpperCase() !== 'PENDING') {
      alert('Only pending leave requests can be edited');
      return;
    }
    setEditingLeave(leave);
    setIsModalOpen(true);
  };


  const handleNewLeave = () => {
    setEditingLeave(null);
    setIsModalOpen(true);
  };


  const sortedLeaves = useMemo(
    () =>
      [...leaves].sort(
        (a, b) =>
          new Date(b.fromDate || b.from_date) -
          new Date(a.fromDate || a.from_date)
      ),
    [leaves]
  );


  const getStatusBadge = (status) => {
    const statusUpper = (status || '').toUpperCase();
    const styles = {
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return styles[statusUpper] || styles.PENDING;
  };


  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };


  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to view your leaves</p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.location.href = '/login'}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  // No empId found
  if (!empId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Employee ID Not Found</h2>
            <p className="text-gray-600 mb-4">
              Your employee ID is missing. Please log out and log in again.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-600 mb-2">Debug Info:</p>
              <pre className="text-xs text-left bg-white p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.location.href = '/logout'}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Leaves</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your time-off and track leave balances ({empId})
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          onClick={handleNewLeave}
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Leave
        </Button>
      </div>


      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error loading data</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-100"
                onClick={() => {
                  loadLeaves();
                  loadLeaveCounter();
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Leave Balance Cards */}
      {/* Leave Balance Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Casual Leave */}
  <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Casual Leave
        </CardTitle>
        <div className="p-2 bg-blue-100 rounded-full">
          <Umbrella className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {counterLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600">
                {leaveBalances.casual.remaining}
              </p>
              <p className="text-sm text-gray-500">days remaining</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {leaveBalances.casual.used} / {leaveBalances.casual.total}
              </p>
              <p className="text-xs text-gray-500">used</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Usage</span>
              <span>{Math.round(leaveBalances.casual.percentage)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(
                  leaveBalances.casual.percentage
                )} transition-all duration-300`}
                style={{
                  width: `${Math.min(leaveBalances.casual.percentage, 100)}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>

  {/* Sick Leave */}
  <Card className="border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Sick Leave
        </CardTitle>
        <div className="p-2 bg-red-100 rounded-full">
          <Heart className="w-5 h-5 text-red-600" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {counterLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-red-600">
                {leaveBalances.sick.remaining}
              </p>
              <p className="text-sm text-gray-500">days remaining</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {leaveBalances.sick.used} / {leaveBalances.sick.total}
              </p>
              <p className="text-xs text-gray-500">used</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Usage</span>
              <span>{Math.round(leaveBalances.sick.percentage)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(
                  leaveBalances.sick.percentage
                )} transition-all duration-300`}
                style={{
                  width: `${Math.min(leaveBalances.sick.percentage, 100)}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>

  {/* Annual Leave */}
  <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Annual Leave
        </CardTitle>
        <div className="p-2 bg-green-100 rounded-full">
          <Plane className="w-5 h-5 text-green-600" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {counterLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">
                {leaveBalances.annual.remaining}
              </p>
              <p className="text-sm text-gray-500">days remaining</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {leaveBalances.annual.used} / {leaveBalances.annual.total}
              </p>
              <p className="text-xs text-gray-500">used</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Usage</span>
              <span>{Math.round(leaveBalances.annual.percentage)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(
                  leaveBalances.annual.percentage
                )} transition-all duration-300`}
                style={{
                  width: `${Math.min(leaveBalances.annual.percentage, 100)}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>

  {/* Loss of Pay (LOP) */}
  <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Loss of Pay
        </CardTitle>
        <div className="p-2 bg-orange-100 rounded-full">
          <DollarSign className="w-5 h-5 text-orange-600" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {counterLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-orange-600">
                {leaveCounter?.lossOfPayLeaves || leaveCounter?.lopDays || leaveCounter?.lossOfPay || 0}
              </p>
              <p className="text-sm text-gray-500">days taken</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                Unpaid
              </p>
              <p className="text-xs text-gray-500">leave</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Status</span>
              <span className="font-medium text-orange-600">Active</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{
                  width: `${(leaveCounter?.lop || leaveCounter?.lopDays || leaveCounter?.lossOfPay || 0) > 0 ? '100' : '0'}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>
</div>


      {/* Leave Stats/Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </CardContent>
        </Card>
      </div>


      {/* Leave History Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Leave History</CardTitle>
          <CardDescription>View and edit your leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-gray-500">Loading leave requests...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No leave requests found</p>
              <p className="text-sm text-gray-500 mt-1">
                Click "Request Leave" to submit your first request
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>From Date</TableHead>
                    <TableHead>To Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaves.map((leave) => {
                    const fromDate = new Date(leave.fromDate || leave.from_date);
                    const toDate = new Date(leave.toDate || leave.to_date);
                    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
                    const isPending = (leave.status || '').toUpperCase() === 'PENDING';


                    return (
                      <TableRow key={leave._id || leave.id}>
                        <TableCell className="font-medium">
                          {leave.typeOfLeave || leave.leaveType || 'Leave'}
                        </TableCell>
                        <TableCell>
                          {fromDate.toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {toDate.toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{days}</span> day
                          {days > 1 ? 's' : ''}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {leave.reason || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getStatusBadge(leave.status)} ${((leave.status||'').toUpperCase() === 'REJECTED') ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                              const statusUpper = (leave.status || '').toUpperCase();
                              if (statusUpper === 'REJECTED') {
                                const reason = leave.rejectReason || leave.reject_reason || leave.rejectionReason || leave.reject_reason_text || leave.reject_reason_message || '';
                                setCurrentRejectReason(reason || 'No reason provided');
                                try {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  if (rect) setRejectPopupPos({ left: rect.left + rect.width / 2, top: rect.top });
                                  else setRejectPopupPos(null);
                                } catch (err) {
                                  setRejectPopupPos(null);
                                }
                                setShowRejectModal(true);
                              }
                            }}
                            aria-label={((leave.status||'').toUpperCase() === 'REJECTED') ? 'Show rejection reason' : undefined}
                          >
                            {(leave.status || 'PENDING').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isPending && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditLeave(leave)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Leave Request Modal */}
      <LeaveRequestModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLeave(null);
        }}
        onSubmitted={onSubmitted}
        leaveBalances={leaveBalances}
        editingLeave={editingLeave}
        existingLeaves={leaves}
      />


      {/* Rejection reason modal */}
      {showRejectModal && (
        <div>
          <div
            className="fixed z-50 pointer-events-auto"
            style={{
              left: rejectPopupPos ? rejectPopupPos.left : undefined,
              top: rejectPopupPos ? (rejectPopupPos.top - 8) : undefined,
              transform: rejectPopupPos ? 'translate(-50%, -100%)' : undefined,
              minWidth: '220px'
            }}
            role="status"
            aria-live="polite"
          >
            <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 w-72 animate-slide-up border-l-4 border-l-red-500" >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-600">Rejection reason</h3>
                    <div>
                      <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                    {currentRejectReason || 'No reason provided.'}
                  </div>
                </div>
              </div>
            </div>
            <style>{`@keyframes slideUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}} .animate-slide-up{animation:slideUp 220ms ease-out both}`}</style>
          </div>
        </div>
      )}
    </div>
  );
}
