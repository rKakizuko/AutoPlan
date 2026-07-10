import React from 'react';
import { Navigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const token = localStorage.getItem('token');
  const [status, setStatus] = React.useState('checking');
  const [redirectTo, setRedirectTo] = React.useState('/login');

  React.useEffect(() => {
    if (!token) {
      setRedirectTo('/login');
      setStatus('denied');
      return;
    }

    const verifySession = async () => {
      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setRedirectTo('/login');
          setStatus('denied');
          return;
        }

        const freshUser = await response.json();
        localStorage.setItem('user', JSON.stringify(freshUser));

        if (requiredRole && freshUser.role !== requiredRole) {
          setRedirectTo('/');
          setStatus('denied');
          return;
        }

        setStatus('allowed');
      } catch (error) {
        console.error('Erro ao validar sessão:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setRedirectTo('/login');
        setStatus('denied');
      }
    };

    verifySession();
  }, [requiredRole, token]);

  if (status === 'checking') {
    return <div />;
  }

  if (status === 'denied') {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
