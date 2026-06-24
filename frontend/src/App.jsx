import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminLayout from './pages/admin/AdminLayout';
import UsersPage from './pages/admin/UsersPage';
import DocumentsPage from './pages/admin/DocumentsPage';
import ExclusionsPage from './pages/admin/ExclusionsPage';
import DashboardPage from './pages/admin/DashboardPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/chat" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/chat" replace /> : <LoginPage />} />
      <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="exclusions" element={<ExclusionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/chat' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
