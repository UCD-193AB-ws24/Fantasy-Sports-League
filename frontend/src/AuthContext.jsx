import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [activeUsers, setActiveUsers] = useState(0);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:5002");

        ws.onopen = () => console.log("Connected to WebSocket");
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setActiveUsers(data.activeUsers); 
        };
        ws.onerror = (error) => console.error("WebSocket error:", error);

        return () => ws.close();
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get("http://localhost:5001/profile", {
                    withCredentials: true 
                });

                setUser(response.data);
                sessionStorage.setItem("user", JSON.stringify(response.data)); 
            } catch (error) {
                console.error("User not authenticated:", error);
                setUser(null);
            }
        };

        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            fetchProfile();
        }

    
        const handleStorageChange = (event) => {
            if (event.key === "logout") {
                setUser(null);
                sessionStorage.removeItem("user"); 
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    const logout = async () => {
        try {
            await axios.post("http://localhost:5001/logout", {}, {
                withCredentials: true
            });

            setUser(null);
            sessionStorage.removeItem("user");
            sessionStorage.setItem("logout", Date.now());
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout, activeUsers }}>
            {children}
        </AuthContext.Provider>
    );
};
