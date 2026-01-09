import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, CheckCircle, Pencil } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";
import apiClient from "../../lib/apiClient";

// ========== API Setup ==========
const api = apiClient;

const EmployeeApi = {
  create: (payload, createdBy = "HR") =>
    api
      .post(`/employees?createdBy=${encodeURIComponent(createdBy)}`, payload)
      .then((r) => r.data),

  update: (id, payload, updatedBy = "HR") =>
    api
      .put(`/employees/${id}?updatedBy=${encodeURIComponent(updatedBy)}`, payload)
      .then((r) => r.data),

  getByEmpId: (empId) =>
    api.get(`/employees/empid/${empId}`).then((r) => r.data),
  list: (page = 0, size = 20) =>
    api.get(`/employees?page=${page}&size=${size}`).then((r) => r.data),

  deactivate: (id, deactivatedBy = "HR") =>
    api
      .put(`/employees/${id}/deactivate?deactivatedBy=${encodeURIComponent(deactivatedBy)}`)
      .then((r) => r.data),
};

// ========== Helpers ==========
const parseNum = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [size] = useState(10);
  const [onboardSearch, setOnboardSearch] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);

  // Edit / Offboard states
  const [editForm, setEditForm] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const [offbTarget, setOffbTarget] = useState(null);
  const [offbInfo, setOffbInfo] = useState({ lastDay: "", reason: "" });
  const [offbSubmitting, setOffbSubmitting] = useState(false);

  const [editSubmitting, setEditSubmitting] = useState(false);

  const [empIdQuery, setEmpIdQuery] = useState("");
  const [onboardedThisMonth, setOnboardedThisMonth] = useState(0);

  const [searchResults, setSearchResults] = useState([]);

  // Load Employees
  const loadList = async (p = page) => {
    setListLoading(true);
    try {
      const data = await api.get(`/employees/active?page=${p}&size=${size}`).then(r => r.data);
      const list = Array.isArray(data) ? data : data?.content || [];
      setEmployees(list);
      setAllEmployees(list); // keep original list for searching
      setTotalPages(data?.totalPages || 1);
      setPage(p);
    } catch {
      toast({
        title: "Failed to load employees",
        description: "Please check your backend connection.",
      });
    } finally {
      setListLoading(false);
    }
  };


  useEffect(() => {
    loadList(0);
  }, []);



  // ========= EDIT EMPLOYEE =========
  const openEdit = (employee) => {
    setEditTarget(employee);
    setEditForm({ ...employee });
    setEditOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm((p) => ({ ...p, [field]: value }));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const payload = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phoneNumber: parseNum(editForm.phoneNumber),
        empRole: editForm.empRole,
        bloodGroup: editForm.bloodGroup,
        salary: parseNum(editForm.salary),
        address: editForm.address,
        bankDetails: editForm.bankDetails,
        emergencyContact: editForm.emergencyContact,
      };

      await EmployeeApi.update(editTarget.id, payload, "HR");
      toast({
        title: "Employee updated",
        description: `${editForm.empId} updated successfully.`,
      });
      setEditOpen(false);
      setEditTarget(null);
      await loadList(page);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || "Update failed.";
      toast({ title: "Error", description: msg });
    } finally {
      setEditSubmitting(false);
    }
  };

  // ========= OFFBOARD =========
  const submitOffboard = async () => {
    if (!offbTarget) return;
    setOffbSubmitting(true);
    try {
      await EmployeeApi.deactivate(offbTarget.id, "HR");
      toast({
        title: "Employee Offboarded",
        description: `${offbTarget.empId} status changed to INACTIVE.`,
      });
      setOffbTarget(null);
      setOffbInfo({ lastDay: "", reason: "" });
      await loadList(page);
    } catch {
      toast({
        title: "Error",
        description: "Failed to offboard employee.",
      });
    } finally {
      setOffbSubmitting(false);
    }
  };

  const searchOffboardEmp = async () => {
    if (!empIdQuery.trim()) {
      toast({
        title: "Enter a value",
        description: "Search using Emp ID or Name",
      });
      return;
    }

    const query = empIdQuery.toLowerCase();

    const found = employees.find(
      (e) =>
        e.empId?.toLowerCase() === query ||
        e.firstName?.toLowerCase().includes(query) ||
        e.lastName?.toLowerCase().includes(query)
    );

    if (found) {
      setOffbTarget(found);
      return;
    }

    try {
      const res = await EmployeeApi.getByEmpId(empIdQuery.trim());
      setOffbTarget(res);
    } catch {
      setOffbTarget(null);
      toast({ title: "Not found", description: "No employee matches your search." });
    }
    setSearchResults([]);
  };

  const handleLiveSearch = (value) => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    const q = value.toLowerCase();

    const results = employees.filter(
      (emp) =>
        (emp.empId || "").toLowerCase().includes(q) ||
        (emp.firstName || "").toLowerCase().includes(q) ||
        (emp.lastName || "").toLowerCase().includes(q)
    );

    setSearchResults(results.slice(0, 8));
  };

  const selectEmployee = (emp) => {
    setOffbTarget(emp);
    setEmpIdQuery(`${emp.firstName} ${emp.lastName} (${emp.empId})`);
    setSearchResults([]);
  };

  // Helper for nested fields in edit dialog
  const InputField = ({ label, field, obj }) => (
    <div>
      <Label>{label}</Label>
      <Input
        value={editForm[obj]?.[field] || ""}
        onChange={(e) =>
          setEditForm((prev) => ({
            ...prev,
            [obj]: { ...prev[obj], [field]: e.target.value },
          }))
        }
      />
    </div>
  );

  // ========= UI =========
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Onboarding & Offboarding</h1>
          <p className="text-gray-600 mt-1">Manage new hires and employee exits</p>
        </div>
        


        {/* Redirect to Registration Page */}
        <Button
          className="flex items-center text-white bg-blue-600"
          onClick={() => navigate("/register")}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
            </div>
            <UserPlus className="w-6 h-6 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Onboarded This Month</p>
              <p className="text-2xl font-bold text-green-600">{onboardedThisMonth}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="onboarding" className="w-full mt-8">
        <TabsList className="flex w-fit border-b pb-0 gap-2">
          <TabsTrigger
            value="onboarding"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-4 py-2 flex items-center gap-2 rounded-none"
          >
            <UserPlus className="w-4 h-4" />
            Onboarding
          </TabsTrigger>

          <TabsTrigger
            value="offboarding"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-4 py-2 flex items-center gap-2 rounded-none"
          >
            <CheckCircle className="w-4 h-4" />
            Offboarding
          </TabsTrigger>
        </TabsList>

        {/* ONBOARDING TAB */}
        <TabsContent value="onboarding" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <CardTitle>Employees</CardTitle>
                <CardDescription>Manage employee data</CardDescription>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Search by Emp ID or Name"
                  value={onboardSearch}
                  onChange={(e) => setOnboardSearch(e.target.value)}
                  className="w-48"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!onboardSearch.trim()) {
                      setEmployees(allEmployees);
                      return;
                    }

                    const q = onboardSearch.trim().toLowerCase();

                    const filtered = allEmployees.filter((emp) =>
                      (emp.empId || "").toLowerCase().includes(q) ||
                      (emp.firstName || "").toLowerCase().includes(q) ||
                      (emp.lastName || "").toLowerCase().includes(q)
                    );

                    setEmployees(filtered);
                  }}
                >
                  Find
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOnboardSearch("");
                    loadList(0);
                  }}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 pr-3">Name</th>
                      <th className="py-3 pr-3">Emp ID</th>
                      <th className="py-3 pr-3">Email</th>
                      <th className="py-3 pr-3">Role</th>
                      <th className="py-3 pr-3">Phone</th>
                      <th className="py-3 pr-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id} className="border-b">
                        <td className="py-3 pr-3">{[e.firstName, e.lastName].filter(Boolean).join(" ")}</td>
                        <td className="py-3 pr-3">
                          <Badge variant="outline">{e.empId}</Badge>
                        </td>
                        <td className="py-3 pr-3">{e.email}</td>
                        <td className="py-3 pr-3">{e.empRole}</td>
                        <td className="py-3 pr-3">{e.phoneNumber}</td>

                        <td className="py-3 pr-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                              <Pencil className="w-4 h-4 mr-1" /> Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-5">
                <Button variant="outline" disabled={page === 0} onClick={() => loadList(page - 1)}>
                  Previous
                </Button>

                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  disabled={page + 1 >= totalPages}
                  onClick={() => loadList(page + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OFFBOARDING TAB */}
        <TabsContent value="offboarding" className="mt-6">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Offboarding</CardTitle>
              <CardDescription>Submit exit details, upload documents, and finalize offboarding.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-1 relative">
                <Label>Search Employee (ID or Name)</Label>

                <Input
                  placeholder="Start typing to search..."
                  value={empIdQuery}
                  onChange={(e) => {
                    setEmpIdQuery(e.target.value);
                    handleLiveSearch(e.target.value);
                  }}
                />

                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {searchResults.map((emp) => (
                      <div
                        key={emp.id}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between"
                        onClick={() => selectEmployee(emp)}
                      >
                        <span>
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-gray-500 text-sm">{emp.empId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Last Working Day</Label>
                <Input
                  type="date"
                  value={offbInfo.lastDay}
                  onChange={(e) => setOffbInfo((p) => ({ ...p, lastDay: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label>Reason</Label>
                <textarea
                  value={offbInfo.reason}
                  onChange={(e) => setOffbInfo((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full border px-3 py-2 rounded-md"
                  placeholder="Reason for offboarding..."
                />
              </div>

              <div className="space-y-1">
                <Label>Upload Documents</Label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => setOffbInfo((p) => ({ ...p, files: e.target.files }))}
                  className="cursor-pointer"
                />

                {offbInfo.files && (
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    {[...offbInfo.files].map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        📄 {f.name} <span className="text-xs text-gray-400">({(f.size / 1024).toFixed(1)} KB)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                className="bg-red-600 text-white w-full"
                disabled={offbSubmitting}
                onClick={async () => {
                  if (!offbTarget) {
                    toast({ title: "Select an employee", description: "Choose an employee first." });
                    return;
                  }
                  if (!offbInfo.lastDay || !offbInfo.reason) {
                    toast({
                      title: "Missing details",
                      description: "Fill out all required fields.",
                    });
                    return;
                  }

                  setOffbSubmitting(true);
                  try {
                    await EmployeeApi.deactivate(offbTarget.id, "HR");

                    toast({
                      title: "Employee Offboarded",
                      description: `${offbTarget.empId} status changed to INACTIVE.`,
                    });

                    setOffbTarget(null);
                    setOffbInfo({ lastDay: "", reason: "", files: null });
                    setEmpIdQuery("");
                    await loadList(page);
                  } catch (err) {
                    toast({
                      title: "Error",
                      description: err?.response?.data?.message || "Failed to offboard employee",
                    });
                  } finally {
                    setOffbSubmitting(false);
                  }
                }}
              >
                {offbSubmitting ? "Processing..." : "Offboard Employee"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Employee Dialog */}
      {/* You may keep your dialog implementation here — left minimal to avoid adding unused dialog libs */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="w-full max-w-xl bg-white rounded-lg shadow-lg overflow-y-auto max-h-[80vh] p-6">
            <h3 className="text-lg font-semibold mb-2">Edit Employee</h3>
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input required value={editForm.firstName || ""} onChange={(e) => handleEditChange("firstName", e.target.value)} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input required value={editForm.lastName || ""} onChange={(e) => handleEditChange("lastName", e.target.value)} />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" required value={editForm.email || ""} onChange={(e) => handleEditChange("email", e.target.value)} />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input required value={editForm.phoneNumber || ""} onChange={(e) => handleEditChange("phoneNumber", e.target.value)} />
                </div>
                <div>
                  <Label>Role *</Label>
                  <select required value={editForm.empRole || ""} onChange={(e) => handleEditChange("empRole", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">Select</option>
                    <option value="HR">HR</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="CEO">CEO</option>
                  </select>
                </div>
                <div>
                  <Label>Salary *</Label>
                  <Input required value={editForm.salary || ""} onChange={(e) => handleEditChange("salary", e.target.value)} />
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <Input value={editForm.bloodGroup || ""} onChange={(e) => handleEditChange("bloodGroup", e.target.value.toUpperCase())} />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Address Line 1 *" field="address1" obj="address" />
                  <InputField label="Address Line 2" field="address2" obj="address" />
                  <InputField label="Country *" field="country" obj="address" />
                  <InputField label="City *" field="city" obj="address" />
                  <InputField label="Pincode *" field="pincode" obj="address" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Account Number *" field="bankAccount" obj="bankDetails" />
                  <InputField label="IFSC Code *" field="ifscCode" obj="bankDetails" />
                  <InputField label="Bank Name *" field="bankName" obj="bankDetails" />
                  <InputField label="Branch Name *" field="branchName" obj="bankDetails" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Name *" field="name" obj="emergencyContact" />
                  <InputField label="Contact Number *" field="contactNumber" obj="emergencyContact" />
                  <InputField label="Relation *" field="relation" obj="emergencyContact" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="ml-auto bg-gray-800 text-white" disabled={editSubmitting}>{editSubmitting ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
