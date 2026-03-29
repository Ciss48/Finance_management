import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Overview from "./pages/Overview";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import YearlyReport from "./pages/YearlyReport";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="reports" element={<Reports />} />
          <Route path="yearly" element={<YearlyReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
