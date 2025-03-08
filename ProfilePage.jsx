import React, { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css"

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    // Because we cannot have useNavigate in a .jsx file (AuthContext) that is not within the Router domain in App.jsx, needs redirection in DashBoard.jsx instead
    const handleLogout = async () => {
        await logout(); // Call logout from AuthContext
        navigate("/"); // Redirect after logout
    };
//A test page mainly used for testing to see if user persistence works
    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <div className="profilepage-logout-container">
                <button onClick={handleLogout} className="button-49"><p className="Logout-title">Logout</p></button> 
            </div>
            <h1>Profile Page</h1>

            {user ? (
                <div>
                    <h2>Profile Details</h2>
                    <p>Username: {user.username}</p>
                    <p>Email: {user.email}</p>
                    <p>User ID: {user.id}</p>
                </div>
            ) : (
                <p>You are not logged in.</p>
            )}

            <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
    );
};

export default ProfilePage;
