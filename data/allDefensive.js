const fs = require('fs');
const newPlayerData = require("./newPlayerData");

// Filter the players who have been selected for the "All-Defensive Team"
const allDefensiveTeamPlayers = newPlayerData.filter(player => player.awards["All-Defensive Team"]);

// Extract names
const names = allDefensiveTeamPlayers.map(player => `${player.first_name} ${player.last_name}`);

// Save to file
fs.writeFileSync('all_defensive_team_players.txt', names.join('\n'), 'utf8');

console.log('Names saved to all_defensive_team_players.txt!');