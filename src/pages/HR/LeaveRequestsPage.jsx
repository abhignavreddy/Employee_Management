import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
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

    return (
      <Card className="hover:shadow-md transition-shadow">
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

            <Badge
              className={`px-2 py-1 ${
                request.status === "APPROVED"
                  ? "bg-green-100 text-green-800"
                  : request.status === "REJECTED"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {request.status}
            </Badge>
          </div>

          <p className="text-gray-700 mt-2">{request.reason}</p>

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

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length > 0 ? (
            pendingRequests.map(r => <LeaveRequestCard key={r.id} request={r} />)
          ) : (
            <p>No pending requests</p>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRequests.length > 0 ? (
            approvedRequests.map(r => <LeaveRequestCard key={r.id} request={r} />)
          ) : (
            <p>No approved requests</p>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.length > 0 ? (
            rejectedRequests.map(r => <LeaveRequestCard key={r.id} request={r} />)
          ) : (
            <p>No rejected requests</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaveRequestsPage;
