import React from 'react'

const GoldenState= ({ onEventClick }) =>{
    const events = [
        {
          date: "FEB 20 (PAST)",
          description: "vs. Philadelphia 76ers",
          images: ["boston2-20.png", "76ers2-20.png"] // Two images
        },
        {
          date: "FEB 23",
          description: "vs. New York Knicks",
          images: ["bostonBet.png", "knicksBet.png"]
        },
        {
          date: "FEB 25",
          description: "vs. Toronto Raptors",
          images: ["bostonBet.png", "raptorsBet.png"]
        },
        {
          date: "FEB 26",
          description: "vs. Detroit Pistons",
          images: ["bostonBet.png", "pistonsBet.png"]
        },
        {
          date: "FEB 28",
          description: "vs. Cleveland Cavaliers",
          images: ["bostonBet.png", "cavaliersBet.png"]
        },
        {
          date: "MAR 2",
          description: "vs. Denver Nuggets",
          images: ["bostonBet.png", "nuggetsBet.png"]
        },
        {
          date: "MAR 5",
          description: "vs. Portland Blazers",
          images: ["bostonBet.png", "blazersBet.png"]
        }
      ];
    
      return (
        <div className="container">
          <div className="goldenS-wrapper">
            <h1 className='goldenS-h1'>Golden State Warriors Schedule</h1>
            <ul className="sessions">
              {events.map((event, index) => (
                <li key={index} className="goldenS-times" onClick={() => onEventClick(event)}>
                  <div className="goldenS-time">{event.date}</div>
                  <p className='goldenS-p'>{event.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    };

export default GoldenState
