// src/components/pages/DraftSetup.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar';
import axios from 'axios';
import './DraftSetup.css'; // We'll create this CSS file next

const DraftSetup = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [league, setLeague] = useState(null);
  const [formData, setFormData] = useState({
    draftDate: '',
    timePerPick: 90, // Default to 90 seconds
    draftOrder: 'random', // Default to random
    allowDraftPickTrading: false, // Default to no
  });
  const [users, setUsers] = useState([]);
  const [manualDraftOrder, setManualDraftOrder] = useState([]);

  // Fetch league data on component mount
  useEffect(() => {
    const fetchLeague = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
          withCredentials: true
        });
        
        setLeague(response.data);
        
        // Set form data based on existing league settings
        if (response.data.draftDate) {
          // Format the date to YYYY-MM-DDThh:mm
          const date = new Date(response.data.draftDate);
          const formattedDate = date.toISOString().slice(0, 16);
          
          setFormData(prev => ({
            ...prev,
            draftDate: formattedDate
          }));
        }
        
        // Set users for manual draft order
        if (response.data.users && response.data.users.length > 0) {
          setUsers(response.data.users);
          
          // Initialize the manual draft order with users in their current order
          setManualDraftOrder(response.data.users.map(user => ({
            userId: user.id,
            name: user.name,
            teamName: user.teamName || `Team ${user.name}`
          })));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching league:", error);
        setError('Failed to fetch league details');
        setLoading(false);
      }
    };
    
    fetchLeague();
  }, [leagueId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Move a team up in draft order
  const moveTeamUp = (index) => {
    if (index === 0) return; // Already at the top
    const newOrder = [...manualDraftOrder];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    setManualDraftOrder(newOrder);
  };

  // Move a team down in draft order
  const moveTeamDown = (index) => {
    if (index === manualDraftOrder.length - 1) return; // Already at the bottom
    const newOrder = [...manualDraftOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setManualDraftOrder(newOrder);
  };

  // Randomize draft order
  const randomizeDraftOrder = () => {
    const newOrder = [...manualDraftOrder];
    // Fisher-Yates shuffle algorithm
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setManualDraftOrder(newOrder);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Prepare data for API
      const draftSettings = {
        ...formData
      };
      
      // If order is manual, include the draft order
      if (formData.draftOrder === 'manual') {
        draftSettings.draftOrderList = manualDraftOrder.map(user => user.userId);
      }
      
      // Save draft settings
      await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/setup`, 
        draftSettings,
        { withCredentials: true }
      );
      
      // Navigate back to league details
      navigate(`/leagues/${leagueId}`);
    } catch (error) {
      console.error("Error saving draft settings:", error);
      setError(error.response?.data?.error || 'Failed to save draft settings');
    }
  };

  if (loading) {
    return (
      <div>
        <MenuBar />
        <div className="DS_container">
          <h2>Loading draft setup...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <MenuBar />
        <div className="DS_container">
          <h2>Error: {error}</h2>
          <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DS_button">Back to League</button>
        </div>
      </div>
    );
  }

  // Check if user is commissioner
  const isCommissioner = league && league.commissionerId === localStorage.getItem('userId');

  /*if (!isCommissioner) {
    return (
      <div>
        <MenuBar />
        <div className="DS_container">
          <h2>Access Denied</h2>
          <p>Only the league commissioner can set up the draft.</p>
          <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DS_button">Back to League</button>
        </div>
      </div>
    );
  }*/

  return (
    <div>
      <MenuBar />
      <div className="DS_container">
        <h1 className="DS_header">Draft Setup for {league.name}</h1>
        
        <form onSubmit={handleSubmit} className="DS_form">
          <div className="DS_form-group">
            <label htmlFor="draftDate">Draft Date and Time</label>
            <input
              id="draftDate"
              type="datetime-local"
              name="draftDate"
              value={formData.draftDate}
              onChange={handleChange}
              className="DS_input"
              required
            />
            <p className="DS_help-text">
              Draft settings can be changed until one hour before the scheduled start time.
              All team managers must be joined by the scheduled start time.
            </p>
          </div>
          
          <div className="DS_form-group">
            <label htmlFor="timePerPick">Time Per Pick</label>
            <select
              id="timePerPick"
              name="timePerPick"
              value={formData.timePerPick}
              onChange={handleChange}
              className="DS_select"
              required
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="45">45 seconds</option>
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
            </select>
          </div>
          
          <div className="DS_form-group">
            <label>Draft Type</label>
            <div className="DS_radio-group">
              <div className="DS_radio-option">
                <input
                  type="radio"
                  id="snake"
                  name="draftType"
                  value="Snake"
                  checked={league.draftType === "Snake"}
                  disabled
                />
                <label htmlFor="snake">
                  <strong>Snake Draft</strong> - Each team takes a turn selecting a player in a set amount of time. The draft order reverses each round.
                </label>
              </div>
            </div>
          </div>
          
          <div className="DS_form-group">
            <label>Draft Order</label>
            <div className="DS_radio-group">
              <div className="DS_radio-option">
                <input
                  type="radio"
                  id="randomOrder"
                  name="draftOrder"
                  value="random"
                  checked={formData.draftOrder === "random"}
                  onChange={handleChange}
                />
                <label htmlFor="randomOrder">Random Order</label>
              </div>
              <div className="DS_radio-option">
                <input
                  type="radio"
                  id="manualOrder"
                  name="draftOrder"
                  value="manual"
                  checked={formData.draftOrder === "manual"}
                  onChange={handleChange}
                />
                <label htmlFor="manualOrder">Manually Set by Commissioner</label>
              </div>
            </div>
          </div>
          
          {formData.draftOrder === "manual" && (
            <div className="DS_form-group">
              <label>Manual Draft Order</label>
              <button type="button" onClick={randomizeDraftOrder} className="DS_button DS_randomize-button">
                Randomize
              </button>
              <ul className="DS_draft-order-list">
                {manualDraftOrder.map((user, index) => (
                  <li key={user.userId} className="DS_draft-order-item">
                    <span className="DS_draft-position">{index + 1}</span>
                    <span className="DS_team-name">{user.teamName || `Team ${user.name}`}</span>
                    <span className="DS_user-name">({user.name})</span>
                    <div className="DS_order-buttons">
                      <button 
                        type="button" 
                        onClick={() => moveTeamUp(index)}
                        disabled={index === 0}
                        className="DS_order-button"
                      >
                        ↑
                      </button>
                      <button 
                        type="button" 
                        onClick={() => moveTeamDown(index)}
                        disabled={index === manualDraftOrder.length - 1}
                        className="DS_order-button"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="DS_form-group DS_checkbox-group">
            <label htmlFor="allowDraftPickTrading" className="DS_checkbox-label">
              <input
                id="allowDraftPickTrading"
                type="checkbox"
                name="allowDraftPickTrading"
                checked={formData.allowDraftPickTrading}
                onChange={handleChange}
                className="DS_checkbox"
              />
              <span>Allow Draft Pick Trading</span>
            </label>
          </div>
          
          <div className="DS_button-group">
            <button
              type="button"
              onClick={() => navigate(`/leagues/${leagueId}`)}
              className="DS_button DS_cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="DS_button DS_save-button"
            >
              Save Draft Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DraftSetup;