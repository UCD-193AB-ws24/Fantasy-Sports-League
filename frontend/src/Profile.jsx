import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MenuBar from "./components/MenuBar";
import "./Profile.css";

import ProfilePageHeader from "./components/mainScreenTemplateDemos/ProfilePageHeader.jsx";
import DemoFooter from "./components/mainScreenTemplateDemos/DemoFooter.jsx";
import "bootstrap/dist/css/bootstrap.min.css";


const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [teamName, setTeamName]   = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage]     = useState("");
  React.useEffect(() => {
    const sheets = [
      createLink("/assets/css/bootstrap.min.css"),
      createLink("/assets/css/nucleo-icons.css"),
      createLink("/assets/css/paper-kit.css"),
    ];
    sheets.forEach(s => document.head.appendChild(s));
    return () => sheets.forEach(s => document.head.removeChild(s));
  }, []);

  // helper to make a <link>
  function createLink(href) {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = href;
    return link;
  }

  // ─── Fetch existing team name ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchTeamName = async () => {
      try {
        const resp = await axios.get(
          "http://localhost:5001/api/user/teamName",
          { withCredentials: true }
        );
        setTeamName(resp.data.teamName || "");
      } catch (err) {
        console.error("Error fetching team name:", err);
      }
    };
    fetchTeamName();
  }, [user]);

  // ─── Logout handler ────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ─── Save updated team name ────────────────────────────────────────────────
  const handleTeamNameSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:5001/api/user/updateTeamName",
        { teamName },
        { withCredentials: true }
      );
      setMessage("Team name updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating team name:", err);
      setMessage("Failed to update team name.");
    }
  };

  return (
    <>
      {/* keep your own menu bar */}
      <MenuBar />

      {/* optional template header — copy ProfilePageHeader.js into your project if you want it */}
      <ProfilePageHeader />
      <div className="section profile-content">
      <div className="container">
        {user ? (
          <div
            className="profile-details mx-auto text-center"
            style={{ maxWidth: 600 }}
          >
            {/* Profile header */}
            <h2 className="title">My Profile</h2>
            <p className="profile-info">
              <strong>Username:</strong> {user.name}
            </p>
            <p className="profile-info">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="profile-info">
              <strong>User ID:</strong> {user.id}
            </p>

            {/* Team info + message */}
            <div className="team-name-section mt-4">

              <h2 className="title">Team Information</h2>
              {message && (
                <div className="profile-message mb-3">{message}</div>
              )}
              {isEditing ? (
                <form onSubmit={handleTeamNameSubmit}>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    className="input-field"
                  />
                  <div className="mt-2">
                    <button type="submit" className="button-23">
                      Save
                    </button>{" "}
                    <button
                      type="button"
                      className="button-23"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <p className="lead">{teamName || "Not set"}</p>
                  <button
                    className="button-23"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Team Name
                  </button>
                </div>
              )}
            
            </div>

            {/* Logout */}
            <div className="text-center mt-4">
              <button className="button-49" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center">You are not logged in.</p>
        )}
      </div>
    </div>

    <DemoFooter />
  </>
);


};

export default ProfilePage;