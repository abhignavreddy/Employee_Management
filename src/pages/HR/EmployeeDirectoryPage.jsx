import React, { useEffect, useState, useMemo } from 'react';
import { Users, Search, Filter, Mail, Phone, Edit, Save, X, MapPin, Building2, CreditCard, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import apiClient from '../../lib/apiClient';
import { toast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';

const api = apiClient;

const EmployeeApi = {
  list: (page = 0, size = 100) =>
    api.get(`/employees?page=${page}&size=${size}`).then((r) => r.data),
  getById: (id) =>
    api.get(`/employees/${id}`).then((r) => r.data),
  update: (id, payload, updatedBy = 'Admin') =>
    api.put(`/employees/${id}?updatedBy=${encodeURIComponent(updatedBy)}`, payload).then((r) => r.data),
};

const EmployeeDirectoryPage = () => {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await EmployeeApi.list(0, 100);
      setEmployees(data?.content || data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load employees.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = useMemo(() => {
    const roles = Array.from(new Set(employees.map((e) => e.empRole).filter(Boolean)));
    return roles.length ? roles : ['General'];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch =
        !q ||
        name.includes(q) ||
        String(emp.empId || '').toLowerCase().includes(q) ||
        String(emp.email || '').toLowerCase().includes(q);
      const matchesDept =
        departmentFilter === 'all' || String(emp.empRole || '') === departmentFilter;
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'Active' && emp.status === 'ACTIVE') ||
        (statusFilter === 'Inactive' && emp.status === 'INACTIVE');
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  const handleCardClick = async (employee) => {
    try {
      // Fetch full employee details
      const fullData = await EmployeeApi.getById(employee.id);
      setSelectedEmployee(fullData);
      setEditForm(fullData);
      setModalOpen(true);
      setEditMode(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load employee details' });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updatePayload = {
        title: editForm.title,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        empRole: editForm.empRole,
        empId: editForm.empId,
        bloodGroup: editForm.bloodGroup,
        salary: editForm.salary,
        status: editForm.status,
        address: editForm.address,
        bankDetails: editForm.bankDetails,
        emergencyContact: editForm.emergencyContact,
      };

      const updated = await EmployeeApi.update(selectedEmployee.id, updatePayload, 'Admin');
      
      // Update local state
      setEmployees(prev => 
        prev.map(emp => emp.id === selectedEmployee.id ? updated : emp)
      );
      setSelectedEmployee(updated);
      setEditMode(false);
      
      toast({ title: 'Success', description: 'Employee updated successfully' });
    } catch (err) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: err?.response?.data?.message || 'Failed to update employee' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'UN';

  const getStatusColor = (status) =>
    status === 'ACTIVE'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';

  const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
  const inactiveCount = employees.filter(e => e.status === 'INACTIVE').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Directory</h1>
          <p className="text-gray-600 mt-1">Manage employee records and information</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{inactiveCount}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">✗</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-purple-600">{departments.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">🏢</span>
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
                placeholder="Search by name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <p className="col-span-full text-center text-gray-500 py-10">Loading employees...</p>
        ) : filteredEmployees.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-10">
            No employees found matching your criteria
          </p>
        ) : (
          filteredEmployees.map((employee) => {
            const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
            return (
              <Card
                key={employee.id}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleCardClick(employee)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-blue-600 text-white text-xl">
                        {getInitials(fullName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1 w-full">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {fullName}
                      </h3>
                      <p className="text-sm text-gray-600">{employee.empRole}</p>
                      <p className="text-xs font-mono text-gray-500">{employee.empId}</p>
                    </div>

                    <div className="flex flex-col items-center space-y-2 w-full">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{employee.phoneNumber || '—'}</span>
                      </div>
                    </div>

                    <Badge variant="outline" className={getStatusColor(employee.status)}>
                      {employee.status || 'ACTIVE'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Employee Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) {
          setEditMode(false);
          setSelectedEmployee(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="text-xl font-bold">Employee Details</span>
              {!editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="bank">Bank Details</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
              </TabsList>

              {/* Personal Info Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editForm?.title || ''}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID</Label>
                    <Input
                      value={editForm?.empId || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={editForm?.firstName || ''}
                      onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={editForm?.lastName || ''}
                      onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={editForm?.email || ''}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={editForm?.phoneNumber || ''}
                      onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={editForm?.empRole || ''}
                      onChange={(e) => setEditForm({...editForm, empRole: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Blood Group</Label>
                    <Input
                      value={editForm?.bloodGroup || ''}
                      onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary</Label>
                    <Input
                      type="number"
                      value={editForm?.salary || ''}
                      onChange={(e) => setEditForm({...editForm, salary: parseFloat(e.target.value)})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    {editMode ? (
                      <Select
                        value={editForm?.status || 'ACTIVE'}
                        onValueChange={(v) => setEditForm({...editForm, status: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={editForm?.status || 'ACTIVE'} disabled />
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Address Line 1</Label>
                    <Input
                      value={editForm?.address?.address1 || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        address: {...editForm.address, address1: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address Line 2</Label>
                    <Input
                      value={editForm?.address?.address2 || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        address: {...editForm.address, address2: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={editForm?.address?.city || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        address: {...editForm.address, city: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      value={editForm?.address?.pincode || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        address: {...editForm.address, pincode: parseInt(e.target.value)}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Country</Label>
                    <Input
                      value={editForm?.address?.country || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        address: {...editForm.address, country: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Bank Details Tab */}
              <TabsContent value="bank" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <Input
                      value={editForm?.bankDetails?.bankAccount || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        bankDetails: {...editForm.bankDetails, bankAccount: parseInt(e.target.value)}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={editForm?.bankDetails?.ifscCode || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        bankDetails: {...editForm.bankDetails, ifscCode: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={editForm?.bankDetails?.bankName || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        bankDetails: {...editForm.bankDetails, bankName: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input
                      value={editForm?.bankDetails?.branchName || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        bankDetails: {...editForm.bankDetails, branchName: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Emergency Contact Tab */}
              <TabsContent value="emergency" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={editForm?.emergencyContact?.name || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        emergencyContact: {...editForm.emergencyContact, name: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <Input
                      value={editForm?.emergencyContact?.contactNumber || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        emergencyContact: {...editForm.emergencyContact, contactNumber: parseInt(e.target.value)}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Relation</Label>
                    <Input
                      value={editForm?.emergencyContact?.relation || ''}
                      onChange={(e) => setEditForm({
                        ...editForm, 
                        emergencyContact: {...editForm.emergencyContact, relation: e.target.value}
                      })}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {editMode && (
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setEditForm(selectedEmployee);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default EmployeeDirectoryPage;
