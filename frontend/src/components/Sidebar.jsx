import React, { useState } from "react";
import "./Sidebar.css";

const Sidebar = () => {
  const [openMenus, setOpenMenus] = useState({});

  // Toggle function for each menu
  const toggleMenu = (menuName) => {
    setOpenMenus((prevMenus) => ({
      ...prevMenus,
      [menuName]: !prevMenus[menuName], // Toggle only the clicked menu
    }));
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title"></h2>
      <nav>
        <ul className="menu">
          {/* Option 1 with dropdown */}
          <li>
            <button className="menu-btn" onClick={() => toggleMenu("option1")}>
              <span className={`triangle ${openMenus["option1"] ? "open" : ""}`}></span>
              General
            </button>
            <ul className={`submenu ${openMenus["option1"] ? "open" : ""}`}>
              <li><a href="#sub1">Sub Option 1</a></li>
              <li><a href="#sub2">Sub Option 2</a></li>
            </ul>
          </li>

          <li>
            <button className="menu-btn" onClick={() => toggleMenu("option2")}>
              <span className={`triangle ${openMenus["option2"] ? "open" : ""}`}></span>
              Leagues
            </button>
            <ul className={`submenu ${openMenus["option2"] ? "open" : ""}`}>
              <li><a href="#sub1">Live Public Leagues</a></li>
              <li><a href="#sub2">Live Private Leagues</a></li>
              <li><a href="#sub1">Historic Leagues</a></li>

            </ul>
          </li>

          {/* Other top-level options */}
          <li><a className="menu-link" href="/YourRoster">Manage Roster</a></li>
          <li><a className="menu-link" href="#option3">Contact Us</a></li>
          <li><a className="menu-link" href="#option4">Settings</a></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
