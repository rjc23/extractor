const { MongoClient } = require('mongodb');
const fs = require('fs');

// MongoDB connection string and settings
const uri = 'mongodb://mstpx72h6:r2JwYnrAfxOUHXO19a@marcdonaldson.com:27017/?authSource=admin';
const dbName = 'nba-stats';
const playersCollectionName = 'players';
const awardsCollectionName = 'player_awards';
const playersFileName = 'players_data.json';
const awardsFileName = 'awards_data.json';
const outputFileName = 'data.json';

function convertToCamelCase(str) {
    const words = str.split(/[\s\-]+/);
    const firstWord = words[0].toLowerCase();
    const otherWords = words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    return [firstWord, ...otherWords].join('');
}

const relevantAwards = [
    "All-Defensive Team",
    "All-NBA",
    "All-Rookie Team",
    "Hall of Fame Inductee",
    "Olympic Gold Medal",
    "NBA Most Valuable Player",
    "NBA Player of the Month",
    "NBA Player of the Week",
    "NBA Rookie of the Month",
    "NBA Rookie of the Year",
];

async function extractData() {
    let allAwards, distinctAwards;

    const client = new MongoClient(uri);

    // Load or fetch Awards data
    if (fs.existsSync(awardsFileName)) {
        allAwards = JSON.parse(fs.readFileSync(awardsFileName, 'utf8'));
        distinctAwards = [...new Set(allAwards.map(award => award.description))];
    } else {
        await client.connect();
        const awardsCollection = client.db(dbName).collection(awardsCollectionName);
        allAwards = await awardsCollection.find({}).toArray();
        fs.writeFileSync(awardsFileName, JSON.stringify(allAwards, null, 2), 'utf8');
        distinctAwards = await awardsCollection.distinct('description');
        await client.close();
    }

    const awardsCache = {};
    for (const award of allAwards) {
        if (!awardsCache[award.personId]) {
            awardsCache[award.personId] = new Map();
        }
        const currentCount = awardsCache[award.personId].get(award.description) || 0;
        awardsCache[award.personId].set(award.description, currentCount + 1);
    }

    let playersCursor;

    // Load or fetch Players data
    if (fs.existsSync(playersFileName)) {
        playersCursor = JSON.parse(fs.readFileSync(playersFileName, 'utf8'));
    } else {
        await client.connect();
        const playersCollection = client.db(dbName).collection(playersCollectionName);
        playersCursor = await playersCollection.find().toArray();
        fs.writeFileSync(playersFileName, JSON.stringify(playersCursor, null, 2), 'utf8');
        await client.close();
    }

    const processedPlayers = [];

    for await (const player of playersCursor) {
        const playerAwards = {};

        // Populate awards from the cache
        const playerAwardsMap = awardsCache[player.personId] || new Map();

        for (const award of relevantAwards) {
            const awardCamelCase = convertToCamelCase(award);
            const awardCount = playerAwardsMap.get(award) || 0;
            playerAwards[`${awardCamelCase}`] = awardCount > 0;
            playerAwards[`${awardCamelCase}Count`] = awardCount;
        }

        const processedPlayer = {
            id: player.personId,
            name: player.firstName + " " + player.lastName,
            first_name: player.firstName,
            last_name: player.lastName,
            birthdate: player.birthdate,
            country: player.country,
            height: player.height,
            roster_status: player.rosterstatus,
            season_exp: player.seasonExp,
            start_year: player.fromYear,
            end_year: player.toYear,
            college: player.school,
            draft_year: player.draftYear,
            draft_number: player.draftNumber,
            awards: playerAwards
        };
        processedPlayers.push(processedPlayer);
    }

    fs.writeFileSync(outputFileName, JSON.stringify(processedPlayers, null, 2), 'utf8');
    console.log('Data extraction completed!');
}

extractData().catch(err => {
    console.error(err);
    process.exit(1);
});
