import React, { useState } from 'react';
import './MenuBar.css';
import { useNavigate } from 'react-router-dom';


const MenuBar = () => {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const menuItems = [
    {
      id: 1,
      label: 'Home',
      path: '/' 
    },
    {
      id: 2,
      label: 'Leagues',
      options: [
        { text: 'Public' },
        { text: 'Private' },
      ],
    },
    {
      id: 3,
      label: 'Rankings',
      options: [
        { text: 'Regional', type: 'internal', path: '/RegionalRankings' },
        { text: 'National', type: 'internal', path: '/NationalRankings' },
        { text: 'International', type: 'internal', path: '/InternationalRankings' },
      ],
    },
    {
      id: 4,
      label: 'Your Roster',
      path: '/YourRoster' 
    },
    {
      id: 5,
      label: 'Matchups',
      path: '/Matchups' 
    },
    {
      id: 6,
      label: 'Live Games',
      options: [
        { text: 'NBA', type: 'external', link: "https://www.nba.com/schedule" },
        { text: 'NFL', type: 'external', link: "https://www.nfl.com/schedules/" },
        { text: 'MLB', type: 'external', link: "https://www.mlb.com/schedule/2025-02-20" }
      ]
    },
  ];

  return (
    <div className="menu-bar">
      {menuItems.map((item) => (
        <div
          key={item.id}
          className="menu-item-container"
          onMouseEnter={() => item.options && setActiveDropdown(item.id)} 
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div
            className="menu-item"
            onClick={() => item.path && navigate(item.path)} 
            style={{ cursor: 'pointer' }}
          >
            {item.label}
          </div>
          {activeDropdown === item.id && item.options && (
            <div className="dropdown-menu">
              {item.options.map((option, index) => (
                option.type === 'external' ? (
                  <a
                    key={index}
                    href={option.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dropdown-item"
                  >
                    {option.text}
                  </a>
                ) : (
                  <div
                    key={index}
                    className="dropdown-item"
                    onClick={() => navigate(option.path)}
                    style={{ cursor: 'pointer' }}
                  >
                    {option.text}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
