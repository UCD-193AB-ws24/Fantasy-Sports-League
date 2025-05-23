import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  // Show loading indicator while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/register', '/login'];
  
  // If on public route, allow access regardless of auth state
  if (publicRoutes.includes(location.pathname)) {
    return children;
  }
  
  // For ALL other routes, require authentication
  // If not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is authenticated, allow access to the protected route
  return children;
};

export default ProtectedRoute;