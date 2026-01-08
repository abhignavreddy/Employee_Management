import React, { useState, useEffect } from 'react';
import { Search, X, LogOut, User, DollarSign, Briefcase, FileText, Calendar, Clock, Users, Building, Heart, Shield, Mail, Phone, MapPin, Home, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatar } from '../ProfileAvatar';
import apiClient from '../../lib/apiClient';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'User';

  // ULTIMATE COMPREHENSIVE GLOBAL SEARCH
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
      const searchTerm = query.toLowerCase();
      const results = [];

      // ========== 1. EMPLOYEES - All Fields ==========
      try {
        const employeesRes = await apiClient.get('/employees', {
          params: { page: 0, size: 200 }
        });
        
        const employees = employeesRes.data?.content || [];
        employees.forEach(emp => {
          const searchableFields = [
            emp.firstName, emp.lastName, emp.empId, emp.email, emp.phoneNumber,
            emp.empRole, emp.title, emp.status, emp.bloodGroup, emp.salary?.toString(),
            emp.address?.address1, emp.address?.city, emp.address?.pincode?.toString(),
            emp.bankDetails?.bankName, emp.bankDetails?.ifscCode,
            emp.emergencyContact?.name, emp.emergencyContact?.contactNumber
          ].filter(Boolean);

          if (searchableFields.some(field => field.toLowerCase().includes(searchTerm))) {
            results.push({
              id: emp.id,
              type: 'employee',
              title: `${emp.firstName} ${emp.lastName}`,
              subtitle: `${emp.empId} • ${emp.empRole} • ${emp.email}`,
              icon: User,
              color: 'indigo',
              action: () => navigate('/employees')
            });
          }
        });
      } catch (err) {
        console.error('Employee search error:', err);
      }

      // ========== 2. TASKS - All Fields ==========
      try {
        const tasksRes = await apiClient.get('/tasks');
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.content || [];
        
        tasks.forEach(task => {
          const searchableFields = [
            task.taskName, task.description, task.assignedTo, task.assignedBy,
            task.status, task.priority, task.category, task.project,
            task.dueDate, task.createdAt, task.comments
          ].filter(Boolean);

          if (searchableFields.some(field => field.toString().toLowerCase().includes(searchTerm))) {
            results.push({
              id: task.id,
              type: 'task',
              title: task.taskName || 'Untitled Task',
              subtitle: `${task.status} • ${task.priority || 'No Priority'} • ${task.assignedTo || 'Unassigned'}`,
              icon: Briefcase,
              color: 'purple',
              action: () => navigate(user?.role === 'Employee' ? '/my-tasks' : '/all-tasks')
            });
          }
        });
      } catch (err) {
        console.error('Task search error:', err);
      }

      // ========== 3. CLIENTS - All Fields ==========
      try {
        const clientsRes = await apiClient.get('/client-onboard', {
          params: { page: 0, size: 200 }
        });
        
        const clients = clientsRes.data?.content || [];
        clients.forEach(client => {
          const searchableFields = [
            client.clientName, client.email, client.phoneNumber?.toString(),
            client.location, client.address, client.city, client.state,
            client.country, client.zipCode?.toString(), client.industry,
            client.contactPerson, client.website, client.notes
          ].filter(Boolean);

          if (searchableFields.some(field => field.toString().toLowerCase().includes(searchTerm))) {
            results.push({
              id: client.id,
              type: 'client',
              title: client.clientName || 'Unnamed Client',
              subtitle: `${client.email || ''} • ${client.phoneNumber || ''} • ${client.location || ''}`,
              icon: Building,
              color: 'green',
              action: () => navigate('/clients')
            });
          }
        });
      } catch (err) {
        console.error('Client search error:', err);
      }

      // ========== 4. ATTENDANCE - All Fields ==========
      try {
        const attendanceRes = await apiClient.get(`/attendance/employee/${user.empId}`);
        const attendance = attendanceRes.data || [];
        
        attendance.forEach(record => {
          const searchableFields = [
            record.date, record.status, record.workMode, 
            record.checkIn, record.checkOut, record.workHours?.toString(),
            new Date(record.date).toLocaleDateString(),
            new Date(record.date).toDateString()
          ].filter(Boolean);

          if (searchableFields.some(field => field.toString().toLowerCase().includes(searchTerm))) {
            results.push({
              id: record.id,
              type: 'attendance',
              title: `Attendance - ${new Date(record.date).toLocaleDateString()}`,
              subtitle: `${record.status} • ${record.workMode || 'Office'} • ${record.workHours || 0}h`,
              icon: Clock,
              color: 'blue',
              action: () => navigate('/my-attendance')
            });
          }
        });
      } catch (err) {
        console.error('Attendance search error:', err);
      }

      // ========== 5. LEAVE REQUESTS - All Fields ==========
      try {
        const leavesRes = await apiClient.get(`/leave-approvel/employee/${user.empId}`);
        const leaves = leavesRes.data || [];
        
        leaves.forEach(leave => {
          const searchableFields = [
            leave.typeOfLeave, leave.status, leave.reason,
            leave.fromDate, leave.toDate, leave.empName,
            new Date(leave.fromDate).toLocaleDateString(),
            new Date(leave.toDate).toLocaleDateString()
          ].filter(Boolean);

          if (searchableFields.some(field => field.toString().toLowerCase().includes(searchTerm))) {
            const fromDate = new Date(leave.fromDate).toLocaleDateString();
            const toDate = new Date(leave.toDate).toLocaleDateString();
            results.push({
              id: leave.id || leave._id,
              type: 'leave',
              title: `${leave.typeOfLeave || 'Leave Request'}`,
              subtitle: `${leave.status} • ${fromDate} to ${toDate}`,
              icon: Calendar,
              color: 'yellow',
              action: () => navigate('/my-leaves')
            });
          }
        });
      } catch (err) {
        console.error('Leave search error:', err);
      }

      // ========== 6. SALARY/PAYROLL - Fields ==========
      try {
        // Search current user's salary data if available
        const salaryFields = [
          'salary', 'basic pay', 'hra', 'allowances', 'deductions',
          'net pay', 'gross pay', 'tax', 'pf', 'bonus', 'ctc'
        ];

        if (salaryFields.some(field => field.includes(searchTerm))) {
          results.push({
            id: 'salary',
            type: 'salary',
            title: 'Salary Details',
            subtitle: 'View your salary and compensation details',
            icon: DollarSign,
            color: 'green',
            action: () => navigate('/my-salary')
          });
        }
      } catch (err) {
        console.error('Salary search error:', err);
      }

      // ========== 7. PROFILE FIELDS ==========
      const profileFields = {
        'email': { title: 'Email Address', icon: Mail },
        'phone': { title: 'Phone Number', icon: Phone },
        'address': { title: 'Address Information', icon: Home },
        'blood': { title: 'Blood Group', icon: Heart },
        'emergency': { title: 'Emergency Contact', icon: AlertCircle },
        'bank': { title: 'Bank Details', icon: CreditCard },
        'personal': { title: 'Personal Information', icon: User },
      };

      Object.entries(profileFields).forEach(([key, value]) => {
        if (key.includes(searchTerm) || value.title.toLowerCase().includes(searchTerm)) {
          results.push({
            id: `profile-${key}`,
            type: 'profile',
            title: value.title,
            subtitle: 'View in your profile',
            icon: value.icon,
            color: 'indigo',
            action: () => navigate('/profile')
          });
        }
      });

      // ========== 8. PAGE NAVIGATION ==========
      const pages = [
        { name: 'Dashboard', keywords: ['home', 'overview', 'main'], path: '/dashboard', icon: Users, color: 'indigo' },
        { name: 'My Profile', keywords: ['profile', 'personal', 'info', 'details'], path: '/profile', icon: User, color: 'indigo' },
        { name: 'My Tasks', keywords: ['tasks', 'work', 'assignments', 'todo'], path: '/my-tasks', icon: Briefcase, color: 'purple' },
        { name: 'My Attendance', keywords: ['attendance', 'check-in', 'checkout', 'presence'], path: '/my-attendance', icon: Clock, color: 'blue' },
        { name: 'My Leaves', keywords: ['leave', 'vacation', 'time off', 'holiday'], path: '/my-leaves', icon: Calendar, color: 'yellow' },
        { name: 'My Salary', keywords: ['salary', 'pay', 'payroll', 'compensation', 'ctc'], path: '/my-salary', icon: DollarSign, color: 'green' },
        { name: 'Employees', keywords: ['employees', 'staff', 'team', 'members'], path: '/employees', icon: Users, color: 'indigo' },
        { name: 'All Tasks', keywords: ['tasks', 'projects', 'assignments'], path: '/all-tasks', icon: Briefcase, color: 'purple' },
        { name: 'Clients', keywords: ['clients', 'customers', 'partners'], path: '/clients', icon: Building, color: 'green' },
        { name: 'Attendance History', keywords: ['attendance', 'history', 'records'], path: '/attendance-history', icon: Clock, color: 'blue' },
        { name: 'Leave Approvals', keywords: ['leave', 'approval', 'requests'], path: '/leave-requests', icon: Calendar, color: 'yellow' },
      ];

      pages.forEach(page => {
        const allKeywords = [page.name, ...page.keywords].join(' ').toLowerCase();
        if (allKeywords.includes(searchTerm)) {
          results.push({
            id: page.path,
            type: 'page',
            title: page.name,
            subtitle: 'Navigate to this page',
            icon: page.icon,
            color: page.color,
            action: () => navigate(page.path)
          });
        }
      });

      // ========== 9. CARD/SECTION NAMES ==========
      const sections = [
        { name: 'Years of Service', keywords: ['years', 'service', 'tenure'] },
        { name: 'Annual CTC', keywords: ['ctc', 'salary', 'annual', 'compensation'] },
        { name: 'Blood Group', keywords: ['blood', 'group', 'type'] },
        { name: 'Department', keywords: ['department', 'team', 'division'] },
        { name: 'Personal Information', keywords: ['personal', 'info', 'details'] },
        { name: 'Address Information', keywords: ['address', 'location', 'residence'] },
        { name: 'Bank Details', keywords: ['bank', 'account', 'ifsc', 'branch'] },
        { name: 'Emergency Contact', keywords: ['emergency', 'contact', 'relation'] },
      ];

      sections.forEach(section => {
        const allKeywords = [section.name, ...section.keywords].join(' ').toLowerCase();
        if (allKeywords.includes(searchTerm)) {
          results.push({
            id: `section-${section.name}`,
            type: 'section',
            title: section.name,
            subtitle: 'View in profile or dashboard',
            icon: FileText,
            color: 'indigo',
            action: () => navigate('/profile')
          });
        }
      });

      // Remove duplicates based on title
      const uniqueResults = results.filter((result, index, self) =>
        index === self.findIndex((r) => r.title === result.title && r.type === result.type)
      );

      setSearchResults(uniqueResults.slice(0, 15)); // Limit to 15 results
    } catch (error) {
      console.error('Global search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result) => {
    result.action();
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfileMenu && !e.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
      if (showSearchResults && !e.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showSearchResults]);

  const getColorClasses = (color) => {
    const colors = {
      indigo: 'from-indigo-50 to-indigo-100 text-indigo-600',
      purple: 'from-purple-50 to-purple-100 text-purple-600',
      blue: 'from-blue-50 to-blue-100 text-blue-600',
      green: 'from-green-50 to-green-100 text-green-600',
      yellow: 'from-yellow-50 to-yellow-100 text-yellow-600',
      red: 'from-red-50 to-red-100 text-red-600',
    };
    return colors[color] || colors.indigo;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
      {/* Ultimate Global Search Bar */}
      <div className="flex-1 max-w-2xl relative search-container">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search everything... (employees, tasks, fields, cards, pages, etc.)"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="pl-11 pr-10 w-full h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[500px] overflow-y-auto">
            {isSearching ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">Searching everything...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 flex items-center justify-between">
                  <span>Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
                  <Badge variant="outline" className="text-xs">
                    Global Search
                  </Badge>
                </div>
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left border-b border-gray-100 last:border-b-0"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getColorClasses(result.color)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <result.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                      <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                      {result.type}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">No results found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try: employee names, tasks, emails, dates, salary, cards, pages
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="flex items-center ml-6 profile-menu-container relative">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center space-x-3 pl-6 border-l border-gray-200 hover:bg-gray-50 rounded-xl px-4 py-2 transition-all group"
        >
          <ProfileAvatar 
            empId={user?.empId} 
            firstName={user?.firstName}
            size="sm"
          />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {fullName}
            </p>
            <p className="text-xs text-gray-500">{user?.empRole || user?.role || 'Employee'}</p>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Profile Dropdown */}
        {showProfileMenu && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="ring-4 ring-white/30 rounded-full">
                  <ProfileAvatar 
                    empId={user?.empId} 
                    firstName={user?.firstName}
                    size="lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{fullName}</h3>
                  <p className="text-sm text-indigo-100 truncate">{user?.email}</p>
                  <Badge className="mt-2 bg-white/20 text-white border-white/30 hover:bg-white/30">
                    {user?.empId}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">My Profile</p>
                  <p className="text-xs text-gray-500">View and edit profile</p>
                </div>
              </button>

              <button
                onClick={() => {
                  navigate('/my-tasks');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">My Tasks</p>
                  <p className="text-xs text-gray-500">View assigned tasks</p>
                </div>
              </button>

              <button
                onClick={() => {
                  navigate('/my-salary');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Salary Details</p>
                  <p className="text-xs text-gray-500">View salary information</p>
                </div>
              </button>

              <div className="border-t border-gray-200 my-2"></div>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3 text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600">Logout</p>
                  <p className="text-xs text-red-400">Sign out of your account</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
