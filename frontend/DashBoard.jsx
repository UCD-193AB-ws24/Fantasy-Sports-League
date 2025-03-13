import React, { useContext } from "react";
import { AuthContext } from "./AuthContext"; // Import Auth Context
import { useNavigate } from "react-router-dom";
import MenuBar from "./components/MenuBar";
import './DashBoard.css';


const Dashboard = () => {

  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  // Because we cannot have useNavigate in a .jsx file (AuthContext) that is not within the Router domain in App.jsx, needs redirection in DashBoard.jsx instead
  const handleLogout = async () => {
      await logout(); 
      navigate("/"); 
  };

  const goToTest = async () => {
    nagivate("/test");
  }
  const { activeUsers } = useContext(AuthContext);

  return (
    <div className="page-container">
      <div className="profilepage-logout-container">
        <button onClick={handleLogout} className="button-49"><p className="Logout-title">Logout</p></button> 
      </div>
      <div className="section section-1">
        <div className="subsection">
          <img src="pic1.png"></img>
          {user ? (
                <div>
                    <p className="info-text">Username: {user.name}</p>
                    <p className="info-text">Email: {user.email}</p>
                    <p className="info-text">User ID: {user.id}</p>
                    <p>Currently Active Users: {activeUsers}</p>
                </div>
            ) : (
                <p className="info-text">Please reload.</p>
            )}

          </div>
        <div className="subsection">Your Wins</div>
      </div>
      <div className="section section-2">
        <div className="subsection">Your Roster</div>
        <div className="subsection">Current Leagues</div>
      </div>
      <div className="section section-3">
        <div className="subsection">
          <button className="test-button-test" onClick={() => navigate("/profile")}></button>
        </div>
        <div className="subsection">Settings</div>
      </div>
    </div>
  );
};

export default Dashboard;

/*
Main issue was providing multiple users to access the website at the same time
Previous implementation 3/4 allowed only one user - multiple users would try and take control of the website from the other - No concurrency
Old implementation stored user info in React Context (useState)- global state that all tabs of the website shared - Possible use of this for other features like news and updates
  - Will research more on this
New implementation places user info in both useState and sessionStorage
  - This allows for multiple users to have their own info storage in the current tab they are logged into
  - This will be helpful for development during the game development process

 */

