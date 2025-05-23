// importPlayers.cjs - Completely fixed version
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const prisma = new PrismaClient();

const filePath = './parsed_nba_players.txt';

// Helper function to get player position and team info using Python script
async function getPlayerInfo(playerName) {
  return new Promise((resolve, reject) => {
    // Execute the Python script to get player info
    const command = `python player_collection.py common_info "${playerName}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error fetching info for ${playerName}: ${error.message}`);
        resolve({ 
          positions: [], 
          positionGroup: [],
          team: null, 
          jersey: null 
        });
        return;
      }
      
      try {
        const data = JSON.parse(stdout);
        console.log(`Raw position data for ${playerName}:`, data.position);
        
        // Store original position text as position group
        let positionGroup = [];
        if (data.position) {
          const rawPosition = String(data.position).toUpperCase();
          
          // Map to standard position groups (G, F, C, G-F, F-C)
          if (rawPosition === 'G' || rawPosition.includes('GUARD')) {
            positionGroup.push('G');
          } else if (rawPosition === 'F' || rawPosition.includes('FORWARD')) {
            positionGroup.push('F');
          } else if (rawPosition === 'C' || rawPosition.includes('CENTER')) {
            positionGroup.push('C');
          } else if (rawPosition.includes('G-F') || rawPosition.includes('G/F') || 
                    (rawPosition.includes('GUARD') && rawPosition.includes('FORWARD'))) {
            positionGroup.push('G-F');
          } else if (rawPosition.includes('F-C') || rawPosition.includes('F/C') || 
                    (rawPosition.includes('FORWARD') && rawPosition.includes('CENTER'))) {
            positionGroup.push('F-C');
          } else if (rawPosition.includes('C-F') || rawPosition.includes('C/F')) {
            positionGroup.push('F-C'); // Normalize to F-C
          }
        }
        
        // Map position data to specific positions
        let positions = [];
        
        if (data.position) {
          // Convert to uppercase for consistent comparison
          const positionText = String(data.position).toUpperCase();
          
          // Check for specific positions first
          if (positionText.includes('POINT') || positionText === 'PG') {
            positions.push('PG');
          }
          
          if (positionText.includes('SHOOTING') || positionText === 'SG') {
            positions.push('SG');
          }
          
          if (positionText.includes('SMALL') || positionText === 'SF') {
            positions.push('SF');
          }
          
          if (positionText.includes('POWER') || positionText === 'PF') {
            positions.push('PF');
          }
          
          if (positionText.includes('CENTER') || positionText === 'C') {
            positions.push('C');
          }
          
          // Handle generic position designations if no specific positions found
          if (positions.length === 0) {
            if (positionText === 'G' || positionText === 'GUARD') {
              positions = ['PG', 'SG'];
            } else if (positionText === 'F' || positionText === 'FORWARD') {
              positions = ['SF', 'PF'];
            } else if (positionText.includes('G-F') || positionText.includes('G/F')) {
              positions = ['SG', 'SF'];
            } else if (positionText.includes('F-G') || positionText.includes('F/G')) {
              positions = ['SF', 'SG'];
            } else if (positionText.includes('F-C') || positionText.includes('F/C')) {
              positions = ['PF', 'C'];
            } else if (positionText.includes('C-F') || positionText.includes('C/F')) {
              positions = ['C', 'PF'];
            }
          }
        }
        
        // If we still don't have positions, infer from position group
        if (positions.length === 0 && positionGroup.length > 0) {
          if (positionGroup.includes('G')) {
            positions = ['PG', 'SG'];
          } else if (positionGroup.includes('F')) {
            positions = ['SF', 'PF'];
          } else if (positionGroup.includes('C')) {
            positions = ['C'];
          } else if (positionGroup.includes('G-F')) {
            positions = ['SG', 'SF'];
          } else if (positionGroup.includes('F-C')) {
            positions = ['PF', 'C'];
          }
        }
        
        // If all else fails, make a reasonable guess
        if (positions.length === 0) {
          console.log(`No position detected for ${playerName}, defaulting to Guard`);
          positions = ['PG', 'SG'];
          positionGroup = ['G'];
        }
        
        resolve({
          positions: positions,
          positionGroup: positionGroup,
          team: data.team || null,
          jersey: data.jersey ? parseInt(data.jersey) : null
        });
      } catch (e) {
        console.error(`Error parsing data for ${playerName}: ${e.message}`);
        resolve({ 
          positions: ['PG', 'SG'], 
          positionGroup: ['G'],
          team: null, 
          jersey: null 
        });
      }
    });
  });
}

async function importPlayers() {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const names = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    console.log(`Found ${names.length} players in the file.`);
    
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 5; // Process players in smaller batches to see progress
    
    // Process players in batches
    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, Math.min(i + batchSize, names.length));
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(names.length/batchSize)}`);
      
      // Process each player in the batch sequentially
      for (const name of batch) {
        try {
          console.log(`Processing player: ${name}`);
          
          // Get player info from NBA API - always update positions
          const playerInfo = await getPlayerInfo(name);
          
          console.log(`Player: ${name}, Positions: ${playerInfo.positions.join(', ')}, PositionGroup: ${playerInfo.positionGroup.join(', ')}, Team: ${playerInfo.team || 'Unknown'}`);
          
          // Update or create the player with position info
          await prisma.player.upsert({
            where: { name },
            update: {
              positions: playerInfo.positions,
              positionGroup: playerInfo.positionGroup,
              team: playerInfo.team,
              jersey: playerInfo.jersey
            },
            create: { 
              name,
              positions: playerInfo.positions,
              positionGroup: playerInfo.positionGroup,
              team: playerInfo.team,
              jersey: playerInfo.jersey
            }
          });
          
          console.log(`Imported: ${name} - Positions: ${playerInfo.positions.join(', ')}, PositionGroup: ${playerInfo.positionGroup.join(', ')}, Team: ${playerInfo.team || 'Unknown'}`);
          successCount++;
          
          // Shorter delay to make process faster but still avoid API rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing player ${name}:`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log(`Import complete: ${successCount} players successfully imported/updated, ${errorCount} errors`);
  } catch (error) {
    console.error("Error importing players:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

importPlayers();