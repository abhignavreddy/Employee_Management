import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { apiGet, apiPut } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

/**
 * ProjectSpacesPage.jsx
 * Final integrated page:
 * - Backlog & Sprint tabs
 * - Sprint dropdown + Employee filter (always visible)
 * - Columns: ASSIGNED | IN_PROGRESS | TESTING | COMPLETED | CANCELLED | SPILLOVER
 * - Equal-height cards, modal, manager-only controls, spillover tile, employee filter rules
 *
 * Assumptions:
 * - apiGet/apiPut are available and return Response-like objects
 * - useAuth returns { user } with { role, empId, name } fields
 * - Backend fields: id, taskName, taskDescription, assignedTo, empId, sprintNumber,
 *   previousSprints, spillover, spilloverFromSprint, status, priority, type,
 *   createdAt, updatedAt, completedAt, cancelledAt, dueDate
 */

// Small helper to avoid StrictMode flicker for Droppable
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

export default function ProjectSpacesPage() {
  const { projectId } = useParams();
  const { user } = useAuth();

  // Data
  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [employees, setEmployees] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState("sprint"); // default to sprint view
  const [loading, setLoading] = useState(true);

  // Filters and sprint selection
  const [projectSprints, setProjectSprints] = useState([]); // [{id, name, startDate, endDate}]
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("ALL");

  // Modal
  const [selectedStory, setSelectedStory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isManager = user?.role === "Manager" || user?.role === "CEO";

  // -------------------
  // Loaders
  // -------------------
  const loadProject = async () => {
    try {
      const res = await apiGet(`/client-onboard/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      const json = await res.json();
      setProject(json);
    } catch (e) {
      console.error("loadProject:", e);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await apiGet("/employees");
      if (!res.ok) throw new Error("Failed to load employees");
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.content) ? data.content : [];
      setEmployees(list);
    } catch (e) {
      console.error("loadEmployees:", e);
    }
  };

  const normalizeStories = (raw) =>
    (raw || []).map((r) => ({
      ...r,
      id: r.id,
      taskName: r.taskName || r.name || "Untitled",
      taskDescription: r.taskDescription || r.description || "",
      assignedTo: r.assignedTo && r.assignedTo !== "unassigned" ? r.assignedTo : "",
      empId: r.empId || r.employeeBusinessId || null,
      sprintNumber: r.sprintNumber != null && r.sprintNumber !== "" ? Number(r.sprintNumber) : null,
      previousSprints: Array.isArray(r.previousSprints) ? r.previousSprints : r.previousSprints ? [r.previousSprints] : [],
      spillover: !!r.spillover,
      spilloverFromSprint: r.spilloverFromSprint || null,
      status: r.status || "BACKLOG",
      priority: r.priority || null,
      type: r.type || null,
      createdAt: r.createdAt || r.createdAtDateTime || null,
      updatedAt: r.updatedAt || r.updatedAtDateTime || null,
      completedAt: r.completedAt || r.completedAtDateTime || null,
      cancelledAt: r.cancelledAt || r.cancelledAtDateTime || null,
      dueDate: r.dueDate || null,
    }));

  const loadStories = async (projectName) => {
    if (!projectName) return;
    try {
      setLoading(true);
      const res = await apiGet(`/story-table/project/${projectName}`);
      if (!res.ok) throw new Error("Failed to load stories");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : Array.isArray(data.content) ? data.content : [];
      const norm = normalizeStories(raw);
      setStories(norm);
    } catch (e) {
      console.error("loadStories:", e);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------
  // Effects: initial data
  // -------------------
  useEffect(() => {
    if (!projectId) return;
    loadProject();
    loadEmployees();
  }, [projectId]);

  useEffect(() => {
    if (!project) return;

    // use backend project.sprints if provided, else generate 52 + spillover placeholder
    if (Array.isArray(project.sprints) && project.sprints.length) {
      setProjectSprints(
        project.sprints.map((s) => ({
          id: s.id,
          name: s.name || `Sprint ${s.id}`,
          startDate: s.startDate,
          endDate: s.endDate,
        }))
      );
      const defaultSprint = project.currentSprintNumber != null ? project.currentSprintNumber : project.sprints[0]?.id || null;
      setSelectedSprint(defaultSprint);
    } else {
      const sprints = Array.from({ length: 52 }).map((_, i) => ({ id: i + 1, name: `Sprint ${i + 1}` }));
      sprints.push({ id: 999, name: "Spillover" });
      setProjectSprints(sprints);
      const defaultSprint = project.currentSprintNumber != null ? project.currentSprintNumber : 1;
      setSelectedSprint(defaultSprint);
    }

    const name = project?.clientInfo?.projectName;
    if (name) loadStories(name);
  }, [project]);

  // -------------------
  // Helpers
  // -------------------
  const isOverdue = (s) => {
    if (!s?.dueDate) return false;
    if (s.status === "COMPLETED" || s.status === "CANCELLED") return false;
    try {
      return new Date() > new Date(s.dueDate);
    } catch {
      return false;
    }
  };

  const storyVisibleToViewer = (s) => {
    if (isManager) {
      if (selectedEmployee && selectedEmployee !== "ALL") {
        // selectedEmployee stored as empId or employee id
        return String(s.empId) === String(selectedEmployee) || (s.assignedTo || "").includes(selectedEmployee);
      }
      return true;
    } else {
      const matchById = user?.empId && s.empId && String(user.empId) === String(s.empId);
      const matchByName = user?.name && s.assignedTo && s.assignedTo === user.name;
      return matchById || matchByName;
    }
  };

  // -------------------
  // Derived lists / filters
  // -------------------
  const backlog = useMemo(() => stories.filter((s) => !s.sprintNumber || s.status === "BACKLOG"), [stories]);

  const sprintStories = useMemo(() => {
    if (selectedSprint == null) return [];
    return stories.filter((s) => {
      if (!storyVisibleToViewer(s)) return false;
      return s.sprintNumber === selectedSprint && ["ASSIGNED", "IN_PROGRESS", "TESTING", "COMPLETED", "CANCELLED"].includes(s.status);
    });
  }, [stories, selectedSprint, selectedEmployee, user]);

  const spilloverFromSelectedSprint = useMemo(() => {
    if (selectedSprint == null) return [];
    return stories.filter((s) => {
      if (!storyVisibleToViewer(s)) return false;
      return s.spillover && s.spilloverFromSprint === selectedSprint;
    });
  }, [stories, selectedSprint, selectedEmployee, user]);

  const byStatus = useMemo(() => {
    const map = { ASSIGNED: [], IN_PROGRESS: [], TESTING: [], COMPLETED: [], CANCELLED: [] };
    (sprintStories || []).forEach((s) => {
      if (!map[s.status]) map[s.status] = [];
      map[s.status].push(s);
    });
    return map;
  }, [sprintStories]);

  // -------------------
  // Update helpers & DnD
  // -------------------
  const updateStory = async (id, payload) => {
    try {
      await apiPut(`/story-table/${id}`, payload);
      await loadStories(project?.clientInfo?.projectName);
    } catch (e) {
      console.error("updateStory:", e);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    try {
      const story = stories.find((x) => String(x.id) === String(draggableId));
      if (!story) return;

      // Prevent non-managers from moving items that are inside the spillover area (enforce option C)
      const movedFromSpillover =
        source.droppableId === "SPILLOVER_TILE" ||
        (story.spillover && story.spilloverFromSprint === selectedSprint);
      if (movedFromSpillover && !isManager) {
        // revert by reloading
        await loadStories(project?.clientInfo?.projectName);
        return;
      }

      const payload = {
        status: destination.droppableId,
        sprintNumber: story?.sprintNumber ?? null,
      };

      await updateStory(draggableId, payload);
    } catch (e) {
      console.error("onDragEnd:", e);
    }
  };

  // -------------------
  // Modal
  // -------------------
  const openModal = (story) => {
    setSelectedStory(story);
    setModalOpen(true);
  };
  const closeModal = () => {
    setSelectedStory(null);
    setModalOpen(false);
  };

  const saveStoryChanges = async (updates) => {
    if (!selectedStory) return;
    try {
      const payload = { ...updates };
      if (updates.sprintNumber != null && updates.sprintNumber !== selectedStory.sprintNumber) {
        const prev = Array.isArray(selectedStory.previousSprints) ? selectedStory.previousSprints.slice() : [];
        if (selectedStory.sprintNumber) prev.push(selectedStory.sprintNumber);
        payload.previousSprints = prev;
      }
      await updateStory(selectedStory.id, payload);
      await loadStories(project?.clientInfo?.projectName);
      const refreshed = stories.find((s) => s.id === selectedStory.id);
      setSelectedStory(refreshed || { ...selectedStory, ...updates });
    } catch (e) {
      console.error("saveStoryChanges:", e);
    }
  };

  // -------------------
  // UI constants
  // -------------------
  const columns = ["ASSIGNED", "IN_PROGRESS", "TESTING", "COMPLETED", "CANCELLED"];
  const columnStyles = {
    ASSIGNED: "bg-blue-50 border-blue-200",
    IN_PROGRESS: "bg-amber-50 border-amber-200",
    TESTING: "bg-indigo-50 border-indigo-200",
    COMPLETED: "bg-green-50 border-green-200",
    CANCELLED: "bg-gray-100 border-gray-200 opacity-90",
  };
  const headerColors = {
    ASSIGNED: "text-blue-700",
    IN_PROGRESS: "text-amber-700",
    TESTING: "text-indigo-700",
    COMPLETED: "text-green-700",
    CANCELLED: "text-gray-600",
  };

  // -------------------
  // Render
  // -------------------
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b pb-3">
        <h1 className="text-2xl font-bold text-gray-900">{project?.clientInfo?.projectName || "Project"}</h1>
        <p className="text-gray-500 text-sm">{project?.clientInfo?.businessName || ""}</p>
      </div>

      {/* Tabs + dropdowns (Sprint behaves like a tab, dropdowns always visible on right) */}
      <div className="flex items-center border-b mt-4 w-full">
        <div className="flex">
          <button
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              activeTab === "backlog" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("backlog")}
          >
            Backlog
          </button>

          <button
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ml-2 ${
              activeTab === "sprint" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("sprint")}
          >
            Sprint
          </button>
        </div>

        {/* Right side filters (always visible) */}
        <div className="flex items-center gap-4 ml-auto pr-4">
          {/* Sprint dropdown */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Sprint</label>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={selectedSprint ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : Number(e.target.value);
                setSelectedSprint(val);
                // If switching to sprint view, ensure activeTab is sprint
                setActiveTab("sprint");
              }}
            >
              {projectSprints.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee filter (manager only) */}
          {isManager && (
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Employee</label>
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="ALL">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.empId ?? emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <p className="text-sm text-gray-500 mt-4">Loading stories...</p>
      ) : activeTab === "backlog" ? (
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {backlog.length ? (
            backlog.map((s) => {
              const overdue = isOverdue(s);
              return (
                <div key={s.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{s.taskName}</h3>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-3">{s.taskDescription || "No description"}</p>
                    </div>
                    <div className="text-right space-y-1">
                      {s.spillover && s.spilloverFromSprint && <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">Spillover</span>}
                      {overdue && <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">Overdue</span>}
                      <div className="text-xs text-gray-400 mt-2">{s.priority || "—"}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Assign employee */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Assign Employee</label>
                      <select
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        value={s.assignedTo || ""}
                        onChange={async (e) => {
                          const emp = e.target.value;
                          try {
                            const newStatus = s.status === "BACKLOG" ? "ASSIGNED" : s.status;
                            await updateStory(s.id, { assignedTo: emp || null, status: newStatus });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <option value="">Select employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                            {emp.firstName} {emp.lastName} ({emp.empRole})
                          </option>
                        ))}
                      </select>
                      {s.assignedTo && <p className="text-xs text-green-600 mt-1">Assigned to {s.assignedTo}</p>}
                    </div>

                    {/* Sprint selector */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Sprint</label>
                      <select
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        value={s.sprintNumber ?? ""}
                        onChange={async (e) => {
                          const val = e.target.value;
                          try {
                            await updateStory(s.id, { sprintNumber: val === "" ? null : Number(val) });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <option value="">No sprint (Backlog)</option>
                        {projectSprints.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                          </option>
                        ))}
                        <option value="999">Spillover</option>
                      </select>
                      {s.sprintNumber && <p className="text-xs text-blue-600 mt-1">Planned for Sprint {s.sprintNumber}</p>}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">Created: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</div>
                    <button className="text-sm text-indigo-600 hover:underline" onClick={() => openModal(s)}>
                      View details
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 mt-4">No backlog stories found.</p>
          )}
        </div>
      ) : (
        // Sprint view
        <>
          {!selectedSprint ? (
            <p className="text-sm text-gray-500 mt-4">No sprint selected.</p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mt-6">
                {/* Status columns */}
                {columns.map((status) => (
                  <StrictModeDroppable droppableId={status} key={status}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col rounded-xl border p-3 shadow-sm transition ${columnStyles[status]}`}
                      >
                        <h3 className={`text-sm font-semibold mb-3 uppercase ${headerColors[status]}`}>{status.replace("_", " ")}</h3>

                        <div className="space-y-3 min-h-[300px]">
                          {byStatus[status].map((story, index) => {
                            const overdue = isOverdue(story);
                            return (
                              <Draggable key={String(story.id)} draggableId={String(story.id)} index={index}>
                                {(drag) => (
                                  <div
                                    ref={drag.innerRef}
                                    {...drag.draggableProps}
                                    {...drag.dragHandleProps}
                                    className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md min-h-40 max-h-40 overflow-hidden flex flex-col justify-between cursor-pointer"
                                    onClick={() => openModal(story)}
                                  >
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1" title={story.taskName}>
                                        {story.taskName}
                                      </h4>
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-3">{story.taskDescription || "No description"}</p>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          {story.spillover && <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-amber-100 text-amber-800">Spillover</span>}
                                          {overdue && <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-red-100 text-red-800">Overdue</span>}
                                        </div>
                                        <div className="mt-1">@{story.assignedTo || "Unassigned"}</div>
                                      </div>

                                      <div className="text-right">
                                        <div className="text-[11px]">{story.priority || "—"}</div>
                                        <div className="text-[11px] text-gray-500 mt-1">{story.dueDate ? new Date(story.dueDate).toLocaleDateString() : "No due"}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </StrictModeDroppable>
                ))}

                {/* Spillover tile (last column) */}
                <div className="flex flex-col rounded-xl border p-3 shadow-sm bg-zinc-50">
                  <h3 className="text-sm font-semibold mb-3 text-amber-700">Spillover</h3>

                  <div className="space-y-3 min-h-[300px]">
                    {spilloverFromSelectedSprint.length ? (
                      spilloverFromSelectedSprint.map((spStory, idx) => {
                        const overdue = isOverdue(spStory);
                        // Manager can drag; non-manager sees static cards
                        if (isManager) {
                          return (
                            <Draggable key={String(spStory.id)} draggableId={String(spStory.id)} index={idx}>
                              {(drag) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md min-h-[160px] max-h-40 overflow-hidden flex flex-col justify-between cursor-pointer"
                                  onClick={() => openModal(spStory)}
                                >
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{spStory.taskName}</h4>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-3">{spStory.taskDescription || "No description"}</p>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        {spStory.spillover && <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-amber-100 text-amber-800">Spillover</span>}
                                        {overdue && <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-red-100 text-red-800">Overdue</span>}
                                      </div>
                                      <div className="mt-1">@{spStory.assignedTo || "Unassigned"}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[11px]">{spStory.priority || "—"}</div>
                                      <div className="text-[11px] text-gray-500 mt-1">{spStory.dueDate ? new Date(spStory.dueDate).toLocaleDateString() : "No due"}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        } else {
                          return (
                            <div
                              key={spStory.id}
                              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm min-h-[160px] max-h-[160px] overflow-hidden flex flex-col justify-between cursor-pointer"
                              onClick={() => openModal(spStory)}
                            >
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{spStory.taskName}</h4>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-3">{spStory.taskDescription || "No description"}</p>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {spStory.spillover && <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-amber-100 text-amber-800">Spillover</span>}
                                    {overdue && <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-red-100 text-red-800">Overdue</span>}
                                  </div>
                                  <div className="mt-1">@{spStory.assignedTo || "Unassigned"}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[11px]">{spStory.priority || "—"}</div>
                                  <div className="text-[11px] text-gray-500 mt-1">{spStory.dueDate ? new Date(spStory.dueDate).toLocaleDateString() : "No due"}</div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })
                    ) : (
                      <div className="text-sm text-gray-500">No spillover stories from sprint {selectedSprint}</div>
                    )}
                  </div>
                </div>
              </div>
            </DragDropContext>
          )}
        </>
      )}

      {/* Modal (centered) */}
      {modalOpen && selectedStory && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedStory.taskName}</h2>
                <div className="text-xs text-gray-500 mt-1">ID: {selectedStory.id}</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedStory.spillover && <span className="inline-block px-2 py-1 text-sm rounded bg-amber-100 text-amber-800">Spillover (from sprint {selectedStory.spilloverFromSprint})</span>}
                {isOverdue(selectedStory) && <span className="inline-block px-2 py-1 text-sm rounded bg-red-100 text-red-800">Overdue</span>}
                <button className="text-sm text-gray-600 px-3 py-1 rounded hover:bg-gray-100" onClick={() => navigator.clipboard?.writeText(String(selectedStory.id))}>Copy ID</button>
                <button className="text-sm text-gray-600 px-3 py-1 rounded hover:bg-gray-100" onClick={() => closeModal()}>Close</button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{selectedStory.taskDescription || "No description"}</div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Sprint Timeline</h3>
                  <div className="text-sm text-gray-700">
                    <div>Current sprint: {selectedStory.sprintNumber || "Backlog"}</div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Previous sprints</div>
                      {selectedStory.previousSprints && selectedStory.previousSprints.length ? (
                        <ul className="list-disc list-inside text-sm text-gray-800">
                          {selectedStory.previousSprints.map((ps, i) => <li key={i}>Sprint {ps}</li>)}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-500">No previous sprints</div>
                      )}
                    </div>
                    {selectedStory.spillover && selectedStory.spilloverFromSprint && (
                      <div className="mt-2 text-sm text-amber-700">Spillover from Sprint {selectedStory.spilloverFromSprint}</div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity & Audit</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Created: {selectedStory.createdAt ? new Date(selectedStory.createdAt).toLocaleString() : "—"}</div>
                    <div>Updated: {selectedStory.updatedAt ? new Date(selectedStory.updatedAt).toLocaleString() : "—"}</div>
                    <div>Completed: {selectedStory.completedAt ? new Date(selectedStory.completedAt).toLocaleString() : "—"}</div>
                    <div>Cancelled: {selectedStory.cancelledAt ? new Date(selectedStory.cancelledAt).toLocaleString() : "—"}</div>
                    <div>Due date: {selectedStory.dueDate ? new Date(selectedStory.dueDate).toLocaleString() : "—"}</div>
                  </div>
                </section>
              </div>

              <div className="space-y-4 border-l pl-4">
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <div className="mt-1">
                    {isManager ? (
                      <select className="w-full border border-gray-300 rounded-md p-2 text-sm" value={selectedStory.status} onChange={(e) => setSelectedStory((s) => ({ ...s, status: e.target.value }))}>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="TESTING">TESTING</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    ) : (
                      <div className="text-sm text-gray-700">{selectedStory.status}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Assignee</label>
                  <div className="mt-1">
                    {isManager ? (
                      <select className="w-full border border-gray-300 rounded-md p-2 text-sm" value={selectedStory.assignedTo || ""} onChange={(e) => setSelectedStory((s) => ({ ...s, assignedTo: e.target.value }))}>
                        <option value="">Unassigned</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>{emp.firstName} {emp.lastName} ({emp.empRole})</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-700">{selectedStory.assignedTo || "Unassigned"}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Sprint</label>
                  <div className="mt-1">
                    {isManager ? (
                      <select className="w-full border border-gray-300 rounded-md p-2 text-sm" value={selectedStory.sprintNumber ?? ""} onChange={(e) => setSelectedStory((s) => ({ ...s, sprintNumber: e.target.value === "" ? null : Number(e.target.value) }))}>
                        <option value="">Backlog</option>
                        {projectSprints.map((sp) => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                        <option value="999">Spillover</option>
                      </select>
                    ) : (
                      <div className="text-sm text-gray-700">{selectedStory.sprintNumber || "Backlog"}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Due Date</label>
                  <div className="mt-1">
                    {isManager ? (
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        value={selectedStory.dueDate ? selectedStory.dueDate.slice(0, 10) : ""}
                        onChange={(e) => {
                          const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                          setSelectedStory((s) => ({ ...s, dueDate: val }));
                        }}
                      />
                    ) : (
                      <div className="text-sm text-gray-700">{selectedStory.dueDate ? new Date(selectedStory.dueDate).toLocaleDateString() : "—"}</div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  {isManager ? (
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded bg-zinc-900 text-white px-3 py-2"
                        onClick={async () => {
                          const updates = {
                            status: selectedStory.status,
                            assignedTo: selectedStory.assignedTo || null,
                            sprintNumber: selectedStory.sprintNumber ?? null,
                            dueDate: selectedStory.dueDate || null,
                            previousSprints: selectedStory.previousSprints || [],
                            spillover: selectedStory.spillover || false,
                            spilloverFromSprint: selectedStory.spilloverFromSprint || null,
                          };
                          await saveStoryChanges(updates);
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="rounded border border-zinc-200 px-3 py-2"
                        onClick={async () => {
                          await loadStories(project?.clientInfo?.projectName);
                          const original = stories.find((s) => s.id === selectedStory.id);
                          setSelectedStory(original || selectedStory);
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button className="rounded border border-zinc-200 px-3 py-2" onClick={closeModal}>
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
