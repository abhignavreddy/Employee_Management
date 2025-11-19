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

const TaskHistoryApi = {
  create: async (payload) => {
    const res = await apiPost('/task-history', payload);
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },
};

export default function AssignTaskPage() {
  const { user } = useAuth(); // expect user fields like name, employeeId or empId; adapt below if different
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignedTo: '',     // empId
    priority: 'Medium', // client-only
    dueDate: '',
    department: '',     // client-only
  });
  const [submitting, setSubmitting] = useState(false);

  const [employees, setEmployees] = useState([]); // EmployeeResponse[]
  const [loadingEmps, setLoadingEmps] = useState(false);

  const [projects, setProjects] = useState([]); // ProjectResponse[]
  const [loadingProjects, setLoadingProjects] = useState(false);

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



  // Derive departments from employees if you need a filter; backend has no department field.
  // Use empRole as a proxy department to retain your UI.
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

      const payload = {
        taskName: formData.title,
        taskDescription: formData.description,
        type: "Story",
        description: formData.description,
        assignedTo: formData.assignedTo || "unassigned",
        project: projectName,
        dueDate: formData.dueDate,
        createdBy: user?.employeeId,
        department: formData.department,
        priority: formData.priority,
        status: "BACKLOG",
      };

      // ✅ Axios returns response with .data property
      const response = await apiPost("/story-table", payload);
      const created = response.data;

      if (created?.id) setPriorityLocal(created.id, formData.priority);

      toast({
        title: "Story Created Successfully",
        description: `Story "${formData.title}" has been assigned to ${empName || formData.assignedTo}.`,
      });

      setFormData({
        title: "",
        description: "",
        project: "",
        assignedTo: "",
        priority: "Medium",
        dueDate: "",
        department: "",
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
        <p className="text-gray-600 mt-1">Create and assign new tasks to employees</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
            New Task Assignment
          </CardTitle>
          <CardDescription>
            Fill in the details below to assign a new task to an employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed task description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
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
                          key={`${project._id || project.projectId}-${index}`} // ✅ Unique key
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
                <Label htmlFor="department">Department *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleChange('department', value)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
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
                    assignedTo: '',
                    priority: 'Medium',
                    dueDate: '',
                    department: '',
                  })
                }
              >
                Reset
              </Button>
              <Button type="submit" className="text-white" disabled={submitting || loadingEmps}>
                {submitting ? 'Assigning...' : 'Assign Task'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
