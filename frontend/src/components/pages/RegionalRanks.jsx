import React from 'react'
import MenuBar from '../MenuBar'
import './RegionalRanks.css'

function RegionalRankings() {
  const characters = [
    { name: 'King James', rank: 1 },
    { name: 'lost_Luka_LOL', rank: 2 },
    { name: 'my_BOY_AD', rank: 3 },
    { name: 'LaRRY_B', rank: 4 },
    { name: '...', rank: 5 },
    { name: '...', rank: 6 },
    { name: '...', rank: 7 },
    { name: '...', rank: 8 },
    { name: '...', rank: 9 },
    { name: '...', rank: 10 },
  ];
  return (
    <div>
      <MenuBar/>
      <div className="ranking-container">
      <h2>Regional Ranks - US West</h2>
      <ul className="ranking-list">
        {characters.map((character, index) => (
          <li key={index} className="ranking-item">
            <span className="rank">#{character.rank}</span> {character.name}
          </li>
        ))}
      </ul>
    </div>

    </div>
  );
};

export default RegionalRankings
