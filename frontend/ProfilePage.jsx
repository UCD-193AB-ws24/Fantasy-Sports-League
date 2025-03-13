import React, { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css"
import Sidebar from './components/Sidebar'
import MenuBar from './components/MenuBar'

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    // Because we cannot have useNavigate in a .jsx file (AuthContext) that is not within the Router domain in App.jsx, needs redirection in DashBoard.jsx instead
    const handleLogout = async () => {
        await logout(); // Call logout from AuthContext
        navigate("/"); // Redirect after logout
    };

    const menuItems = [
        {
          id: 1,
          label: 'Overview',
          path: '/profile' 
        },
        {
          id: 2,
          label: 'Past Leagues',
          path: '/profile-pastleagues'
        },
        {
          id: 3,
          label: 'Roster History',
          path: '/profile-rosterhistory'
        }
      ];
    
//A test page mainly used for testing to see if user persistence works
    return (
        <div className="profilepage-main-container">
            <h1 className="profilepage-title-card">
                Profile
            </h1>            
            <div className="profilepage-upperMenubar-container">
                <nav className="upper-menubar">
                    {menuItems.map((item) => (
                        <button 
                            key={item.id} 
                            className="profilepage-menu-item" 
                            onClick={() => navigate(item.path)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="profilepage-name-date-container">
                <img src="pic1.png"></img>
                <div className="profilepage-name-date-info-container">
                    <p>{user.name}</p>
                    <p>Joined on: {user.createdAt.slice(0,10)}</p>
                </div>
                <div className="profilepage-name-date-aboutme-container">
                    <p>About Me:</p>
                </div>
            </div>

            <div className="profilepage-achievements-container">

            </div>

            <div className="profilepage-roster-info-container">

            </div>

            <div className="profilepage-extra-container">

            </div>


            <Sidebar/>
            

            
            <div className="profilepage-logout-container">
                <button onClick={handleLogout} className="button-49"><p className="Logout-title">Logout</p></button>             
                <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
            </div>



        </div>
    );
};

export default ProfilePage;
