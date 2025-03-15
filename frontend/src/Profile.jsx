import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MenuBar from "./components/MenuBar";
import "./Profile.css";

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [teamName, setTeamName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Fetch team name if user exists
        if (user) {
            const fetchTeamName = async () => {
                try {
                    const response = await axios.get(`http://localhost:5001/api/user/teamName`, {
                        withCredentials: true
                    });
                    setTeamName(response.data.teamName || "");
                } catch (error) {
                    console.error("Error fetching team name:", error);
                }
            };
            fetchTeamName();
        }
    }, [user]);

    const handleLogout = async () => {
        await logout(); // Call logout from AuthContext
        navigate("/"); // Redirect after logout
    };

    const handleTeamNameSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post("http://localhost:5001/api/user/updateTeamName", 
                { teamName }, 
                { withCredentials: true }
            );
            setMessage("Team name updated successfully!");
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating team name:", error);
            setMessage("Failed to update team name.");
        }
    };

    return (
        <div>
            <MenuBar />
            <div style={{ textAlign: "center", marginTop: "50px" }}>
                <div className="profilepage-logout-container">
                    <button onClick={handleLogout} className="button-49"><p className="Logout-title">Logout</p></button> 
                </div>
                <h1>Profile Page</h1>

                {message && <div className="message">{message}</div>}

                {user ? (
                    <div>
                        <h2>Profile Details</h2>
                        <p>Username: {user.name}</p>
                        <p>Email: {user.email}</p>
                        <p>User ID: {user.id}</p>
                        
                        <div className="team-name-section">
                            <h3>Team Name</h3>
                            {isEditing ? (
                                <form onSubmit={handleTeamNameSubmit}>
                                    <input 
                                        type="text" 
                                        value={teamName} 
                                        onChange={(e) => setTeamName(e.target.value)}
                                        placeholder="Enter your team name"
                                        className="input-field"
                                    />
                                    <div>
                                        <button type="submit" className="button-23">Save</button>
                                        <button 
                                            type="button" 
                                            className="button-23" 
                                            onClick={() => setIsEditing(false)}
                                            style={{ marginLeft: "10px" }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <p>{teamName || "Not set"}</p>
                                    <button 
                                        onClick={() => setIsEditing(true)} 
                                        className="button-23"
                                    >
                                        Edit Team Name
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p>You are not logged in.</p>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;

