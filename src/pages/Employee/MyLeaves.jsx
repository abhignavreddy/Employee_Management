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
  AlertCircle
} from 'lucide-react';

// Default annual leave allocation
const LEAVE_ALLOCATION = {
  casual: 12,
  sick: 10,
  annual: 18
};

export default function MyLeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);

  const loadLeaves = async () => {
    if (!user?.empId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/leave-approvel/employee/${user.empId}`);
      const data = res.data || [];
      setLeaves(data);
    } catch (err) {
      console.error('Failed to load leave requests', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [user?.empId]);

  // Calculate leave balances
  const leaveBalances = useMemo(() => {
    const approvedLeaves = leaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED');
    
    const used = {
      casual: 0,
      sick: 0,
      annual: 0
    };

    approvedLeaves.forEach(leave => {
      const fromDate = new Date(leave.fromDate || leave.from_date);
      const toDate = new Date(leave.toDate || leave.to_date);
      const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      
      const leaveType = (leave.typeOfLeave || leave.leaveType || '').toLowerCase();
      
      if (leaveType.includes('casual')) {
        used.casual += days;
      } else if (leaveType.includes('sick')) {
        used.sick += days;
      } else if (leaveType.includes('annual') || leaveType.includes('vacation')) {
        used.annual += days;
      }
    });

    return {
      casual: {
        total: LEAVE_ALLOCATION.casual,
        used: used.casual,
        remaining: LEAVE_ALLOCATION.casual - used.casual,
        percentage: (used.casual / LEAVE_ALLOCATION.casual) * 100
      },
      sick: {
        total: LEAVE_ALLOCATION.sick,
        used: used.sick,
        remaining: LEAVE_ALLOCATION.sick - used.sick,
        percentage: (used.sick / LEAVE_ALLOCATION.sick) * 100
      },
      annual: {
        total: LEAVE_ALLOCATION.annual,
        used: used.annual,
        remaining: LEAVE_ALLOCATION.annual - used.annual,
        percentage: (used.annual / LEAVE_ALLOCATION.annual) * 100
      }
    };
  }, [leaves]);

  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length;
    const rejected = leaves.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length;
    const pending = leaves.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;
    return { total, approved, rejected, pending };
  }, [leaves]);

  const onSubmitted = () => {
    setIsModalOpen(false);
    setEditingLeave(null);
    loadLeaves();
  };

  const handleEditLeave = (leave) => {
    // Only allow editing pending leaves
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

  const sortedLeaves = useMemo(() => 
    [...leaves].sort((a, b) => new Date(b.fromDate || b.from_date) - new Date(a.fromDate || a.from_date)),
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Leaves</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your time-off and track leave balances</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
          onClick={handleNewLeave}
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Leave
        </Button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Casual Leave */}
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">Casual Leave</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full">
                <Umbrella className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{leaveBalances.casual.remaining}</p>
                <p className="text-sm text-gray-500">days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{leaveBalances.casual.used} / {leaveBalances.casual.total}</p>
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
                  className={`h-full ${getProgressColor(leaveBalances.casual.percentage)} transition-all duration-300`}
                  style={{ width: `${Math.min(leaveBalances.casual.percentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sick Leave */}
        <Card className="border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">Sick Leave</CardTitle>
              <div className="p-2 bg-red-100 rounded-full">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-red-600">{leaveBalances.sick.remaining}</p>
                <p className="text-sm text-gray-500">days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{leaveBalances.sick.used} / {leaveBalances.sick.total}</p>
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
                  className={`h-full ${getProgressColor(leaveBalances.sick.percentage)} transition-all duration-300`}
                  style={{ width: `${Math.min(leaveBalances.sick.percentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annual Leave */}
        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">Annual Leave</CardTitle>
              <div className="p-2 bg-green-100 rounded-full">
                <Plane className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{leaveBalances.annual.remaining}</p>
                <p className="text-sm text-gray-500">days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{leaveBalances.annual.used} / {leaveBalances.annual.total}</p>
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
                  className={`h-full ${getProgressColor(leaveBalances.annual.percentage)} transition-all duration-300`}
                  style={{ width: `${Math.min(leaveBalances.annual.percentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
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

      {/* Leave Requests Table */}
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
              <p className="text-sm text-gray-500 mt-1">Click "Request Leave" to submit your first request</p>
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
                  {sortedLeaves.map(leave => {
                    const fromDate = new Date(leave.fromDate || leave.from_date);
                    const toDate = new Date(leave.toDate || leave.to_date);
                    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
                    const isPending = (leave.status || '').toUpperCase() === 'PENDING';
                    
                    return (
                      <TableRow key={leave._id || leave.id}>
                        <TableCell className="font-medium">
                          {leave.typeOfLeave || leave.leaveType || 'Leave'}
                        </TableCell>
                        <TableCell>{fromDate.toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{toDate.toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{days}</span> day{days > 1 ? 's' : ''}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {leave.reason || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getStatusBadge(leave.status)}
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
    </div>
  );
}
