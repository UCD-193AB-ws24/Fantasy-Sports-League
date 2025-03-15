import React, { useState, useContext } from 'react';
import './MenuBar.css';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';

const MenuBar = () => {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
      label: 'Player List',
      path: '/PlayerList' 
    },
    {
      id: 7,
      label: 'Live Games',
      options: [
        { text: 'NBA', type: 'external', link: "https://www.nba.com/schedule" },
        { text: 'NFL', type: 'external', link: "https://www.nfl.com/schedules/" },
        { text: 'MLB', type: 'external', link: "https://www.mlb.com/schedule/2025-02-20" }
      ]
    },
  ];

  // User menu items only shown when logged in
  const userMenuItems = [
    {
      id: 8,
      label: user ? user.name : 'Account',
      options: [
        { text: 'Dashboard', type: 'internal', path: '/dashboard' },
        { text: 'Profile', type: 'internal', path: '/profile' },
        { text: 'Logout', type: 'action', action: handleLogout }
      ]
    }
  ];

  // Non-logged in user menu items
  const nonUserMenuItems = [
    {
      id: 8,
      label: 'Login',
      path: '/login'
    },
    {
      id: 9,
      label: 'Register',
      path: '/register'
    }
  ];

  // Combine base menu with user-specific items
  const finalMenuItems = [
    ...menuItems,
    ...(user ? userMenuItems : nonUserMenuItems)
  ];

  return (
    <div className="menu-bar">
      {finalMenuItems.map((item) => (
        <div
          key={item.id}
          className="menu-item-container"
          onMouseEnter={() => item.options && setActiveDropdown(item.id)} 
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div
            className="menu-item"
            onClick={() => {
              if (item.path) {
                navigate(item.path);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {item.label}
          </div>
          {activeDropdown === item.id && item.options && (
            <div className="dropdown-menu">
              {item.options.map((option, index) => {
                if (option.type === 'external') {
                  return (
                    
                    <a
                      key={index}
                      href={option.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dropdown-item"
                    >
                      {option.text}
                    </a>
                  );
                } else if (option.type === 'action') {
                  return (
                    <div
                      key={index}
                      className="dropdown-item"
                      onClick={option.action}
                      style={{ cursor: 'pointer' }}
                    >
                      {option.text}
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={index}
                      className="dropdown-item"
                      onClick={() => navigate(option.path)}
                      style={{ cursor: 'pointer' }}
                    >
                      {option.text}
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;