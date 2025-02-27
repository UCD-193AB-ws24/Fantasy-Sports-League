import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainScreen from './components/mainScreen';
import RegisterPage from '../src/components/pages/registerPage'
import RegionalRanks from './components/pages/RegionalRanks'
import NationalRanks from './components/pages/NationalRanks'
import InternationalRanks from './components/pages/InternationalRanks'
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



/*
    { id: 2, label: "Golden State Warriors", path: "/golden-state-warriors" },
    { id: 3, label: "LA Lakers", path: "/la-lakers" },
    { id: 4, label: "Dallas Mavericks", path: "/dallas-mavericks" },
    { id: 5, label: "LA Clippers", path: "/la-clippers" },
    { id: 6, label: "New York Knicks", path: "/new-york-knicks" },
    { id: 7, label: "Chicago Bulls", path: "/chicago-bulls" },
    { id: 8, label: "Cleveland Cavaliers", path: "/cleveland-cavaliers" },
    { id: 9, label: "Miami Heat", path: "/miami-heat" },*/ 
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
        <Route path="/Matchups" element={<Matchups/>} />
        <Route path="/NewsFeed" element={<NewsFeed/>} />
        <Route path="/golden-state-warriors" element={<Warriors/>} />
        <Route path="/cleveland-cavaliers" element={<Cavaliers/>}/>
        <Route path="/la-lakers" element={<Lakers/>} />
        <Route path="/dallas-mavericks" element={<Mavericks/>} />
        <Route path="/la-clippers" element={<Clippers/>} />
        <Route path="/la-lakers" element={<Lakers/>} />
        <Route path="/chicago-bulls" element={<Bulls/>} />
        <Route path="/miami-heat" element={<Heats/>} />
        <Route path="/new-york-knicks" element={<Knicks/>} />
      </Routes>
    </Router>
  );
}

export default App;