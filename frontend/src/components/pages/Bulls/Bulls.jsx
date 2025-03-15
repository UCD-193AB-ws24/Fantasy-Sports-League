import React from 'react'
import './Bulls.css'

const Bulls = ({ onEventClick }) => {
    const events = [
        {
          date: "FEB 20 (PAST)",
          description: "vs. New York Knicks",
          images: ["bulls2-20.png", "knicks2-20.png"] // Two images
        },
        {
          date: "FEB 22",
          description: "vs. Phoenix Suns",
          images: ["bostonBet.png", "knicksBet.png"]//
        },
        {
          date: "FEB 24",
          description: "vs. Philadelphia 76ers",
          images: ["bostonBet.png", "raptorsBet.png"]//
        },
        {
          date: "FEB 26",
          description: "vs. LA Clippers",
          images: ["bostonBet.png", "pistonsBet.png"]//
        },
        {
          date: "FEB 28",
          description: "vs. Toronto Raptors",
          images: ["bostonBet.png", "raptorsBet.png"]
        },
        {
          date: "MAR 2",
          description: "vs. Indiana Pacers",
          images: ["bostonBet.png", "nuggetsBet.png"]//
        },
        {
          date: "MAR 4",
          description: "vs. Cleveland Cavaliers",
          images: ["bostonBet.png", "cavaliersBet.png"]
        }
      ];
    
      return (
        <div className="container">
          <div className="bulls-wrapper">
            <h1 className='bulls-h1'>Chicago Bulls Schedule</h1>
            <ul className="sessions">
              {events.map((event, index) => (
                <li key={index} className="bulls-times" onClick={() => onEventClick(event)}>
                  <div className="bull-time">{event.date}</div>
                  <p className='bull-p'>{event.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    };

export default Bulls
