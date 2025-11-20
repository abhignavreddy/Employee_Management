import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Phone, MapPin, Calendar, Building, Edit, 
  CreditCard, AlertCircle, Heart, Briefcase, DollarSign,
  Shield, Home, Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';
import apiClient from '../../lib/apiClient';

const api = apiClient;

const ProfilePage = () => {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const response = await api.get(`/employees/empid/${user.empId}`);
      setEmployeeData(response.data);
      setEditData(response.data);
    } catch (err) {
      console.error('Error loading employee data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employees/${employeeData.id}?updatedBy=${user.empId}`, {
        ...editData,
      });
      
      setEmployeeData(editData);
      setEditDialogOpen(false);
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been updated successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Employee data not found</p>
      </div>
    );
  }

  const fullName = `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim();
  const yearsOfService = Math.floor(
    (new Date() - new Date(employeeData.createdAt)) / (1000 * 60 * 60 * 24 * 365)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">View and manage your personal information</p>
        </div>
        <Button className="text-white" onClick={() => setEditDialogOpen(true)}>
          <Edit className="w-4 h-4 mr-2 text-white" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="border-2">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl ring-4 ring-blue-50">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-linear-to-br from-blue-600 to-blue-700 text-white text-4xl">
                {getInitials(employeeData.firstName, employeeData.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h2 className="text-3xl font-bold text-gray-900">{fullName}</h2>
                <Badge 
                  variant="outline" 
                  className={employeeData.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                  }
                >
                  {employeeData.status}
                </Badge>
              </div>
              <p className="text-xl text-gray-600 mb-3">{employeeData.empRole}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="flex items-center text-gray-600">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="font-mono font-semibold">{employeeData.empId}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="text-sm">{employeeData.email}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span className="text-sm">{employeeData.phoneNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-linear-to-brrom-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium mb-1">Years of Service</p>
                <p className="text-3xl font-bold text-blue-900">{yearsOfService || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">Annual CTC</p>
                <p className="text-3xl font-bold text-green-900">
                  ₹{employeeData.salary.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium mb-1">Blood Group</p>
                <p className="text-3xl font-bold text-purple-900">
                  {employeeData.bloodGroup || 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium mb-1">Department</p>
                <p className="text-2xl font-bold text-orange-900 truncate">
                  {employeeData.empRole}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <InfoItem 
                    icon={<User className="w-5 h-5 text-gray-400" />}
                    label="Title"
                    value={employeeData.title}
                  />
                  <InfoItem 
                    icon={<User className="w-5 h-5 text-gray-400" />}
                    label="First Name"
                    value={employeeData.firstName}
                  />
                  <InfoItem 
                    icon={<User className="w-5 h-5 text-gray-400" />}
                    label="Last Name"
                    value={employeeData.lastName}
                  />
                  <InfoItem 
                    icon={<Mail className="w-5 h-5 text-gray-400" />}
                    label="Email Address"
                    value={employeeData.email}
                  />
                </div>
                <div className="space-y-4">
                  <InfoItem 
                    icon={<Phone className="w-5 h-5 text-gray-400" />}
                    label="Phone Number"
                    value={employeeData.phoneNumber}
                  />
                  <InfoItem 
                    icon={<Shield className="w-5 h-5 text-gray-400" />}
                    label="Employee ID"
                    value={employeeData.empId}
                  />
                  <InfoItem 
                    icon={<Briefcase className="w-5 h-5 text-gray-400" />}
                    label="Role"
                    value={employeeData.empRole}
                  />
                  <InfoItem 
                    icon={<Heart className="w-5 h-5 text-gray-400" />}
                    label="Blood Group"
                    value={employeeData.bloodGroup || 'Not specified'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2 text-purple-600" />
                Address Information
              </CardTitle>
              <CardDescription>Your residential address details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <InfoItem 
                  icon={<MapPin className="w-5 h-5 text-gray-400" />}
                  label="Address Line 1"
                  value={employeeData.address?.address1}
                />
                <InfoItem 
                  icon={<MapPin className="w-5 h-5 text-gray-400" />}
                  label="Address Line 2"
                  value={employeeData.address?.address2 || 'N/A'}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoItem 
                    icon={<Building className="w-5 h-5 text-gray-400" />}
                    label="City"
                    value={employeeData.address?.city}
                  />
                  <InfoItem 
                    icon={<MapPin className="w-5 h-5 text-gray-400" />}
                    label="Pincode"
                    value={employeeData.address?.pincode}
                  />
                  <InfoItem 
                    icon={<MapPin className="w-5 h-5 text-gray-400" />}
                    label="Country"
                    value={employeeData.address?.country}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                Bank Account Details
              </CardTitle>
              <CardDescription>Your banking information for salary payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <InfoItem 
                  icon={<CreditCard className="w-5 h-5 text-gray-400" />}
                  label="Account Number"
                  value={`XXXX XXXX ${String(employeeData.bankDetails?.bankAccount || '').slice(-4)}`}
                  sensitive
                />
                <InfoItem 
                  icon={<Building className="w-5 h-5 text-gray-400" />}
                  label="Bank Name"
                  value={employeeData.bankDetails?.bankName}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem 
                    icon={<Building className="w-5 h-5 text-gray-400" />}
                    label="Branch Name"
                    value={employeeData.bankDetails?.branchName}
                  />
                  <InfoItem 
                    icon={<CreditCard className="w-5 h-5 text-gray-400" />}
                    label="IFSC Code"
                    value={employeeData.bankDetails?.ifscCode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                Emergency Contact
              </CardTitle>
              <CardDescription>Contact person in case of emergency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <InfoItem 
                  icon={<Users className="w-5 h-5 text-gray-400" />}
                  label="Contact Name"
                  value={employeeData.emergencyContact?.name}
                />
                <InfoItem 
                  icon={<Phone className="w-5 h-5 text-gray-400" />}
                  label="Contact Number"
                  value={employeeData.emergencyContact?.contactNumber}
                />
                <InfoItem 
                  icon={<Heart className="w-5 h-5 text-gray-400" />}
                  label="Relation"
                  value={employeeData.emergencyContact?.relation}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information (some fields may be restricted)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="number"
                  value={editData.phoneNumber || ''}
                  onChange={(e) => setEditData({ ...editData, phoneNumber: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Input
                  id="bloodGroup"
                  value={editData.bloodGroup || ''}
                  onChange={(e) => setEditData({ ...editData, bloodGroup: e.target.value })}
                  placeholder="e.g., O+"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Input
                id="address1"
                value={editData.address?.address1 || ''}
                onChange={(e) => setEditData({ 
                  ...editData, 
                  address: { ...editData.address, address1: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                value={editData.address?.address2 || ''}
                onChange={(e) => setEditData({ 
                  ...editData, 
                  address: { ...editData.address, address2: e.target.value }
                })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editData.address?.city || ''}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    address: { ...editData.address, city: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  type="number"
                  value={editData.address?.pincode || ''}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    address: { ...editData.address, pincode: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={editData.address?.country || ''}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    address: { ...editData.address, country: e.target.value }
                  })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-white">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

// Helper Component for displaying information
const InfoItem = ({ icon, label, value, sensitive = false }) => (
  <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="mt-0.5">{icon}</div>
    <div className="flex-1">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`font-medium text-gray-900 ${sensitive ? 'font-mono' : ''}`}>
        {value || 'Not specified'}
      </p>
    </div>
  </div>
);

export default ProfilePage;
