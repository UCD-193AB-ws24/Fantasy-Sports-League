// MenuBar.jsx
import React, { useState, useContext } from 'react';
import styles from './MenuBar.module.css';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';

// Define inline style for the MenuBar wrapper
const menuBarInlineStyle = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '15px'
};

const MenuBar = () => {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { id: 1, label: 'Home', path: '/' },
    {
      id: 2,
      label: 'Leagues',
      options: [
        { text: 'View Leagues', type: 'internal', path: '/leagues' },
        { text: 'Create League', type: 'internal', path: '/leagues/create' }
      ]
    },
    {
      id: 3,
      label: 'Rankings',
      options: [
        { text: 'Regional', type: 'internal', path: '/RegionalRankings' },
        { text: 'National', type: 'internal', path: '/NationalRankings' },
        { text: 'International', type: 'internal', path: '/InternationalRankings' }
      ]
    },
    { id: 4, label: 'Your Roster', path: '/YourRoster' },
    { id: 5, label: 'Matchups', path: '/Matchups' },
    { id: 6, label: 'Player List', path: '/PlayerList' },
    {
      id: 7,
      label: 'Live Games',
      options: [
        { text: 'NBA', type: 'external', link: "https://www.nba.com/schedule" },
        { text: 'NFL', type: 'external', link: "https://www.nfl.com/schedules/" },
        { text: 'MLB', type: 'external', link: "https://www.mlb.com/schedule/2025-02-20" }
      ]
    }
  ];

  const userMenuItems = [
    {
      id: 8,
      label: user ? user.name : 'Account',
      options: [
        { text: 'Profile', type: 'internal', path: '/profile' },
        { text: 'Logout', type: 'action', action: handleLogout }
      ]
    }
  ];

  const nonUserMenuItems = [
    { id: 8, label: 'Login', path: '/login' },
    { id: 9, label: 'Register', path: '/register' }
  ];

  const finalMenuItems = [
    ...menuItems,
    ...(user ? userMenuItems : nonUserMenuItems)
  ];

  return (
    <div id="MenuBarWrapper" className={styles.Menu_Bar_bar} style={menuBarInlineStyle}>
      {finalMenuItems.map((item) => (
        <div
          key={item.id}
          className={styles.Menu_Bar_itemContainer}
          onMouseEnter={() => item.options && setActiveDropdown(item.id)}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div
            className={styles.Menu_Bar_item}
            onClick={() => item.path && navigate(item.path)}
          >
            {item.label}
          </div>
          {activeDropdown === item.id && item.options && (
            <div className={styles.Menu_Bar_dropdownMenu}>
              {item.options.map((option, index) => {
                if (option.type === 'external') {
                  return (
                    <a
                      key={index}
                      href={option.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.Menu_Bar_dropdownItem}
                    >
                      {option.text}
                    </a>
                  );
                } else if (option.type === 'action') {
                  return (
                    <div
                      key={index}
                      className={styles.Menu_Bar_dropdownItem}
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
                      className={styles.Menu_Bar_dropdownItem}
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
