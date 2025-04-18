import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import MenuBar from './MenuBar';
import './Login.css';

const CrossfadeImage = ({ src, alt, duration = 1000 }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [nextSrc, setNextSrc] = useState(null);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // When src prop changes, store it as nextSrc
  useEffect(() => {
    if (src !== currentSrc) {
      setNextSrc(src);
    }
  }, [src, currentSrc]);

  // When the next image loads, start the fade transition
  const handleNextImageLoad = () => {
    // Begin fade transition by setting opacity from 0 to 1
    setIsFading(true);
    setFadeOpacity(1);

    // After the fade duration, update the current image
    setTimeout(() => {
      setCurrentSrc(src);
      setNextSrc(null);
      setIsFading(false);
      setFadeOpacity(0); // reset for the next cycle
    }, duration);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Current image stays fully visible until fade completes */}
      <img
        src={currentSrc}
        alt={alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 1,
        }}
      />
      {/* Next image: wait for it to load before fading in */}
      {nextSrc && (
        <img
          src={nextSrc}
          alt={alt}
          onLoad={handleNextImageLoad}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: fadeOpacity,
            transition: isFading ? `opacity ${duration}ms ease-in-out` : 'none',
          }}
        />
      )}
    </div>
  );
};

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

  // Define an array of image paths (ensure these exist in public/Login_Pictures)
  const images = [
    '/Login_Pictures/image1.jpg',
    '/Login_Pictures/image2.jpg',
    '/Login_Pictures/image3.jpg',
    '/Login_Pictures/image4.jpg',
    '/Login_Pictures/image5.jpg',
    '/Login_Pictures/image6.jpg',
    '/Login_Pictures/image7.jpg',
    '/Login_Pictures/image8.jpg',
    '/Login_Pictures/image9.jpg'
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate images every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    try {
      // Get the sessionId from context
      const sessionId = localStorage.getItem("sessionId") || 
        `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Add sessionId as a query param
      const response = await axios.post(`http://localhost:5001/login?sessionId=${sessionId}`, 
        formData, 
        { withCredentials: true }
      );
      
      setUser(response.data.user);
      await fetchProfile();
      
      // Store the session for this tab only
      sessionStorage.setItem(`authSession_${sessionId}`, Date.now().toString());
      sessionStorage.setItem("sessionId", sessionId);
      
      navigate(from);
    } catch (err) {
      setError(err.response?.data?.error);
    }
  };

  return (
    <>
      <MenuBar />
      <div className="Login_login-wrapper">
        <div className="Login_login-card">
          <div className="Login_login-image">
            <CrossfadeImage
              src={images[currentImageIndex]}
              alt="login illustration"
              duration={1000}
            />
          </div>
          <div className="Login_login-content">
            <h2 className="Login_title-header">Welcome Back!</h2>
            {error && <div className="Login_error-message">{error}</div>}
            <form className="Login_login-form" onSubmit={handleSubmit}>
              <label className="Login_texts" htmlFor="usernameInput">Username</label>
              <input 
                type="text" 
                id="usernameInput"
                name="name" 
                placeholder="Username" 
                className="Login_input-field" 
                onChange={handleChange} 
                required 
              />
              <label className="Login_texts" htmlFor="passwordInput">Password</label>
              <input 
                type="password" 
                id="passwordInput"
                name="password" 
                placeholder="Password" 
                className="Login_input-field" 
                onChange={handleChange} 
                required 
              />
              <button type="submit" className="Login_button-23">Login</button>
            </form>
            <div className="Login_google-login">
              <a href="http://localhost:5001/auth/google" className="Login_google-btn">
                <span className="Login_google-icon">
                  <svg width="18" height="18" viewBox="0 0 256 262" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M255.2 131.1c0-8.7-.7-17.1-2.1-25.1H130v47.4h70.3c-3 16.4-12.4 30.3-26.5 39.6v32.9h42.9c25.1-23.1 39.7-57.3 39.7-94.8z"/>
                    <path fill="#34A853" d="M130 261.1c35.1 0 64.6-11.6 86.1-31.3l-42.9-32.9c-11.9 8-27.3 12.9-43.2 12.9-33.2 0-61.3-22.4-71.4-52.5H14.7v32.9C36.7 226 79.6 261.1 130 261.1z"/>
                    <path fill="#FBBC05" d="M58.6 157.1c-2.7-8.3-4.2-17.1-4.2-26 0-8.9 1.5-17.7 4.2-26V72.1H14.7C5.3 89.8 0 110.8 0 131.1s5.3 41.3 14.7 58.9l43.9-32.9z"/>
                    <path fill="#EA4335" d="M130 52.2c19.1 0 36.2 6.6 49.8 19.5l37.4-37.4C196.3 15 165.2 0 130 0 79.6 0 36.7 35 14.7 86.1l43.9 32.9C68.7 74.6 96.8 52.2 130 52.2z"/>
                  </svg>
                </span>
                <span>Login with Google</span>
              </a>
            </div>
            <div className="Login_register-link">
              <p>Don't have an account? <a href="/register">Register</a></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;