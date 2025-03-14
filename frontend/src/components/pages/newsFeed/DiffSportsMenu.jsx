import React, { useState } from 'react';
import './DiffSportsMenu.css'
import { useNavigate } from 'react-router-dom';

function DiffSportsMenu() {
const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const menuItems = [
    {
      id: 1,
      label: 'NFL',
      path: '/' 
    },
    {
      id: 2,
      label: 'NBA',
      options: [
      ],
    },
    {
      id: 3,
      label: 'MLB',
      options: [
      ],
    },
    {
      id: 4,
      label: 'NHL',
      path: '/YourRoster' 
    },
    {
      id: 5,
      label: 'Tennis',
      options: [
      ]
    },
  ];

  return (
    <div className="diffmenu-bar">
      {menuItems.map((item) => (
        <div
          key={item.id}
          className="vmenu-item-container"
          onMouseEnter={() => item.options && setActiveDropdown(item.id)} 
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div
            className="diffmenu-item"
            onClick={() => item.path && navigate(item.path)} 
            style={{ cursor: 'pointer' }}
          >
            {item.label}
          </div>
         
        </div>
      ))}
    </div>
  );
};

export default DiffSportsMenu;
