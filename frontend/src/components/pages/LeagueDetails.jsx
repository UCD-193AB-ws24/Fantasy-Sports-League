import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar';
import { AuthContext } from '../../AuthContext';
import axios from 'axios';
import './LeagueDetails.css';

const LeagueDetails = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('standings');
  const [editMode, setEditMode] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 10,
    scoringFormat: 'Standard',
    draftType: 'Snake',
    isPrivate: false,
    draftDate: ''
  });

  useEffect(() => {
    const fetchLeague = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
          withCredentials: true
        });
        
        setLeague(response.data);
        setFormData({
          name: response.data.name,
          maxTeams: response.data.maxTeams,
          scoringFormat: response.data.scoringFormat,
          draftType: response.data.draftType,
          isPrivate: response.data.isPrivate,
          draftDate: response.data.draftDate ? new Date(response.data.draftDate).toISOString().split('T')[0] : ''
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching league:", error);
        setError('Failed to fetch league details');
        setLoading(false);
      }
    };
    
    fetchLeague();
  }, [leagueId]);

  // Add this function to handle leaving a league
    const handleLeaveLeague = async () => {
        setLeaveLoading(true);
        try {
        await axios.post(
            'http://localhost:5001/api/leagues/leave',
            { leagueId },
            { withCredentials: true }
        );
        
        // Navigate back to leagues page
        navigate('/leagues');
        } catch (error) {
        console.error("Error leaving league:", error);
        setError(error.response?.data?.error || 'Failed to leave league');
        setLeaveLoading(false);
        setShowLeaveConfirm(false);
        }
    };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put(`http://localhost:5001/api/leagues/${leagueId}`,
        formData,
        { withCredentials: true }
      );
      
      // Refresh league data
      const response = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
        withCredentials: true
      });
      
      setLeague(response.data);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating league:", error);
      setError('Failed to update league settings');
    }
  };

  const isCommissioner = league && user && league.commissionerId === user.id.toString();

  if (loading) {
    return (
      <div>
        <MenuBar />
        <div className="LD_container">
          <h2>Loading league details...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <MenuBar />
        <div className="LD_container">
          <h2>Error: {error}</h2>
          <button onClick={() => navigate('/leagues')} className="LD_button">Back to Leagues</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MenuBar />
      <div className="LD_container">
        <div className="LD_header-section">
          <h1 className="LD_league-name">{league.name}</h1>
          <div className="LD_league-info">
            <span>Teams: {league.users?.length || 0} / {league.maxTeams}</span>
            <span>Format: {league.scoringFormat}</span>
            <span>Draft Type: {league.draftType}</span>
            <span>League ID: {league.id}</span>
          </div>
        </div>
        
        {/* League Navigation Tabs */}
        <div className="LD_tabs">
          <button 
            className={`LD_tab ${activeTab === 'standings' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            Standings
          </button>
          <button 
            className={`LD_tab ${activeTab === 'transactions' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`LD_tab ${activeTab === 'chat' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            League Chat
          </button>
          <button 
            className={`LD_tab ${activeTab === 'trading' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('trading')}
          >
            Trading List
          </button>
          <button 
            className={`LD_tab ${activeTab === 'stats' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Team Stats
          </button>
          <button 
            className={`LD_tab ${activeTab === 'records' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            Record Book
          </button>
          <button 
            className={`LD_tab ${activeTab === 'email' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Email League
          </button>
          <button 
            className={`LD_tab ${activeTab === 'dues' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('dues')}
          >
            Dues
          </button>
          <button 
            className={`LD_tab ${activeTab === 'managers' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('managers')}
          >
            Managers
          </button>
          <button 
            className={`LD_tab ${activeTab === 'rosters' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('rosters')}
          >
            Rosters
          </button>
          <button 
            className={`LD_tab ${activeTab === 'draft' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            Draft
          </button>
          {isCommissioner && (
            <button 
              className={`LD_tab ${activeTab === 'settings' ? 'LD_active-tab' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          )}
        </div>
        
        {/* Tab Content */}
        <div className="LD_tab-content">
          {activeTab === 'standings' && (
            <div className="LD_standings">
              <h2>League Standings</h2>
              <table className="LD_standings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Manager</th>
                    <th>W</th>
                    <th>L</th>
                    <th>Win %</th>
                    <th>Pts For</th>
                    <th>Pts Against</th>
                  </tr>
                </thead>
                <tbody>
                  {league.users?.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.teamName || `Team ${user.name}`}</td>
                      <td>{user.name}</td>
                      <td>0</td>
                      <td>0</td>
                      <td>.000</td>
                      <td>0</td>
                      <td>0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'managers' && (
            <div className="LD_managers">
              <h2>League Managers</h2>
              <div className="LD_managers-list">
                {league.users?.map(user => (
                  <div key={user.id} className="LD_manager-card">
                    <h3>{user.name}</h3>
                    <p>{user.teamName || `Team ${user.name}`}</p>
                    <p>{user.email}</p>
                    {league.commissionerId === user.id.toString() && (
                      <span className="LD_commissioner-badge">Commissioner</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && isCommissioner && (
            <div className="LD_settings">
              <h2>League Settings</h2>
              
              {editMode ? (
                <form className="LD_settings-form">
                  <div className="LD_form-group">
                    <label htmlFor="name">League Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="LD_input"
                    />
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="maxTeams">Max Teams</label>
                    <select
                      id="maxTeams"
                      name="maxTeams"
                      value={formData.maxTeams}
                      onChange={handleChange}
                      className="LD_select"
                    >
                      {[4, 6, 8, 10, 12, 14, 16, 20].map(num => (
                        <option key={num} value={num}>{num} Teams</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="scoringFormat">Scoring Format</label>
                    <select
                      id="scoringFormat"
                      name="scoringFormat"
                      value={formData.scoringFormat}
                      onChange={handleChange}
                      className="LD_select"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Points">Points Only</option>
                      <option value="Categories">Category Based</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="draftType">Draft Type</label>
                    <select
                      id="draftType"
                      name="draftType"
                      value={formData.draftType}
                      onChange={handleChange}
                      className="LD_select"
                    >
                      <option value="Snake">Snake</option>
                      <option value="Auction">Auction</option>
                      <option value="Linear">Linear</option>
                    </select>
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="draftDate">Draft Date</label>
                    <input
                      id="draftDate"
                      type="date"
                      name="draftDate"
                      value={formData.draftDate}
                      onChange={handleChange}
                      className="LD_input"
                    />
                  </div>
                  
                  <div className="LD_form-group LD_checkbox-group">
                    <label htmlFor="isPrivate" className="LD_checkbox-label">
                      <input
                        id="isPrivate"
                        type="checkbox"
                        name="isPrivate"
                        checked={formData.isPrivate}
                        onChange={handleChange}
                        className="LD_checkbox"
                      />
                      <span>Private League</span>
                    </label>
                  </div>
                  
                  <div className="LD_button-group">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="LD_button LD_cancel-button"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="LD_button LD_save-button"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              ) : (
                <div className="LD_settings-view">
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">League Name:</span>
                    <span className="LD_settings-value">{league.name}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Max Teams:</span>
                    <span className="LD_settings-value">{league.maxTeams}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Scoring Format:</span>
                    <span className="LD_settings-value">{league.scoringFormat}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Draft Type:</span>
                    <span className="LD_settings-value">{league.draftType}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Draft Date:</span>
                    <span className="LD_settings-value">
                      {league.draftDate ? new Date(league.draftDate).toLocaleDateString() : 'Not scheduled'}
                    </span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">League Type:</span>
                    <span className="LD_settings-value">{league.isPrivate ? 'Private' : 'Public'}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Created:</span>
                    <span className="LD_settings-value">{new Date(league.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <button
                    onClick={() => setEditMode(true)}
                    className="LD_button LD_edit-button"
                  >
                    Edit Settings
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Placeholder content for other tabs */}
          {activeTab === 'transactions' && (
            <div className="LD_transactions">
              <h2>League Transactions</h2>
              <p>No transactions to display yet.</p>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div className="LD_chat">
              <h2>League Chat</h2>
              <p>Chat functionality coming soon.</p>
            </div>
          )}
          
          {activeTab === 'trading' && (
            <div className="LD_trading">
              <h2>Trading Block</h2>
              <p>No players on the trading block yet.</p>
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div className="LD_stats">
              <h2>Team Stats</h2>
              <p>Team statistics will be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'records' && (
            <div className="LD_records">
              <h2>League Record Book</h2>
              <p>League records will be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'email' && (
            <div className="LD_email">
              <h2>Email League</h2>
              <p>Email functionality coming soon.</p>
            </div>
          )}
          
          {activeTab === 'rosters' && (
            <div className="LD_rosters">
              <h2>League Rosters</h2>
              <p>Team rosters will be displayed here.</p>
            </div>
          )}
          {activeTab === 'draft' && (
        <div className="LD_draft">
          <h2>League Draft</h2>
          
          {league.draftDate ? (
            <div className="LD_draft-info">
              <p><strong>Draft Date:</strong> {new Date(league.draftDate).toLocaleString()}</p>
              <p><strong>Draft Type:</strong> {league.draftType}</p>
              
              {new Date(league.draftDate) > new Date() ? (
                <p className="LD_draft-status LD_upcoming">
                  <span className="LD_status-dot"></span> Upcoming Draft
                </p>
              ) : (
                league.draftCompleted ? (
                  <p className="LD_draft-status LD_completed">
                    <span className="LD_status-dot"></span> Draft Completed
                  </p>
                ) : (
                  <p className="LD_draft-status LD_ready">
                    <span className="LD_status-dot"></span> Ready to Start
                  </p>
                )
              )}
            </div>
          ) : (
            <p>No draft has been scheduled yet.</p>
          )}
          
          <div className="LD_draft-buttons">
            {isCommissioner && !league.draftCompleted && (
              <button
                onClick={() => navigate(`/leagues/${league.id}/draft/setup`)}
                className="LD_button LD_setup-button"
              >
                {league.draftDate ? 'Edit Draft Settings' : 'Setup Draft'}
              </button>
            )}
            
            <button
              onClick={() => navigate(`/leagues/${league.id}/draft`)}
              className="LD_button LD_draft-button"
            >
              {league.draftCompleted ? 'View Draft Results' : 'Enter Draft Room'}
            </button>
          </div>
        </div>
      )}
          {/* Leave League Button - Only show for non-commissioners */}
            {user && league && league.commissionerId !== user.id.toString() && (
            <div className="LD_leave-league">
                <button 
                onClick={() => setShowLeaveConfirm(true)}
                className="LD_button LD_leave-button"
                >
                Leave League
                </button>
            </div>
            )}

            {/* Leave League Confirmation Dialog */}
            {showLeaveConfirm && (
            <div className="LD_confirmation-dialog">
                <div className="LD_confirmation-content">
                <h3>Leave League?</h3>
                <p>Are you sure you want to leave the league "{league.name}"?</p>
                <div className="LD_confirmation-buttons">
                    <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="LD_button LD_cancel-button"
                    disabled={leaveLoading}
                    >
                    Cancel
                    </button>
                    <button
                    onClick={handleLeaveLeague}
                    className="LD_button LD_confirm-button"
                    disabled={leaveLoading}
                    >
                    {leaveLoading ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LeagueDetails;