const path = require('path');
const fs = require('fs');

const statsFolderPath = './stats';  // Assuming the stats folder is in the same directory as the script
const outputFileName = 'data.json';

const teamMapping = {
    'SEA': 'OKC',
    'NJN': 'BKN',
    'CHH': 'CHA',
    'NOK': 'NOP',
    'NOH': 'NOP',
    'VAN': 'MEM',
    'SDC': 'LAC',
    'KCK': 'SAC',
    'BUF': 'LAC',
    'CIN': 'SAC',
    'ROC': 'SAC',
    'SYR': 'PHI',
    'FTW': 'DET',
    'MNL': 'LAL',
    'PHW': 'GSW',
    'STL': 'ATL',
    'GOS': 'GSW',
    'SAN': 'SAS',
    'UTH': 'UTA',
    'SFW': 'GSW',
    'BLT': 'WAS',
    'NOJ': 'UTA'
};

function hasAveraged(stat, value, comparison, row, headers) {
    const statValue = row[headers.indexOf(stat)];
    if (comparison === 'gt') {
        return statValue >= value;
    } else if (comparison === 'lt') {
        return statValue <= value;
    }
    return false;
}

function getDecadesFromSeasonId(seasonId) {
    const startYear = parseInt(seasonId.split('-')[0]);
    const endYear = startYear + 1;

    return {
        sixties: startYear >= 1960 && startYear < 1970 || endYear >= 1960 && endYear < 1970,
        seventies: startYear >= 1970 && startYear < 1980 || endYear >= 1970 && endYear < 1980,
        eighties: startYear >= 1980 && startYear < 1990 || endYear >= 1980 && endYear < 1990,
        nineties: startYear >= 1990 && startYear < 2000 || endYear >= 1990 && endYear < 2000,
        naughties: startYear >= 2000 && startYear < 2010 || endYear >= 2000 && endYear < 2010,
        tens: startYear >= 2010 && startYear < 2020 || endYear >= 2010 && endYear < 2020,
        twenties: startYear >= 2020
    };
}

async function getTeamsAndDecadesFromPlayerStatsFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const seasonTotals = data.resultSets.find(rs => rs.name === "SeasonTotalsRegularSeason");

    const teams = new Set();
    const decades = {
        sixties: false,
        seventies: false,
        eighties: false,
        nineties: false,
        naughties: false,
        tens: false,
        twenties: false
    };
    const statAverages = {};
    const averageConditions = [
        { stat: 'PTS', value: 5, comparison: 'gt', name: 'points5PerGame' },
        { stat: 'PTS', value: 10, comparison: 'gt', name: 'points10PerGame' },
        { stat: 'PTS', value: 20, comparison: 'gt', name: 'points20PerGame' },
        { stat: 'PTS', value: 5, comparison: 'lt', name: 'pointsLessThan5PerGame' }, // Less than 5 points

        { stat: 'REB', value: 5, comparison: 'gt', name: 'rebounds5PerGame' },
        { stat: 'REB', value: 10, comparison: 'gt', name: 'rebounds10PerGame' },
        { stat: 'REB', value: 3, comparison: 'lt', name: 'reboundsLessThan3PerGame' }, // Less than 3 rebounds

        { stat: 'AST', value: 5, comparison: 'gt', name: 'assists5PerGame' },
        { stat: 'AST', value: 10, comparison: 'gt', name: 'assists10PerGame' },
        { stat: 'AST', value: 3, comparison: 'lt', name: 'assistsLessThan3PerGame' }, // Less than 3 assists

        { stat: 'BLK', value: 1, comparison: 'gt', name: 'blocks1PerGame' },
        { stat: 'BLK', value: 2, comparison: 'gt', name: 'blocks2PerGame' },
        { stat: 'BLK', value: 0.5, comparison: 'lt', name: 'blocksLessThan05PerGame' }, // Less than 0.5 blocks

        { stat: 'STL', value: 1, comparison: 'gt', name: 'steals1PerGame' },
        { stat: 'STL', value: 2, comparison: 'gt', name: 'steals2PerGame' },
        { stat: 'STL', value: 0.5, comparison: 'lt', name: 'stealsLessThan05PerGame' }, // Less than 0.5 steals

        { stat: 'FG_PCT', value: 0.4, comparison: 'gt', name: 'fgPct40' },
        { stat: 'FG_PCT', value: 0.5, comparison: 'gt', name: 'fgPct50' },
        { stat: 'FG_PCT', value: 0.35, comparison: 'lt', name: 'fgPctLessThan35' }, // Less than 35% FG

        { stat: 'FT_PCT', value: 0.75, comparison: 'gt', name: 'ftPct75' },
        { stat: 'FT_PCT', value: 0.9, comparison: 'gt', name: 'ftPct90' },
        { stat: 'FT_PCT', value: 0.6, comparison: 'lt', name: 'ftPctLessThan60' }, // Less than 60% FT

        { stat: '3P_PCT', value: 0.35, comparison: 'gt', name: 'threePtPct35' },
        { stat: '3P_PCT', value: 0.4, comparison: 'gt', name: 'threePtPct40' },
        { stat: '3P_PCT', value: 0.3, comparison: 'lt', name: 'threePtPctLessThan30' }, // Less than 30% 3P
        // // Turnovers
        // { stat: 'TOV', value: 1, comparison: 'lt', name: 'turnoversLessThan1PerGame' },  // Less than 1 turnover per game
        // { stat: 'TOV', value: 3, comparison: 'gt', name: 'turnovers3PerGame' },          // More than 3 turnovers per game
        // { stat: 'TOV', value: 5, comparison: 'gt', name: 'turnovers5PerGame' },          // More than 5 turnovers per game (quite high, for standout games)

        // // Minutes Played
        // { stat: 'MIN', value: 10, comparison: 'lt', name: 'minutesLessThan10PerGame' },  // Less than 10 minutes per game (bench players or limited action)
        // { stat: 'MIN', value: 20, comparison: 'lt', name: 'minutesLessThan20PerGame' },  // Less than 20 minutes per game
        // { stat: 'MIN', value: 30, comparison: 'gt', name: 'minutes30PerGame' },          // More than 30 minutes per game (likely starters or main rotation)
        // { stat: 'MIN', value: 40, comparison: 'gt', name: 'minutes40PerGame' },
    ];

    for (const row of seasonTotals.rowSet) {
        const teamAbbreviation = row[seasonTotals.headers.indexOf("TEAM_ABBREVIATION")];
        teams.add(convertOldTeamAbbreviation(teamAbbreviation));

        const seasonId = row[seasonTotals.headers.indexOf("SEASON_ID")];
        const seasonDecades = getDecadesFromSeasonId(seasonId);

        for (const condition of averageConditions) {
            if (hasAveraged(condition.stat, condition.value, condition.comparison, row, seasonTotals.headers)) {
                statAverages[condition.name] = true;
            } else if (!statAverages.hasOwnProperty(condition.name)) {
                statAverages[condition.name] = false;
            }
        }

        for (const decade in seasonDecades) {
            if (seasonDecades[decade]) {
                decades[decade] = true;
            }
        }
    }

    let allStarAppearances = 0;
    const seasonTotalsAllStarSeason = data.resultSets.find(section => section.name === "SeasonTotalsAllStarSeason");

    if (seasonTotalsAllStarSeason && seasonTotalsAllStarSeason.rowSet) {
        allStarAppearances = seasonTotalsAllStarSeason.rowSet.length;
    }

    return {
        teams: Array.from(teams),
        decades,
        allStarAppearances,
        stats: statAverages
    };
}

function convertOldTeamAbbreviation(abbreviation) {
    return teamMapping[abbreviation] || abbreviation;
}

async function appendTeamsAndDecadesToPlayers() {
    const files = fs.readdirSync(statsFolderPath).filter(file => file.endsWith('.json'));
    const playerDataMap = new Map();  // Map to store teams and decades for each player
    const allTeamsSet = new Set(); // To collect all unique team codes

    for (const file of files) {
        const playerId = parseInt(path.basename(file, '.json'), 10);
        const playerData = await getTeamsAndDecadesFromPlayerStatsFile(path.join(statsFolderPath, file));

        playerData.teams.forEach(team => allTeamsSet.add(team));

        playerDataMap.set(playerId, playerData);
    }

    const processedPlayersData = JSON.parse(fs.readFileSync(outputFileName, 'utf8'));

    for (const player of processedPlayersData) {
        const data = playerDataMap.get(player.id) || {
            teams: [],
            decades: {},
            allStarAppearances: 0,
            stats: {}
        };

        if (!player.stats) {
            player.stats = {};
        }

        player.stats = {
            ...player.stats,       // existing stats
            ...data.stats,         // new stats
            ...data.decades       // decades info
        };
    }

    fs.writeFileSync(outputFileName, JSON.stringify(processedPlayersData, null, 2), 'utf8');
}

appendTeamsAndDecadesToPlayers().catch(err => {
    console.error(err);
    process.exit(1);
});
