
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import LeaveRequestModal from './LeaveRequestModal';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function MyLeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  }, [user]);

  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length;
    const rejected = leaves.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length;
    const pending = leaves.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;
    return { total, approved, rejected, pending };
  }, [leaves]);

  const onSubmitted = () => {
    setIsModalOpen(false);
    loadLeaves();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Leaves</h1>
          <p className="text-sm text-gray-600">Track your leave requests and their statuses</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsModalOpen(true)}>
          Request Leave
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>All your leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-gray-600">No leave requests found.</p>
          ) : (
            <div className="space-y-3">
              {leaves.map(l => (
                <div key={l._id || l.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="text-sm font-medium">{l.typeOfLeave || l.leaveType || 'Leave'}</div>
                    <div className="text-xs text-gray-500">{new Date(l.fromDate || l.from_date).toLocaleDateString()} - {new Date(l.toDate || l.to_date).toLocaleDateString()}</div>
                    {l.reason && <div className="text-xs text-gray-700 mt-1">{l.reason}</div>}
                  </div>
                  <div className="text-right">
                    <Badge className={`px-2 py-0.5 text-xs rounded-md ${((l.status||'').toUpperCase() === 'APPROVED') ? 'bg-green-100 text-green-800' : ( (l.status||'').toUpperCase() === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}`}>
                      {(l.status || '').toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LeaveRequestModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmitted={onSubmitted} />
    </div>
  );
}
