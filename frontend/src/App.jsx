import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import MainScreen from './mainScreen';
import LoginPage from './loginPage';
import RegisterPage from './registerPage'; // Updated path based on your structure
import RegionalRanks from './RegionalRanks';
import NationalRanks from './NationalRanks';
import InternationalRanks from './InternationalRanks';
import YourRoster from './YourRoster';

// Function to check if user is authenticated (Token exists in localStorage)
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return token && token !== 'null' && token !== 'undefined';
};

// Higher-order component for Protected Routes
const ProtectedRoute = ({ element }) => {
  return isAuthenticated() ? element : <Navigate to="/register" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Accessible by anyone */}
        <Route path="/" element={<MainScreen />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Redirect logged-in users away from Login */}
        <Route 
          path="/login" 
          element={isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />} 
        />

        {/* Protected Routes - Requires Authentication */}
        <Route path="/RegionalRankings" element={<ProtectedRoute element={<RegionalRanks />} />} />
        <Route path="/NationalRankings" element={<ProtectedRoute element={<NationalRanks />} />} />
        <Route path="/InternationalRankings" element={<ProtectedRoute element={<InternationalRanks />} />} />
        <Route path="/YourRoster" element={<ProtectedRoute element={<YourRoster />} />} />
      </Routes>
    </Router>
  );
}

export default App;
