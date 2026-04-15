export const fmt = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

export const fmtShort = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toString();
};

export const COLORS = ["#6c7cff", "#3ecf8e", "#f5c842", "#f47070", "#a78bfa", "#34d399", "#fb923c", "#60a5fa", "#e2e8f0"];

const CATEGORY_COLORS = {
  "Ăn uống":                    "#f47070",
  "Cà phê":                     "#f5c842",
  "Xăng xe":                    "#fb923c",
  "Du lịch":                    "#ffffff",
  "Di chuyển":                  "#60a5fa",
  "Giải trí/Bạn bè":            "#a78bfa",
  "Tạp hóa / Chợ / Siêu thị":  "#3ecf8e",
  "Mua sắm":                    "#ec4899",
  "Sức khỏe":                   "#34d399",
};

export const getCatColor = (name, fallbackIndex) =>
  CATEGORY_COLORS[name] ?? COLORS[fallbackIndex % COLORS.length];

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
