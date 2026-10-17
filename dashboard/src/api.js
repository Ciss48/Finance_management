import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE });

export const getCategories = () => api.get("/api/categories").then((r) => r.data);

export const getTransactions = (params = {}) =>
  api.get("/api/transactions", { params }).then((r) => r.data);

export const deleteTransaction = (id) =>
  api.delete(`/api/transactions/${id}`);

export const getMonthlyStats = (month) =>
  api.get("/api/stats/monthly", { params: month ? { month } : {} }).then((r) => r.data);

export const getDailyStats = (month) =>
  api.get("/api/stats/daily", { params: month ? { month } : {} }).then((r) => r.data);

export const getCategoryStats = (month) =>
  api.get("/api/stats/by-category", { params: month ? { month } : {} }).then((r) => r.data);

export const getDailyCategoryStats = (month) =>
  api.get("/api/stats/daily-by-category", { params: month ? { month } : {} }).then((r) => r.data);

export const getWeeklyStats = (month) =>
  api.get("/api/stats/weekly", { params: month ? { month } : {} }).then((r) => r.data);

export const getWeekdayStats = (month) =>
  api.get("/api/stats/by-weekday", { params: month ? { month } : {} }).then((r) => r.data);

export const getCategoryTrend = (categoryId, months = 6) =>
  api.get("/api/stats/category-trend", { params: { category_id: categoryId, months } }).then((r) => r.data);

export const getBudgetHistory = (months = 6) =>
  api.get("/api/stats/budget-history", { params: { months } }).then((r) => r.data);

export const getAnomalies = (month) =>
  api.get("/api/stats/anomalies", { params: month ? { month } : {} }).then((r) => r.data);

export const getYearlyStats = (year) =>
  api.get("/api/stats/yearly", { params: year ? { year } : {} }).then((r) => r.data);

export const getBudget = (month) =>
  api.get("/api/budgets", { params: month ? { month } : {} }).then((r) => r.data);

export const saveBudget = (month, amount) =>
  api.put("/api/budgets", { month, amount }).then((r) => r.data);
