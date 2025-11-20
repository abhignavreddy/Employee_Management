import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';
import { apiGet, apiPost } from '../../lib/api';

// Simple local priority store (client-only until backend supports it)
const PRIORITY_KEY = 'task_priorities_v1';
const setPriorityLocal = (taskId, value) => {
  try {
    const map = JSON.parse(localStorage.getItem(PRIORITY_KEY) || '{}');
    map[taskId] = value;
    localStorage.setItem(PRIORITY_KEY, JSON.stringify(map));
  } catch {}
};

// API helpers
const EmployeeApi = {
  list: async (page = 0, size = 200) => {
    const res = await apiGet(`/employees?page=${page}&size=${size}`);
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
  },
};

const ProjectsApi = {
  list: async () => {
    const res = await apiGet(`/client-onboard`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return Array.isArray(data) ? data : data?.content || [];
  },
};

export default function AssignTaskPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Story',
    project: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    department: '',
    sprintNumber: '',
    acceptanceCriteria: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [loadingEmps, setLoadingEmps] = useState(false);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // ✅ Completely disable page scrolling on mount
  useEffect(() => {
    // Apply overflow hidden to html and body
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalBodyHeight = document.body.style.height;
    
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';

    return () => {
      // Cleanup on unmount
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
    };
  }, []);

  // --- Load Employees ---
  const loadEmployees = async () => {
    setLoadingEmps(true);
    try {
      const data = await EmployeeApi.list(0, 500);
      setEmployees(Array.isArray(data) ? data : data?.content || []);
    } catch (e) {
      toast({ title: 'Failed to load employees', description: 'Check API or proxy settings.' });
    } finally {
      setLoadingEmps(false);
    }
  };

  // --- Load Projects ---
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await ProjectsApi.list();
      setProjects(Array.isArray(data) ? data : data?.content || []);
    } catch (e) {
      toast({
        title: 'Failed to load projects',
        description: 'Check API or proxy settings.',
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  // --- Load once on mount ---
  useEffect(() => {
    loadEmployees();
    loadProjects();
  }, []);

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

  // Story/Work Item Types
  const STORY_TYPES = [
    { value: 'Story', label: 'Story' },
    { value: 'Bug', label: 'Bug' },
    { value: 'Task', label: 'Task' },
    { value: 'Epic', label: 'Epic' },
    { value: 'Feature', label: 'Feature' },
    { value: 'Spike', label: 'Spike' },
    { value: 'Sub-task', label: 'Sub-task' },
    { value: 'Issue', label: 'Issue' },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.assignedTo || !formData.project) {
      toast({ 
        title: 'Validation', 
        description: 'Please select assignee and project.' 
      });
      return;
    }

    setSubmitting(true);
    try {
      const emp = (employees || []).find(
        (e) => String(e.empId) === String(formData.assignedTo)
      );
      const empName = [emp?.firstName, emp?.lastName].filter(Boolean).join(' ');

      const projectObj = projects.find(
        (p) => p.projectId === formData.project
      );
      const projectName = projectObj?.clientInfo?.projectName || formData.project;

      // Format dueDate to LocalDateTime format (ISO 8601)
      const formattedDueDate = formData.dueDate 
        ? new Date(formData.dueDate).toISOString() 
        : null;

      const payload = {
        taskName: formData.title,
        taskDescription: formData.description,
        type: formData.type,
        description: formData.description,
        assignedTo: formData.assignedTo || "unassigned",
        project: projectName,
        dueDate: formattedDueDate,
        createdBy: user?.employeeId,
        department: formData.department,
        priority: formData.priority,
        status: "BACKLOG",
        empId: formData.assignedTo,
        sprintNumber: formData.sprintNumber ? parseInt(formData.sprintNumber) : null,
        acceptanceCriteria: formData.acceptanceCriteria || null,
      };

      const response = await apiPost("/story-table", payload);
      const created = response.data;

      if (created?.id) setPriorityLocal(created.id, formData.priority);

      toast({
        title: `${formData.type} Created Successfully`,
        description: `${formData.type} "${formData.title}" has been assigned to ${empName || formData.assignedTo}.`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        type: "Story",
        project: "",
        assignedTo: "",
        priority: "Medium",
        dueDate: "",
        department: "",
        sprintNumber: "",
        acceptanceCriteria: "",
      });
    } catch (err) {
      console.error('Task creation error:', err);
      const msg = err?.response?.data?.message || 
                  err?.response?.data?.error || 
                  err?.message || 
                  "Failed to create story.";
      toast({ 
        title: "Error", 
        description: msg,
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Story</h1>
        <p className="text-gray-600 mt-1">Create and assign new work items to employees</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
            New Work Item Assignment
          </CardTitle>
          <CardDescription>
            Fill in the details below to assign a new work item to an employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter work item title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            {/* Type Dropdown - scrollable */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select work item type" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-white border border-gray-200 shadow-lg"
                  style={{ maxHeight: '240px', overflowY: 'auto' }}
                >
                  {STORY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
              <Textarea
                id="acceptanceCriteria"
                placeholder="Define the acceptance criteria (optional)"
                value={formData.acceptanceCriteria}
                onChange={(e) => handleChange('acceptanceCriteria', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assign To Dropdown - scrollable */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To *</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => handleChange('assignedTo', value)}
                  disabled={loadingEmps}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder={loadingEmps ? 'Loading...' : 'Select employee'} />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200 shadow-lg"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {(employees || []).map((emp) => (
                      <SelectItem key={emp.id} value={emp.empId}>
                        {[emp.firstName, emp.lastName].filter(Boolean).join(' ')} — {emp.empId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project}
                  onValueChange={(value) => handleChange('project', value)}
                  disabled={loadingProjects}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder={loadingProjects ? 'Loading...' : 'Select project'} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {(projects || []).map((project, index) => {
                      const projectName =
                        project.clientInfo?.projectName ||
                        project.projectId ||
                        `Project ${index + 1}`;

                      return (
                        <SelectItem
                          key={`${project._id || project.projectId}-${index}`}
                          value={project.projectId}
                        >
                          {projectName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sprintNumber">Sprint Number</Label>
                <Input
                  id="sprintNumber"
                  type="number"
                  min="1"
                  placeholder="Enter sprint number"
                  value={formData.sprintNumber}
                  onChange={(e) => handleChange('sprintNumber', e.target.value)}
                />
              </div>

              {/* Department Dropdown - scrollable */}
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleChange('department', value)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border border-gray-200 shadow-lg"
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setFormData({
                    title: '',
                    description: '',
                    type: 'Story',
                    project: '',
                    assignedTo: '',
                    priority: 'Medium',
                    dueDate: '',
                    department: '',
                    sprintNumber: '',
                    acceptanceCriteria: '',
                  })
                }
              >
                Reset
              </Button>
              <Button type="submit" className="text-white" disabled={submitting || loadingEmps}>
                {submitting ? 'Creating...' : `Create ${formData.type}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
