import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainScreen from './components/mainScreen';
import RegisterPage from '../src/components/pages/registerPage'
import RegionalRanks from './components/pages/RegionalRanks'
import NationalRanks from './components/pages/NationalRanks'
import InternationalRanks from './components/pages/InternationalRanks'
import YourRoster from './components/pages/YourRoster';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainScreen />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/RegionalRankings" element={<RegionalRanks />} /> 
        <Route path="/NationalRankings" element={<NationalRanks />} />  
        <Route path="/InternationalRankings" element={<InternationalRanks />} />  
        <Route path="/YourRoster" element={<YourRoster/>} />
      </Routes>
    </Router>
  );
}

export default App;