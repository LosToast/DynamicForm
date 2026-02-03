import { useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080"; // change if needed

const FIELD_TYPES = [
  { type: "TEXT", label: "Text" },
  { type: "EMAIL", label: "Email" },
  { type: "NUMBER", label: "Number" },
  { type: "TEXTAREA", label: "Textarea" },
  { type: "CHECKBOX", label: "Checkbox" },
  { type: "RADIO", label: "Radio" },
  { type: "SELECT", label: "Dropdown" },
  { type: "SLIDER", label: "Slider" },
];

function uid(prefix = "f") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function defaultField(type) {
  const key = uid("field");
  const base = { key, type, label: `${type} Field`, required: false };
  if (type === "RADIO" || type === "SELECT") {
    return { ...base, options: ["Option 1", "Option 2"] };
  }
  if (type === "SLIDER") {
    return { ...base, min: 0, max: 10, step: 1 };
  }
  if (type === "CHECKBOX") {
    return { ...base, default: false };
  }
  return base;
}

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  }
  return json;
}

export default function App() {
  // Builder state
  const [formName, setFormName] = useState("Dynamic Form");
  const [createdBy, setCreatedBy] = useState("admin");
  const [schemaTitle, setSchemaTitle] = useState("Dynamic Form");
  const [fields, setFields] = useState([
    { key: "name", type: "TEXT", label: "Name", required: true },
    { key: "email", type: "EMAIL", label: "Email", required: true },
    {
      key: "rating",
      type: "SLIDER",
      label: "Rating",
      min: 0,
      max: 10,
      step: 1,
      required: false,
    },
  ]);

  // Runtime identifiers
  const [formId, setFormId] = useState("");
  const [versionId, setVersionId] = useState("");

  // Active schema & submission
  const [activeSchema, setActiveSchema] = useState(null);
  const [submittedBy, setSubmittedBy] = useState("user1");
  const [answers, setAnswers] = useState({});
  const [log, setLog] = useState([]);

  const schemaJson = useMemo(() => ({ title: schemaTitle, fields }), [schemaTitle, fields]);

  function pushLog(msg) {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30));
  }

  // --- API actions ---
  const handleCreateForm = async () => {
    try {
      const res = await api("POST", "/api/forms", { name: formName, createdBy });
      setFormId(res.id);
      pushLog(`✅ Created form: ${res.id}`);
    } catch (e) {
      pushLog(`❌ Create form failed: ${e.message}`);
    }
  };

  const handleCreateVersion = async () => {
    try {
      if (!formId) throw new Error("Create a form first.");
      const res = await api("POST", `/api/forms/${formId}/versions`, { schemaJson });
      setVersionId(res.id);
      pushLog(`✅ Created version: ${res.id} (v${res.version})`);
    } catch (e) {
      pushLog(`❌ Create version failed: ${e.message}`);
    }
  };

  const handlePublish = async () => {
    try {
      if (!formId || !versionId) throw new Error("Create form + version first.");
      await api("POST", `/api/forms/${formId}/versions/${versionId}/publish`);
      pushLog(`✅ Published version: ${versionId}`);
    } catch (e) {
      pushLog(`❌ Publish failed: ${e.message}`);
    }
  };

  const handleLoadActive = async () => {
    try {
      if (!formId) throw new Error("Enter or create a formId.");
      const res = await api("GET", `/api/forms/${formId}/active`);
      setActiveSchema(res.schemaJson);
      setVersionId(res.id); // active version id
      setAnswers({});
      pushLog(`✅ Loaded active schema (versionId=${res.id})`);
    } catch (e) {
      pushLog(`❌ Load active failed: ${e.message}`);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formId) throw new Error("Missing formId");
      if (!versionId) throw new Error("Missing versionId (publish or load active first)");
      const res = await api("POST", `/api/forms/${formId}/submissions`, {
        formVersionId: versionId,
        submittedBy,
        answersJson: answers,
      });
      pushLog(`✅ Submitted: ${res.id}`);
    } catch (e) {
      pushLog(`❌ Submit failed: ${e.message}`);
    }
  };

  // --- Builder helpers ---
  const addField = (type) => setFields((f) => [...f, defaultField(type)]);
  const removeField = (idx) => setFields((f) => f.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    setFields((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      return next;
    });
  };
  const updateField = (idx, patch) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  // --- Dynamic renderer ---
  const renderFields = (schema, isPreview) => {
    const flds = schema?.fields || [];
    return (
      <div className="card">
        <div className="cardTitle">{schema?.title || "Form"}</div>

        {flds.map((f) => {
          const val = answers[f.key];
          const setVal = (v) => setAnswers((a) => ({ ...a, [f.key]: v }));

          return (
            <div key={f.key} className="fieldRow">
              <label className="label">
                {f.label} {f.required ? <span className="req">*</span> : null}
              </label>

              {f.type === "TEXT" || f.type === "EMAIL" || f.type === "NUMBER" ? (
                <input
                  className="input"
                  type={f.type === "NUMBER" ? "number" : f.type === "EMAIL" ? "email" : "text"}
                  value={val ?? ""}
                  onChange={(e) => setVal(f.type === "NUMBER" ? Number(e.target.value) : e.target.value)}
                  placeholder={f.label}
                />
              ) : f.type === "TEXTAREA" ? (
                <textarea
                  className="textarea"
                  value={val ?? ""}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder={f.label}
                />
              ) : f.type === "CHECKBOX" ? (
                <div className="checkboxRow">
                  <input type="checkbox" checked={Boolean(val)} onChange={(e) => setVal(e.target.checked)} />
                  <span>{f.label}</span>
                </div>
              ) : f.type === "RADIO" ? (
                <div className="options">
                  {(f.options || []).map((opt) => (
                    <label key={opt} className="opt">
                      <input type="radio" name={f.key} checked={val === opt} onChange={() => setVal(opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : f.type === "SELECT" ? (
                <select className="input" value={val ?? ""} onChange={(e) => setVal(e.target.value)}>
                  <option value="" disabled>
                    Select...
                  </option>
                  {(f.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : f.type === "SLIDER" ? (
                <div className="sliderRow">
                  <input
                    type="range"
                    min={f.min ?? 0}
                    max={f.max ?? 10}
                    step={f.step ?? 1}
                    value={val ?? f.min ?? 0}
                    onChange={(e) => setVal(Number(e.target.value))}
                  />
                  <span className="sliderVal">{val ?? f.min ?? 0}</span>
                </div>
              ) : (
                <div className="muted">Unsupported field type: {f.type}</div>
              )}

              {isPreview ? null : <div className="muted small">key: {f.key} • type: {f.type}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="layout">
      {/* Left: Builder */}
      <div className="panel">
        <h2>Dynamic Forms POC</h2>

        <div className="card">
          <div className="row">
            <div className="col">
              <label className="label">Form Name</label>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="col">
              <label className="label">Created By</label>
              <input className="input" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label className="label">formId</label>
              <input className="input" value={formId} onChange={(e) => setFormId(e.target.value)} placeholder="uuid" />
            </div>
            <div className="col">
              <label className="label">versionId</label>
              <input className="input" value={versionId} onChange={(e) => setVersionId(e.target.value)} placeholder="uuid" />
            </div>
          </div>

          <div className="btnRow">
            <button onClick={handleCreateForm}>Create Form</button>
            <button onClick={handleCreateVersion} disabled={!formId}>
              Save Version
            </button>
            <button onClick={handlePublish} disabled={!formId || !versionId}>
              Publish
            </button>
            <button onClick={handleLoadActive} disabled={!formId}>
              Load Active
            </button>
          </div>
        </div>

        <div className="card">
          <div className="row">
            <div className="col">
              <label className="label">Schema Title</label>
              <input className="input" value={schemaTitle} onChange={(e) => setSchemaTitle(e.target.value)} />
            </div>
          </div>

          <div className="divider" />

          <div className="rowWrap">
            {FIELD_TYPES.map((t) => (
              <button key={t.type} className="chip" onClick={() => addField(t.type)}>
                + {t.label}
              </button>
            ))}
          </div>

          <div className="divider" />

          {fields.map((f, idx) => (
            <div key={f.key} className="fieldEditor">
              <div className="row">
                <div className="col">
                  <label className="label">Label</label>
                  <input className="input" value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                </div>
                <div className="col">
                  <label className="label">Key</label>
                  <input className="input" value={f.key} onChange={(e) => updateField(idx, { key: e.target.value })} />
                </div>
              </div>

              <div className="row">
                <div className="col">
                  <label className="label">Type</label>
                  <select className="input" value={f.type} onChange={(e) => updateField(idx, { type: e.target.value })}>
                    {FIELD_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label className="label">Required</label>
                  <div className="checkboxRow">
                    <input
                      type="checkbox"
                      checked={Boolean(f.required)}
                      onChange={(e) => updateField(idx, { required: e.target.checked })}
                    />
                    <span>required</span>
                  </div>
                </div>
              </div>

              {(f.type === "RADIO" || f.type === "SELECT") && (
                <div className="row">
                  <div className="col">
                    <label className="label">Options (comma separated)</label>
                    <input
                      className="input"
                      value={(f.options || []).join(",")}
                      onChange={(e) =>
                        updateField(idx, {
                          options: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {f.type === "SLIDER" && (
                <div className="row">
                  <div className="col">
                    <label className="label">Min</label>
                    <input
                      className="input"
                      type="number"
                      value={f.min ?? 0}
                      onChange={(e) => updateField(idx, { min: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col">
                    <label className="label">Max</label>
                    <input
                      className="input"
                      type="number"
                      value={f.max ?? 10}
                      onChange={(e) => updateField(idx, { max: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col">
                    <label className="label">Step</label>
                    <input
                      className="input"
                      type="number"
                      value={f.step ?? 1}
                      onChange={(e) => updateField(idx, { step: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="btnRow">
                <button onClick={() => moveField(idx, -1)} disabled={idx === 0}>
                  ↑
                </button>
                <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>
                  ↓
                </button>
                <button className="danger" onClick={() => removeField(idx)}>
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="divider" />
          <div className="muted small">Schema JSON preview:</div>
          <pre className="pre">{JSON.stringify(schemaJson, null, 2)}</pre>
        </div>
      </div>

      {/* Right: Preview + Submit */}
      <div className="panel">
        <h2>Preview / Submit</h2>

        <div className="card">
          <label className="label">Submitted By</label>
          <input className="input" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} />
          <div className="divider" />

          <div className="muted small">
            Preview uses: {activeSchema ? "Active Schema (GET /active)" : "Builder Schema (local)"}
          </div>

          <div style={{ marginTop: 12 }}>{renderFields(activeSchema || schemaJson, true)}</div>

          <div className="divider" />
          <button onClick={handleSubmit} disabled={!formId || !versionId}>
            Submit
          </button>

          <div className="divider" />
          <div className="muted small">answersJson preview:</div>
          <pre className="pre">{JSON.stringify(answers, null, 2)}</pre>
        </div>

        <div className="card">
          <div className="cardTitle">Logs</div>
          <pre className="pre">{log.join("\n")}</pre>
        </div>
      </div>
    </div>
  );
}
