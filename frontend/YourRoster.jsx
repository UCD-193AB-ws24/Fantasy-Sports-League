import React from 'react'
import { useState } from 'react';
import MenuBar from '../MenuBar'
import './YourRoster.css'

function YourRoster() {
    const [selectedCharacter, setSelectedCharacter] = useState(null);

    const characters = [
      { id: 1, name: "Shai Gilgeous-Alexander", image: "./sahi.png",imageextra: "./picture1.png", description: "Giannis Antetokounmpo" },
      { id: 2, name: "Stephen Curry", image: "./steph.jpg", imageextra:"./picture2.png" ,description: "Stephen Curry" },

    ];
  
    // Should handle character selection easily now
    const handleCharacterClick = (character) => {
      setSelectedCharacter(character);
    };
  

  return (
    <div>
      
        <MenuBar />
        <h1 className='title'> Your Roster</h1>
    <div className="roster-page">
      <div className="grid-container">


        {characters.map((character) => (
          <div
            key={character.id}
            className="grid-item"
            onClick={() => handleCharacterClick(character)}
          >
            <img src={character.image} alt={character.name} className="grid-image" />
            <p>{character.name}</p>
          </div>
        ))}
      </div>

      {selectedCharacter && (
        <div className="character-details">
          <h2 className='name'>{selectedCharacter.name}</h2>
          <img src={selectedCharacter.imageextra} alt={selectedCharacter.name} className="character-image" />
        </div>
      )}
    </div>
    </div>
  );
};


export default YourRoster
