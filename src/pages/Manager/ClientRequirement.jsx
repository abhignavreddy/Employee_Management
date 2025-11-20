import { useForm, FormProvider, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TaskTemplatePicker from "../../components/TaskTemplatePicker";
import { apiGet, apiPost, apiFetch } from "../../lib/api";

// ------------------ Validation Schema with ALL validations ------------------
const RequirementIntakeSchema = z.object({
  clientInfo: z.object({
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must not exceed 100 characters"),
    stakeholders: z.array(z.string().min(2)).optional(),
    projectname: z
      .string()
      .min(2, "Project name must be at least 2 characters")
      .max(100, "Project name must not exceed 100 characters"),
    budget: z.number().nonnegative("Budget must be a positive number").optional(),
    timelineWeeks: z
      .number()
      .int("Timeline must be a whole number")
      .positive("Timeline must be greater than 0")
      .optional(),
    clientAddress: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .optional()
      .or(z.literal("")),
    businessPhoneNo: z
      .string()
      .regex(/^\d{10}$/, "Business phone number must be exactly 10 digits")
      .optional()
      .or(z.literal("")),
    contactEmail: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
  }),
  functional: z.object({
    pagesCsv: z.string().min(1, "Please select a project type"),
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
    brandColors: z.string().optional(),
    hasWireframes: z.boolean().default(false),
    responsive: z.boolean().default(true),
  }),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .or(z.literal("")),
  note: z
    .string()
    .max(200, "Notes must not exceed 200 characters")
    .optional()
    .or(z.literal("")),
  contactInfo: z
    .object({
      contactName: z
        .string()
        .min(2, "Contact name must be at least 2 characters")
        .optional()
        .or(z.literal("")),
      contactNumber: z
        .string()
        .regex(/^\d{10}$/, "Contact number must be exactly 10 digits")
        .optional()
        .or(z.literal("")),
      contactEmail: z
        .string()
        .email("Invalid email address")
        .optional()
        .or(z.literal("")),
      address: z
        .string()
        .min(5, "Address must be at least 5 characters")
        .optional()
        .or(z.literal("")),
    })
    .optional(),
});

// ------------------ Component ------------------
export default function ClientIntakePage() {
  const methods = useForm({
    resolver: zodResolver(RequirementIntakeSchema),
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      clientInfo: {
        stakeholders: [],
        clientAddress: "",
        businessPhoneNo: "",
        contactEmail: "",
      },
      functional: { pagesCsv: "" },
      technical: {
        deployModel: "cloud",
        releaseStrategy: "continuous",
      },
      uiux: {
        brandColors: "",
        hasWireframes: false,
        responsive: true,
      },
      description: "",
      note: "",
      contactInfo: {
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

  const navigate = useNavigate();

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
  const inputError = "border-red-500 focus:border-red-500 focus:ring-red-500/10";
  const labelBase = "text-sm font-medium text-zinc-700";
  const errorText = "text-xs text-red-600 mt-1";
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
            data.functional.pagesCsv === "E-commerce Development"
              ? "true"
              : "false",
          mobileApp:
            data.functional.pagesCsv === "Mobile App Development"
              ? "true"
              : "false",
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
          contactEmail:
            data.contactInfo?.contactEmail || data.clientInfo?.contactEmail || "",
          address: data.contactInfo?.address || "",
        },
      };

      console.log("📦 Sending payload to backend (multipart):", payload);

      const formData = new FormData();
      formData.append(
        "data",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );

      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

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
        `✅ Client Onboard Created Successfully for ${
          saved.clientInfo?.businessName || saved.projectId
        }`
      );

      setFiles([]);

      try {
        const projectName = saved?.clientInfo?.projectName;
        if (projectName) {
          console.log("⚡ Auto-generating sprints for:", projectName);
          const sprintRes = await apiPost(`/sprints/${projectName}/generate`);
          if (sprintRes.ok) console.log("🎉 Sprints generated");
          else console.error("⚠ Sprint generation failed", await sprintRes.text());
        }
      } catch (err) {
        console.error("❌ Sprint generation error:", err);
      }

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

      // After successful save (+ optional story creation), navigate back to projects.
      navigate("/projects");
    } catch (e) {
      console.error("❌ Save failed:", e);
      alert("❌ Failed to save client onboarding record. Please try again.");
    }
  };

  // ---------- UI with Error Messages ----------
  return (
    <FormProvider {...methods}>
      <div className="min-h-screen w-full bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <header className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Client Intake
              </h1>
              <p className="mt-1 text-zinc-600">
                All categories on one page, saved in a single submission.
              </p>
            </div>

            {/* Go Back button at top-right */}
            <div>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                ← Go Back
              </button>
            </div>
          </header>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-6"
          >
            <div className="grid gap-6">
              <Section title="Client Info">
                <div className={gridTwo}>
                  {/* Business Name */}
                  <div>
                    <label className={labelBase}>
                      Business name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`${inputBase} ${
                        errors.clientInfo?.businessName ? inputError : ""
                      }`}
                      placeholder="Acme Corp"
                      {...register("clientInfo.businessName")}
                      onFocus={saveScroll}
                    />
                    {errors.clientInfo?.businessName && (
                      <p className={errorText}>
                        {errors.clientInfo.businessName.message}
                      </p>
                    )}
                  </div>

                  {/* Project Name */}
                  <div>
                    <label className={labelBase}>
                      Project name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`${inputBase} ${
                        errors.clientInfo?.projectname ? inputError : ""
                      }`}
                      placeholder="Project Name"
                      {...register("clientInfo.projectname")}
                      onFocus={saveScroll}
                    />
                    {errors.clientInfo?.projectname && (
                      <p className={errorText}>
                        {errors.clientInfo.projectname.message}
                      </p>
                    )}
                  </div>

                  {/* Client Address */}
                  <div>
                    <label className={labelBase}>Client Address</label>
                    <input
                      className={`${inputBase} ${
                        errors.clientInfo?.clientAddress ? inputError : ""
                      }`}
                      placeholder="123 Business Street, City"
                      {...register("clientInfo.clientAddress")}
                    />
                    {errors.clientInfo?.clientAddress && (
                      <p className={errorText}>
                        {errors.clientInfo.clientAddress.message}
                      </p>
                    )}
                  </div>

                  {/* Business Phone Number */}
                  <div>
                    <label className={labelBase}>Business Phone Number</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${
                        errors.clientInfo?.businessPhoneNo ? inputError : ""
                      }`}
                      placeholder="9876543210"
                      maxLength={10}
                      {...register("clientInfo.businessPhoneNo")}
                      onInput={(e) => {
                        e.target.value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                      }}
                    />
                    {errors.clientInfo?.businessPhoneNo && (
                      <p className={errorText}>
                        {errors.clientInfo.businessPhoneNo.message}
                      </p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className={labelBase}>Contact Email</label>
                    <input
                      type="email"
                      className={`${inputBase} ${
                        errors.clientInfo?.contactEmail ? inputError : ""
                      }`}
                      placeholder="contact@company.com"
                      {...register("clientInfo.contactEmail")}
                    />
                    {errors.clientInfo?.contactEmail && (
                      <p className={errorText}>
                        {errors.clientInfo.contactEmail.message}
                      </p>
                    )}
                  </div>
                </div>
              </Section>

              <Section title="Project / Product Type">
                <div>
                  <label className={labelBase}>
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`${inputBase} ${
                      errors.functional?.pagesCsv ? inputError : ""
                    }`}
                    {...register("functional.pagesCsv")}
                    onFocus={saveScroll}
                  >
                    <option value="" disabled hidden>
                      Select type
                    </option>
                    <option value="Website Development">Website Development</option>
                    <option value="Web Application Development">Web Application Development</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                    <option value="E-commerce Development">E-commerce Development</option>
                    <option value="Social Media Application Development">Social Media Application Development</option>
                    <option value="Social Networking Application Development">Social Networking Application Development</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="SEO Services">SEO Services</option>
                    <option value="Content Creation">Content Creation</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Branding & Graphic Design">Branding & Graphic Design</option>
                    <option value="Custom Software Development">Custom Software Development</option>
                    <option value="Cloud Integration">Cloud Integration</option>
                    <option value="Maintenance & Support">Maintenance & Support</option>
                  </select>
                  {errors.functional?.pagesCsv && (
                    <p className={errorText}>{errors.functional.pagesCsv.message}</p>
                  )}
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
                    <select
                      className={inputBase}
                      {...register("technical.frontend")}
                    >
                      <option value="" disabled hidden>
                        Select
                      </option>
                      <option value="Required">Required</option>
                      <option value="Not Required">Not Required</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Backend</label>
                    <select
                      className={inputBase}
                      {...register("technical.backend")}
                    >
                      <option value="JAVA">JAVA</option>
                      <option value="PYTHON">PYTHON</option>
                      <option value=".NET">.NET</option>
                      <option value="NODE.js">NODE.js</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Frameworks</label>
                    <select
                      className={inputBase}
                      {...register("technical.frameworks")}
                    >
                      <option value="cloud">cloud</option>
                      <option value="onprem">onprem</option>
                      <option value="hybrid">hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Hosting</label>
                    <select
                      className={inputBase}
                      {...register("technical.hosting")}
                    >
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
                      <select
                        className={inputBase}
                        {...register("technical.deployModel")}
                      >
                        <option value="cloud">cloud</option>
                        <option value="onprem">onprem</option>
                        <option value="hybrid">hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelBase}>Release strategy</label>
                      <select
                        className={inputBase}
                        {...register("technical.releaseStrategy")}
                      >
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

              {/* Description & Notes Section */}
              <Section title="Project Description & Notes">
                <div>
                  <label className={labelBase}>Description</label>
                  <textarea
                    className={`${inputBase} h-24 resize-none ${
                      errors.description ? inputError : ""
                    }`}
                    placeholder="Describe the project goals and requirements..."
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className={errorText}>{errors.description.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelBase}>Notes</label>
                  <textarea
                    className={`${inputBase} h-20 resize-none ${
                      errors.note ? inputError : ""
                    }`}
                    placeholder="Any additional notes or remarks..."
                    {...register("note")}
                  />
                  {errors.note && (
                    <p className={errorText}>{errors.note.message}</p>
                  )}
                </div>
              </Section>

              {/* Contact Info Section */}
              <Section title="Primary Contact Info">
                <div className={gridTwo}>
                  <div>
                    <label className={labelBase}>Contact Name</label>
                    <input
                      className={`${inputBase} ${
                        errors.contactInfo?.contactName ? inputError : ""
                      }`}
                      placeholder="John Doe"
                      {...register("contactInfo.contactName")}
                    />
                    {errors.contactInfo?.contactName && (
                      <p className={errorText}>
                        {errors.contactInfo.contactName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelBase}>Contact Number</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${
                        errors.contactInfo?.contactNumber ? inputError : ""
                      }`}
                      placeholder="9876543210"
                      maxLength={10}
                      {...register("contactInfo.contactNumber")}
                      onInput={(e) => {
                        e.target.value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                      }}
                    />
                    {errors.contactInfo?.contactNumber && (
                      <p className={errorText}>
                        {errors.contactInfo.contactNumber.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelBase}>Contact Email</label>
                    <input
                      type="email"
                      className={`${inputBase} ${
                        errors.contactInfo?.contactEmail ? inputError : ""
                      }`}
                      placeholder="contact@company.com"
                      {...register("contactInfo.contactEmail")}
                    />
                    {errors.contactInfo?.contactEmail && (
                      <p className={errorText}>
                        {errors.contactInfo.contactEmail.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelBase}>Contact Address</label>
                    <input
                      className={`${inputBase} ${
                        errors.contactInfo?.address ? inputError : ""
                      }`}
                      placeholder="Company HQ, City, Country"
                      {...register("contactInfo.address")}
                    />
                    {errors.contactInfo?.address && (
                      <p className={errorText}>
                        {errors.contactInfo.address.message}
                      </p>
                    )}
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
                  <input
                    type="file"
                    multiple
                    onChange={onPick}
                    className="mt-3 block w-full text-sm"
                  />
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
                <div className="text-sm text-red-600">
                  {Object.keys(errors ?? {}).length > 0
                    ? `Please fix ${Object.keys(errors).length} validation error(s)`
                    : " "}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save all"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </FormProvider>
  );
}
