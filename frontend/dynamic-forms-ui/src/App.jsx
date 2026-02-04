import { useEffect, useMemo, useState } from "react";
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

function diffSchemas(oldSchema, newSchema) {
  const oldFields = (oldSchema?.fields || []).reduce((acc, f) => {
    acc[f.key] = f;
    return acc;
  }, {});
  const newFields = (newSchema?.fields || []).reduce((acc, f) => {
    acc[f.key] = f;
    return acc;
  }, {});

  const added = [];
  const removed = [];
  const modified = [];

  for (const key of Object.keys(newFields)) {
    if (!oldFields[key]) {
      added.push(newFields[key]);
    } else {
      const o = oldFields[key];
      const n = newFields[key];
      const changes = [];

      const propsToCheck = ["label", "type", "required", "min", "max", "step"];
      propsToCheck.forEach((prop) => {
        if ((o[prop] ?? null) !== (n[prop] ?? null)) changes.push(prop);
      });

      const oOpt = (o.options || []).join("|");
      const nOpt = (n.options || []).join("|");
      if (oOpt !== nOpt) changes.push("options");

      if (changes.length) modified.push({ key, oldField: o, newField: n, changes });
    }
  }

  for (const key of Object.keys(oldFields)) {
    if (!newFields[key]) removed.push(oldFields[key]);
  }

  return { added, removed, modified };
}

function VersionUpdateModal({ open, onClose, onSync, onKeepOld, diff, newVersionId }) {
  if (!open) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>New template version available</div>
          <button onClick={onClose} style={styles.xBtn}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 8, color: "#333" }}>
          A newer published version is available: <b>{newVersionId}</b>
        </div>

        <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Diff summary</div>
          <div>✅ Added: {diff.added.length}</div>
          <div>❌ Removed: {diff.removed.length}</div>
          <div>🛠️ Modified: {diff.modified.length}</div>

          <div style={{ marginTop: 10 }}>
            {diff.added.length > 0 && (
              <>
                <div style={{ fontWeight: 700 }}>Added</div>
                <ul>
                  {diff.added.map((f) => (
                    <li key={f.key}>
                      {f.label} <span style={{ color: "#666" }}>({f.key})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {diff.removed.length > 0 && (
              <>
                <div style={{ fontWeight: 700 }}>Removed</div>
                <ul>
                  {diff.removed.map((f) => (
                    <li key={f.key}>
                      {f.label} <span style={{ color: "#666" }}>({f.key})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {diff.modified.length > 0 && (
              <>
                <div style={{ fontWeight: 700 }}>Modified</div>
                <ul>
                  {diff.modified.map((m) => (
                    <li key={m.key}>
                      <b>{m.key}</b> changed: {m.changes.join(", ")}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onKeepOld} style={styles.secondary}>
            Keep using old version
          </button>
          <button onClick={onSync} style={styles.primary}>
            Sync to new version
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          Tip: keeping old version will still submit to the old <b>formVersionId</b>.
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    width: "min(720px, 92vw)",
    background: "white",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
    maxHeight: "85vh",
    overflow: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 },
  primary: { padding: "10px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" },
  secondary: { padding: "10px 14px", borderRadius: 10, border: "1px solid #bbb", background: "#f7f7f7", color: "#111" },
  xBtn: { border: "none", background: "transparent", fontSize: 18, cursor: "pointer" },
};

export default function App() {
  // Builder state
  const [formName, setFormName] = useState("Dynamic Form");
  const [createdBy, setCreatedBy] = useState("admin");
  const [schemaTitle, setSchemaTitle] = useState("Dynamic Form");
  const [fields, setFields] = useState([
    { key: "name", type: "TEXT", label: "Name", required: true },
    { key: "email", type: "EMAIL", label: "Email", required: true },
    { key: "rating", type: "SLIDER", label: "Rating", min: 0, max: 10, step: 1, required: false },
  ]);

  // Runtime identifiers
  const [formId, setFormId] = useState("");
  const [versionId, setVersionId] = useState("");

  // Active schema & submission
  const [activeSchema, setActiveSchema] = useState(null);
  const [submittedBy, setSubmittedBy] = useState("user1");
  const [answers, setAnswers] = useState({});
  const [log, setLog] = useState([]);

  // Enterprise-like update prompt state
  // ✅ FIX: don't read global key at init; we load per-form key when formId changes
  const [openedVersionId, setOpenedVersionId] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [pendingNewVersion, setPendingNewVersion] = useState(null); // { versionId, schemaJson }
  const [diff, setDiff] = useState({ added: [], removed: [], modified: [] });

  // versions dropdown (admin/testing)
  const [versions, setVersions] = useState([]);
  const [selectedVersionToOpen, setSelectedVersionToOpen] = useState("");

  const schemaJson = useMemo(() => ({ title: schemaTitle, fields }), [schemaTitle, fields]);

  function pushLog(msg) {
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 30));
  }

  // ✅ FIX: store opened version per formId (prevents "Version does not belong to form")
  const openedKey = useMemo(() => (formId ? `openedVersionId:${formId}` : ""), [formId]);

  const getOpenedForForm = () => {
    if (!openedKey) return "";
    return localStorage.getItem(openedKey) || "";
  };

  const setOpenedForForm = (vid) => {
    if (!openedKey) return;
    localStorage.setItem(openedKey, vid);
    setOpenedVersionId(vid);
  };

  const clearOpenedForForm = () => {
    if (!openedKey) return;
    localStorage.removeItem(openedKey);
    setOpenedVersionId("");
  };

  // ✅ when formId changes, load correct opened version for that form
  useEffect(() => {
    if (!formId) {
      setOpenedVersionId("");
      return;
    }
    setOpenedVersionId(getOpenedForForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  // reset openedVersionId (for THIS form only)
  const resetOpenedVersion = () => {
    clearOpenedForForm();
    setShowUpdateModal(false);
    setPendingNewVersion(null);
    setDiff({ added: [], removed: [], modified: [] });
    pushLog("🧹 Reset openedVersionId for this form (simulate brand-new user)");
  };

  const loadVersions = async () => {
    try {
      if (!formId) throw new Error("Enter formId first");
      const res = await api("GET", `/api/forms/${formId}/versions`);
      setVersions(res || []);
      pushLog(`📚 Loaded versions list (${res?.length || 0})`);
    } catch (e) {
      pushLog(`❌ Load versions failed: ${e.message}`);
    }
  };

  const openSelectedVersion = async () => {
    try {
      if (!formId) throw new Error("Enter formId first");
      if (!selectedVersionToOpen) throw new Error("Select a version first");

      const res = await api("GET", `/api/forms/${formId}/versions/${selectedVersionToOpen}`);

      setActiveSchema(res.schemaJson);
      setVersionId(res.id);

      // ✅ FIX: store openedVersionId per form
      setOpenedForForm(res.id);

      setAnswers({});
      pushLog(`🧪 Opened as version: ${res.id} (v${res.version})`);
    } catch (e) {
      pushLog(`❌ Open version failed: ${e.message}`);
    }
  };

  // --- API actions ---
  const handleCreateForm = async () => {
    try {
      const res = await api("POST", "/api/forms", { name: formName, createdBy });
      setFormId(res.id);

      // optional: clear runtime state for clarity
      setVersionId("");
      setActiveSchema(null);
      setAnswers({});
      setShowUpdateModal(false);
      setPendingNewVersion(null);
      setDiff({ added: [], removed: [], modified: [] });

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

  // ✅ FIXED Load Active (per-form storage + safety fallback)
  const handleLoadActive = async () => {
    try {
      if (!formId) throw new Error("Enter or create a formId.");

      const active = await api("GET", `/api/forms/${formId}/active`);
      const newVersionId = active.id;
      const newSchema = active.schemaJson;

      // First time open for THIS form
      if (!openedVersionId) {
        setActiveSchema(newSchema);
        setVersionId(newVersionId);
        setOpenedForForm(newVersionId);
        setAnswers({});
        pushLog(`✅ Loaded active schema (first open) (versionId=${newVersionId})`);
        return;
      }

      // If version changed: show popup with diff
      if (openedVersionId !== newVersionId) {
        try {
          const old = await api("GET", `/api/forms/${formId}/versions/${openedVersionId}`);
          const oldSchema = old.schemaJson;

          const d = diffSchemas(oldSchema, newSchema);
          setDiff(d);
          setPendingNewVersion({ versionId: newVersionId, schemaJson: newSchema });
          setShowUpdateModal(true);
          pushLog(`⚠️ New version available. old=${openedVersionId} new=${newVersionId}`);
          return;
        } catch (e) {
          // Safety: if old version can't be loaded, reset and proceed
          clearOpenedForForm();
          setActiveSchema(newSchema);
          setVersionId(newVersionId);
          setOpenedForForm(newVersionId);
          setAnswers({});
          pushLog(`⚠️ Old openedVersionId invalid; reset and loaded active (versionId=${newVersionId})`);
          return;
        }
      }

      // Same version -> normal load
      setActiveSchema(newSchema);
      setVersionId(newVersionId);
      setAnswers({});
      pushLog(`✅ Loaded active schema (versionId=${newVersionId})`);
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

  const onSyncToNew = () => {
    if (!pendingNewVersion) return;

    const newKeys = new Set((pendingNewVersion.schemaJson.fields || []).map((f) => f.key));
    const migrated = {};
    Object.keys(answers).forEach((k) => {
      if (newKeys.has(k)) migrated[k] = answers[k];
    });

    setActiveSchema(pendingNewVersion.schemaJson);
    setVersionId(pendingNewVersion.versionId);

    // ✅ FIX: store per-form
    setOpenedForForm(pendingNewVersion.versionId);

    setAnswers(migrated);
    setShowUpdateModal(false);
    setPendingNewVersion(null);

    pushLog(`✅ Synced to new version: ${pendingNewVersion.versionId}`);
  };

  const onKeepOldVersion = async () => {
    try {
      if (!formId) throw new Error("Missing formId");
      if (!openedVersionId) throw new Error("No previously opened version found.");

      const old = await api("GET", `/api/forms/${formId}/versions/${openedVersionId}`);
      setActiveSchema(old.schemaJson);
      setVersionId(openedVersionId);
      setShowUpdateModal(false);
      setPendingNewVersion(null);
      pushLog(`🕒 Staying on old version: ${openedVersionId}`);
    } catch (e) {
      pushLog(`❌ Keep old failed: ${e.message}`);
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
                <textarea className="textarea" value={val ?? ""} onChange={(e) => setVal(e.target.value)} placeholder={f.label} />
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
      <VersionUpdateModal
        open={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSync={onSyncToNew}
        onKeepOld={onKeepOldVersion}
        diff={diff}
        newVersionId={pendingNewVersion?.versionId}
      />

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

          {/* Admin/Test dropdown + reset */}
          <div className="divider" />
          <div className="row">
            <div className="col">
              <label className="label">Admin/Test: Open as version</label>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  className="input"
                  value={selectedVersionToOpen}
                  onChange={(e) => setSelectedVersionToOpen(e.target.value)}
                  style={{ minWidth: 260 }}
                >
                  <option value="">-- select version --</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} {v.isActive ? "(ACTIVE)" : ""} - {v.id}
                    </option>
                  ))}
                </select>

                <button onClick={loadVersions} disabled={!formId}>
                  Load Versions
                </button>

                <button onClick={openSelectedVersion} disabled={!formId || !selectedVersionToOpen}>
                  Open
                </button>

                <button onClick={resetOpenedVersion}>Reset openedVersionId</button>
              </div>

              <div className="muted small" style={{ marginTop: 6 }}>
                Fix: openedVersionId is stored per formId so diff popup works reliably when v1 → v2 on same form.
              </div>
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
                    <input type="checkbox" checked={Boolean(f.required)} onChange={(e) => updateField(idx, { required: e.target.checked })} />
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
                    <input className="input" type="number" value={f.min ?? 0} onChange={(e) => updateField(idx, { min: Number(e.target.value) })} />
                  </div>
                  <div className="col">
                    <label className="label">Max</label>
                    <input className="input" type="number" value={f.max ?? 10} onChange={(e) => updateField(idx, { max: Number(e.target.value) })} />
                  </div>
                  <div className="col">
                    <label className="label">Step</label>
                    <input className="input" type="number" value={f.step ?? 1} onChange={(e) => updateField(idx, { step: Number(e.target.value) })} />
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

          <div className="muted small">Preview uses: {activeSchema ? "Loaded Schema (active/old)" : "Builder Schema (local)"}</div>

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
