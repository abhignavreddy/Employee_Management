import React, { useState, useEffect } from "react";
import { FileText, Check, X, Calendar } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import apiClient from "../../lib/apiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";

const LeaveRequestsPage = () => {
  const [requests, setRequests] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role?.toUpperCase();

  // ----------------------------------------------------
  // Fetch Leave Requests
  // ----------------------------------------------------
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
          empRole: r.emp_role?.toUpperCase(),
          id: r._id || r.id
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }
  fetchLeaveRequests();
}, [role]);

  // ----------------------------------------------------
  // Role Filtering FIXED
  // ----------------------------------------------------
  const filterRequestsByRole = () => {
    const cleanRole = (r) => r.emp_role?.toUpperCase(); // DB returns "Employee"

    if (role === "CEO") return requests;

    if (role === "HR") {
      return requests.filter(r =>
        ["EMPLOYEE", "MANAGER"].includes(cleanRole(r))
      );
    }

    if (role === "MANAGER") {
      return requests.filter(r =>
        ["EMPLOYEE", "HR"].includes(cleanRole(r))
      );
    }

    return [];
  };

  const visibleRequests = filterRequestsByRole();


  // ----------------------------------------------------
  // Status Filtering
  // ----------------------------------------------------
  const pendingRequests = visibleRequests.filter(r => r.status?.toUpperCase() === "PENDING");
  const approvedRequests = visibleRequests.filter(r => r.status?.toUpperCase() === "APPROVED");
  const rejectedRequests = visibleRequests.filter(r => r.status?.toUpperCase() === "REJECTED");


  // ----------------------------------------------------
  // Approval Permissions
  // ----------------------------------------------------
  const canApprove = (req) => {
    if (req.empId === user.empId) return false;  // Cannot approve own leave
    if (role === "CEO") return true;            // CEO approves all
    if (role === "HR") return req.emp_role?.toUpperCase() === "EMPLOYEE";
    if (role === "MANAGER") return req.emp_role?.toUpperCase() === "EMPLOYEE";
    return false;
  };


  // ----------------------------------------------------
  // Approve / Reject Actions
  // ----------------------------------------------------
  const handleApprove = async (id) => {
    try {
      await apiClient.patch(`/leave-approvel/${id}/status`, { status: "APPROVED" });

      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r)
      );

      toast.success("Leave approved!");
    } catch (error) {
      toast.error("Approval failed");
    }
  };

  const handleReject = async (id) => {
    try {
      await apiClient.patch(`/leave-approvel/${id}/status`, { status: "REJECTED" });

      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "REJECTED" } : r)
      );

      toast.success("Leave rejected");
    } catch (error) {
      toast.error("Rejection failed");
    }
  };


  // ----------------------------------------------------
  // Leave Card
  // ----------------------------------------------------
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
              className={`px-2 py-1 
                ${request.status === "APPROVED"
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


  // ----------------------------------------------------
  // PAGE UI
  // ----------------------------------------------------
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
          {pendingRequests.map(r => <LeaveRequestCard key={r.id} request={r} />)}
          {pendingRequests.length === 0 && <p>No pending requests</p>}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRequests.map(r => <LeaveRequestCard key={r.id} request={r} />)}
          {approvedRequests.length === 0 && <p>No approved requests</p>}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.map(r => <LeaveRequestCard key={r.id} request={r} />)}
          {rejectedRequests.length === 0 && <p>No rejected requests</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaveRequestsPage;
