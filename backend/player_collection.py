import sys
import json
from nba_api.live.nba.endpoints import scoreboard, boxscore
from nba_api.stats.static import players
from nba_api.stats.endpoints import commonteamroster
from nba_api.stats.endpoints import commonplayerinfo
from datetime import datetime

def get_player_id(player_name):
    """Find player ID using nba_api."""
    player_dict = players.get_players()
    for player in player_dict:
        if player['full_name'].lower() == player_name.lower():
            return player['id']
    return None
def get_common_player_info(player_name):
    """Fetch player's team and position using CommonPlayerInfo endpoint."""
    player_id = get_player_id(player_name)
    if not player_id:
        return {"error": f"Player '{player_name}' not found."}
    try:
        info = commonplayerinfo.CommonPlayerInfo(player_id=player_id, timeout=60)
        result_set = info.get_dict()["resultSets"][0]
        headers = result_set["headers"]
        data = result_set["rowSet"][0]
        info_dict = dict(zip(headers, data))
        return {
            "team": info_dict.get("TEAM_NAME"),
            "position": info_dict.get("POSITION"),
            "jersey": info_dict.get("JERSEY")
        }
    except Exception as e:
        return {"error": str(e)}
def get_today_games():
    """Fetch today's NBA games from the live scoreboard API."""
    board = scoreboard.ScoreBoard()
    return board.games.get_dict()

def get_team_roster(team_id):
    """Fetch the full roster for a team using CommonTeamRoster."""
    try:
        team_roster = commonteamroster.CommonTeamRoster(team_id=team_id)
        roster_data = team_roster.get_dict()
        players_list = roster_data['resultSets'][0]['rowSet']  # Extract player data
        return [player[3] for player in players_list]  # Column index 3 = Player Name
    except:
        return []

def get_player_game_status(player_name):
    """Check if the player has a game today and return game details."""
    player_id = get_player_id(player_name)
    if not player_id:
        return None, None, None, None, f"Player '{player_name}' not found."

    games = get_today_games()
    for game in games:
        game_status = game.get("gameStatus")
        game_time = game.get("gameEt")

        home_team = game.get("homeTeam", {})
        away_team = game.get("awayTeam", {})
        home_players = home_team.get('players', [])
        away_players = away_team.get('players', [])
        all_players = home_players + away_players
        #print(all_players)

        matchup = f"{home_team.get('teamName')} vs {away_team.get('teamName')}"  # Updated matchup format

        # Check if player is in game roster
        for player in all_players:
            if int(player['personId']) == int(player_id):
                return game_status, game_time, game['gameId'], matchup, None
            
        # If `players` list is empty, use team roster
        home_team_roster = get_team_roster(home_team.get("teamId")) if not home_players else []
        away_team_roster = get_team_roster(away_team.get("teamId")) if not away_players else []



        if player_name in home_team_roster or player_name in away_team_roster:
            return game_status, game_time, game['gameId'], matchup, None
        
    
    if player_name not in home_team_roster and player_name not in away_team_roster:
        return None, None, None, None, None
        
def get_live_or_final_stats(player_id, game_id, game_status):
    """Fetch the player's live stats if the game is ongoing or final stats if the game is over."""
    try:
        box = boxscore.BoxScore(game_id)
        game_data = box.get_dict()
        home_score = game_data['game']['homeTeam'].get('score')
        away_score = game_data['game']['awayTeam'].get('score')
        finalScore = f"{home_score}-{away_score}" if home_score is not None and away_score is not None else "N/A"
        # Check both teams for the player's stats
        for team in ['homeTeam', 'awayTeam']:
            for player in game_data['game'][team]['players']:
                if player['personId'] == player_id:
                    return {
                        "points": player['statistics'].get('points', 0),
                        "rebounds": player['statistics'].get('reboundsTotal', 0),
                        "assists": player['statistics'].get('assists', 0),
                        "steals": player['statistics'].get('steals', 0),
                        "blocks": player['statistics'].get('blocks', 0),
                        "turnovers": player['statistics'].get('turnovers', 0),
                        "fg": f"{player['statistics'].get('fieldGoalsMade', 0)}/{player['statistics'].get('fieldGoalsAttempted', 0)}",
                        "3pt": f"{player['statistics'].get('threePointersMade', 0)}/{player['statistics'].get('threePointersAttempted', 0)}",  # Added 3PT stats
                        "ft": f"{player['statistics'].get('freeThrowsMade', 0)}/{player['statistics'].get('freeThrowsAttempted', 0)}",  # Added FT stats
                        "minutes": player['statistics'].get('min', "0"),  # Added minutes field
                        "finalScore": finalScore,                         # Added final game score field
                        "game_in_progress": "Yes" if game_status == 2 else "No"
                    }
    except:
        pass

    return {
        "points": 0, "rebounds": 0, "assists": 0,
        "steals": 0, "blocks": 0, "turnovers": 0,
        "fg": "0/0", "3pt": "0/0", "ft": "0/0",
        "minutes": "0",
        "finalScore": "N/A",
        "game_in_progress": "No"
    }

def format_game_time(game_time):
    """Convert game time to a more readable format."""
    if not game_time:
        return None
    try:
        dt = datetime.strptime(game_time, "%Y-%m-%dT%H:%M:%SZ")
        return dt.strftime("%I:%M %p ET")
    except:
        return game_time  # Return as-is if conversion fails

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments. Expected 'live_stats <player_name>'"}))
        sys.exit(1)

    command = sys.argv[1].strip().lower()
    player_name = " ".join(sys.argv[2:]).strip()

    if command != "live_stats":
        print(json.dumps({"error": f"Invalid command '{command}'"}))
        sys.exit(1)

    game_status, game_time, game_id, matchup, error_msg = get_player_game_status(player_name)
    common_info = get_common_player_info(player_name)

    if error_msg:
        output = {"error": error_msg}
    elif game_status is None:
        output = {
            "player": player_name,
            "matchup": "No game found",
            "jersey": common_info.get("jersey"),
            "game_time": "N/A",
            "stats": {
                "points": 0, "rebounds": 0, "assists": 0,
                "steals": 0, "blocks": 0, "turnovers": 0,
                "fg": "0/0", "3pt": "0/0", "ft": "0/0",
                "minutes": "0",
                "finalScore": "N/A",
                "game_in_progress": "No"
            }
        }
    elif game_status == 1:
        output = {
            "player": player_name,
            "matchup": matchup,
            "jersey": common_info.get("jersey"),
            "game_time": format_game_time(game_time),  # Improved time format
            "stats": {
                "points": 0, "rebounds": 0, "assists": 0,
                "steals": 0, "blocks": 0, "turnovers": 0,
                "fg": "0/0", "3pt": "0/0", "ft": "0/0",
                "minutes": "0",
                "finalScore": "N/A",
                "game_in_progress": "No"
            }
        }
    elif game_status in [2, 3]:  # Live or completed games
        player_id = get_player_id(player_name)
        stats = get_live_or_final_stats(player_id, game_id, game_status)
        output = {
            "player": player_name,
            "jersey": common_info.get("jersey"),
            "team": common_info.get("team"),
            "position": common_info.get("position"),
            "matchup": matchup,
            "game_time": format_game_time(game_time),
            "stats": stats
        }

    print(json.dumps(output, indent=4))

if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 2 and sys.argv[1].strip().lower() == "common_info":
        player_name = " ".join(sys.argv[2:]).strip()
        info = get_common_player_info(player_name)
        print(json.dumps(info, indent=4))
    else:
        main()
