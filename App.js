import { useState, useEffect, useCallback } from "react";
import {
  getOKRs, saveOKRs,
  findUser, saveUser, getUsers,
  getSession, saveSession, clearSession,
} from "./storage";

// ── Constants ──────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  "Business Development",
  "Engineering",
  "Product",
  "Marketing",
  "Operations",
  "Design",
];

const DEPT_SHORT = {
  "Business Development": "BD",
  "Engineering": "ENG",
  "Product": "PRD",
  "Marketing": "MKT",
  "Operations": "OPS",
  "Design": "DSN",
};

const DEPT_COLORS = {
  "Business Development": { bg: "#FFF4E6", accent: "#F97316", light: "#FFEDD5" },
  "Engineering":          { bg: "#EFF6FF", accent: "#3B82F6", light: "#DBEAFE" },
  "Product":              { bg: "#F0FDF4", accent: "#22C55E", light: "#DCFCE7" },
  "Marketing":            { bg: "#FFF1F2", accent: "#F43F5E", light: "#FFE4E6" },
  "Operations":           { bg: "#F5F3FF", accent: "#8B5CF6", light: "#EDE9FE" },
  "Design":               { bg: "#FFFBEB", accent: "#EAB308", light: "#FEF9C3" },
};

// ── Progress helpers ───────────────────────────────────────────────────────

function getProgress(kr) {
  if (kr.direction === "down") {
    if (kr.current <= kr.target) return 100;
    const start = kr.baseline ?? kr.target * 2;
    if (start === kr.target) return 0;
    return Math.max(0, Math.min(100, ((start - kr.current) / (start - kr.target)) * 100));
  }
  if (kr.target === 0) return 100;
  return Math.max(0, Math.min(100, (kr.current / kr.target) * 100));
}

function getOKRProgress(okr) {
  if (!okr.keyResults.length) return 0;
  const avg = okr.keyResults.reduce((s, kr) => s + getProgress(kr), 0) / okr.keyResults.length;
  return Math.round(avg);
}

function getStatusColor(pct) {
  if (pct >= 75) return "#22C55E";
  if (pct >= 40) return "#F97316";
  return "#EF4444";
}

function getStatusLabel(pct) {
  if (pct >= 75) return "On Track";
  if (pct >= 40) return "At Risk";
  return "Off Track";
}

// ── Shared style constants ─────────────────────────────────────────────────

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280",
  marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
};

const inputStyle = {
  display: "block", width: "100%", padding: "10px 12px",
  border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14,
  color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box",
};

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ value, color, height = 6 }) {
  return (
    <div style={{ background: "#E5E7EB", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${value}%`, background: color,
        borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}

function KRRow({ kr, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(kr.current));
  const pct = Math.round(getProgress(kr));
  const statusColor = getStatusColor(pct);

  const save = () => {
    const n = parseFloat(val);
    if (!isNaN(n)) onUpdate({ ...kr, current: n });
    setEditing(false);
  };

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{kr.text}</div>
        <div style={{ flexShrink: 0 }}>
          {editing ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                autoFocus
                style={{ width: 80, padding: "4px 8px", border: "2px solid #3B82F6", borderRadius: 6, fontSize: 14, textAlign: "right", outline: "none" }}
              />
              <button onClick={save} style={{ padding: "4px 10px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>✓</button>
              <button onClick={() => setEditing(false)} style={{ padding: "4px 8px", background: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setVal(String(kr.current)); setEditing(true); }}
              style={{ padding: "4px 10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#6B7280" }}
            >
              ✏️ Update
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}><ProgressBar value={pct} color={statusColor} /></div>
        <div style={{ fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap", minWidth: 130, textAlign: "right" }}>
          <span style={{ color: "#111827", fontWeight: 600 }}>{kr.current}{kr.unit}</span>
          <span style={{ margin: "0 4px" }}>→</span>
          <span>{kr.target}{kr.unit}</span>
          <span style={{ marginLeft: 8, fontWeight: 700, color: statusColor }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function OKRCard({ okr, deptColor, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const progress = getOKRProgress(okr);
  const statusColor = getStatusColor(progress);

  const updateKR = (updated) =>
    onUpdate({ ...okr, keyResults: okr.keyResults.map((kr) => (kr.id === updated.id ? updated : kr)) });

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div
        style={{ padding: "18px 20px", background: deptColor.bg, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{okr.objective}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 240 }}><ProgressBar value={progress} color={statusColor} height={5} /></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: statusColor, minWidth: 35 }}>{progress}%</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: statusColor + "22", color: statusColor }}>
              {getStatusLabel(progress)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 16, alignItems: "center" }}>
          <button
            onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this OKR?")) onDelete(okr.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", padding: 4, fontSize: 15, lineHeight: 1 }}
            title="Delete OKR"
          >🗑️</button>
          <span style={{ color: "#9CA3AF", fontSize: 18, marginLeft: 4 }}>{expanded ? "▾" : "▸"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 20px" }}>
          {okr.keyResults.length === 0 ? (
            <div style={{ padding: "20px 0", color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>No key results yet.</div>
          ) : (
            okr.keyResults.map((kr) => <KRRow key={kr.id} kr={kr} onUpdate={updateKR} />)
          )}
        </div>
      )}
    </div>
  );
}

function AddOKRModal({ onClose, onAdd }) {
  const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [objective, setObjective] = useState("");
  const [krs, setKrs] = useState([{ text: "", current: "", target: "", unit: "", direction: "up" }]);
  const [error, setError] = useState("");

  const addKR = () => setKrs([...krs, { text: "", current: "", target: "", unit: "", direction: "up" }]);
  const updateKR = (i, field, val) => setKrs(krs.map((kr, idx) => (idx === i ? { ...kr, [field]: val } : kr)));
  const removeKR = (i) => setKrs(krs.filter((_, idx) => idx !== i));

  const handleAdd = () => {
    if (!objective.trim()) { setError("Objective is required."); return; }
    if (krs.some((k) => !k.text.trim() || k.target === "")) { setError("All key results need a description and target."); return; }
    onAdd({
      id: "okr-" + Date.now(),
      department: dept,
      objective: objective.trim(),
      keyResults: krs.map((kr, i) => ({
        id: `kr-${Date.now()}-${i}`,
        text: kr.text.trim(),
        current: parseFloat(kr.current) || 0,
        target: parseFloat(kr.target),
        unit: kr.unit.trim(),
        direction: kr.direction,
        baseline: parseFloat(kr.current) || 0,
      })),
    });
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "auto", padding: 32, boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>Add New OKR</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF" }}>✕</button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Department</label>
            <select value={dept} onChange={(e) => setDept(e.target.value)} style={inputStyle}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Objective</label>
            <input
              value={objective}
              onChange={(e) => { setObjective(e.target.value); setError(""); }}
              placeholder="What do you want to achieve?"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Key Results</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
              {krs.map((kr, i) => (
                <div key={i} style={{ background: "#F9FAFB", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>KR {i + 1}</span>
                    {krs.length > 1 && (
                      <button onClick={() => removeKR(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600 }}>Remove</button>
                    )}
                  </div>
                  <input
                    value={kr.text}
                    onChange={(e) => { updateKR(i, "text", e.target.value); setError(""); }}
                    placeholder="Specific, measurable result…"
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Current</label>
                      <input type="number" value={kr.current} onChange={(e) => updateKR(i, "current", e.target.value)} placeholder="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Target</label>
                      <input type="number" value={kr.target} onChange={(e) => { updateKR(i, "target", e.target.value); setError(""); }} placeholder="100" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Unit</label>
                      <input value={kr.unit} onChange={(e) => updateKR(i, "unit", e.target.value)} placeholder="%, users…" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Direction</label>
                      <select value={kr.direction} onChange={(e) => updateKR(i, "direction", e.target.value)} style={inputStyle}>
                        <option value="up">↑ Higher</option>
                        <option value="down">↓ Lower</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addKR}
                style={{ padding: "10px", background: "#F0F9FF", border: "2px dashed #BAE6FD", borderRadius: 10, cursor: "pointer", color: "#0369A1", fontSize: 13, fontWeight: 600 }}
              >
                + Add Key Result
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            style={{ padding: "14px", background: "linear-gradient(135deg, #3B82F6, #6366F1)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
          >
            Save OKR
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Login / Register screen ────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setError("");
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setTimeout(() => {
      if (mode === "login") {
        const user = findUser(email.trim().toLowerCase(), password);
        if (!user) { setError("Incorrect email or password."); setLoading(false); return; }
        saveSession(user);
        onLogin(user);
      } else {
        if (!name.trim()) { setError("Name is required."); setLoading(false); return; }
        const exists = getUsers().find((u) => u.email === email.trim().toLowerCase());
        if (exists) { setError("An account with that email already exists."); setLoading(false); return; }
        const user = { id: "u-" + Date.now(), name: name.trim(), role: role.trim(), email: email.trim().toLowerCase(), password };
        saveUser(user);
        saveSession(user);
        onLogin(user);
      }
    }, 400);
  };

  const darkInput = {
    display: "block", width: "100%", marginTop: 8, padding: "12px 14px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, width: 420, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "48px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", marginBottom: 18, fontSize: 22 }}>⬡</div>
          <div style={{ color: "#fff", fontSize: 25, fontWeight: 800, letterSpacing: "-0.5px" }}>Compass</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 4 }}>Company OKR Dashboard</div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                background: mode === m ? "rgba(255,255,255,0.12)" : "transparent",
                color: mode === m ? "#fff" : "rgba(255,255,255,0.4)" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <>
              <div>
                <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" style={darkInput} />
              </div>
              <div>
                <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Job Title <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Head of Engineering" style={darkInput} />
              </div>
            </>
          )}
          <div>
            <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Email</label>
            <input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@company.com" style={darkInput} />
          </div>
          <div>
            <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Password</label>
            <input value={password} type="password" onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" style={darkInput} />
          </div>
          {error && (
            <div style={{ color: "#F87171", fontSize: 13, background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: 8 }}>{error}</div>
          )}
          <button onClick={submit} style={{ marginTop: 4, padding: "14px", background: "linear-gradient(135deg, #3B82F6, #6366F1)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [okrs, setOkrs] = useState([]);
  const [activeDept, setActiveDept] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  // Restore session on mount
  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);
    setOkrs(getOKRs());
  }, []);

  // Persist OKRs on every change
  const updateOKRs = useCallback((next) => {
    setOkrs(next);
    saveOKRs(next);
  }, []);

  const handleLogin = (u) => setUser(u);

  const handleSignOut = () => {
    clearSession();
    setUser(null);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  // Filtering
  const activeDeptsList = DEPARTMENTS.filter((d) => okrs.some((o) => o.department === d));
  const deptTabs = ["All", ...activeDeptsList];

  const filtered = okrs.filter((o) => {
    const deptMatch = activeDept === "All" || o.department === activeDept;
    const q = search.toLowerCase();
    const searchMatch = !q || o.objective.toLowerCase().includes(q) || o.keyResults.some((k) => k.text.toLowerCase().includes(q));
    return deptMatch && searchMatch;
  });

  const grouped = {};
  DEPARTMENTS.forEach((d) => { grouped[d] = filtered.filter((o) => o.department === d); });

  // Summary stats
  const totalOkrs = okrs.length;
  const avgProgress = totalOkrs ? Math.round(okrs.reduce((s, o) => s + getOKRProgress(o), 0) / totalOkrs) : 0;
  const onTrackCount = okrs.filter((o) => getOKRProgress(o) >= 75).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0A0A0F", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
            <span style={{ color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>Compass</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{user.name}</div>
              {user.role && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{user.role}</div>}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <button onClick={handleSignOut} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Summary cards */}
        {totalOkrs > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Company Progress", value: `${avgProgress}%`, sub: "Average across all OKRs", icon: "📈" },
              { label: "On Track", value: onTrackCount, sub: `of ${totalOkrs} objective${totalOkrs !== 1 ? "s" : ""}`, icon: "✅" },
              { label: "Active Departments", value: activeDeptsList.length, sub: "with defined OKRs", icon: "🏢" },
            ].map((card) => (
              <div key={card.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginTop: 4, letterSpacing: "-1px" }}>{card.value}</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{card.sub}</div>
                  </div>
                  <span style={{ fontSize: 26 }}>{card.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {deptTabs.map((d) => (
              <button key={d} onClick={() => setActiveDept(d)} style={{
                padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                background: activeDept === d ? "#111827" : "#fff",
                color: activeDept === d ? "#fff" : "#6B7280",
                border: activeDept === d ? "1px solid #111827" : "1px solid #E5E7EB",
              }}>
                {d === "All" ? "All" : (DEPT_SHORT[d] || d)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search OKRs…"
              style={{ padding: "8px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, outline: "none", width: 200 }}
            />
            <button onClick={() => setShowModal(true)} style={{ padding: "8px 20px", background: "linear-gradient(135deg, #3B82F6, #6366F1)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              + Add OKR
            </button>
          </div>
        </div>

        {/* Empty state */}
        {totalOkrs === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧭</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>No OKRs yet</div>
            <div style={{ fontSize: 15, color: "#9CA3AF", marginBottom: 28 }}>Add your first company objective to get started.</div>
            <button onClick={() => setShowModal(true)} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #3B82F6, #6366F1)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              + Add First OKR
            </button>
          </div>
        )}

        {/* OKRs grouped by department */}
        {DEPARTMENTS.map((dept) => {
          const deptOkrs = grouped[dept];
          if (!deptOkrs || deptOkrs.length === 0) return null;
          const color = DEPT_COLORS[dept];
          const deptAvg = Math.round(deptOkrs.reduce((s, o) => s + getOKRProgress(o), 0) / deptOkrs.length);
          return (
            <div key={dept} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800, background: color.light, color: color.accent, letterSpacing: "0.06em" }}>
                  {DEPT_SHORT[dept] || dept}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{dept}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>{deptOkrs.length} objective{deptOkrs.length !== 1 ? "s" : ""}</div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, maxWidth: 160 }}><ProgressBar value={deptAvg} color={color.accent} height={4} /></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: color.accent }}>{deptAvg}%</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {deptOkrs.map((okr) => (
                  <OKRCard
                    key={okr.id}
                    okr={okr}
                    deptColor={color}
                    onUpdate={(updated) => updateOKRs(okrs.map((o) => (o.id === updated.id ? updated : o)))}
                    onDelete={(id) => updateOKRs(okrs.filter((o) => o.id !== id))}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* No results from search/filter */}
        {totalOkrs > 0 && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No OKRs match your filters</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Try clearing the search or switching departments.</div>
          </div>
        )}
      </div>

      {showModal && (
        <AddOKRModal
          onClose={() => setShowModal(false)}
          onAdd={(okr) => updateOKRs([...okrs, okr])}
        />
      )}
    </div>
  );
}
