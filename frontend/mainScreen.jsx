import React from 'react';
import { useNavigate } from 'react-router-dom';  // Import for navigation
import MenuBar from './MenuBar';
import TutorialButton from './TutorialButton';  
import RegisterNow from './registerNow';
import './mainScreen.css';
import './TutorialButton.css';

const MainScreen = () => {
  const navigate = useNavigate();  // Hook for navigation

  const handleLoginRedirect = () => {
    navigate('/login'); // Redirects to the login page
  };

  const infoBoxes = [
    { title: "Kevin Durant Joins Exclusive 30,000-Point Club", content: "On February 11, 2025, Kevin Durant became the eighth player in NBA history to surpass 30,000 career points during the Phoenix Suns' game against the Memphis Grizzlies." },
    { title: "LeBron James Extends All-Star Appearance Record", content: "Set to make his 21st NBA All-Star game appearance in 2025 at age 40, LeBron James continues to hold the record for the most All-Star selections in NBA history" },
    { title: "NBA Plans Regular-Season Games in Manchester", content: "The NBA is considering hosting regular-season games in Manchester and developing a Manchester City basketball team for a potential NBA Europe competition, aiming to expand its presence in Europe" }
  ];
  
  const infoBoxes2 = [
    { title: "Luka Dončić Donates $500,000 to LA Wildfire Relief", content: "Following his trade to the LA Lakers, Luka Dončić donated $500,000 to support recovery efforts after devastating wildfires in Los Angeles, focusing on rebuilding playgrounds and fields for children" },
    { title: "Breaking News", content: "please help me" },
    { title: "Devin Booker Becomes Suns' All-Time Leading Scorer", content: "On February 3, 2025, Devin Booker surpassed Walter Davis to become the all-time leading scorer in Phoenix Suns franchise history" }
  ];

  return (
    <div className="main-screen">
      <video autoPlay loop muted playsInline className="background-video">
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <MenuBar />
      <div className="container">
        <h1 className="moving-text">Fantasy Basketball</h1>
        
        <div className="tutorial-button">
          <TutorialButton />
        </div>

        <div className="registerToday-button">
          <RegisterNow />
        </div>  

        {/* 🏀 Login Button */}
        <div className="login-button-container">
          <button onClick={handleLoginRedirect} className="login-button">
            Log In
          </button>
        </div>
              
        <div className='newsFeed'> 
          <div className='dot'></div>
          <div className='newsText'>Live Updates</div>
        </div>

        <div className="info-box-container">
          {infoBoxes.map((info, index) => (
            <div key={index} className="info-box">
              <h3>{info.title}</h3>
              <p>{info.content}</p>
            </div>
          ))}
        </div>

        <div className="info-box-container">
          {infoBoxes2.map((info, index) => (
            <div key={index} className="info-box">
              <h3>{info.title}</h3>
              <p>{info.content}</p>
            </div>
          ))}
        </div>
      </div>      
    </div>
  );
};

// Styling for the Login Button
const styles = {
  loginButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  },
  loginButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '12px 24px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '20px',
  },
};

export default MainScreen;
