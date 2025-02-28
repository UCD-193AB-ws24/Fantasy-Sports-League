import json
import sys
from nba_api.stats.endpoints import playergamelog, playercareerstats
from nba_api.stats.static import players

def get_player_id(player_name):
    """ Fetch player ID from NBA API given a player's full name """
    player_list = players.get_players()
    for player in player_list:
        if player["full_name"].lower() == player_name.lower():
            return player["id"]
    return None

def get_player_game_log(player_name, season="2023-24"):
    """ Fetch player's game log for a specific season """
    
    player_id = get_player_id(player_name)
            
    if not player_id:
        return json.dumps({"error": f"Player '{player_name}' not found in NBA API"}, indent=4)

    try:
        game_log = playergamelog.PlayerGameLog(player_id=player_id, season=season)
        games = game_log.get_dict()["resultSets"][0]["rowSet"]

        if not games:
            return json.dumps({"error": f"No game logs found for {player_name} in {season}"}, indent=4)

        formatted_games = [
            {
                "date": game[3],
                "matchup": game[4],
                "points": game[26],
                "rebounds": game[20],
                "assists": game[21],
                "steals": game[22],
                "blocks": game[23],
                "turnovers": game[24],
                "fg": f"{game[9]}/{game[10]} ({game[11]}%)",
                "3pt": f"{game[12]}/{game[13]} ({game[14]}%)",
                "ft": f"{game[15]}/{game[16]} ({game[17]}%)"
            }
            for game in games
        ]

        return json.dumps({"player": player_name, "season": season, "games": formatted_games}, indent=4)

    except Exception as e:
        return json.dumps({"error": f"Failed to fetch game log: {str(e)}"}, indent=4)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments: Expected 'game_log <player_name> <season>'"}))
        sys.exit(1)

    command = sys.argv[1]

    player_name = " ".join(sys.argv[2:-1]) if len(sys.argv) > 3 else sys.argv[2]
    season = sys.argv[-1] if len(sys.argv) > 3 else "2023-24"

    if command == "game_log":
        result = get_player_game_log(player_name, season)
        print(result)
        sys.exit(0)  # Ensures script exits after first response
    else:
        print(json.dumps({"error": "Invalid command"}))
        sys.exit(1)
        
def get_player_career_stats(player_name):
    """ Fetch player's career stats """
    player_id = get_player_id(player_name)

    if not player_id:
        return json.dumps({"error": f"Player '{player_name}' not found in NBA API"}, indent=4)

    try:
        career_stats = playercareerstats.PlayerCareerStats(player_id=player_id)
        stats = career_stats.get_dict()["resultSets"][0]["rowSet"]

        if not stats:
            return json.dumps({"error": f"No career stats found for {player_name}"}, indent=4)

        formatted_stats = {
            "player": player_name,
            "career": {
                "games_played": stats[0][3],
                "points_per_game": stats[0][26],
                "rebounds_per_game": stats[0][20],
                "assists_per_game": stats[0][21],
                "steals_per_game": stats[0][22],
                "blocks_per_game": stats[0][23],
                "turnovers_per_game": stats[0][24],
                "fg_percentage": f"{stats[0][11]}%",
                "3pt_percentage": f"{stats[0][14]}%",
                "ft_percentage": f"{stats[0][17]}%"
            }
        }
        
        return json.dumps(formatted_stats, indent=4)

    except Exception as e:
        return json.dumps({"error": f"Failed to fetch career stats: {str(e)}"}, indent=4)

if __name__ == "__main__":
    # Debugging: Print received arguments
    print("Raw arguments received:", sys.argv)

    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments: Expected 'career_stats <player_name>' or 'test_name <player_name>'"}))
        sys.exit(1)

    command = sys.argv[1]
    player_name = " ".join(sys.argv[2:]).strip()


    # Debugging: Print processed command and player name
    print(f"Command: {command}, Player Name: {player_name}")

    if command == "career_stats":
        result = get_player_career_stats(player_name)
    else:
        result = json.dumps({"error": "Invalid command"})
    
    print(result)
    sys.exit(0)









    
    