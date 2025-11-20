import React, { useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";
import {
  ClipboardList,
  Search,
  Edit,
  X,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { toast } from "../../hooks/use-toast";
import { motion } from "framer-motion";

const api = apiClient;

export default function AllTasksPage() {
  const [stories, setStories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
  });

  const statuses = [
    "BACKLOG",
    "ASSIGNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ];

  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const types = ["Story", "Task", "Bug", "Epic", "Feature", "Spike", "Sub-task", "Issue"];
  
  const DEPARTMENTS = [
    'Development',
    'Designing',
    'Digital Marketing',
    'Quality Assurance',
    'DevOps',
    'Product Management',
    'Human Resources',
    'Sales',
    'Customer Support',
    'Finance',
    'Operations'
  ];

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
      case "CRITICAL":
        return "bg-red-100 text-red-700 border-red-300";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "LOW":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const badgeColors = {
    BACKLOG: "bg-gray-100 text-gray-700 border-gray-200",
    ASSIGNED: "bg-blue-100 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
    CANCELLED: "bg-gray-200 text-gray-700 border-gray-300",
  };

  const loadStories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/story-table");
      setStories(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast({
        title: "Error loading stories",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get("/employees?page=0&size=500");
      setEmployees(Array.isArray(res.data) ? res.data : res.data?.content || []);
    } catch (e) {
      console.error("Failed to load employees", e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get("/client-onboard");
      const data = res.data;
      setProjects(Array.isArray(data) ? data : data?.content || []);
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  };

  useEffect(() => {
    loadStories();
    loadEmployees();
    loadProjects();
  }, []);

  const handleEdit = (story) => {
    setEditingStory(story);
    // Populate form with EXISTING story values from story-table
    setEditForm({
      taskName: story.taskName || "",
      taskDescription: story.taskDescription || "",
      type: story.type || "Story",
      description: story.description || "",
      assignedTo: story.assignedTo || "", // Keep the name from story
      project: story.project || "",
      department: story.department || "", // Keep the department from story
      priority: story.priority || "MEDIUM",
      status: story.status || "BACKLOG",
      sprintNumber: story.sprintNumber || 1,
      spillover: story.spillover || false,
      dueDate: story.dueDate ? new Date(story.dueDate).toISOString().split('T')[0] : "",
      acceptanceCriteria: story.acceptanceCriteria || "",
      empId: story.empId || "", // Store empId separately
    });
  };

  const handleUpdate = async () => {
    try {
      if (!editingStory) return;

      const updated = {
        ...editingStory,
        ...editForm,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      };

      await api.put(`/story-table/${editingStory.id}`, updated);
      
      toast({
        title: "Story Updated",
        description: "Story updated successfully.",
      });

      setStories((prev) =>
        prev.map((s) => (s.id === editingStory.id ? updated : s))
      );
      
      setEditingStory(null);
      setEditForm({});
    } catch (err) {
      toast({
        title: "Update failed",
        description:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message,
        variant: "destructive",
      });
    }
  };

  const filteredStories = stories.filter((s) => {
    const matchSearch =
      !filters.search ||
      s.taskName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      s.assignedTo?.toLowerCase().includes(filters.search.toLowerCase()) ||
      s.project?.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus =
      filters.status === "all" ||
      s.status?.toUpperCase() === filters.status.toUpperCase();
    const matchPriority =
      filters.priority === "all" ||
      s.priority?.toUpperCase() === filters.priority.toUpperCase();
    return matchSearch && matchStatus && matchPriority;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-blue-600" /> All Stories
        </h1>
        <p className="text-gray-600 mt-1">
          View, filter, and edit all stories across projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search stories, employees or projects..."
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            className="pl-9 w-72"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
        >
          <SelectTrigger className="w-40 bg-white border border-gray-200 shadow-sm">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-lg border border-gray-200 rounded-md">
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
        >
          <SelectTrigger className="w-40 bg-white border border-gray-200 shadow-sm">
            <SelectValue placeholder="Filter by Priority" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-lg border border-gray-200 rounded-md">
            <SelectItem value="all">All Priority</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() =>
            setFilters({ search: "", status: "all", priority: "all" })
          }
        >
          Reset Filters
        </Button>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <p className="text-gray-500">Loading stories...</p>
      ) : filteredStories.length === 0 ? (
        <p className="text-gray-500 mt-4">No stories found.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredStories.map((story) => (
            <motion.div
              key={story.id}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Card className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition h-full flex flex-col">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {story.taskName}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {story.taskDescription || "No description"}
                      </p>
                    </div>
                    <Edit
                      className="w-4 h-4 text-gray-400 hover:text-blue-600 cursor-pointer shrink-0 ml-2"
                      onClick={() => handleEdit(story)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <Badge
                      variant="outline"
                      className={`${badgeColors[story.status] || ""}`}
                    >
                      {story.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(story.priority)}
                    >
                      {story.priority || "N/A"}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                      {story.type || "Story"}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <strong>Assigned To:</strong>{" "}
                      {story.assignedTo || "Unassigned"}
                    </p>
                    <p>
                      <strong>Project:</strong> {story.project || "—"}
                    </p>
                    <p>
                      <strong>Department:</strong> {story.department || "—"}
                    </p>
                    <p>
                      <strong>Sprint:</strong> {story.sprintNumber || "—"}
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <strong>Due:</strong> {formatDate(story.dueDate)}
                    </p>
                    {story.acceptanceCriteria && (
                      <p className="flex items-start gap-1 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                        <CheckSquare className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{story.acceptanceCriteria}</span>
                      </p>
                    )}
                    {story.spillover && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 mt-1">
                        Spillover
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingStory} onOpenChange={(open) => !open && setEditingStory(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Story
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="taskName">Task Name *</Label>
              <Input
                id="taskName"
                value={editForm.taskName}
                onChange={(e) => setEditForm({ ...editForm, taskName: e.target.value })}
                placeholder="Enter task name"
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Task Description *</Label>
              <Textarea
                id="taskDescription"
                value={editForm.taskDescription}
                onChange={(e) => setEditForm({ ...editForm, taskDescription: e.target.value })}
                rows={4}
                placeholder="Provide detailed description"
              />
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-2">
              <Label htmlFor="acceptanceCriteria" className="flex items-center gap-1">
                <CheckSquare className="w-4 h-4 text-green-600" />
                Acceptance Criteria
              </Label>
              <Textarea
                id="acceptanceCriteria"
                value={editForm.acceptanceCriteria}
                onChange={(e) => setEditForm({ ...editForm, acceptanceCriteria: e.target.value })}
                rows={3}
                placeholder="Define acceptance criteria for this story"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200 shadow-lg"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned To - Shows current assignee name, can select new employee */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To *</Label>
                <Select
                  value={editForm.assignedTo}
                  onValueChange={(v) => {
                    // Find employee by name to get empId
                    const emp = employees.find(e => `${e.firstName} ${e.lastName}` === v);
                    setEditForm({ 
                      ...editForm, 
                      assignedTo: v,
                      empId: emp?.empId || v
                    });
                  }}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200 shadow-lg"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {employees.map((emp) => {
                      const empName = `${emp.firstName} ${emp.lastName}`;
                      return (
                        <SelectItem key={emp.id} value={empName}>
                          {empName} — {emp.empId}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Project - Shows current project */}
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={editForm.project}
                  onValueChange={(v) => setEditForm({ ...editForm, project: v })}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200 shadow-lg"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {projects.map((project, index) => {
                      const projectName = project.clientInfo?.projectName || project.projectId || `Project ${index + 1}`;
                      return (
                        <SelectItem
                          key={`${project._id || project.projectId}-${index}`}
                          value={projectName}
                        >
                          {projectName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Department - Shows current department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={editForm.department}
                  onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200 shadow-lg"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {/* Show current department first if it's not in the list */}
                    {editForm.department && !DEPARTMENTS.includes(editForm.department) && (
                      <SelectItem value={editForm.department}>
                        {editForm.department}
                      </SelectItem>
                    )}
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sprint Number */}
              <div className="space-y-2">
                <Label htmlFor="sprintNumber">Sprint Number</Label>
                <Input
                  id="sprintNumber"
                  type="number"
                  value={editForm.sprintNumber}
                  onChange={(e) => setEditForm({ ...editForm, sprintNumber: parseInt(e.target.value) || 1 })}
                  min="1"
                  placeholder="Enter sprint number"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Spillover */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="spillover-modal"
                checked={editForm.spillover}
                onChange={(e) => setEditForm({ ...editForm, spillover: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="spillover-modal" className="cursor-pointer">
                Mark as Spillover
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingStory(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
