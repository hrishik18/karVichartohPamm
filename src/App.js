import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/Toast';
import Home from './public/Home';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';
import ProtectedRoute from './admin/ProtectedRoute';
import DebugPage from './debug/DebugPage';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public listener */}
            <Route path="/" element={<Home />} />

            {/* Admin auth */}
            <Route path="/admin/login" element={<Login />} />

            {/* Admin dashboard (protected) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Debug diagnostics */}
            <Route path="/debug" element={<DebugPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
