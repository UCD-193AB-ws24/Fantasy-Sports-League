import React, { useState } from "react";
import MenuBar from "../../MenuBar";
import "../../mainScreen.css";
import '../../BostonCelts.css';
import './Bulls.css';
import Bulls from './Bulls'
import TeamsBar from "../../TeamsBar";

const backgrounds = [
  {
    image: "jasontatumBackground.jpg",
    specialText0:"Make",
    specialText: "Your",
    specialText2: "Own Legend",
    showSignIn: true, // Indicates that a sign-in box should be shown
  },
  {
    image: "lebronDunk.jpg",
    description: "New Innovative Roster!",
    nextdecrip: "Update Coming Soon",
    moreInfo:"For more info on this future update, check it out here!",
  },
  {
    image: "mjBackgorund.jpg"
  },
  {
    image: "celticsBackground.jpg",
  }
];


const BullsmainScreen = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [index, setIndex] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleNext = () => {
    setIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
    setShowSignIn(false);
  };

  const handlePrev = () => {
    setIndex((prevIndex) => (prevIndex - 1 + backgrounds.length) % backgrounds.length);
    setShowSignIn(false);
  };

  const toggleSignIn = () => {
    setShowSignIn((prev) => !prev);
  };

  return (
    <div className="main-container">
      <MenuBar/>
      <div className="main-picture" style={{ backgroundImage: `url(${backgrounds[index].image})` }}>
        <button className="arrow left" onClick={handlePrev}>{"<"}</button>
        <button className="arrow right" onClick={handleNext}>{">"}</button>

        <div className="play-Container">Fantasy</div>
        <div className="risk-Container">Welcome Back, Champ</div>
        <div className="win-Container">Sports</div>

        <div className="background-text">
          <h2 className="background-title">{backgrounds[index].title}</h2>
          <h2 className="specialTitle">{backgrounds[index].specialText0}</h2>

          <h2 className="specialTitle">{backgrounds[index].specialText}</h2>
          <h2 className="specialTitle">{backgrounds[index].specialText2}</h2>

          <p className="background-description">{backgrounds[index].description}</p>
          <p className="background-description">{backgrounds[index].nextdecrip}</p>

        </div>

        {backgrounds[index].showSignIn ? (
          <div className="login-container">
            <button className="login-button" onClick={toggleSignIn}>
              {showSignIn ? "Welcome Back Champ" : "Login"}
            </button>
            {showSignIn && (
              <div className="sign-in-box">
                <input type="text" placeholder="Username" />
                <input type="password" placeholder="Password" />
                <button>Login</button>
              </div>
            )}
          </div>
        ) : null}

        <div className="main-Info">
          <p className="latest-News">Latest Games</p>
          <div className="teamBar">
            <TeamsBar />
          </div>
          <div className="bulls-container">
            <div className="timeline-section">
              <Bulls onEventClick={handleEventClick} />
            </div>
            <div className="event-details-section">
              {selectedEvent ? (
                <div>
                  <h2 className="event-title">{selectedEvent.description} on {selectedEvent.date} </h2>
                  <div className="images-container">
                    {selectedEvent.images.map((imgSrc, index) => (
                      <img key={index} src={imgSrc} alt={`${selectedEvent.description} image ${index + 1}`} className="game-Image" />
                    ))}
                  </div>
                  {selectedEvent.postDescrip && <p>{selectedEvent.postDescrip}</p>}
                </div>
              ) : (
                <p></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BullsmainScreen;
