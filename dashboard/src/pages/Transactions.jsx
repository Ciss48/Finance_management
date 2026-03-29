import { useState, useEffect, useCallback } from "react";
import { getTransactions, deleteTransaction, getCategories } from "../api";
import { fmt } from "../utils";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterType, setFilterType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = { limit: 200 };
    if (filterMonth) params.month = filterMonth;
    if (filterCat) params.category_id = filterCat;
    const [txns, cats] = await Promise.all([getTransactions(params), getCategories()]);
    let filtered = txns;
    if (filterType) filtered = filtered.filter((t) => t.type === filterType);
    setTransactions(filtered);
    setCategories(cats);
    setLoading(false);
  }, [filterMonth, filterCat, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Xóa giao dịch này?")) return;
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const total = transactions.reduce((sum, t) => sum + (t.type === "expense" ? -t.amount : +t.amount), 0);

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="page-title">Giao dịch</h1>
          <p className="page-sub">{transactions.length} giao dịch</p>
        </div>
      </header>

      <div style={{ padding: "0 32px 16px" }}>
        <div className="filter-bar">
          <input
            type="month"
            className="filter-input"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            placeholder="Tháng"
          />
          <select className="filter-input" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <select className="filter-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tất cả loại</option>
            <option value="expense">Chi tiêu</option>
            <option value="income">Thu nhập</option>
          </select>
          {(filterMonth || filterCat || filterType) && (
            <button className="refresh-btn" onClick={() => { setFilterMonth(""); setFilterCat(""); setFilterType(""); }}>
              ✕ Xóa bộ lọc
            </button>
          )}
          <div style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: total >= 0 ? "var(--green)" : "var(--red)" }}>
            {total >= 0 ? "+" : ""}{fmt(Math.abs(total))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 32px 32px" }}>
        <div className="card">
          {loading ? (
            <div className="full-center" style={{ height: 200 }}><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">Không có giao dịch nào</div>
          ) : (
            <div className="txn-table">
              <div className="txn-table-head">
                <span>Thời gian</span>
                <span>Danh mục</span>
                <span>Ghi chú</span>
                <span>Nguồn</span>
                <span style={{ textAlign: "right" }}>Số tiền</span>
                <span />
              </div>
              {transactions.map((t) => (
                <div key={t.id} className="txn-table-row">
                  <span className="txn-time">{new Date(t.created_at).toLocaleString("vi-VN")}</span>
                  <span className="txn-cat-cell">
                    <span>{t.categories?.icon || "📦"}</span>
                    <span>{t.categories?.name || "Khác"}</span>
                  </span>
                  <span className="txn-note" style={{ color: "var(--text-secondary)" }}>{t.note || "—"}</span>
                  <span className="source-badge">{t.source}</span>
                  <span className={`txn-amount ${t.type === "income" ? "income" : "expense"}`} style={{ textAlign: "right" }}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                  <span>
                    <button className="txn-delete" onClick={() => handleDelete(t.id)} title="Xóa">×</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
