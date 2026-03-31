import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Center, Spinner } from "@chakra-ui/react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import Organizations from "./pages/Organizations";
import AdminUsers from "./pages/AdminUsers";
import Modules from "./pages/Modules";
import FieldControl from "./pages/FieldControl";
import CreateOrganization from "./pages/CreateOrganization.jsx";

import { AdminAuthProvider } from "./context/AdminAuthProvider";
import { useAdminAuth } from "./context/useAdminAuth";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Stores from "./pages/Stores";
import Orders from "./pages/Orders";

interface PrivateRouteProps {
  children: ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, sessionLoading } = useAdminAuth();

  if (sessionLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="orange.500" />
      </Center>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Login/register when already signed in as admin → app home */
function GuestOnlyRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, sessionLoading } = useAdminAuth();

  if (sessionLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="orange.500" />
      </Center>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
      <Route
        path="/register"
        element={
          <PrivateRoute>
            <Register />
          </PrivateRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/categories"
        element={
          <PrivateRoute>
            <Categories />
          </PrivateRoute>
        }
      />

      <Route
        path="/organizations"
        element={
          <PrivateRoute>
            <Organizations />
          </PrivateRoute>
        }
      />
      <Route
        path="/organizations/create"
        element={
          <PrivateRoute>
            <CreateOrganization />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin-users"
        element={
          <PrivateRoute>
            <AdminUsers />
          </PrivateRoute>
        }
      />

      <Route
        path="/modules"
        element={
          <PrivateRoute>
            <Modules />
          </PrivateRoute>
        }
      />

      <Route
        path="/field-control"
        element={
          <PrivateRoute>
            <FieldControl />
          </PrivateRoute>
        }
      />

      <Route
        path="/products"
        element={
          <PrivateRoute>
            <Products />
          </PrivateRoute>
        }
      />
      <Route
        path="/products/:id"
        element={
          <PrivateRoute>
            <ProductDetail />
          </PrivateRoute>
        }
      />

      <Route
        path="/stores"
        element={
          <PrivateRoute>
            <Stores />
          </PrivateRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <PrivateRoute>
            <Orders />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
