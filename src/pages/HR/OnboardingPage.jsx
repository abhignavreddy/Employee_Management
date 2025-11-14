import React, { useEffect, useState } from "react";
import {
  UserPlus,
  CheckCircle,
  Pencil,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
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

  delete: (id, deletedBy = "HR") =>
    api
      .delete(`/employees/${id}?deletedBy=${encodeURIComponent(deletedBy)}`)
      .then((r) => r.data),
};

// ========== Helpers ==========
const parseNum = (v) =>
  v === "" || v === null || v === undefined ? undefined : Number(v);
const optionalEmpty = (v) => (v === "" ? undefined : v);
const generateEmpId = (firstName, lastName) => {
  if (!firstName) return "";
  const f = firstName.trim().toUpperCase().slice(0, 4);
  const l = lastName?.trim()?.toUpperCase()?.charAt(0) || "";
  const num = Math.floor(100 + Math.random() * 900);
  return `${f}${l}${num}`;
};
const emptyCreate = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phoneNumber: "",
  empRole: "",
  empId: "",
  bloodGroup: "",
  salary: "",
  address: { address1: "", address2: "", country: "", city: "", pincode: "" },
  bankDetails: {
    bankAccount: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
  },
  emergencyContact: { name: "", contactNumber: "", relation: "" },
};

export default function OnboardingPage() {
  const [employees, setEmployees] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [size] = useState(10);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [offbConfirmOpen, setOffbConfirmOpen] = useState(false);

  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [offbTarget, setOffbTarget] = useState(null);
  const [offbInfo, setOffbInfo] = useState({ lastDay: "", reason: "" });

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [offbSubmitting, setOffbSubmitting] = useState(false);
  const [empIdQuery, setEmpIdQuery] = useState("");

  const [onboardedThisMonth, setOnboardedThisMonth] = useState(0);

  // Generate Employee ID automatically
  useEffect(() => {
    if (createForm.firstName || createForm.lastName) {
      const empId = generateEmpId(createForm.firstName, createForm.lastName);
      setCreateForm((p) => ({ ...p, empId }));
    }
  }, [createForm.firstName, createForm.lastName]);

  // Load Employees
  const loadList = async (p = page) => {
    setListLoading(true);
    try {
      const data = await EmployeeApi.list(p, size);
      const list = Array.isArray(data) ? data : data?.content || [];
      setEmployees(list);
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

  // ========= CREATE EMPLOYEE =========
  const submitCreate = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const ifscOk = /^[A-Z]{4}[A-Z0-9]{7}$/.test(
        createForm.bankDetails.ifscCode || ""
      );
      if (!ifscOk) {
        toast({
          title: "Invalid IFSC",
          description:
            "Use 4 letters followed by 7 alphanumeric characters.",
        });
        setCreateSubmitting(false);
        return;
      }

      const payload = {
        title: createForm.title,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        email: createForm.email,
        password: createForm.password,
        phoneNumber: parseNum(createForm.phoneNumber),
        empRole: createForm.empRole,
        empId: createForm.empId,
        bloodGroup: createForm.bloodGroup,
        salary: parseNum(createForm.salary),
        address: createForm.address,
        bankDetails: createForm.bankDetails,
        emergencyContact: createForm.emergencyContact,
      };

      await EmployeeApi.create(payload, "HR");
      toast({
        title: "Employee created",
        description: `${payload.empId} added successfully.`,
      });
      setCreateForm(emptyCreate);
      setCreateOpen(false);
      await loadList(0);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create employee.";
      toast({ title: "Error", description: msg });
    } finally {
      setCreateSubmitting(false);
    }
  };

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
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Update failed.";
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
      await EmployeeApi.delete(offbTarget.id, "HR");
      toast({
        title: "Employee Offboarded",
        description: `${offbTarget.empId} removed.`,
      });
      setOffbConfirmOpen(false);
      setOffbTarget(null);
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

  // ========= UI =========
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Onboarding & Offboarding
          </h1>
          <p className="text-gray-600 mt-1">
            Manage new hires and employee exits
          </p>
        </div>
        
        {/* Create Employee */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center text-white bg-blue-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Employee
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-white rounded-lg p-6">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Enter all required details for the new employee.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={submitCreate} className="space-y-6">
              <div>
                <Label>Title *</Label>
                <select
                  required
                  value={createForm.title || ""}
                  onChange={(e) =>
                    setCreateForm((s) => ({ ...s, title: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Title</option>
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    required
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, firstName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    required
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, lastName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, password: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Role *</Label>
                  <select
                    required
                    value={createForm.empRole}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, empRole: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Role</option>
                    <option value="HR">HR</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="CEO">CEO</option>
                  </select>
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    required
                    value={createForm.phoneNumber}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, phoneNumber: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Salary *</Label>
                  <Input
                    required
                    value={createForm.salary}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, salary: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <Input
                    value={createForm.bloodGroup}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        bloodGroup: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Employee ID</Label>
                  <Input readOnly value={createForm.empId} />
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h3 className="font-semibold text-gray-800 mt-6 mb-2">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Address Line 1 *</Label>
                    <Input
                      required
                      value={createForm.address.address1}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          address: { ...s.address, address1: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Address Line 2</Label>
                    <Input
                      value={createForm.address.address2}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          address: { ...s.address, address2: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Country *</Label>
                    <Input
                      required
                      value={createForm.address.country}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          address: { ...s.address, country: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input
                      required
                      value={createForm.address.city}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          address: { ...s.address, city: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Pincode *</Label>
                    <Input
                      required
                      value={createForm.address.pincode}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          address: { ...s.address, pincode: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div>
                <h3 className="font-semibold text-gray-800 mt-6 mb-2">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account Number *</Label>
                    <Input
                      required
                      value={createForm.bankDetails.bankAccount}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          bankDetails: { ...s.bankDetails, bankAccount: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>IFSC Code *</Label>
                    <Input
                      required
                      value={createForm.bankDetails.ifscCode}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          bankDetails: {
                            ...s.bankDetails,
                            ifscCode: e.target.value.toUpperCase(),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Bank Name *</Label>
                    <Input
                      required
                      value={createForm.bankDetails.bankName}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          bankDetails: { ...s.bankDetails, bankName: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Branch Name *</Label>
                    <Input
                      required
                      value={createForm.bankDetails.branchName}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          bankDetails: { ...s.bankDetails, branchName: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="font-semibold text-gray-800 mt-6 mb-2">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      required
                      value={createForm.emergencyContact.name}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          emergencyContact: {
                            ...s.emergencyContact,
                            name: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Contact Number *</Label>
                    <Input
                      required
                      value={createForm.emergencyContact.contactNumber}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          emergencyContact: {
                            ...s.emergencyContact,
                            contactNumber: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Relation *</Label>
                    <Input
                      required
                      value={createForm.emergencyContact.relation}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          emergencyContact: {
                            ...s.emergencyContact,
                            relation: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-black text-white"
                disabled={createSubmitting}
              >
                {createSubmitting ? "Creating..." : "Start Onboarding"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold text-blue-600">
                {employees.length}
              </p>
            </div>
            <UserPlus className="w-6 h-6 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Onboarded This Month</p>
              <p className="text-2xl font-bold text-green-600">
                {onboardedThisMonth}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <CardTitle>Employees</CardTitle>
            <CardDescription>Manage employee data</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search by Emp ID"
              value={empIdQuery}
              onChange={(e) => setEmpIdQuery(e.target.value)}
              className="w-48"
            />
            <Button
              variant="outline"
              onClick={async () => {
                if (!empIdQuery.trim()) return loadList(0);
                try {
                  const res = await EmployeeApi.getByEmpId(empIdQuery.trim());
                  setEmployees([res]);
                } catch {
                  toast({ title: "Not found", description: "Employee not found." });
                }
              }}
            >
              Find
            </Button>
            <Button variant="outline" onClick={() => loadList(0)}>
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
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 pr-3">
                      {[e.firstName, e.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setOffbTarget(e);
                            setOffbConfirmOpen(true);
                          }}
                        >
                          Offboard
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto border-white rounded-lg p-6">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Modify employee details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName || ""}
                  onChange={(e) => handleEditChange("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName || ""}
                  onChange={(e) => handleEditChange("lastName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editForm.email || ""}
                  onChange={(e) => handleEditChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phoneNumber || ""}
                  onChange={(e) => handleEditChange("phoneNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  value={editForm.empRole || ""}
                  onChange={(e) => handleEditChange("empRole", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select</option>
                  <option value="HR">HR</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                  <option value="CEO">CEO</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offboard Confirmation */}
      <Dialog open={offbConfirmOpen} onOpenChange={setOffbConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Offboarding</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this employee?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              {offbTarget?.firstName} {offbTarget?.lastName} (
              {offbTarget?.empId})
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOffbConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitOffboard}
                disabled={offbSubmitting}
              >
                {offbSubmitting ? "Removing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
