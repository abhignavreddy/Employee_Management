import React, { useState, useEffect } from 'react';
import { Bell, Settings, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import { toast } from '../../hooks/use-toast';

const api = apiClient;

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState(null); // Add this
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load employee data
  useEffect(() => {
    if (user?.empId) {
      loadEmployeeData();
    }
  }, [user?.empId]);

  const loadEmployeeData = async () => {
    try {
      const response = await api.get(`/employees/empid/${user.empId}`);
      setEmployeeData(response.data);
    } catch (err) {
      console.error('Failed to load employee data', err);
    }
  };

  // Load real notifications
  useEffect(() => {
    if (user?.empId) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.empId]);

  const loadNotifications = async () => {
    if (!user?.empId) return;
    
    try {
      setLoadingNotifications(true);
      const response = await api.get(`/notifications/user/${user.empId}`);
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const empResponse = await api.get('/employees');
      const employees = empResponse.data?.content || empResponse.data || [];
      
      const taskResponse = await api.get('/story-table');
      const tasks = taskResponse.data || [];

      const lowerQuery = query.toLowerCase();

      const matchedEmployees = employees
        .filter(emp => 
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(lowerQuery) ||
          emp.empId?.toLowerCase().includes(lowerQuery) ||
          emp.empRole?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 3)
        .map(emp => ({
          type: 'employee',
          id: emp.id,
          title: `${emp.firstName} ${emp.lastName}`,
          subtitle: emp.empRole,
          empId: emp.empId,
        }));

      const matchedTasks = tasks
        .filter(task => 
          task.taskName?.toLowerCase().includes(lowerQuery) ||
          task.project?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 3)
        .map(task => ({
          type: 'task',
          id: task.id,
          title: task.taskName,
          subtitle: task.project || 'No project',
          status: task.status,
        }));

      setSearchResults([...matchedEmployees, ...matchedTasks]);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result) => {
    if (result.type === 'employee') {
      navigate('/employees');
    } else if (result.type === 'task') {
      if (user?.role === 'Employee') {
        navigate('/my-tasks');
      } else {
        navigate('/all-tasks');
      }
    }
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/user/${user.empId}/read-all`);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (err) {
      console.error('Failed to mark all as read', err);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete(`/notifications/user/${user.empId}/all`);
      setNotifications([]);
      toast({
        title: 'Success',
        description: 'All notifications cleared',
      });
    } catch (err) {
      console.error('Failed to clear notifications', err);
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationColor = (type) => {
    const colors = {
      TASK: 'bg-blue-100 text-blue-800 border-blue-200',
      LEAVE: 'bg-green-100 text-green-800 border-green-200',
      SALARY: 'bg-purple-100 text-purple-800 border-purple-200',
      SYSTEM: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Use employeeData if available, fallback to user
  const displayData = employeeData || user;
  const fullName = `${displayData?.firstName || ''} ${displayData?.lastName || ''}`.trim() || displayData?.name || 'User';

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      {/* Search Bar with Results */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search employees, tasks, or departments..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="pl-10 pr-10 w-full bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto backdrop-blur-sm">
            {isSearching ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full p-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{result.title}</p>
                        <p className="text-sm text-gray-500">{result.subtitle}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No results found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4 ml-6">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-white shadow-xl border-gray-200" align="end">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loadingNotifications ? 'Loading...' : `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
                </p>
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs hover:bg-gray-100"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-hide bg-white">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getNotificationColor(notification.type)}`}
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
                    <span className="text-xs text-gray-400">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 bg-white">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 text-center bg-white">
                <Button
                  variant="ghost"
                  onClick={clearAllNotifications}
                  className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                >
                  Clear all notifications
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
              <Settings className="w-5 h-5 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white shadow-xl border-gray-200">
            <DropdownMenuLabel className="bg-white">Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="bg-white hover:bg-gray-50">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="bg-white hover:bg-gray-50">Preferences</DropdownMenuItem>
            <DropdownMenuItem className="bg-white hover:bg-gray-50">Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 bg-white hover:bg-red-50">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown - FIXED */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-2 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={displayData?.profilePicture} />
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {getInitials(displayData?.firstName, displayData?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {fullName}
                </p>
                <p className="text-xs text-gray-500">{displayData?.empRole || displayData?.role || 'Employee'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white shadow-xl border-gray-200">
            <DropdownMenuLabel className="bg-white">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="bg-white hover:bg-gray-50">
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/my-tasks')} className="bg-white hover:bg-gray-50">
              My Tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/my-salary')} className="bg-white hover:bg-gray-50">
              Salary Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 bg-white hover:bg-red-50">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
