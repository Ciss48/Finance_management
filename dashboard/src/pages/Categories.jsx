import { useState, useEffect } from "react";
import { getCategories } from "../api";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", type: "daily", icon: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await axios.post(`${BASE}/api/categories`, {
        name: form.name.trim(),
        type: form.type,
        icon: form.icon.trim() || null,
      });
      setForm({ name: "", type: "daily", icon: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi khi thêm danh mục");
    } finally {
      setSaving(false);
    }
  };

  const daily = categories.filter((c) => c.type === "daily");
  const fixed = categories.filter((c) => c.type === "fixed");

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Danh mục</h1>
          <p className="page-sub">{categories.length} danh mục</p>
        </div>
      </header>

      <div style={{ padding: "0 32px 32px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-header"><h2>Chi tiêu hằng ngày</h2></div>
            {loading ? <div className="empty-state"><div className="spinner" /></div> : (
              <div className="cat-grid">
                {daily.map((c) => (
                  <div key={c.id} className="cat-item">
                    <span className="cat-icon">{c.icon || "📦"}</span>
                    <span className="cat-name">{c.name}</span>
                    <span className="cat-badge daily">Hằng ngày</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-header"><h2>Chi phí cố định</h2></div>
            {loading ? <div className="empty-state"><div className="spinner" /></div> : (
              <div className="cat-grid">
                {fixed.map((c) => (
                  <div key={c.id} className="cat-item">
                    <span className="cat-icon">{c.icon || "🔒"}</span>
                    <span className="cat-name">{c.name}</span>
                    <span className="cat-badge fixed">Cố định</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-header"><h2>Thêm danh mục</h2></div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Tên danh mục *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Cà phê"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Loại</label>
              <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="daily">Hằng ngày</option>
                <option value="fixed">Cố định</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Icon (emoji)</label>
              <input
                className="form-input"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="VD: ☕"
                maxLength={4}
              />
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
            <button className="submit-btn" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "＋ Thêm danh mục"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
