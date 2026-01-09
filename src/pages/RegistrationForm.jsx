import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";



export default function EmployeeRegistrationForm() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    // Basic Info
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
    empRole: "",
    empId: "",
    bloodGroup: "",
    salary: "",
    status: "ACTIVE",
    dept: "",
    panNo: "",
    joiningDate: "",


    // Address
    address: {
      address1: "",
      address2: "",
      country: "",
      city: "",
      pincode: "",
    },
    // Bank Details
    bankDetails: {
      bankAccount: "",
      ifscCode: "",
      bankName: "",
      branchName: "",
    },


    // Emergency Contact
    emergencyContact: {
      name: "",
      contactNumber: "",
      relation: "",
    },
  });



  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});



  // ✅ Handle nested and flat field updates
  const onChange = (e, section = null) => {
    const { name, value, type, checked } = e.target;


    if (section) {
      // Nested object update (address, bankDetails, emergencyContact)
      setForm((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value,
        },
      }));
    } else {

    // Flat field update - SIMPLE ✅
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

    // Clear error for this field
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };




  // ✅ Validation functions for each step
  const validateStep1 = () => {
    const newErrors = {};



    if (!form.title) newErrors.title = "Title is required";
    if (!form.firstName) newErrors.firstName = "First name is required";
    if (!form.lastName) newErrors.lastName = "Last name is required";
    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!form.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (form.phoneNumber.length !== 10 || !/^[6-9]\d{9}$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = "Enter valid 10-digit phone number";
    }
    if (!form.empRole) newErrors.empRole = "Role is required";
    if (!form.salary || parseFloat(form.salary) < 0) {
      newErrors.salary = "Valid salary is required";
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!form.address.address1) newErrors.address1 = "Address line 1 is required";
    if (!form.address.country) newErrors.country = "Country is required";
    if (!form.address.city) newErrors.city = "City is required";
    if (!form.address.pincode) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(form.address.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (!form.bankDetails.bankAccount) {
      newErrors.bankAccount = "Bank account number is required";
    } else if (form.bankDetails.bankAccount.length < 10 || form.bankDetails.bankAccount.length > 15) {
      newErrors.bankAccount = "Bank account must be 10-15 digits";
    }
    if (!form.bankDetails.bankName) newErrors.bankName = "Bank name is required";
    if (!form.bankDetails.branchName) newErrors.branchName = "Branch name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};

    if (!form.emergencyContact.name) newErrors.emergencyContactName = "Emergency contact name is required";
    if (!form.emergencyContact.contactNumber) {
      newErrors.emergencyContactNumber = "Emergency contact number is required";
    } else if (!/^[6-9]\d{9}$/.test(form.emergencyContact.contactNumber)) {
      newErrors.emergencyContactNumber = "Enter valid 10-digit contact number";
    }
    if (!form.emergencyContact.relation) newErrors.relation = "Relation is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle step navigation
  const nextStep = () => {
    let isValid = false;

    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    else if (currentStep === 4) isValid = validateStep4();

    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // ✅ Submit form to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep4()) return;

    try {
      setSubmitting(true);
      setAlert({ type: "", message: "" });


      // Get createdBy from current user session (adjust based on your auth)
      const createdBy = "ADMIN"; // Replace with actual user identifier

        const payload = {
        ...form,
        phoneNumber: parseInt(form.phoneNumber),
        salary: parseFloat(form.salary),
        // ✅ Convert joiningDate to ISO format for Instant
      joiningDate: form.joiningDate 
        ? new Date(form.joiningDate + 'T00:00:00').toISOString() 
        : null,
        address: {
          ...form.address,
          pincode: parseInt(form.address.pincode),
        },
        bankDetails: {
          ...form.bankDetails,
          bankAccount: parseInt(form.bankDetails.bankAccount),
        },
        emergencyContact: {
          ...form.emergencyContact,
          contactNumber: parseInt(form.emergencyContact.contactNumber),
        },
      };


      const res = await apiPost(`/employees?createdBy=${createdBy}`, payload);



      if (res.ok) {
        setAlert({ type: "success", message: "Employee registered successfully!" });
        // Reset form
        setForm({
          title: "",
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          phoneNumber: "",
          empRole: "",
          bloodGroup: "",
          salary: "",
          status: "ACTIVE",
          dept: "",
          panNo: "",
          joiningDate: "",
          address: { address1: "", address2: "", country: "", city: "", pincode: "" },
          bankDetails: { bankAccount: "", ifscCode: "", bankName: "", branchName: "" },
          emergencyContact: { name: "", contactNumber: "", relation: "" },
        });
        setCurrentStep(1);
      } else {
        const data = await res.json();
        setAlert({ type: "danger", message: data.message || "Registration failed" });
      }
    } catch (error) {
      setAlert({ type: "danger", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 border border-gray-100">
            <button
              onClick={() => window.location.href = '/onboarding'}
              className="flex items-center gap-2 px-4 py-2 mb-4 bg-gray-400 text-white hover:bg-gray-500 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Go Back</span>
            </button>
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Employee Registration</h2>
            <p className="text-sm text-gray-500 mt-2">Complete all steps to register a new employee</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex-1 flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${currentStep > step ? "bg-blue-600" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Basic Info</span>
              <span>Address</span>
              <span>Bank Details</span>
              <span>Emergency</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="title"
                      value={form.title}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select</option>
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Dr">Dr</option>
                    </select>
                    {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="John"
                    />
                    {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Doe"
                    />
                    {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="john.doe@company.com"
                    />
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={onChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-10"
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={form.phoneNumber}
                      onChange={onChange}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="9876543210"
                    />
                    {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="empRole"
                      value={form.empRole}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select role</option>
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="HR">HR</option>
                      <option value="CEO">CEO</option>
                    </select>
                    {errors.empRole && <p className="text-xs text-red-600 mt-1">{errors.empRole}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="salary"
                      value={form.salary}
                      onChange={onChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="50000"
                    />
                    {errors.salary && <p className="text-xs text-red-600 mt-1">{errors.salary}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      name="dept"
                      value={form.dept}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g., Marketing"
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      name="joiningDate"
                      value={form.joiningDate}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="status"
                      checked={form.status === "ACTIVE"}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.checked ? "ACTIVE" : "INACTIVE" })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active Status</span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Address */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Address Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address1"
                    value={form.address.address1}
                    onChange={(e) => onChange(e, "address")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Street address, building number"
                  />
                  {errors.address1 && <p className="text-xs text-red-600 mt-1">{errors.address1}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    name="address2"
                    value={form.address.address2}
                    onChange={(e) => onChange(e, "address")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Apartment, suite, unit, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={form.address.country}
                      onChange={(e) => onChange(e, "address")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="India"
                    />
                    {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={form.address.city}
                      onChange={(e) => onChange(e, "address")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Mumbai"
                    />
                    {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={form.address.pincode}
                      onChange={(e) => onChange(e, "address")}
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="400001"
                    />
                    {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Bank Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Bank Details</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={form.bankDetails.bankAccount}
                    onChange={(e) => onChange(e, "bankDetails")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="1234567890123"
                  />
                  {errors.bankAccount && <p className="text-xs text-red-600 mt-1">{errors.bankAccount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={form.bankDetails.ifscCode}
                    onChange={(e) => onChange(e, "bankDetails")}
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                    placeholder="SBIN0000123"
                  />
                  {errors.ifscCode && <p className="text-xs text-red-600 mt-1">{errors.ifscCode}</p>}
                </div>

                {/* PAN Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    name="panNo"
                    value={form.panNo.toUpperCase()}
                    onChange={onChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={form.bankDetails.bankName}
                      onChange={(e) => onChange(e, "bankDetails")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="State Bank of India"
                    />
                    {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="branchName"
                      value={form.bankDetails.branchName}
                      onChange={(e) => onChange(e, "bankDetails")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Mumbai Main Branch"
                    />
                    {errors.branchName && <p className="text-xs text-red-600 mt-1">{errors.branchName}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Emergency Contact */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Emergency Contact</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.emergencyContact.name}
                    onChange={(e) => onChange(e, "emergencyContact")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Jane Doe"
                  />
                  {errors.emergencyContactName && <p className="text-xs text-red-600 mt-1">{errors.emergencyContactName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={form.emergencyContact.contactNumber}
                      onChange={(e) => onChange(e, "emergencyContact")}
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="9876543210"
                    />
                    {errors.emergencyContactNumber && <p className="text-xs text-red-600 mt-1">{errors.emergencyContactNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relation <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="relation"
                      value={form.emergencyContact.relation}
                      onChange={(e) => onChange(e, "emergencyContact")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select</option>
                      <option value="Parent">Parent</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.relation && <p className="text-xs text-red-600 mt-1">{errors.relation}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Previous
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Registration"}
                </button>
              )}
            </div>
          </form>

          {/* Alert Messages */}
          {alert.message && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                alert.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {alert.message}
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-4">
          All fields marked with <span className="text-red-500">*</span> are required
        </p>
      </div>
    </div>
  );
}
