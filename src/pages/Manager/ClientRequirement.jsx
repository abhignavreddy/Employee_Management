import { useForm, FormProvider, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, useEffect } from "react";
import TaskTemplatePicker from "../../components/TaskTemplatePicker";
import { apiGet, apiPost, apiFetch } from "../../lib/api";


// ------------------ Validation Schema ------------------
const RequirementIntakeSchema = z.object({
  clientInfo: z.object({
    businessName: z.string().min(2),
    stakeholders: z.array(z.string().min(2)).optional(),
    projectname: z.string().min(2),
    budget: z.number().nonnegative().optional(),
    timelineWeeks: z.number().int().positive().optional(),
    clientAddress: z.string().optional(),
    businessPhoneNo: z.string().optional(),
    contactEmail: z.string().email().optional(), // ✅ ADDED
  }),
  functional: z.object({
    pagesCsv: z.string().optional(),
  }),
  technical: z.object({
    dbChoice: z.string().optional(),
    hosting: z.enum(["cloud", "onprem", "hybrid"]).optional(),
    frontend: z.string().optional(),
    backend: z.string().optional(),
    frameworks: z.string().optional(),
    deployModel: z.enum(["cloud", "onprem", "hybrid"]).optional(),
    releaseStrategy: z.enum(["continuous", "scheduled"]).optional(),
    supportSla: z.string().optional(),
  }),
  uiux: z.object({
    brandColors: z.string().optional(), // ✅ CHANGED from array to string
    hasWireframes: z.boolean().default(false),
    responsive: z.boolean().default(true),
  }),
  description: z.string().optional(), // ✅ ADDED
  note: z.string().optional(), // ✅ ADDED
  contactInfo: z.object({ // ✅ ADDED entire section
    contactName: z.string().optional(),
    contactNumber: z.string().optional(),
    contactEmail: z.string().email().optional(),
    address: z.string().optional(),
  }).optional(),
});


// ------------------ Component ------------------
export default function ClientIntakePage() {
  const methods = useForm({
    resolver: zodResolver(RequirementIntakeSchema),
    defaultValues: {
      clientInfo: { 
        stakeholders: [],
        clientAddress: "",
        businessPhoneNo: "",
        contactEmail: "", // ✅ ADDED
      },
      functional: { pagesCsv: "" },
      technical: {
        deployModel: "cloud",
        releaseStrategy: "continuous",
      },
      uiux: { 
        brandColors: "", // ✅ CHANGED from [] to ""
        hasWireframes: false, 
        responsive: true 
      },
      description: "", // ✅ ADDED
      note: "", // ✅ ADDED
      contactInfo: { // ✅ ADDED
        contactName: "",
        contactNumber: "",
        contactEmail: "",
        address: "",
      },
    },
  });


  const { handleSubmit, register, control, formState } = methods;
  const { isSubmitting, errors } = formState;


  const [files, setFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const selectedType = useWatch({ control, name: "functional.pagesCsv" });


  // ---------- Scroll Helpers ----------
  const scrollYRef = useRef(0);
  const saveScroll = () => {
    if (typeof window !== "undefined") scrollYRef.current = window.scrollY;
  };
  const restoreScroll = () => {
    if (typeof window !== "undefined")
      requestAnimationFrame(() => window.scrollTo({ top: scrollYRef.current }));
  };


  const preventDefault = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files || [])]);
  };
  const onPick = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
  };


  const Section = ({ title, children }) => (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold tracking-tight text-zinc-900">{title}</h3>
      <div className="grid gap-4">{children}</div>
    </section>
  );


  const inputBase =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
  const labelBase = "text-sm font-medium text-zinc-700";
  const gridTwo = "grid grid-cols-1 gap-4 md:grid-cols-2";


  // ---------- Template Picker ----------
  const handleSelectTemplate = (id) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };


  // ---------- Load Fields Based on Selected Type ----------
  useEffect(() => {
    if (!selectedType) {
      setTemplates([]);
      return;
    }


    const loadFields = async () => {
      try {
        const res = await apiGet("/field-table");
        if (!res.ok) throw new Error("Failed to load fields");
        const data = await res.json();

        const filtered = data.filter((f) => f.type === selectedType);

        setTemplates(
          filtered.map((f) => ({
            id: f.id,
            title: f.taskName,
            description: f.taskDescription,
            defaultRole: f.deptName || "General",
            defaultEstimateHours: 2,
          }))
        );
      } catch (err) {
        console.error("❌ Failed to load fields:", err);
        setTemplates([]);
      }
    };

    loadFields();
  }, [selectedType]);


  // ---------- Submit (multipart: data + files) ----------
 const onSubmit = async (data) => {
  try {
    const payload = {
      projectId: `PROJ-${Date.now()}`,
      clientInfo: {
        businessName: data.clientInfo.businessName,
        projectName: data.clientInfo.projectname,
        clientAddress: data.clientInfo.clientAddress || "",
        businessPhoneNo: data.clientInfo.businessPhoneNo || "",
      },
      projectType: {
        websiteDev:
          data.functional.pagesCsv === "Website Development" ? "true" : "false",
        ecommerceApp:
          data.functional.pagesCsv === "E-commerce Development" ? "true" : "false",
        mobileApp:
          data.functional.pagesCsv === "Mobile App Development" ? "true" : "false",
        seoServices:
          data.functional.pagesCsv === "SEO Services" ? "true" : "false",
        contentManagement:
          data.functional.pagesCsv === "Content Creation" ? "true" : "false",
        digitalMarketing:
          data.functional.pagesCsv === "Digital Marketing" ? "true" : "false",
      },
      technical: {
        preferredStack: [],
        dbChoice: data.technical?.dbChoice || "",
        hosting: data.technical?.hosting || "",
        frontend: data.technical?.frontend || "",
        backend: data.technical?.backend || "",
        frameworks: data.technical?.frameworks || "",
        deployModel: data.technical?.deployModel || "",
        releaseStrategy: data.technical?.releaseStrategy || "",
        supportSla: data.technical?.supportSla || "",
      },
      uiux: {
        brandColors: data?.uiux?.brandColors || "",
        hasWireframes: !!data?.uiux?.hasWireframes,
        responsive: !!data?.uiux?.responsive,
      },
      fileUploads: files.map((f) => ({
        fileName: f.name,
        fileType: f.type || "unknown",
        fileUrl: "",
        fileSize: f.size || 0,
      })),
      description: data.description || "",
      note: data.note || "",
      contactInfo: {
        contactName: data.contactInfo?.contactName || "",
        contactNumber: data.contactInfo?.contactNumber || "",
        contactEmail: data.contactInfo?.contactEmail || data.clientInfo?.contactEmail || "",
        address: data.contactInfo?.address || "",
      },
    };

    console.log("📦 Sending payload to backend (multipart):", payload);

    // ✅ Create FormData
    const formData = new FormData();
    
    // ✅ Append JSON data as Blob
    formData.append(
      "data",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );

    // ✅ Append files
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    // ✅ Use apiFetch with FormData (it will now handle Content-Type correctly)
    const res = await apiFetch(`/client-onboard`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(text || "Failed to save client onboarding");
    }

    const saved = await res.json();
    console.log("✅ Saved successfully:", saved);
    alert(
      `✅ Client Onboard Created Successfully for ${saved.clientInfo?.businessName || saved.projectId}`
    );

    // Clear files
    setFiles([]);

    // Create stories for selected templates
    if (selectedTemplateIds.length > 0) {
      console.log("🧩 Creating stories for selected fields...");
      for (const fieldId of selectedTemplateIds) {
        try {
          const fieldRes = await apiGet(`/field-table/${fieldId}`);
          let field = null;
          if (fieldRes.ok) field = await fieldRes.json();

          const storyPayload = {
            taskName: field?.taskName || "Feature from Field",
            taskDescription: field?.taskDescription || "",
            type: field?.type || "Feature",
            description: "",
            assignedTo: "unassigned",
            project: saved.clientInfo?.projectName || saved.projectId || "",
            department: field?.deptName || "",
            priority: field?.priority || "MEDIUM",
            status: "BACKLOG",
          };

          const storyRes = await apiPost(`/story-table`, storyPayload);

          if (!storyRes.ok) {
            console.error(`❌ Failed to create story for field ${fieldId}`);
          } else {
            console.log(`✅ Story created for field ${fieldId}`);
          }
        } catch (err) {
          console.error("❌ Error creating story:", err);
        }
      }
    }
  } catch (e) {
    console.error("❌ Save failed:", e);
    alert("❌ Failed to save client onboarding record. Please try again.");
  }
};


  // ---------- UI ----------
  return (
    <FormProvider {...methods}>
      <div className="min-h-screen w-full bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Client Intake
            </h1>
            <p className="mt-1 text-zinc-600">
              All categories on one page, saved in a single submission.
            </p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6">
            <div className="grid gap-6">
              <Section title="Client Info">
                <div className={gridTwo}>
                  <div>
                    <label className={labelBase}>Business name</label>
                    <input
                      className={inputBase}
                      placeholder="Acme Corp"
                      {...register("clientInfo.businessName")}
                      onFocus={saveScroll}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Project name</label>
                    <input
                      className={inputBase}
                      placeholder="Project Name"
                      {...register("clientInfo.projectname")}
                      onFocus={saveScroll}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Client Address</label>
                    <input
                      className={inputBase}
                      placeholder="123 Business Street, City"
                      {...register("clientInfo.clientAddress")}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Business Phone Number</label>
                    <input
                      type="tel"
                      className={inputBase}
                      placeholder="9876543210"
                      {...register("clientInfo.businessPhoneNo")}
                    />
                  </div>

                  {/* ✅ ADDED: Contact Email in clientInfo */}
                  <div>
                    <label className={labelBase}>Contact Email</label>
                    <input
                      type="email"
                      className={inputBase}
                      placeholder="contact@company.com"
                      {...register("clientInfo.contactEmail")}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Project / Product Type">
                <div>
                  <label className={labelBase}>Type</label>
                  <select
                    className={inputBase}
                    {...register("functional.pagesCsv")}
                    onFocus={saveScroll}
                  >
                    <option value="" disabled hidden>
                      Select type
                    </option>
                    <option value="Website Development">Website Development</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                    <option value="E-commerce Development">E-commerce Development</option>
                    <option value="SEO Services">SEO Services</option>
                    <option value="Content Creation">Content Creation</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                  </select>
                </div>

                {selectedType && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-zinc-700 mb-2">
                      Suggested Features (click + to add)
                    </h4>
                    {templates.length > 0 ? (
                      <TaskTemplatePicker
                        templates={templates}
                        selected={selectedTemplateIds}
                        onSelect={handleSelectTemplate}
                      />
                    ) : (
                      <p className="text-sm text-gray-500">
                        No templates found for this type.
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Technical + Deployment">
                <div className={gridTwo}>
                  <div>
                    <label className={labelBase}>DB choice</label>
                    <input
                      className={inputBase}
                      placeholder="PostgreSQL"
                      {...register("technical.dbChoice")}
                      onFocus={saveScroll}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Frontend</label>
                    <select className={inputBase} {...register("technical.frontend")}>
                      <option value="" disabled hidden>
                        Select
                      </option>
                      <option value="Required">Required</option>
                      <option value="Not Required">Not Required</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Backend</label>
                    <select className={inputBase} {...register("technical.backend")}>
                      <option value="JAVA">JAVA</option>
                      <option value="PYTHON">PYTHON</option>
                      <option value=".NET">.NET</option>
                      <option value="NODE.js">NODE.js</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Frameworks</label>
                    <select className={inputBase} {...register("technical.frameworks")}>
                      <option value="cloud">cloud</option>
                      <option value="onprem">onprem</option>
                      <option value="hybrid">hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Hosting</label>
                    <select className={inputBase} {...register("technical.hosting")}>
                      <option value="cloud">cloud</option>
                      <option value="onprem">onprem</option>
                      <option value="hybrid">hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <h4 className="font-semibold text-zinc-900 mb-2">Deployment</h4>
                  <div className={gridTwo}>
                    <div>
                      <label className={labelBase}>Model</label>
                      <select className={inputBase} {...register("technical.deployModel")}>
                        <option value="cloud">cloud</option>
                        <option value="onprem">onprem</option>
                        <option value="hybrid">hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelBase}>Release strategy</label>
                      <select className={inputBase} {...register("technical.releaseStrategy")}>
                        <option value="continuous">continuous</option>
                        <option value="scheduled">scheduled</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={labelBase}>Support SLA</label>
                    <input
                      className={inputBase}
                      placeholder="Business hours"
                      {...register("technical.supportSla")}
                    />
                  </div>
                </div>
              </Section>

              <Section title="UI / UX">
                <div className={gridTwo}>
                  <div>
                    <label className={labelBase}>Brand colors</label>
                    <input
                      className={inputBase}
                      placeholder="#000000, #FFFFFF"
                      {...register("uiux.brandColors")} 
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Wireframes available</label>
                    <select
                      className={inputBase}
                      {...register("uiux.hasWireframes", {
                        setValueAs: (v) => v === "true",
                      })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelBase}>Responsive</label>
                  <select
                    className={inputBase}
                    {...register("uiux.responsive", {
                      setValueAs: (v) => v === "true",
                    })}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </Section>

              {/* ✅ ADDED: Description & Notes Section */}
              <Section title="Project Description & Notes">
                <div>
                  <label className={labelBase}>Description</label>
                  <textarea
                    className={`${inputBase} h-24 resize-none`}
                    placeholder="Describe the project goals and requirements..."
                    {...register("description")}
                  />
                </div>
                <div>
                  <label className={labelBase}>Notes</label>
                  <textarea
                    className={`${inputBase} h-20 resize-none`}
                    placeholder="Any additional notes or remarks..."
                    {...register("note")}
                  />
                </div>
              </Section>

              {/* ✅ ADDED: Contact Info Section */}
              <Section title="Primary Contact Info">
                <div className={gridTwo}>
                  <div>
                    <label className={labelBase}>Contact Name</label>
                    <input
                      className={inputBase}
                      placeholder="John Doe"
                      {...register("contactInfo.contactName")}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Contact Number</label>
                    <input
                      type="tel"
                      className={inputBase}
                      placeholder="9876543210"
                      {...register("contactInfo.contactNumber")}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Contact Email</label>
                    <input
                      type="email"
                      className={inputBase}
                      placeholder="contact@company.com"
                      {...register("contactInfo.contactEmail")}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Contact Address</label>
                    <input
                      className={inputBase}
                      placeholder="Company HQ, City, Country"
                      {...register("contactInfo.address")}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Attachments">
                <div
                  onDragOver={preventDefault}
                  onDragEnter={preventDefault}
                  onDrop={onDrop}
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center"
                >
                  <p className="text-sm text-zinc-700">
                    Drag & drop files here, or click to browse
                  </p>
                  <input type="file" multiple onChange={onPick} className="mt-3 block w-full text-sm" />
                  {files.length > 0 && (
                    <ul className="mt-3 w-full text-left text-xs text-zinc-600 list-disc pl-4">
                      {files.map((f, i) => (
                        <li key={i}>
                          {f.name} ({f.type || "unknown"})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-zinc-500">All file types accepted.</p>
              </Section>

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-zinc-600">
                  {Object.keys(errors ?? {}).length > 0 ? "Fix validation errors" : " "}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Save all
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </FormProvider>
  );
}
