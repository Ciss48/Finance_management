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

export const getYearlyStats = (year) =>
  api.get("/api/stats/yearly", { params: year ? { year } : {} }).then((r) => r.data);
