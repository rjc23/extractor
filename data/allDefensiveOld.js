const fs = require('fs');
const playerData = require('./existingData');

// Filter the players who are on the "All-Defensive Team"
const allDefensiveTeamPlayers = playerData.filter(player => player.awards["All-Defensive Team"].length > 0);

// Extract names
const names = allDefensiveTeamPlayers.map(player => player.name);

// Save to file
fs.writeFileSync('all_defensive_team_players_v2.txt', names.join('\n'), 'utf8');

console.log('Names saved to all_defensive_team_players_v2.txt!');
