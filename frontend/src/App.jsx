import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import MainScreen from './components/mainScreen';
import RegisterPage from './components/pages/registerPage';
import LoginPage from './components/pages/loginPage';
import RegionalRanks from './components/pages/RegionalRanks';
import NationalRanks from './components/pages/NationalRanks';
import InternationalRanks from './components/pages/InternationalRanks';
import YourRoster from './components/pages/YourRoster';
import Matchups from './components/pages/Matchups';
import NewsFeed from './components/pages/newsFeed/NewsFeed';
import Warriors from './components/pages/GoldenState/GoldenStatemainScreen';
import Cavaliers from './components/pages/Cavaliers/Cavaliers-mainScreen';
import Lakers from './components/pages/Lakers/LakersmainScreen';
import Mavericks from './components/pages/Mavericks/MavericksmainScreen';
import Clippers from './components/pages/Clippers/ClippersmainScreen';
import Bulls from './components/pages/Bulls/Bulls-mainScreen';
import Heats from './components/pages/Heats/HeatsmainScreen';
import Knicks from './components/pages/Knicks/KnicksmainScreen';

// Function to check if user is authenticated (Token exists in localStorage)
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return token && token !== 'null' && token !== 'undefined';
};

// Higher-order component for Protected Routes
const ProtectedRoute = ({ element }) => {
  return isAuthenticated() ? element : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Accessible by anyone */}
        <Route path="/" element={<MainScreen />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes - Requires Authentication */}
        <Route path="/RegionalRankings" element={<ProtectedRoute element={<RegionalRanks />} />} />
        <Route path="/NationalRankings" element={<ProtectedRoute element={<NationalRanks />} />} />
        <Route path="/InternationalRankings" element={<ProtectedRoute element={<InternationalRanks />} />} />
        <Route path="/YourRoster" element={<ProtectedRoute element={<YourRoster />} />} />
        <Route path="/Matchups" element={<ProtectedRoute element={<Matchups />} />} />
        <Route path="/NewsFeed" element={<ProtectedRoute element={<NewsFeed />} />} />
        <Route path="/Warriors" element={<ProtectedRoute element={<Warriors />} />} />
        <Route path="/Cavaliers" element={<ProtectedRoute element={<Cavaliers />} />} />
        <Route path="/Lakers" element={<ProtectedRoute element={<Lakers />} />} />
        <Route path="/Mavericks" element={<ProtectedRoute element={<Mavericks />} />} />
        <Route path="/Clippers" element={<ProtectedRoute element={<Clippers />} />} />
        <Route path="/Bulls" element={<ProtectedRoute element={<Bulls />} />} />
        <Route path="/Heats" element={<ProtectedRoute element={<Heats />} />} />
        <Route path="/Knicks" element={<ProtectedRoute element={<Knicks />} />} />
      </Routes>
    </Router>
  );
}

export default App;
