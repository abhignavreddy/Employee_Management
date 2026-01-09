// src/pages/MyLeavesPage.jsx
import React, { useEffect, useState } from 'react';
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
  DollarSign,
  AlertTriangle
} from 'lucide-react';

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

  const empId = user?.identifier || user?.empId || "";

  // Auto-close popup
  useEffect(() => {
    if (!showRejectModal) return;
    const t = setTimeout(() => setShowRejectModal(false), 6000);
    return () => clearTimeout(t);
  }, [showRejectModal]);

// Load leave counter from backend
const loadLeaveCounter = async () => {
  if (!empId) return;
  
  setCounterLoading(true);
  
  try {
    const res = await apiClient.get(`/leave-counter/${empId}`);
    console.log('✅ Leave counter from backend:', res.data);
    setLeaveCounter(res.data);
  } catch (err) {
    console.error('❌ Error loading leave counter:', err);
    setLeaveCounter(null);
  } finally {
    setCounterLoading(false);
  }
};

// Load leave requests
const loadLeaves = async () => {
  if (!empId) return;
  
  setLoading(true);
  setError(null);
  
  try {
    const res = await apiClient.get(`/leave-approvel/employee/${empId}`);
    
    console.log('🔍 RAW leave requests from API:', res.data); // ✅ ADD THIS
    
    const normalized = (res.data || []).map((r) => ({
      ...r,
      id: r._id || r.id,
      fromDate: r.fromDate || r.from_date,
      toDate: r.toDate || r.to_date,
      status: (r.status || '').toUpperCase(),
      rejectReason: r.rejectReason || r.reject_reason || r.rejectionReason || "",
    }));
    
    console.log('✅ Normalized leaves:', normalized); // ✅ ADD THIS
    console.log('📊 Approved leaves:', normalized.filter(l => l.status === 'APPROVED')); // ✅ ADD THIS
    
    setLeaves(normalized);
  } catch (err) {
    console.error('❌ Error loading leaves:', err);
    setError(err.response?.data?.message || 'Failed to load leave requests');
    setLeaves([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (isAuthenticated && empId) {
      loadLeaves();
      loadLeaveCounter();
    }
  }, [isAuthenticated, empId]);

// ✅ FIXED: Calculate used leaves from approved requests
const calculateLeaveBalances = () => {
  if (!leaveCounter) {
    return {
      casual: { remaining: 0, used: 0, total: 0, percentage: 0 },
      sick: { remaining: 0, used: 0, total: 0, percentage: 0 },
      annual: { remaining: 0, used: 0, total: 0, percentage: 0 },
      lossOfPay: 0
    };
  }

  // Get remaining values from backend
  const casualRemaining = leaveCounter.casualLeaves || 0;
  const sickRemaining = leaveCounter.sickLeaves || 0;
  const annualRemaining = leaveCounter.annualLeaves || 0;

  // Get totals from backend
  const casualTotal = leaveCounter.totalCasualLeaves || 0;
  const sickTotal = leaveCounter.totalSickLeaves || 0;
  const annualTotal = leaveCounter.totalAnnualLeaves || 0;

  // ✅ Calculate USED leaves from APPROVED leave requests
  let casualUsed = 0;
  let sickUsed = 0;
  let annualUsed = 0;

  leaves
    .filter(leave => leave.status === 'APPROVED')
    .forEach(leave => {
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      
      const leaveType = (leave.typeOfLeave || '').toLowerCase();

      if (leaveType.includes('casual')) {
        casualUsed += days;
      } else if (leaveType.includes('sick')) {
        sickUsed += days;
      } else if (leaveType.includes('annual') || leaveType.includes('vacation')) {
        annualUsed += days;
      }
    });

  // Calculate percentages based on used vs total
  const casualPercentage = casualTotal > 0 ? Math.round((casualUsed / casualTotal) * 100) : 0;
  const sickPercentage = sickTotal > 0 ? Math.round((sickUsed / sickTotal) * 100) : 0;
  const annualPercentage = annualTotal > 0 ? Math.round((annualUsed / annualTotal) * 100) : 0;

  console.log('📊 Leave balances calculated:', {
    casual: { remaining: casualRemaining, used: casualUsed, total: casualTotal, percentage: casualPercentage },
    sick: { remaining: sickRemaining, used: sickUsed, total: sickTotal, percentage: sickPercentage },
    annual: { remaining: annualRemaining, used: annualUsed, total: annualTotal, percentage: annualPercentage }
  });

  return {
    casual: {
      remaining: casualRemaining,
      used: casualUsed,
      total: casualTotal,
      percentage: casualPercentage
    },
    sick: {
      remaining: sickRemaining,
      used: sickUsed,
      total: sickTotal,
      percentage: sickPercentage
    },
    annual: {
      remaining: annualRemaining,
      used: annualUsed,
      total: annualTotal,
      percentage: annualPercentage
    },
    lossOfPay: leaveCounter.lossOfPayLeaves || 0
  };
};


  const balances = calculateLeaveBalances();

  // Simple stats from leaves array
  const stats = {
    total: leaves.length,
    approved: leaves.filter(l => l.status === 'APPROVED').length,
    rejected: leaves.filter(l => l.status === 'REJECTED').length,
    pending: leaves.filter(l => l.status === 'PENDING').length
  };

  const onSubmitted = () => {
    setIsModalOpen(false);
    setEditingLeave(null);
    loadLeaves();
    loadLeaveCounter();
  };

  const handleEditLeave = (leave) => {
    if (leave.status !== 'PENDING') {
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

  const sortedLeaves = [...leaves].sort(
    (a, b) => new Date(b.fromDate) - new Date(a.fromDate)
  );

  const getStatusBadge = (status) => {
    const styles = {
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return styles[status] || styles.PENDING;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

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

  if (!empId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Employee ID Not Found</h2>
            <p className="text-gray-600 mb-4">Please log out and log in again.</p>
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

      {/* ✅ NEW: Low Balance Warning */}
      {!counterLoading && leaveCounter && (
        (balances.casual.remaining === 0 || balances.sick.remaining === 0 || balances.annual.remaining < 1) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">Low Leave Balance Warning</p>
                  <p className="text-sm text-orange-700 mt-1">
                    {balances.casual.remaining === 0 && "Casual leaves exhausted. "}
                    {balances.sick.remaining === 0 && "Sick leaves exhausted. "}
                    {balances.annual.remaining < 1 && `Only ${balances.annual.remaining.toFixed(2)} annual leave(s) remaining. `}
                    Further leave applications will result in Loss of Pay (LOP).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

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
            {counterLoading || loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">
                      {balances.casual.remaining}
                    </p>
                    <p className="text-sm text-gray-500">days remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {balances.casual.used} / {balances.casual.total}
                    </p>
                    <p className="text-xs text-gray-500">used</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Usage</span>
                    <span>{balances.casual.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(balances.casual.percentage)} transition-all duration-300`}
                      style={{
                        width: `${Math.min(balances.casual.percentage, 100)}%`
                      }}
                    />
                  </div>
                </div>
                {balances.casual.remaining === 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Exhausted - LOP applies</span>
                  </div>
                )}
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
            {counterLoading || loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      {balances.sick.remaining}
                    </p>
                    <p className="text-sm text-gray-500">days remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {balances.sick.used} / {balances.sick.total}
                    </p>
                    <p className="text-xs text-gray-500">used</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Usage</span>
                    <span>{balances.sick.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(balances.sick.percentage)} transition-all duration-300`}
                      style={{
                        width: `${Math.min(balances.sick.percentage, 100)}%`
                      }}
                    />
                  </div>
                </div>
                {balances.sick.remaining === 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Exhausted - LOP applies</span>
                  </div>
                )}
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
            {counterLoading || loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      {balances.annual.remaining.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">days remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {balances.annual.used.toFixed(2)} / {balances.annual.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">used</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Usage</span>
                    <span>{balances.annual.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(balances.annual.percentage)} transition-all duration-300`}
                      style={{
                        width: `${Math.min(balances.annual.percentage, 100)}%`
                      }}
                    />
                  </div>
                </div>
                {balances.annual.remaining < 1 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Low balance - {balances.annual.remaining.toFixed(2)} days left</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Loss of Pay */}
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
            {counterLoading || loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-orange-600">
                      {balances.lossOfPay}
                    </p>
                    <p className="text-sm text-gray-500">days taken</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Unpaid</p>
                    <p className="text-xs text-gray-500">leave</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Status</span>
                    <span className="font-medium text-orange-600">
                      {balances.lossOfPay > 0 ? 'Active' : 'None'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{
                        width: `${balances.lossOfPay > 0 ? '100' : '0'}%`
                      }}
                    />
                  </div>
                </div>
                {balances.lossOfPay > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>Unpaid leave days recorded</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leave Stats */}
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
                    const fromDate = new Date(leave.fromDate);
                    const toDate = new Date(leave.toDate);
                    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
                    const isPending = leave.status === 'PENDING';

                    return (
                      <TableRow key={leave.id}>
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
                          <span className="font-semibold">{days}</span> day{days > 1 ? 's' : ''}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {leave.reason || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getStatusBadge(leave.status)} ${leave.status === 'REJECTED' ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                              if (leave.status === 'REJECTED') {
                                setCurrentRejectReason(leave.rejectReason || 'No reason provided');
                                const rect = e.currentTarget.getBoundingClientRect();
                                setRejectPopupPos({ left: rect.left + rect.width / 2, top: rect.top });
                                setShowRejectModal(true);
                              }
                            }}
                          >
                            {leave.status}
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
        leaveBalances={{
          casual: { remaining: balances.casual.remaining },
          sick: { remaining: balances.sick.remaining },
          annual: { remaining: balances.annual.remaining }
        }}
        editingLeave={editingLeave}
        existingLeaves={leaves}
      />

      {/* Rejection Modal */}
      {showRejectModal && (
        <div
          className="fixed z-50 pointer-events-auto"
          style={{
            left: rejectPopupPos?.left,
            top: rejectPopupPos?.top - 8,
            transform: 'translate(-50%, -100%)',
            minWidth: '220px'
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 w-72 animate-slide-up border-l-4 border-l-red-500">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-red-600">Rejection reason</h3>
                  <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                  {currentRejectReason}
                </div>
              </div>
            </div>
          </div>
          <style>{`@keyframes slideUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}} .animate-slide-up{animation:slideUp 220ms ease-out both}`}</style>
        </div>
      )}
    </div>
  );
}
