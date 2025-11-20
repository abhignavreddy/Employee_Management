import React, { useEffect, useMemo, useState } from 'react';
import { History, Calendar, CheckCircle, TrendingUp, Search, Filter } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import apiClient from '../../lib/apiClient';
import { toast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';

const api = apiClient;

const getPriorityColor = (priority) => {
  const colors = {
    LOW: 'bg-gray-100 text-gray-800 border-gray-200',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[priority?.toUpperCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusColor = (status) => {
  const colors = {
    BACKLOG: 'bg-gray-100 text-gray-800 border-gray-200',
    ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function TaskHistoryPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStory, setSelectedStory] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const loadStories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/story-table');
      setStories(response.data || []);
    } catch (e) {
      console.error('Error loading stories:', e);
      toast({
        title: 'Error',
        description: 'Failed to load task history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesSearch =
        !searchQuery ||
        story.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.project?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === 'all' ||
        story.status?.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [stories, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = stories.length;
    const completed = stories.filter(s => s.status === 'COMPLETED').length;
    const inProgress = stories.filter(s => s.status === 'IN_PROGRESS').length;
    
    const thisMonth = stories.filter((s) => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    
    const highPriority = stories.filter(s => 
      s.priority === 'HIGH' || s.priority === 'CRITICAL'
    ).length;

    return { total, completed, inProgress, thisMonth, highPriority };
  }, [stories]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const handleViewHistory = (story) => {
    setSelectedStory(story);
    setHistoryDialogOpen(true);
  };

  const getStatusChanges = (story) => {
    const changes = [];
    
    // Created
    changes.push({
      date: story.createdAt,
      action: 'Created',
      status: 'BACKLOG',
      description: `Story created: ${story.taskName}`,
    });

    // Status updates (you can enhance this with actual history from backend)
    if (story.status !== 'BACKLOG') {
      changes.push({
        date: story.updatedAt,
        action: 'Status Changed',
        status: story.status,
        description: `Status updated to ${story.status}`,
      });
    }

    // Spillover tracking
    if (story.spillover && story.previousSprints?.length > 0) {
      changes.push({
        date: story.updatedAt,
        action: 'Spillover',
        status: 'IN_PROGRESS',
        description: `Moved from Sprint ${story.previousSprints[story.previousSprints.length - 1]} to Sprint ${story.sprintNumber}`,
      });
    }

    return changes.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Task History</h1>
        <p className="text-gray-600 mt-1">View complete history of all stories and tasks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stories</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <History className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-purple-600">{stats.thisMonth}</p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-3xl font-bold text-red-600">{stats.highPriority}</p>
              </div>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by task name, assignee, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="BACKLOG">Backlog</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Stories & Tasks</CardTitle>
          <CardDescription>
            Complete history of all stories with status tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading history...</p>
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No stories found</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Sprint</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{story.taskName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                          {story.type || 'Story'}
                        </Badge>
                      </TableCell>
                      <TableCell>{story.assignedTo || 'Unassigned'}</TableCell>
                      <TableCell>{story.project || '—'}</TableCell>
                      <TableCell className="text-center">
                        {story.sprintNumber || '—'}
                        {story.spillover && (
                          <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-200 text-xs">
                            Spillover
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(story.priority)}>
                          {story.priority || 'MEDIUM'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(story.status)}>
                          {story.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(story.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(story.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleViewHistory(story)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View History
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Detail Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Story History: {selectedStory?.taskName}
            </DialogTitle>
          </DialogHeader>

          {selectedStory && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Story Details</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <Badge className="mt-1 bg-purple-100 text-purple-700 border-purple-200">
                        {selectedStory.type || 'Story'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge className={`mt-1 ${getStatusColor(selectedStory.status)}`}>
                        {selectedStory.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Priority</p>
                      <Badge className={`mt-1 ${getPriorityColor(selectedStory.priority)}`}>
                        {selectedStory.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Assigned To</p>
                      <p className="font-medium">{selectedStory.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Project</p>
                      <p className="font-medium">{selectedStory.project || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sprint</p>
                      <p className="font-medium">{selectedStory.sprintNumber || '—'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-sm bg-gray-50 p-3 rounded border">
                    {selectedStory.taskDescription || 'No description'}
                  </p>
                </div>

                {selectedStory.acceptanceCriteria && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Acceptance Criteria</p>
                    <p className="text-sm bg-green-50 p-3 rounded border border-green-200">
                      {selectedStory.acceptanceCriteria}
                    </p>
                  </div>
                )}

                {selectedStory.spillover && (
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <p className="text-sm font-medium text-orange-800">
                      🔄 This is a spillover task
                    </p>
                    {selectedStory.previousSprints?.length > 0 && (
                      <p className="text-xs text-orange-700 mt-1">
                        Previous sprints: {selectedStory.previousSprints.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-4">
                  {getStatusChanges(selectedStory).map((change, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          getStatusColor(change.status).split(' ')[0]
                        }`}>
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        {index < getStatusChanges(selectedStory).length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <p className="font-medium text-gray-900">{change.action}</p>
                        <p className="text-sm text-gray-600 mt-1">{change.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(change.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
