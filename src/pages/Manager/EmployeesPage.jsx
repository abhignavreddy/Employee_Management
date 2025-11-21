import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Eye, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import apiClient from '../../lib/apiClient';

// Backend API
const api = apiClient;

const EmployeeApi = {
  list: (page = 0, size = 30) =>
    api.get(`/employees?page=${page}&size=${size}`).then((r) => r.data),
  getByEmpId: (empId) =>
    api.get(`/employees/by-empid/${empId}`).then((r) => r.data),
};

function fullName(e) {
  return [e.firstName, e.lastName].filter(Boolean).join(' ');
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function statusBadgeClass(status) {
  const upperStatus = String(status).toUpperCase();
  if (upperStatus === 'ACTIVE') {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (upperStatus === 'INACTIVE') {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  return 'bg-gray-100 text-gray-800 border-gray-300';
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(30);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data = await EmployeeApi.list(p, size);
      setEmployees(Array.isArray(data) ? data : data?.content || []);
      setTotalPages(data?.totalPages || 1);
      setPage(p);
    } catch (e) {
      console.error('Failed to load employees:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
  }, []);

  // Derive departments from data
  const departments = useMemo(() => {
    const roles = Array.from(new Set((employees || []).map(e => e.empRole).filter(Boolean)));
    return roles.length ? roles : [];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (employees || []).filter((emp) => {
      const name = fullName(emp).toLowerCase();
      const matchesSearch =
        !q ||
        name.includes(q) ||
        String(emp.empId || '').toLowerCase().includes(q) ||
        String(emp.email || '').toLowerCase().includes(q);
      const matchesDepartment =
        departmentFilter === 'all' || String(emp.empRole || '') === departmentFilter;
      const matchesStatus =
        statusFilter === 'all' || String(emp.status || '').toUpperCase() === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <p className="text-gray-600 mt-1">Manage and view employee information</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Department Filter - Opaque */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[220px] bg-white/80 backdrop-blur-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-md">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter - Opaque */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/80 backdrop-blur-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-md">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="INACTIVE">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Inactive
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" onClick={() => load(0)} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => {
          const name = fullName(employee) || '—';
          const initials = getInitials(name || 'U N');
          const email = employee.email || '—';
          const phone = employee.phoneNumber ? `+${employee.phoneNumber}` : '—';
          const role = employee.empRole || '—';
          const empId = employee.empId || '—';
          const status = employee.status || 'INACTIVE';

          // Address display from nested structure
          const addr = employee.address
            ? [
                employee.address.address1,
                employee.address.address2,
                employee.address.city,
                employee.address.country,
              ]
                .filter(Boolean)
                .join(', ')
            : '';

          return (
            <Card
              key={employee.id}
              className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() =>
                handleViewDetails({
                  ...employee,
                  name,
                  phone,
                  addressStr: addr,
                })
              }
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{name}</h3>
                      <p className="text-sm text-gray-500">{empId}</p>
                    </div>
                  </div>
                  {/* Dynamic Status Badge */}
                  <Badge variant="outline" className={statusBadgeClass(status)}>
                    {status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="truncate">{email}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{phone}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-500">{role}</span>
                    <Button variant="ghost" size="sm" className="h-8">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'No employees found matching your criteria'
              : 'No employees available'}
          </p>
        </div>
      )}

      {/* Employee Detail Dialog - SCROLLABLE */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>Complete information about the employee</DialogDescription>
          </DialogHeader>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedEmployee && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4 pb-4 border-b">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-blue-600 text-white text-2xl">
                      {getInitials(selectedEmployee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedEmployee.name}
                    </h3>
                    <p className="text-gray-600">{selectedEmployee.empRole || '—'}</p>
                    {/* Dynamic Status Badge in Dialog */}
                    <Badge
                      variant="outline"
                      className={`mt-2 ${statusBadgeClass(selectedEmployee.status)}`}
                    >
                      {selectedEmployee.status || 'INACTIVE'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employee ID</label>
                    <p className="mt-1 text-gray-900">{selectedEmployee.empId || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="mt-1 text-gray-900">{selectedEmployee.empRole || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{selectedEmployee.email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">
                      {selectedEmployee.phone ||
                        (selectedEmployee.phoneNumber
                          ? `+${selectedEmployee.phoneNumber}`
                          : '—')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Blood Group</label>
                    <p className="mt-1 text-gray-900">{selectedEmployee.bloodGroup || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Salary</label>
                    <p className="mt-1 text-gray-900 font-semibold">
                      {selectedEmployee.salary != null
                        ? `₹${Number(selectedEmployee.salary).toLocaleString()}/year`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Joined On</label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {selectedEmployee.createdAt
                        ? new Date(selectedEmployee.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(selectedEmployee.status)}
                      >
                        {selectedEmployee.status || 'INACTIVE'}
                      </Badge>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="mt-1 text-gray-900 flex items-start">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                      {selectedEmployee.addressStr ||
                        (selectedEmployee.address
                          ? [
                              selectedEmployee.address.address1,
                              selectedEmployee.address.address2,
                              selectedEmployee.address.city,
                              selectedEmployee.address.country,
                              selectedEmployee.address.pincode,
                            ]
                              .filter(Boolean)
                              .join(', ')
                          : '—')}
                    </p>
                  </div>
                </div>

                {/* Bank Details Section */}
                {selectedEmployee.bankDetails && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-gray-900 mb-3">Bank Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Account Number
                        </label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.bankDetails.bankAccount || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">IFSC Code</label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.bankDetails.ifscCode || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bank Name</label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.bankDetails.bankName || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Branch</label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.bankDetails.branchName || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact Section */}
                {selectedEmployee.emergencyContact && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.emergencyContact.name || '—'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Relation</label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.emergencyContact.relation || '—'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">
                          Contact Number
                        </label>
                        <p className="mt-1 text-gray-900">
                          {selectedEmployee.emergencyContact.contactNumber
                            ? `+${selectedEmployee.emergencyContact.contactNumber}`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-600">
          Page {page + 1} of {Math.max(1, totalPages)} • {filteredEmployees.length} employee
          {filteredEmployees.length !== 1 ? 's' : ''} shown
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => load(Math.max(0, page - 1))}
            disabled={page <= 0 || loading}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            onClick={() => load(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1 || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
