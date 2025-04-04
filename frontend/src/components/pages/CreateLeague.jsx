// src/components/pages/CreateLeague.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar';
import axios from 'axios';
import './CreateLeague.css';

const CreateLeague = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 10,
    scoringFormat: 'Standard',
    draftType: 'Snake',
    isPrivate: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(
        'http://localhost:5001/api/leagues/create',
        formData,
        { withCredentials: true }
      );
      
      setLoading(false);
      
      // Redirect to the new league page
      navigate(`/leagues/${response.data.league.id}`);
    } catch (error) {
      console.error("Error creating league:", error);
      setError(error.response?.data?.error || 'Failed to create league');
      setLoading(false);
    }
  };

  return (
    <div>
      <MenuBar />
      <div className="CL_container">
        <h1 className="CL_header">Create a New League</h1>
        
        {error && <div className="CL_error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="CL_form">
          <div className="CL_form-group">
            <label htmlFor="name">League Name</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="CL_input"
              required
            />
          </div>
          
          <div className="CL_form-group">
            <label htmlFor="maxTeams">Number of Teams</label>
            <select
              id="maxTeams"
              name="maxTeams"
              value={formData.maxTeams}
              onChange={handleNumberChange}
              className="CL_select"
              required
            >
              {[4, 6, 8, 10, 12, 14, 16, 20].map(num => (
                <option key={num} value={num}>{num} Teams</option>
              ))}
            </select>
          </div>
          
          <div className="CL_form-group">
            <label htmlFor="scoringFormat">Scoring Format</label>
            <select
              id="scoringFormat"
              name="scoringFormat"
              value={formData.scoringFormat}
              onChange={handleChange}
              className="CL_select"
              required
            >
              <option value="Standard">Standard</option>
              <option value="Points">Points Only</option>
              <option value="Categories">Category Based</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          
          <div className="CL_form-group">
            <label htmlFor="draftType">Draft Type</label>
            <select
              id="draftType"
              name="draftType"
              value={formData.draftType}
              onChange={handleChange}
              className="CL_select"
              required
            >
              <option value="Snake">Snake</option>
              <option value="Auction">Auction</option>
              <option value="Linear">Linear</option>
            </select>
          </div>
          
          <div className="CL_form-group CL_checkbox-group">
            <label htmlFor="isPrivate" className="CL_checkbox-label">
              <input
                id="isPrivate"
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="CL_checkbox"
              />
              <span>Private League</span>
            </label>
          </div>
          
          <div className="CL_button-group">
            <button
              type="button"
              onClick={() => navigate('/leagues')}
              className="CL_button CL_cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="CL_button CL_create-button"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeague;