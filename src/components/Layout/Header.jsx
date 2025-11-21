import React, { useState } from 'react';
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

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Mock empty data - no API calls
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const unreadCount = 0; // Always 0 for empty state

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    // Simulate search delay then show empty results
    setTimeout(() => {
      setSearchResults([]);
      setIsSearching(false);
    }, 300);
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

  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'User';

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
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-white shadow-xl border-gray-200" align="end">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                You have no notifications
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-hide bg-white">
              <div className="p-8 text-center text-gray-500 bg-white">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            </div>
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

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-2 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="bg-blue-600 text-white text-sm">
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {fullName}
                </p>
                <p className="text-xs text-gray-500">{user?.empRole || user?.role || 'Employee'}</p>
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
