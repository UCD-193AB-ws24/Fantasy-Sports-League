import React, { createContext, useState, useEffect } from "react";
import axios from "axios";


export const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
   const [user, setUser] = useState(null);
   const [loading, setLoading] = useState(true);
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
               setLoading(true);
               const response = await axios.get("http://localhost:5001/profile", {
                   withCredentials: true
               });


               const userData = response.data;
               setUser(userData);
               sessionStorage.setItem("user", JSON.stringify(userData));
           } catch (error) {
               console.error("User not authenticated:", error);
               setUser(null);
               sessionStorage.removeItem("user");
           } finally {
               setLoading(false);
           }
       };


       const storedUser = sessionStorage.getItem("user");
       if (storedUser) {
           setUser(JSON.parse(storedUser));
           setLoading(false);
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
       <AuthContext.Provider value={{
           user,
           setUser,
           logout,
           loading,
           activeUsers,
           isAuthenticated: !!user
       }}>
           {children}
       </AuthContext.Provider>
   );
};

