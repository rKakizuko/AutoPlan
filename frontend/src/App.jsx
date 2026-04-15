import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Simulador from './pages/Simulador';
import ProtocolDetail from './pages/ProtocolDetail';
import PaymentRules from './pages/PaymentRules';
import AuditLogs from './pages/AuditLogs';
import UserProfile from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/users" replace />} />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Register />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment-rules" 
          element={
            <ProtectedRoute requiredRole="admin">
              <PaymentRules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audit-logs" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AuditLogs />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Dashboard />} />
        <Route path="/simulador" element={<Simulador />} />
        <Route
          path="/minha-conta"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/protocolo/:protocolId" element={<ProtocolDetail />} />
      </Routes>
    </Router>
  );
}

export default App;