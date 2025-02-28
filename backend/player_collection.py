"""
NBA Player Data Collection

This module collects JSON-formatted data for a specific NBA player and outputs it as a JSON file.
The data includes player statistics, biographical information, and other relevant details
from NBA data sources.

The collected data is processed and saved in a structured JSON format that can be used
for further analysis or integration with other systems.
"""

from nba_api.live.nba.endpoints import boxscore
from nba_api.stats.endpoints import playerindex
from nba_api.live.nba.endpoints import scoreboard
import json

def get_live_player_stats(player_name):
    """
    Get live statistics for a specific NBA player.
    
    Args:
        player_name (str): Full name of the NBA player
        
    Returns:
        dict: Live player statistics including points, rebounds, steals, blocks,
              or None if the player is not found or not playing in active games.
    """
    # Format player name to "first-last"
    first_last = player_name.split()
    if len(first_last) != 2:
        return None
    player_name_formatted = f"{first_last[0].lower()}-{first_last[1].lower()}"

    # Get current games
    games = scoreboard.ScoreBoard()
    active_games = games.get_dict()['scoreboard']['games']
    
    # Get player ID
    players = playerindex.PlayerIndex()
    player_info = [p for p in players.get_dict()['resultSets'][0]['rowSet'] 
                   if player_name_formatted == f"{p[3]}"]
    
    if not player_info:
        return None
        
    player_id = player_info[0][0]
    
    # Check each active game for the player
    for game in active_games:
        game_id = game['gameId']
        box = boxscore.BoxScore(game_id=game_id)
        game_data = box.get_dict()
        
        # Check home and away team players
        for team in ['homeTeam', 'awayTeam']:
            team_players = game_data['game'][team]['players']
            for player in team_players:
                if str(player['personId']) == str(player_id):
                    return {
                        'name': player_name_formatted,
                        'points': player['statistics']['points'],
                        'assists': player['statistics']['assists'],
                        'rebounds': player['statistics']['reboundsTotal'],
                        'steals': player['statistics']['steals'],
                        'blocks': player['statistics']['blocks'],
                        'turnovers': player['statistics']['turnovers'],
                        'minutes': player['statistics']['minutesCalculated'],
                        'game_in_progress': True
                    }
    return None

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Please provide a player name as a command line argument"}))
        sys.exit(1)
        
    player_name = " ".join(sys.argv[1:])
    stats = get_live_player_stats(player_name)
    if stats is None:
        print(json.dumps({"error": "Player not found or no active game"}))
    else:
        print(json.dumps(stats))
