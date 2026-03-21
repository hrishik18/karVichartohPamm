import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth';

export default function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/admin/login" replace />;
}
