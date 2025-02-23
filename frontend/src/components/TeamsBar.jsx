import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MenuBar.css";

function TeamsBar() {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const menuItems = [
    { id: 1, label: "Boston Celtics", path: "/" },
    { id: 2, label: "Golden State Warriors", path: "/golden-state-warriors" },
    { id: 3, label: "LA Lakers", path: "/la-lakers" },
    { id: 4, label: "Dallas Mavericks", path: "/dallas-mavericks" },
    { id: 5, label: "LA Clippers", path: "/la-clippers" },
    { id: 6, label: "New York Knicks", path: "/new-york-knicks" },
    { id: 7, label: "Chicago Bulls", path: "/chicago-bulls" },
    { id: 8, label: "Cleveland Cavaliers", path: "/cleveland-cavaliers" },
    { id: 9, label: "Miami Heat", path: "/miami-heat" },
  ];

  return (
    <div className="menu-bar">
      {menuItems.map((item) => (
        <div
          key={item.id}
          className="menu-item-container"
          onClick={() => navigate(item.path)}
          style={{ cursor: "pointer" }}
        >
          <div className="menu-item">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export default TeamsBar;
