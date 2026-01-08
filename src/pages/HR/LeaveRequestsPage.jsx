// src/pages/LeaveRequestsPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Check, X, Edit, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import apiClient from "../../lib/apiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";

const LeaveRequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [rejectingId, setRejectingId] = useState(null);

  // ✅ COMPREHENSIVE USER DATA EXTRACTION
  const getUserData = () => {
    if (!user) {
      console.error('❌ No user object found');
      return { empId: '', empName: '', empRole: 'EMPLOYEE' };
    }

    console.log('=== LeaveRequestsPage User Data ===');
    console.log('Full user object:', user);

    const empId = user.empId 
      || user.employeeId 
      || user.identifier 
      || user.emp_id 
      || user.id 
      || user._id 
      || '';

    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const empName = firstName && lastName 
      ? `${firstName} ${lastName}`.trim()
      : user.name || user.fullName || user.full_name || '';

    const empRole = (user.role 
      || user.empRole 
      || user.userType 
      || 'EMPLOYEE').toUpperCase();

    console.log('✅ Extracted:', { empId, empName, empRole });
    console.log('====================================');

    return { empId, empName, empRole };
  };

  const { empId: currentEmpId, empRole: currentRole } = getUserData();

  useEffect(() => {
    if (currentRole && currentEmpId) {
      fetchLeaveRequests();
    } else {
      console.warn('⚠️ Missing user data - cannot fetch leaves');
    }
  }, [currentRole, currentEmpId]);

  async function fetchLeaveRequests() {
    console.log('🔄 ========== FETCHING LEAVE REQUESTS ==========');
    console.log('📤 Request params:', { role: currentRole, empId: currentEmpId });
    
    try {
      const res = await apiClient.get("/leave-approvel/view", {
        params: { 
          role: currentRole,
          empId: currentEmpId 
        },
      });
      
      console.log("✅ Fetched leaves:", res.data?.length || 0);

      const normalizedRequests = (res.data || []).map((r) => ({
        ...r,
        empRole: (r.emp_role || r.empRole || '').toUpperCase(),
        status: (r.status || '').toUpperCase(),
        id: r._id || r.id,
        empId: r.empId || r.emp_id || r.employeeId || null,
        empName: r.empName || r.emp_name || "Unknown",
        fromDate: r.fromDate || r.from_date,
        toDate: r.toDate || r.to_date,
        statusUpdateDate: r.statusUpdateDate || r.status_update_date || null,
        rejectReason: r.rejectReason 
          || r.reject_reason 
          || r.rejectionReason 
          || r.reject_reason_text 
          || '',
      }));

      console.log("✅ Normalized requests:", normalizedRequests.length);
      console.log("===============================================");
      setRequests(normalizedRequests);
      
    } catch (err) {
      console.error("❌ ========== FETCH FAILED ==========");
      console.error("Error:", err);
      console.error("Status:", err.response?.status);
      console.error("Response:", err.response?.data);
      console.error("====================================");
      
      setRequests([]);
      
      if (err.response?.status === 400) {
        toast.error("Failed to load leave requests. Please log in again.");
      } else {
        toast.error("Failed to load leave requests");
      }
    }
  }

  const filterRequestsByRole = () => {
    if (["CEO", "HR", "MANAGER"].includes(currentRole)) {
      return requests;
    }
    return [];
  };

  const visibleRequests = filterRequestsByRole();
  const pendingRequests = visibleRequests.filter((r) => r.status === "PENDING");
  const approvedRequests = visibleRequests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = visibleRequests.filter((r) => r.status === "REJECTED");

  const canApprove = (req) => {
    // Cannot approve your own leave
    if (!req.empId || req.empId === currentEmpId) return false;
    
    // Only certain roles can approve
    if (["CEO", "HR", "MANAGER"].includes(currentRole)) {
      return true;
    }
    return false;
  };

  const handleApprove = async (id) => {
    if (!id) return toast.error("Invalid request ID");
    
    console.log("✅ ========== APPROVING LEAVE ==========");
    
    try {
      const request = requests.find((r) => r.id === id);
      console.log("Request:", request);
      
      const payload = { status: "APPROVED" };
      console.log("Payload:", payload);
      
      const res = await apiClient.patch(`/leave-approvel/${id}/status`, payload);
      console.log("✅ Response:", res.data);
      console.log("======================================");

      await fetchLeaveRequests();

      toast.success(
        `Leave approved for ${request?.empName || "employee"}! Attendance will reflect this change.`
      );
    } catch (err) {
      console.error("❌ ========== APPROVAL FAILED ==========");
      console.error("Error:", err);
      console.error("Status:", err.response?.status);
      console.error("Data:", err.response?.data);
      console.error("=======================================");
      
      const serverMsg = err.response?.data?.message 
        || err.response?.data?.error 
        || "Approval failed";
      toast.error(serverMsg);
    }
  };

  const openRejectPopup = (id) => {
    setRejectingId(id);
    setRejectReasonInput("");
    setShowRejectPopup(true);
  };

  const handleRejectWithReason = async (id, reason) => {
    if (!id) return toast.error("Invalid request ID");
    if (!reason.trim()) return toast.error("Rejection reason is required");
    
    console.log("❌ ========== REJECTING LEAVE ==========");
    
    try {
      const request = requests.find((r) => r.id === id);
      console.log("Request:", request);
      console.log("Reason:", reason);
      
      const res = await apiClient.patch(`/leave-approvel/${id}/status`, {
        status: "REJECTED",
        rejectReason: reason.trim(),
      });
      
      console.log("✅ Response:", res.data);
      console.log("=======================================");

      await fetchLeaveRequests();
      await purgeLeaveAttendanceRows(request, "REJECTED");

      toast.success(
        `Leave rejected for ${request?.empName || "employee"}! They can now check in/out normally.`
      );
      
      setShowRejectPopup(false);
      setRejectingId(null);
      setRejectReasonInput("");
      
    } catch (err) {
      console.error("❌ ========== REJECTION FAILED ==========");
      console.error("Error:", err);
      console.error("Status:", err.response?.status);
      console.error("Data:", err.response?.data);
      console.error("========================================");
      
      toast.error(err.response?.data?.message || "Rejection failed");
    }
  };

  const purgeLeaveAttendanceRows = async (leaveRequest, newStatus) => {
    try {
      if (!leaveRequest?.empId) return;
      if (newStatus !== "REJECTED") return;
      
      const empIdLocal = leaveRequest.empId;
      const from = new Date(leaveRequest.fromDate);
      const to = new Date(leaveRequest.toDate);
      
      if (isNaN(from) || isNaN(to)) return;
      
      const fromStr = from.toISOString().split("T")[0];
      const toStr = to.toISOString().split("T")[0];
      
      console.log("🧹 Purging attendance for rejected leave:", {
        empId: empIdLocal,
        fromStr,
        toStr,
      });
      
      const attRes = await apiClient.get(`/attendance/employee/${empIdLocal}`);
      const allRecords = attRes.data || [];
      
      const toDelete = allRecords.filter((rec) => {
        if (!rec.date) return false;
        const dateStr = new Date(rec.date).toISOString().split("T")[0];
        const inRange = dateStr >= fromStr && dateStr <= toStr;
        const noWorkLogged = !rec.checkIn && !rec.checkOut;
        return inRange && noWorkLogged;
      });
      
      if (!toDelete.length) {
        console.log("ℹ️ No placeholder records to delete");
        return;
      }
      
      await Promise.all(
        toDelete.map((rec) => {
          const idLocal = rec.id || rec._id;
          if (!idLocal) return Promise.resolve();
          console.log("🗑️ Deleting:", idLocal);
          return apiClient.delete(`/attendance/${idLocal}`);
        })
      );
      
      toast.success(
        `Removed ${toDelete.length} placeholder attendance record(s) after rejection.`
      );
    } catch (err) {
      console.error("❌ Failed to purge attendance rows", err);
      toast.error("Failed to remove attendance rows");
    }
  };

  const LeaveRequestCard = ({ request }) => {
    const showActions = canApprove(request) && request.status === "PENDING";
    const [isEditing, setIsEditing] = useState(false);
    const [editStatus, setEditStatus] = useState(request.status || "PENDING");
    const [isSaving, setIsSaving] = useState(false);

    // ✅ CHECK IF EDIT IS ALLOWED - ONLY 24-HOUR WINDOW
    const canEditRequest = () => {
      // PENDING requests can always be edited
      if (request.status === "PENDING") {
        return canApprove(request);
      }

      // For APPROVED/REJECTED, check ONLY 24-hour window from status update
      if (!request.statusUpdateDate) {
        return false;
      }

      const approvalTime = new Date(request.statusUpdateDate);
      const now = new Date();
      const hoursElapsed = (now - approvalTime) / (1000 * 60 * 60);
      const EDIT_WINDOW_HOURS = 24;

      if (hoursElapsed >= EDIT_WINDOW_HOURS) {
        return false;
      }

      return canApprove(request);
    };

    const isEditable = canEditRequest();

    const handleSaveStatus = async () => {
      if (!request.id) return toast.error("Invalid request id");

      // ✅ VALIDATE EDIT WINDOW
      if (!isEditable) {
        toast.error("Cannot edit - 24-hour window has expired!");
        setIsEditing(false);
        return;
      }

      setIsSaving(true);
      
      console.log("🔄 ========== UPDATING STATUS ==========");
      console.log("Request ID:", request.id);
      console.log("New status:", editStatus);
      
      try {
        const previousStatus = request.status;
        const res = await apiClient.patch(`/leave-approvel/${request.id}/status`, {
          status: editStatus,
        });
        
        console.log("✅ Response:", res.data);
        console.log("=======================================");

        await fetchLeaveRequests();

        if (editStatus === "APPROVED") {
          toast.success(
            `Leave approved for ${request.empName}! Attendance will reflect this change.`
          );
        } else if (editStatus === "REJECTED") {
          toast.success(
            `Leave rejected for ${request.empName}! They can now check in/out normally.`
          );
          if (previousStatus === "APPROVED") {
            await purgeLeaveAttendanceRows(request, editStatus);
          }
        } else {
          toast.success("Status updated to PENDING");
        }

        setIsEditing(false);
      } catch (err) {
        console.error("❌ ========== UPDATE FAILED ==========");
        console.error("Error:", err);
        console.error("Response:", err.response?.data);
        console.error("====================================");
        
        toast.error(err.response?.data?.message || "Update failed");
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between mb-2">
            <div>
              <h3 className="font-semibold">{request.empName}</h3>
              <p className="text-sm text-gray-600">{request.typeOfLeave}</p>
              <p className="text-sm text-gray-600">
                {new Date(request.fromDate).toLocaleDateString()} -{" "}
                {new Date(request.toDate).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Badge
                className={`px-2 py-0.5 text-xs rounded-md self-start z-0 ${
                  request.status === "APPROVED"
                    ? "bg-green-100 text-green-800"
                    : request.status === "REJECTED"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {request.status}
              </Badge>

              {/* ✅ SHOW EDIT ONLY IF WITHIN 24 HOURS */}
              {isEditable && (
                <button
                  aria-label="Edit status"
                  onClick={() => {
                    setIsEditing((prev) => !prev);
                    setEditStatus(request.status);
                  }}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-700 ml-2"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-gray-700 mt-2">{request.reason}</p>

          {/* Show rejection reason */}
          {request.status === "REJECTED" && request.rejectReason && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm">
                <span className="font-semibold text-red-600">Rejection reason:</span>
                <span className="ml-2 text-gray-800">{request.rejectReason}</span>
              </p>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center gap-2 mt-3">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                aria-label="Select leave status"
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <Button
                size="sm"
                onClick={handleSaveStatus}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditStatus(request.status);
                }}
                className="bg-gray-100"
              >
                Cancel
              </Button>
            </div>
          )}

          {showActions && (
            <div className="flex gap-3 mt-4 border-t pt-2">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleApprove(request.id)}
                aria-label={`Approve leave for ${request.empName}`}
              >
                <Check className="w-4 h-4 mr-2" /> Approve
              </Button>

              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => openRejectPopup(request.id)}
                aria-label={`Reject leave for ${request.empName}`}
              >
                <X className="w-4 h-4 mr-2" /> Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ✅ NO USER DATA - SHOW WARNING
  if (!currentEmpId || !currentRole) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Leave Requests</h1>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">User data incomplete</p>
            <p className="mt-1">Please refresh the page and log in again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Leave Requests</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((r) => (
                <LeaveRequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No pending requests</p>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedRequests.map((r) => (
                <LeaveRequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No approved requests</p>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedRequests.map((r) => (
                <LeaveRequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No rejected requests</p>
          )}
        </TabsContent>
      </Tabs>

      {/* ✅ REJECT POPUP MODAL - MOVED OUTSIDE CARDS */}
      {showRejectPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-3">Reject Leave Request</h3>
            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="Enter rejection reason (required)"
              className="w-full border rounded p-2 mb-4"
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowRejectPopup(false);
                  setRejectingId(null);
                  setRejectReasonInput("");
                }}
                className="bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  handleRejectWithReason(rejectingId, rejectReasonInput);
                }}
                disabled={!rejectReasonInput.trim()}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestsPage;
