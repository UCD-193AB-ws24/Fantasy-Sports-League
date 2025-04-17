import React, { useState } from 'react';
import MenuBar from '../MenuBar';
import { useNavigate } from 'react-router-dom';
import "./registerPage.css";
import axios from 'axios';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      
      alert(response.data.message);
      // Redirect to login page after successful registration
      navigate('/login');
    } catch (error) {
      console.error("Registration error:", error);
      console.log("Data:", formData);
      alert(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div>
      <MenuBar />
      <div className="RP_register-wrapper">
        <form className="RP_register-form" onSubmit={handleSubmit}>
          <h2 className="RP_title-header">Register</h2>

          <div className="RP_form-group">
            <label htmlFor="name">Username</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Username"
              className="RP_input-field"
              onChange={handleChange}
              required
            />
          </div>

          <div className="RP_form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="example@email.com"
              className="RP_input-field"
              onChange={handleChange}
              required
            />
          </div>

          <div className="RP_form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Password"
              className="RP_input-field"
              onChange={handleChange}
              required
            />
          </div>

          <div className="RP_form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="RP_input-field"
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="RP_button-23">
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;