import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProductsPage from "./pages/ProductsPage";
import ShippingPage from "./pages/ShippingPage";
import LogisticsPage from "./pages/LogisticsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/logistics" element={<LogisticsPage />} />
      </Route>
    </Routes>
  );
}
