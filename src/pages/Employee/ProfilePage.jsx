import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Phone, MapPin, Calendar, Building, Edit, 
  CreditCard, AlertCircle, Heart, Briefcase, DollarSign,
  Shield, Home, Users, Camera, Trash2, Upload, Eye, EyeOff,
  Clock, CheckCircle
} from 'lucide-react';
import { motion } from "framer-motion";

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
  const [profileImgUrl, setProfileImgUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (user?.empId && !imageError) fetchProfileImage();
  }, [user, imageError]);

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

  const fetchProfileImage = async () => {
    if (!user?.empId) return;

    setImageError(false);
    setImgUploading(false);

    try {
      const res = await fetch(`/api/employees/empid/${user.empId}/profile-image`, {
        method: 'GET',
      });

      if (!res.ok) {
        setProfileImgUrl(null);
        setImageError(true);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        setProfileImgUrl(null);
        setImageError(true);
        return;
      }

      setImageError(false);
      setProfileImgUrl(`/api/employees/empid/${user.empId}/profile-image?ts=${Date.now()}`);
    } catch (err) {
      console.error('Profile image check failed:', err);
      setProfileImgUrl(null);
      setImageError(true);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setProfileImgUrl(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select a valid image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image size should be less than 5MB', variant: 'destructive' });
      return;
    }

    setImgUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/employees/empid/${user.empId}/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast({ title: 'Profile picture updated successfully!' });
      setImageError(false);
      fetchProfileImage();
    } catch (err) {
      toast({ 
        title: 'Failed to upload image', 
        description: err.response?.data?.message || 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setImgUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageDelete = async () => {
    try {
      await api.delete(`/employees/empid/${user.empId}/profile-image`);
      toast({ title: 'Profile picture deleted successfully!' });
      setProfileImgUrl('');
      setImageError(true);
      setDeleteConfirmOpen(false);
    } catch (err) {
      toast({ 
        title: 'Failed to delete image', 
        description: err.response?.data?.message || 'Please try again',
        variant: 'destructive' 
      });
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current && !imgUploading) fileInputRef.current.click();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your profile...</p>
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

  const hasProfileImage = !!profileImgUrl && !imageError && !imgUploading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Glassmorphic Hero Section - FIXED OVERLAPPING */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-white/50 backdrop-blur-xl border border-white/30 shadow-2xl"
        >
          {/* Gradient Background */}
          <div className=""></div>
          
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              
              {/* Profile Picture Section */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative group flex-shrink-0"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                  disabled={imgUploading}
                />
                
                <div className="relative">
                  <Avatar className="w-40 h-40 border-4 border-white shadow-2xl ring-8 ring-indigo-100/50">
                    {profileImgUrl && !imgUploading && !imageError ? (
                      <AvatarImage
                        src={profileImgUrl}
                        alt="Profile"
                        onError={handleImageError}
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-5xl font-bold">
                        {employeeData?.firstName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Upload/Edit Overlay */}
                  {!imgUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasProfileImage ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleAvatarClick}
                            className="p-3 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                            title="Change picture"
                          >
                            <Edit className="w-5 h-5 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmOpen(true)}
                            className="p-3 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                            title="Delete picture"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      ) : (
                        <div onClick={handleAvatarClick}>
                          <Camera className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  {imgUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                      <div className="text-center text-white">
                        <Upload className="w-8 h-8 animate-bounce mx-auto mb-2" />
                        <span className="text-xs font-semibold">Uploading...</span>
                      </div>
                    </div>
                  )}
                </div>


              </motion.div>

              {/* Profile Info - FIXED OVERLAPPING WITH MIN-WIDTH */}
              <div className="flex-1 min-w-0 text-center md:text-left space-y-4">
                <div>
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-2xl md:text-4xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent break-words max-w-full">
                      {fullName}
                    </h1>
                    <Badge 
                      className={`${
                        employeeData.status === 'ACTIVE' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-400 text-white'
                      } px-4 py-1 text-sm font-semibold shadow-lg flex-shrink-0`}
                    >
                      {employeeData.status}
                    </Badge>
                  </div>
                  <p className="text-xl md:text-2xl text-gray-700 font-medium mb-4">{employeeData.empRole}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-gray-600">
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                    <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <span className="font-mono font-bold text-sm">{employeeData.empId}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                    <Mail className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm truncate max-w-[200px]">{employeeData.email}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                    <Phone className="w-5 h-5 text-pink-600 flex-shrink-0" />
                    <span className="text-sm">{employeeData.phoneNumber}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => setEditDialogOpen(true)}
                  className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-full shadow-xl"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - UPDATED COLORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              label: 'Years of Service', 
              value: yearsOfService || 0, 
              icon: Clock, 
              gradient: 'from-indigo-500 to-indigo-600',
              bgGradient: 'from-indigo-50 to-indigo-100'
            },
            { 
              label: 'Annual CTC', 
              value: `₹${employeeData.salary?.toLocaleString('en-IN') || 'N/A'}`, 
              icon: DollarSign, 
              gradient: 'from-green-500 to-green-600',
              bgGradient: 'from-green-50 to-green-100'
            },
            { 
              label: 'Blood Group', 
              value: employeeData.bloodGroup || 'N/A', 
              icon: Heart, 
              gradient: 'from-pink-500 to-pink-600',
              bgGradient: 'from-pink-50 to-pink-100'
            },
            { 
              label: 'Department', 
              value: employeeData.empRole, 
              icon: Building, 
              gradient: 'from-purple-500 to-purple-600',
              bgGradient: 'from-purple-50 to-purple-100'
            }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`bg-gradient-to-br ${stat.bgGradient} border-none shadow-xl hover:shadow-2xl transition-shadow duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 truncate">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* USING YOUR ORIGINAL INFO SECTION WITH TABS */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg">
            <TabsTrigger value="personal" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Personal</TabsTrigger>
            <TabsTrigger value="address" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Address</TabsTrigger>
            <TabsTrigger value="bank" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Bank Details</TabsTrigger>
            <TabsTrigger value="emergency" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Emergency Contact</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <User className="w-5 h-5 mr-2 text-indigo-600" />
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
            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
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
            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                  Bank Account Details
                </CardTitle>
                <CardDescription>Your banking information for salary payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Account Number with Eye Button */}
                  <div className="relative border-l-4 border-indigo-500 pl-4 py-2 overflow-hidden group cursor-default">
                    <div className="absolute inset-0 bg-indigo-50 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
                    
                    <div className="relative z-10">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">Account Number</p>
                      <div className="flex items-center gap-3">
                        <p className="text-base font-bold text-black font-mono">
                          {showFullAccount 
                            ? employeeData.bankDetails?.bankAccount || 'Not specified'
                            : `XXXX XXXX ${String(employeeData.bankDetails?.bankAccount || '').slice(-4)}`
                          }
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowFullAccount(!showFullAccount)}
                          className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
                          title={showFullAccount ? 'Hide account number' : 'Show account number'}
                        >
                          {showFullAccount ? (
                            <EyeOff className="w-5 h-5 text-gray-600" />
                          ) : (
                            <Eye className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <InfoItem 
                    label="Bank Name"
                    value={employeeData.bankDetails?.bankName}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem 
                      label="Branch Name"
                      value={employeeData.bankDetails?.branchName}
                    />
                    <InfoItem 
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
            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Delete Profile Picture
            </DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete your profile picture? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImageDelete} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information (some fields may be restricted)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="number"
                  value={editData.phoneNumber || ''}
                  onChange={(e) => setEditData({ ...editData, phoneNumber: parseInt(e.target.value) })}
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Input
                  id="bloodGroup"
                  value={editData.bloodGroup || ''}
                  onChange={(e) => setEditData({ ...editData, bloodGroup: e.target.value })}
                  placeholder="e.g., O+"
                  className="bg-gray-50"
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
                className="bg-gray-50"
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
                className="bg-gray-50"
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
                  className="bg-gray-50"
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
                  className="bg-gray-50"
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
                  className="bg-gray-50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
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

// Helper Component - YOUR ORIGINAL STYLE
const InfoItem = ({ icon, label, value }) => (
  <div className="relative border-l-4 border-indigo-500 pl-4 py-2 overflow-hidden group cursor-default">
    <div className="absolute inset-0 bg-indigo-50 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
    
    <div className="relative z-10">
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-base font-bold text-black break-words">
        {value || 'Not specified'}
      </p>
    </div>
  </div>
);

export default ProfilePage;
