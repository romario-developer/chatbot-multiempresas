import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/authService';

export function ProtectedRoute() {
  const token = authService.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
