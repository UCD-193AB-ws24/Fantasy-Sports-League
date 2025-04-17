import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext"; 
import { GoogleLogin } from "@react-oauth/google";
import ProtectedRoute from "./components/ProtectedRoute";

import MainScreen from './components/mainScreen';
import RegisterPage from '../src/components/pages/registerPage';
import RegionalRanks from './components/pages/RegionalRanks';
import NationalRanks from './components/pages/NationalRanks';
import InternationalRanks from './components/pages/InternationalRanks';
import YourRoster from './components/pages/YourRoster';
import Matchups from './components/pages/Matchups';
import Player_List from "./components/pages/Player_List";
import NewsFeed from './components/pages/newsFeed/NewsFeed';
import Warriors from './components/pages/GoldenState/GoldenStatemainScreen';
import Cavaliers from './components/pages/Cavaliers/Cavaliers-mainScreen';
import Lakers from './components/pages/Lakers/LakersmainScreen';
import Mavericks from './components/pages/Mavericks/MavericksmainScreen';
import Clippers from './components/pages/Clippers/ClippersmainScreen';
import Bulls from './components/pages/Bulls/Bulls-mainScreen';
import Heats from './components/pages/Heats/HeatsmainScreen';
import Knicks from './components/pages/Knicks/KnicksmainScreen'; 
import Dashboard from './DashBoard';
import Login from "./components/Login";
import ProfilePage from "./Profile";
import LeaguesPage from './components/pages/LeaguePage';
import CreateLeague from './components/pages/CreateLeague';
import LeagueDetails from './components/pages/LeagueDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MainScreen />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/RegionalRankings" element={
            <ProtectedRoute>
              <RegionalRanks />
            </ProtectedRoute>
          } /> 
          <Route path="/NationalRankings" element={
            <ProtectedRoute>
              <NationalRanks />
            </ProtectedRoute>
          } />  
          <Route path="/InternationalRankings" element={
            <ProtectedRoute>
              <InternationalRanks />
            </ProtectedRoute>
          } />  
          <Route path="/YourRoster" element={
            <ProtectedRoute>
              <YourRoster/>
            </ProtectedRoute>
          } />
          <Route path="/Matchups" element={
            <ProtectedRoute>
              <Matchups/>
            </ProtectedRoute>
          } />
          <Route path="/PlayerList" element={
            <ProtectedRoute>
              <Player_List/>
            </ProtectedRoute>
          } />
          <Route path="/NewsFeed" element={
            <ProtectedRoute>
              <NewsFeed/>
            </ProtectedRoute>
          } />
          <Route path="/golden-state-warriors" element={
            <ProtectedRoute>
              <Warriors/>
            </ProtectedRoute>
          } />
          <Route path="/cleveland-cavaliers" element={
            <ProtectedRoute>
              <Cavaliers/>
            </ProtectedRoute>
          } />
          <Route path="/la-lakers" element={
            <ProtectedRoute>
              <Lakers/>
            </ProtectedRoute>
          } />
          <Route path="/dallas-mavericks" element={
            <ProtectedRoute>
              <Mavericks/>
            </ProtectedRoute>
          } />
          <Route path="/la-clippers" element={
            <ProtectedRoute>
              <Clippers/>
            </ProtectedRoute>
          } />
          <Route path="/chicago-bulls" element={
            <ProtectedRoute>
              <Bulls/>
            </ProtectedRoute>
          } />
          <Route path="/miami-heat" element={
            <ProtectedRoute>
              <Heats/>
            </ProtectedRoute>
          } />
          <Route path="/new-york-knicks" element={
            <ProtectedRoute>
              <Knicks/>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/leagues" element={
          <ProtectedRoute>
            <LeaguesPage />
          </ProtectedRoute>
        } />
        <Route path="/leagues/create" element={
          <ProtectedRoute>
            <CreateLeague />
          </ProtectedRoute>
        } />
        <Route path="/leagues/:leagueId" element={
          <ProtectedRoute>
            <LeagueDetails />
          </ProtectedRoute>
        } />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;