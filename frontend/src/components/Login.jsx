import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import MenuBar from './MenuBar';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    name: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { setUser, fetchProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5001/login', formData, {
        withCredentials: true
      });

      // Set user in context and fetch complete profile
      setUser(response.data.user);
      await fetchProfile(); // Make sure we have the complete user profile
      
      // Store session start time
      localStorage.setItem("authSession", Date.now().toString());
      
      // Redirect to home page or original destination
      navigate(from);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div>
      <MenuBar />
      <div className="login-wrapper">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="title-header">Login</h2>
          
          {error && <div className="error-message">{error}</div>}

          <h3 className="texts">Username</h3>
          <input 
            type="text" 
            name="name" 
            placeholder="Username" 
            className="input-field" 
            onChange={handleChange} 
            required 
          />

          <h3 className="texts">Password</h3>
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            className="input-field" 
            onChange={handleChange} 
            required 
          />

          <button type="submit" className="button-23">Login</button>
          
          <div className="register-link">
            <p>Don't have an account? <a href="/register">Register</a></p>
          </div>
          
          <div className="google-login">
            <a href="http://localhost:5001/auth/google" className="google-btn">
              Login with Google
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
