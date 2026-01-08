import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Image, Paperclip, Edit2, Trash2 } from "lucide-react";
import axios from "axios";

// API Configuration
const API_BASE_URL = import.meta.env.API_BASE_URL;

// API Helper Functions
const api = {
  get: (endpoint) => axios.get(`${API_BASE_URL}${endpoint}`),
  post: (endpoint, data) => axios.post(`${API_BASE_URL}${endpoint}`, data),
  put: (endpoint, data) => axios.put(`${API_BASE_URL}${endpoint}`, data),
  delete: (endpoint) => axios.delete(`${API_BASE_URL}${endpoint}`),
};

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-end p-3 border-b">
          <button
            className="text-sm px-3 py-1 rounded-md border hover:bg-gray-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 pb-8">{children}</div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ open, onClose, onConfirm, projectName, deleting }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Delete Project
          </h3>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">"{projectName}"</span>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className={`flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${
              deleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className={`flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${
              deleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Modal Component
function EditModal({ open, onClose, project, onSave }) {
  const [editForm, setEditForm] = useState({
    projectName: '',
    businessName: '',
    description: '',
    status: '',
    owner: '',
    contactName: '',
    contactEmail: '',
    contactNumber: '',
    address: '',
  });

  useEffect(() => {
    if (project && open) {
      setEditForm({
        projectName: project.clientInfo?.projectName || '',
        businessName: project.clientInfo?.businessName || '',
        description: project.description || '',
        status: project.status || '',
        owner: project.owner || '',
        contactName: project.contactInfo?.contactName || '',
        contactEmail: project.contactInfo?.contactEmail || '',
        contactNumber: project.contactInfo?.contactNumber || '',
        address: project.contactInfo?.address || '',
      });
    }
  }, [project, open]);

  if (!open) return null;

  if (!project) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    onSave(project.id, editForm);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
          <button
            className="text-sm px-3 py-1 rounded-md border hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Project Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Project Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={editForm.projectName}
                  onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editForm.businessName}
                  onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Select Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner
                  </label>
                  <input
                    type="text"
                    value={editForm.owner}
                    onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-gray-800 text-sm">Contact Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={editForm.contactEmail}
                    onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={editForm.contactNumber}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helpers to parse and format dates robustly
 */
function parseDate(value) {
  if (!value) return null;

  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    return new Date(Number(value));
  }

  if (typeof value === "string") {
    const tzLessIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
    if (tzLessIso.test(value)) {
      return new Date(value + "Z");
    }
    return new Date(value);
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = parseDate(value);
  if (!d) return "—";

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(d);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get('/client-onboard');
      console.log("🔍 Fetched projects data:", response.data);

      const content = Array.isArray(response.data) ? response.data : response.data?.content || [];
      setProjects(content);
    } catch (err) {
      console.error("❌ Failed to load projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDetail = async (id) => {
    try {
      const response = await api.get(`/client-onboard/${id}`);
      setSelected(response.data);
      setDetailOpen(true);
    } catch (err) {
      console.error("Failed to load project details", err);
    }
  };

  const openEdit = async (e, id) => {
    e.stopPropagation();
    try {
      const response = await api.get(`/client-onboard/${id}`);
      setSelected(response.data);
      setEditOpen(true);
    } catch (err) {
      console.error("Failed to load project for edit", err);
    }
  };

  const openDeleteConfirm = (e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete || deleting) return;

    setDeleting(true);
    try {
      console.log("🗑️ Deleting project:", projectToDelete.id);
      
      await api.delete(`/client-onboard/${projectToDelete.id}`);
      
      console.log("✅ Project deleted successfully");
      alert(`Project "${projectToDelete.clientInfo?.projectName}" deleted successfully!`);
      
      // Close modal and clear state
      setDeleteOpen(false);
      setProjectToDelete(null);
      
      // Reload projects list
      await load();
    } catch (err) {
      console.error("❌ Failed to delete project:", err);
      alert(`Failed to delete project: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async (id, formData) => {
    try {
      console.log("💾 Saving project:", id, formData);
      
      // Construct the update payload
      const payload = {
        clientInfo: {
          projectName: formData.projectName,
          businessName: formData.businessName,
        },
        description: formData.description,
        status: formData.status,
        owner: formData.owner,
        contactInfo: {
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactNumber: formData.contactNumber,
          address: formData.address,
        }
      };

      await api.put(`/client-onboard/${id}`, payload);
      
      alert("Project updated successfully!");
      setEditOpen(false);
      await load(); // Reload projects
    } catch (err) {
      console.error("❌ Failed to save project:", err);
      alert(`Failed to save changes: ${err.response?.data?.message || err.message}`);
    }
  };

  const openDocuments = () => {
    navigate('/documents-management', { 
      state: { 
        defaultTab: 'client-documents',
      } 
    });
  };

  const openCreateIntake = () => {
    navigate("/client-intake");
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    
    return (
      project.clientInfo?.projectName?.toLowerCase().includes(searchLower) ||
      project.clientInfo?.businessName?.toLowerCase().includes(searchLower) ||
      project.projectId?.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower) ||
      project.owner?.toLowerCase().includes(searchLower) ||
      project.status?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="p-6 text-center text-zinc-600">Loading projects...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Browse and manage projects</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Documents Button */}
          <button
            onClick={openDocuments}
            className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>

          {/* Fields Button */}
          <button
            type="button"
            onClick={() => navigate("/projects/fields")}
            className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-md transition-colors"
          >
            Fields
          </button>

          {/* Create Project Button */}
          <button
            className="px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-md transition-colors"
            onClick={openCreateIntake}
          >
            Create Project
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search projects by name, business, status, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        {searchQuery && (
          <div className="text-sm text-gray-600">
            Found <span className="font-semibold">{filteredProjects.length}</span> 
            {filteredProjects.length === 1 ? ' project' : ' projects'}
          </div>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="relative rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:shadow cursor-pointer transition-shadow"
            onClick={() => openDetail(p.id)}
          >
            {/* Action Buttons - Top Right Corner */}
            <div className="absolute top-3 right-3 flex gap-1">
              <button
                onClick={(e) => openEdit(e, p.id)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Edit Project"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
              
              <button
                onClick={(e) => openDeleteConfirm(e, p)}
                className="p-2 rounded-md hover:bg-red-50 transition-colors"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>

            <div className="text-lg font-semibold pr-20">
              {p.clientInfo?.projectName || p.projectId || "Untitled Project"}
            </div>
            <div className="text-sm text-zinc-700 mt-1 line-clamp-2">
              {p.description || "No description available"}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 font-medium">Status:</span>
                <span className={`
                  inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold
                  ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border border-green-300' : ''}
                  ${p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : ''}
                  ${p.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 border border-blue-300' : ''}
                  ${p.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700 border border-gray-300' : ''}
                  ${!p.status ? 'bg-zinc-100 text-zinc-600 border border-zinc-300' : ''}
                `}>
                  {p.status || "Not Set"}
                </span>
              </div>
              
              {/* Owner */}
              <span className="text-xs text-zinc-600">
                Owner: <span className="font-medium text-zinc-800">{p.owner || "—"}</span>
              </span>
            </div>

            <div className="text-xs text-zinc-400 mt-2">
              Created: {p.createdAt ? formatDate(p.createdAt) : "—"}
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="text-sm text-zinc-500">
            {searchQuery 
              ? `No projects found matching "${searchQuery}"`
              : "No projects yet. Click Create Project to add one."}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}>
        {!selected ? (
          <div className="text-sm text-zinc-500">Loading...</div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selected.clientInfo?.projectName || selected.projectId || "Untitled Project"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Business: {selected.clientInfo?.businessName || "—"}
              </p>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {selected.description || "No description provided."}
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Contact Information</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Name:</strong> {selected.contactInfo?.contactName || "—"}
                </p>
                <p>
                  <strong>Email:</strong> {selected.contactInfo?.contactEmail || "—"}
                </p>
                <p>
                  <strong>Number:</strong> {selected.contactInfo?.contactNumber || "—"}
                </p>
                <p>
                  <strong>Address:</strong> {selected.contactInfo?.address || "—"}
                </p>
              </div>
            </div>

            {/* Technical Info */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Technical Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <p>
                  <strong>Frontend:</strong> {selected.technical?.frontend || "—"}
                </p>
                <p>
                  <strong>Backend:</strong> {selected.technical?.backend || "—"}
                </p>
                <p>
                  <strong>Database:</strong> {selected.technical?.dbChoice || "—"}
                </p>
                <p>
                  <strong>Hosting:</strong> {selected.technical?.hosting || "—"}
                </p>
                <p>
                  <strong>Frameworks:</strong> {selected.technical?.frameworks || "—"}
                </p>
                <p>
                  <strong>Deploy Model:</strong> {selected.technical?.deployModel || "—"}
                </p>
                <p>
                  <strong>Release Strategy:</strong> {selected.technical?.releaseStrategy || "—"}
                </p>
                <p>
                  <strong>Support SLA:</strong> {selected.technical?.supportSla || "—"}
                </p>
              </div>
            </div>

            {/* UI/UX */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">UI / UX</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Brand Colors:</strong> {selected.uiux?.brandColors || "—"}
                </p>
                <p>
                  <strong>Wireframes:</strong> {selected.uiux?.hasWireframes ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Responsive:</strong> {selected.uiux?.responsive ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* File Uploads Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Uploaded Files</h3>
              {selected.fileUploads && selected.fileUploads.length > 0 ? (
                <ul className="divide-y border rounded-md bg-gray-50">
                  {selected.fileUploads.map((f, idx) => {
                    const isPdf = f.fileType?.includes("pdf");
                    const isImage = f.fileType?.includes("image");
                    const icon = isPdf ? (
                      <FileText className="w-5 h-5 text-red-500" />
                    ) : isImage ? (
                      <Image className="w-5 h-5 text-green-500" />
                    ) : (
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    );

                    const baseUrl = import.meta.env.API_BASE_URL;
                    const resolvedUrl =
                      f.fileUrl && f.fileUrl.trim() !== "" ? f.fileUrl : `${baseUrl}/${f.fileName}`;

                    const kb =
                      typeof f.fileSize === "number" && !isNaN(f.fileSize)
                        ? (f.fileSize / 1024).toFixed(1)
                        : "—";

                    return (
                      <li
                        key={idx}
                        onClick={() => window.open(resolvedUrl, "_blank", "noopener")}
                        className="p-3 text-sm text-gray-700 flex items-center justify-between rounded-md transition hover:bg-blue-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {icon}
                          <div>
                            <p className="font-medium">{f.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {f.fileType || "Unknown type"} • {kb} KB
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">Open ↗</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No files uploaded.</p>
              )}
            </div>

            {/* Dates */}
            <div className="text-xs text-gray-500 border-t pt-2">
              <p>
                Created: {selected.createdAt ? formatDate(selected.createdAt) : "—"}
              </p>
              <p>
                Updated: {selected.updatedAt ? formatDate(selected.updatedAt) : "—"}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={selected}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setProjectToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        projectName={projectToDelete?.clientInfo?.projectName || projectToDelete?.projectId || "this project"}
        deleting={deleting}
      />
    </div>
  );
}
