import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, Calendar as CalendarIcon, Clock, Loader2, Inbox, Search, Filter } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';
import apiClient from '../../lib/apiClient';

const api = apiClient;

const MyTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadMyTasks();
  }, []);

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/story-table');
      const allTasks = response.data || [];
      
      // Filter tasks assigned to current user
      const myTasks = allTasks.filter(task => {
        const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return task.empId === user.empId || 
               task.assignedTo === userFullName ||
               task.assignedTo === user.empId;
      });
      
      setTasks(myTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchQuery || 
        task.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.department?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'all' || 
        task.priority?.toUpperCase() === priorityFilter.toUpperCase();

      const matchesStatus = statusFilter === 'all' || 
        task.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, searchQuery, priorityFilter, statusFilter]);

  // Filter tasks by status
  const backlogTasks = filteredTasks.filter(t => t.status === 'BACKLOG');
  const assignedTasks = filteredTasks.filter(t => t.status === 'ASSIGNED');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
  const completedTasks = filteredTasks.filter(t => t.status === 'COMPLETED');

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

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800 border-gray-200',
      MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[priority?.toUpperCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProgressPercentage = (status) => {
    const progressMap = {
      BACKLOG: 0,
      ASSIGNED: 25,
      IN_PROGRESS: 50,
      COMPLETED: 100,
      CANCELLED: 0,
    };
    return progressMap[status] || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid';
    }
  };

  const TaskCard = ({ task }) => {
    const progress = getProgressPercentage(task.status);
    
    return (
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                {task.taskName}
              </h3>
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                {task.type || 'Story'}
              </Badge>
            </div>
            <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-xs ml-2`}>
              {task.priority || 'MEDIUM'}
            </Badge>
          </div>
          
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {task.taskDescription || 'No description'}
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center">
                <CalendarIcon className="w-3 h-3 mr-1" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
              <div className="flex items-center">
                <ClipboardList className="w-3 h-3 mr-1" />
                <span>Sprint {task.sprintNumber || 'N/A'}</span>
              </div>
            </div>

            {task.project && (
              <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded truncate">
                <strong>Project:</strong> {task.project}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Progress</span>
                <span className="text-xs font-medium text-gray-900">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Badge variant="outline" className={`${getStatusColor(task.status)} text-xs`}>
                {task.status?.replace('_', ' ')}
              </Badge>
              {task.spillover && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                  Spillover
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">View and manage your assigned tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Backlog</p>
                <p className="text-2xl font-bold text-gray-600">{backlogTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Inbox className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{assignedTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by task name, project, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="BACKLOG">Backlog</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task Tabs */}
      <Tabs defaultValue="backlog" className="space-y-4">
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="backlog">Backlog ({backlogTasks.length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({assignedTasks.length})</TabsTrigger>
          <TabsTrigger value="progress">In Progress ({inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>

        {/* Backlog Tab */}
        <TabsContent value="backlog" className="space-y-4">
          {backlogTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backlogTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks in backlog</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Tasks waiting to be assigned will appear here'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assigned Tab */}
        <TabsContent value="assigned" className="space-y-4">
          {assignedTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No assigned tasks</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'All caught up! 🎉'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* In Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {inProgressTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks in progress</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start working on an assigned task'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <span className="text-6xl mb-4 block">🎯</span>
                <p className="text-gray-500">No completed tasks yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Complete your first task to see it here'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
};

export default MyTasksPage;
