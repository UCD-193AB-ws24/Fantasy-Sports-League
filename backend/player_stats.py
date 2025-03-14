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

def get_player_game_log(player_name, season="2024-25"):
    """Fetch player's game log for a specific season and format stats correctly."""

    player_id = get_player_id(player_name)
    
    if not player_id:
        return json.dumps({"error": f"Player '{player_name}' not found in NBA API"}, indent=4)

    try:
        game_log = playergamelog.PlayerGameLog(player_id=player_id, season=season, timeout=60)
        games = game_log.get_dict()["resultSets"][0]["rowSet"]
        headers = game_log.get_dict()["resultSets"][0]["headers"]  # Column names

        if not games:
            return json.dumps({"error": f"No game logs found for {player_name} in {season}"}, indent=4)

        formatted_games = []
        for game in games:
            game_stats = dict(zip(headers, game))  # Map headers to values dynamically

            formatted_games.append({
                "date": game_stats.get("GAME_DATE", "N/A"),
                "matchup": game_stats.get("MATCHUP", "N/A"),
                "points": game_stats.get("PTS", 0),
                "rebounds": game_stats.get("REB", 0),
                "assists": game_stats.get("AST", 0),
                "steals": game_stats.get("STL", 0),
                "blocks": game_stats.get("BLK", 0),
                "turnovers": game_stats.get("TOV", 0),
                "fg": f"{game_stats.get('FGM', 0)}/{game_stats.get('FGA', 0)}",
                "3pt": f"{game_stats.get('FG3M', 0)}/{game_stats.get('FG3A', 0)}",
                "ft": f"{game_stats.get('FTM', 0)}/{game_stats.get('FTA', 0)}",
                "fg_percentage": f"{game_stats.get('FG_PCT', 0) * 100:.1f}%",
                "3pt_percentage": f"{game_stats.get('FG3_PCT', 0) * 100:.1f}%",
                "ft_percentage": f"{game_stats.get('FT_PCT', 0) * 100:.1f}%"
            })

        return json.dumps({
            "player": player_name,
            "season": season,
            "games": formatted_games
        }, indent=4)

    except Exception as e:
        return json.dumps({"error": f"Failed to fetch game log: {str(e)}"}, indent=4)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments: Expected 'game_log <player_name> <season>'"}))
        sys.exit(1)

    command = sys.argv[1]

    player_name = " ".join(sys.argv[2:-1]) if len(sys.argv) > 3 else sys.argv[2]
    season = sys.argv[-1] if len(sys.argv) > 3 else "2024-25"

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









    
    
