import React, { useEffect, useState } from "react";
import AddTemplateModal from "../../components/AddTemplateModal";
import { apiGet, apiDelete } from "../../lib/api";
import { useNavigate } from "react-router-dom";

export default function ProjectFieldsPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [editField, setEditField] = useState(null);
  const navigate = useNavigate();

  // Temporary auth simulation
  const userRole = "Manager"; // or "CEO", "Employee"
  const isManager = ["Manager", "CEO"].includes(userRole);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        const res = await apiGet("/field-table");
        if (!res.ok) throw new Error("Failed to load fields");
        const data = await res.json();
        setFields(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load field table data", e);
        setFields([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  // Group by project type
  const grouped = fields.reduce((acc, f) => {
    const key = f.type || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  // Modal controls
  const openAddModal = (type) => {
    setSelectedType(type);
    setEditField(null);
    setShowModal(true);
  };

  const openEditModal = (field) => {
    setSelectedType(field.type);
    setEditField(field);
    setShowModal(true);
  };

  const handleSave = (savedField) => {
    setFields((prev) => {
      const exists = prev.find((f) => f.id === savedField.id);
      if (exists) {
        return prev.map((f) => (f.id === savedField.id ? savedField : f));
      } else {
        return [...prev, savedField];
      }
    });
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this field?")) return;
    try {
      const res = await apiDelete(`/field-table/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      setFields((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      alert("Failed to delete field");
    }
  };

  if (!isManager) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Access Restricted</h2>
        <p className="text-zinc-600">
          You do not have permission to view or modify project fields.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center text-zinc-600">Loading fields...</div>;
  }

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Project Fields</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              ← Go Back
            </button>
            <button
              onClick={() => {
                setSelectedType(null);
                setEditField(null);
                setShowModal(true);
              }}
              className="px-3 py-1 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
            >
              + Add Field
            </button>
          </div>
      </header>


      <div className="space-y-8">
        {Object.keys(grouped).map((type) => (
          <div
            key={type}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
             {/* ✅ Add Section Header Here */}
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              {type}
            </h2>

            {grouped[type].length === 0 ? (
              <p className="text-sm text-zinc-500">No fields yet for this type.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[type].map((f) => (
                  <div
                    key={f.id}
                    className="border rounded-lg p-4 bg-zinc-50 hover:shadow-sm transition"
                  >
                    <h3 className="font-medium text-zinc-800 mb-1">{f.taskName}</h3>
                    <p className="text-sm text-zinc-600 mb-2 line-clamp-3">
                      {f.taskDescription || "No description"}
                    </p>
                    <div className="text-xs text-zinc-500 mb-3">
                      Dept: {f.deptName || "—"} • Priority: {f.priority || "—"}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Created:{" "}
                      {f.createdAt
                        ? new Date(f.createdAt).toLocaleDateString()
                        : "—"}
                    </div>

                    <div className="flex justify-end gap-2 text-xs mt-3">
                      <button
                        onClick={() => openEditModal(f)}
                        className="px-2 py-1 border rounded-md text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="px-2 py-1 border rounded-md text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <AddTemplateModal
          type={selectedType}
          field={editField}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
