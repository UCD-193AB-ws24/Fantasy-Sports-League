import React, { createContext, useState, useEffect } from "react";
import axios from "axios";


export const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
   const [user, setUser] = useState(null);
   const [loading, setLoading] = useState(true);
   const [activeUsers, setActiveUsers] = useState(0);

    // Create a unique session ID for this browser tab
    const [sessionId] = useState(() => {
        // Generate a new session ID or retrieve the existing one for this tab
        const existingId = sessionStorage.getItem("sessionId");
        if (existingId) return existingId;
        
        const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem("sessionId", newId);
        return newId;
       }, []);


   useEffect(() => {
       const ws = new WebSocket("ws://localhost:5002");


       ws.onopen = () => console.log("Connected to WebSocket");
       ws.onmessage = (event) => {
           const data = JSON.parse(event.data);
           setActiveUsers(data.activeUsers);
       };
       ws.onerror = (error) => console.error("WebSocket error:", error);


       return () => ws.close();
   });


   useEffect(() => {
       const fetchProfile = async () => {
           try {
               setLoading(true);
               const response = await axios.get("http://localhost:5001/profile", {
                   withCredentials: true
               });


               const userData = response.data;
               setUser(userData);
               sessionStorage.setItem(`user_${sessionId}`, JSON.stringify(userData));
           } catch (error) {
               console.error("User not authenticated:", error);
               setUser(null);
               sessionStorage.removeItem(`user_${sessionId}`);
           } finally {
               setLoading(false);
           }
       };


       const storedUser = sessionStorage.getItem(`user_${sessionId}`);
       if (storedUser) {
           setUser(JSON.parse(storedUser));
           setLoading(false);
       } else {
           fetchProfile();
       }

        // Clear session when closing tab
        const handleBeforeUnload = () => {
            sessionStorage.removeItem(`user_${sessionId}`);
        };
        
        window.addEventListener("beforeunload", handleBeforeUnload);
        
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [sessionId]);


    const logout = async () => {
        try {
            // Get the session ID
            const sessionId = sessionStorage.getItem("sessionId");
            
            // Use original logout endpoint but with sessionId as query param
            await axios.post(`http://localhost:5001/logout${sessionId ? `?sessionId=${sessionId}` : ''}`, {}, {
                withCredentials: true
            });
    
            // Clear user data
            setUser(null);
            sessionStorage.removeItem(`user_${sessionId}`);
            sessionStorage.setItem("logout", Date.now()); // Keep this for cross-tab communication
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            logout,
            loading,
            activeUsers,
            isAuthenticated: !!user,
            sessionId // Exporting the sessionId
        }}>
            {children}
        </AuthContext.Provider>
    );
 };

