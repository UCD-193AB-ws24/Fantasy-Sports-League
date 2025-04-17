import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import './LeaguePage.css';

const LeaguesPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [leagues, setLeagues] = useState([]);
  const [userLeagues, setUserLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For join/leave operations
  const [leagueIdToJoin, setLeagueIdToJoin] = useState('');
  const [leagueAction, setLeagueAction] = useState(null); // Track which league is being acted on
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [leagueToLeave, setLeagueToLeave] = useState(null);

  useEffect(() => {
    // Fetch all leagues and user's leagues
    const fetchLeagues = async () => {
      setLoading(true);
      setErrorMessage('');
      
      try {
        // Fetch all leagues
        const allLeaguesResponse = await axios.get('http://localhost:5001/api/leagues', { 
          withCredentials: true 
        });
        
        // Fetch user leagues
        const userLeaguesResponse = await axios.get('http://localhost:5001/api/leagues/user', { 
          withCredentials: true 
        });
        
        // Ensure we have arrays even if the response is null or undefined
        setLeagues(Array.isArray(allLeaguesResponse.data) ? allLeaguesResponse.data : []);
        setUserLeagues(Array.isArray(userLeaguesResponse.data) ? userLeaguesResponse.data : []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching leagues:", error);
        setErrorMessage(error.response?.data?.error || 'Failed to load leagues. Please try again.');
        setLeagues([]);
        setUserLeagues([]);
        setLoading(false);
      }
    };
    
    // Only fetch if user is authenticated
    if (user && user.id) {
      fetchLeagues();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle joining a league
  const handleJoinLeague = async (e) => {
    // Safely handle preventDefault if e exists
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!leagueIdToJoin) {
      setErrorMessage('Please enter a valid League ID');
      return;
    }
    
    try {
      setActionLoading(true);
      setLeagueAction(leagueIdToJoin);
      
      const response = await axios.post(
        'http://localhost:5001/api/leagues/join', 
        { leagueId: leagueIdToJoin },
        { withCredentials: true }
      );
      
      // Show success message and clear input
      setSuccessMessage(response.data.message || 'Successfully joined league!');
      setLeagueIdToJoin('');
      
      // Reload leagues data
      try {
        const [allLeaguesRes, userLeaguesRes] = await Promise.all([
          axios.get('http://localhost:5001/api/leagues', { withCredentials: true }),
          axios.get('http://localhost:5001/api/leagues/user', { withCredentials: true })
        ]);
        
        setLeagues(Array.isArray(allLeaguesRes.data) ? allLeaguesRes.data : []);
        setUserLeagues(Array.isArray(userLeaguesRes.data) ? userLeaguesRes.data : []);
      } catch (error) {
        console.error("Error refreshing leagues after join:", error);
      }
      
      setActionLoading(false);
      setLeagueAction(null);
      
      // We no longer automatically navigate to the league page
      // This allows users to stay on the leagues page and join multiple leagues
      
    } catch (error) {
      console.error("Error joining league:", error);
      setErrorMessage(error.response?.data?.error || 'Failed to join league. Please try again.');
      setActionLoading(false);
      setLeagueAction(null);
    }
  };

  // Handle leaving a league
  const handleLeaveLeague = async (leagueId) => {
    setShowConfirmLeave(false);
    setLeagueToLeave(null);
    
    try {
      setActionLoading(true);
      setLeagueAction(leagueId);
      setErrorMessage('');
      setSuccessMessage('');
      
      const response = await axios.post(
        'http://localhost:5001/api/leagues/leave',
        { leagueId },
        { withCredentials: true }
      );
      
      // Show success message
      setSuccessMessage(response.data.message || 'Successfully left league!');
      
      // Update the lists by removing the league from userLeagues
      setUserLeagues(prevLeagues => prevLeagues.filter(league => league.id !== parseInt(leagueId)));
      
      // Reload all leagues in case this was a public league that should now appear again
      try {
        const allLeaguesRes = await axios.get('http://localhost:5001/api/leagues', { withCredentials: true });
        setLeagues(Array.isArray(allLeaguesRes.data) ? allLeaguesRes.data : []);
      } catch (error) {
        console.error("Error refreshing leagues after leave:", error);
      }
      
      setActionLoading(false);
      setLeagueAction(null);
      
    } catch (error) {
      console.error("Error leaving league:", error);
      setErrorMessage(error.response?.data?.error || 'Failed to leave league. Please try again.');
      setActionLoading(false);
      setLeagueAction(null);
    }
  };

  // Function to confirm before leaving a league
  const confirmLeaveLeague = (league) => {
    setLeagueToLeave(league);
    setShowConfirmLeave(true);
  };

  const handleJoinClick = (leagueId) => {
    setLeagueIdToJoin(leagueId.toString());
    handleJoinLeague(); // No event object here
  };

  return (
    <div>
      <MenuBar />
      <div className="LP_container">
        <h1 className="LP_header">Fantasy Basketball Leagues</h1>
        
        {/* Error message */}
        {errorMessage && (
          <div className="LP_error-message">{errorMessage}</div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div className="LP_success-message">{successMessage}</div>
        )}
        
        {/* Confirmation Dialog for Leaving League */}
        {showConfirmLeave && leagueToLeave && (
          <div className="LP_confirmation-dialog">
            <div className="LP_confirmation-content">
              <h3>Leave League?</h3>
              <p>Are you sure you want to leave the league "{leagueToLeave.name}"?</p>
              <div className="LP_confirmation-buttons">
                <button
                  onClick={() => {
                    setShowConfirmLeave(false);
                    setLeagueToLeave(null);
                  }}
                  className="LP_button LP_cancel-button"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLeaveLeague(leagueToLeave.id)}
                  className="LP_button LP_confirm-button"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="LP_actions">
          <Link to="/leagues/create" className="LP_button LP_create-button">Create New League</Link>
          
          <div className="LP_join-section">
            <form onSubmit={handleJoinLeague} className="LP_join-form">
              <input
                type="text"
                placeholder="Enter League ID"
                value={leagueIdToJoin}
                onChange={(e) => setLeagueIdToJoin(e.target.value)}
                className="LP_input"
              />
              <button 
                type="submit" 
                className="LP_button LP_join-button"
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Join League'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Loading indicator */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading leagues data...</p>
          </div>
        ) : (
          <>
            {/* My Leagues Section */}
            <div className="LP_my-leagues">
              <h2>My Leagues</h2>
              
              {userLeagues.length === 0 ? (
                <p>You haven't joined any leagues yet. Create a new league or join an existing one!</p>
              ) : (
                <div className="LP_leagues-grid">
                  {userLeagues.map(league => (
                    <div key={league.id} className="LP_league-card">
                      <h3>{league.name}</h3>
                      <p>Teams: {league.users?.length || 0} / {league.maxTeams}</p>
                      <p>Format: {league.scoringFormat}</p>
                      <p>Draft Type: {league.draftType}</p>
                      
                      <div className="LP_card-actions">
                        <Link to={`/leagues/${league.id}`} className="LP_view-button">
                          View League
                        </Link>
                        
                        {/* Don't show leave button for commissioners */}
                        {league.commissionerId !== user?.id?.toString() && (
                          <button
                            onClick={() => confirmLeaveLeague(league)}
                            className="LP_button LP_leave-button"
                            disabled={actionLoading && leagueAction === league.id}
                          >
                            {actionLoading && leagueAction === league.id ? 'Processing...' : 'Leave League'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Public Leagues Section */}
            <div className="LP_public-leagues">
              <h2>Public Leagues</h2>
              
              {leagues.filter(league => !league.isPrivate).length === 0 ? (
                <p>No public leagues available. Why not create one?</p>
              ) : (
                <div className="LP_leagues-grid">
                  {leagues
                    .filter(league => !league.isPrivate)
                    .filter(league => !userLeagues.some(userLeague => userLeague.id === league.id))
                    .map(league => (
                      <div key={league.id} className="LP_league-card">
                        <h3>{league.name}</h3>
                        <p>Teams: {league.users?.length || 0} / {league.maxTeams}</p>
                        <p>Format: {league.scoringFormat}</p>
                        <p>Draft Type: {league.draftType}</p>
                        <p>League ID: {league.id}</p>
                        <button 
                          className="LP_button LP_join-button"
                          style={{ width: '100%', marginTop: '10px' }}
                          disabled={actionLoading || league.users?.length >= league.maxTeams}
                          onClick={() => handleJoinClick(league.id)}
                        >
                          {actionLoading && leagueAction === league.id ? 'Processing...' : 
                            league.users?.length >= league.maxTeams ? 'Full' : 'Join'}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaguesPage;