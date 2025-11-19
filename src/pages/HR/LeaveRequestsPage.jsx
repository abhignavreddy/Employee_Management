import React, { useState, useEffect } from "react";
import { Check, X, Edit } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import apiClient from "../../lib/apiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";

const LeaveRequestsPage = () => {
  const [requests, setRequests] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role?.toUpperCase() || "";

  useEffect(() => {
    async function fetchLeaveRequests() {
      try {
        const res = await apiClient.get("/leave-approvel/view", {
          params: { role }
        });

        console.log("Fetched Leaves:", res.data);

        setRequests(
          res.data.map(r => ({
            ...r,
            empRole: r.emp_role?.toUpperCase() || "",
            status: r.status?.toUpperCase() || "",
            id: r._id || r.id,
            empId: r.empId || r.emp_id || r.employeeId || null,
          }))
        );
      } catch (err) {
        console.error(err);
      }
    }
    fetchLeaveRequests();
  }, [role]);

  const filterRequestsByRole = () => {
  if (role === "CEO" || role === "HR" || role === "MANAGER") {
    return requests;
  }
  return [];
};



  const visibleRequests = filterRequestsByRole();

  const pendingRequests = visibleRequests.filter(r => r.status === "PENDING");
  const approvedRequests = visibleRequests.filter(r => r.status === "APPROVED");
  const rejectedRequests = visibleRequests.filter(r => r.status === "REJECTED");

  const canApprove = (req) => {
  if (!req.empId || req.empId === user.empId) return false;

  // Only CEO and HR can approve
  if (role === "CEO" || role === "HR") {
    return true;
  }

  // Managers cannot approve even employee leaves
  return false;
};


  const handleApprove = async (id) => {
    if (!id) return toast.error("Invalid request ID");
    try {
      await apiClient.patch(`/leave-approvel/${id}/status`, {
        status: "APPROVED",
      });

      setRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, status: "APPROVED" } : r))
      );

      toast.success("Leave approved!");
    } catch (err) {
      console.error(err);
      toast.error("Approval failed");
    }
  };

  const handleReject = async (id) => {
    if (!id) return toast.error("Invalid request ID");
    try {
      await apiClient.patch(`/leave-approvel/${id}/status`, {
        status: "REJECTED",
      });

      setRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, status: "REJECTED" } : r))
      );

      toast.success("Leave rejected!");
    } catch (err) {
      console.error(err);
      toast.error("Rejection failed");
    }
  };

  const LeaveRequestCard = ({ request }) => {
    const showActions = canApprove(request) && request.status === "PENDING";
    const [isEditing, setIsEditing] = useState(false);
    const [editStatus, setEditStatus] = useState(request.status || "PENDING");
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveStatus = async () => {
      if (!request.id) return toast.error("Invalid request id");
      setIsSaving(true);
      try {
        await apiClient.patch(`/leave-approvel/${request.id}/status`, { status: editStatus });
        setRequests(prev => prev.map(r => (r.id === request.id ? { ...r, status: editStatus } : r)));
        toast.success("Status updated");
        setIsEditing(false);
      } catch (err) {
        console.error(err);
        toast.error("Update failed");
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

              {/* Pencil Edit button - does not remove approve/reject buttons */}
              {canApprove(request) && (
                <button
                  aria-label="Edit status"
                  onClick={() => { setIsEditing(prev => !prev); setEditStatus(request.status); }}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-700 ml-2"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-gray-700 mt-2">{request.reason}</p>

          {isEditing && (
            <div className="flex items-center gap-2 mt-3">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <Button
                onClick={handleSaveStatus}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </Button>

              <Button
                onClick={() => { setIsEditing(false); setEditStatus(request.status); }}
                className="bg-gray-100"
              >
                Cancel
              </Button>
            </div>
          )}

          {showActions && (
            <div className="flex gap-3 mt-4 border-t pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleApprove(request.id)}
              >
                <Check className="w-4 h-4 mr-2" /> Approve
              </Button>

              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleReject(request.id)}
              >
                <X className="w-4 h-4 mr-2" /> Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Leave Requests</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map(r => (
                <LeaveRequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p>No pending requests</p>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedRequests.map(r => (
                <LeaveRequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p>No approved requests</p>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedRequests.map(r => (
                <LeaveRequestCard key={r.id} request={r} />
              ))}
            </div>
          ) : (
            <p>No rejected requests</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaveRequestsPage;
