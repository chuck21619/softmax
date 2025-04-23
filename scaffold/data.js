export const rawGames = [
    { chuck: 'windgrace', pk: 'wyleth', dustin: 'lita', winner: 'chuck' },
    { chuck: 'yuriko', emily: 'edgar', winner: 'emily' },
    // Add more games here...
];

export function buildVocab(games) {
    const players = new Set();
    const decks = new Set();

    games.forEach(game => {
        Object.keys(game).forEach(key => {
            if (key !== 'winner') {
                players.add(key);
                decks.add(game[key]);
            }
        });
    });

    return {
        playerToIndex: Object.fromEntries([...players].map((p, i) => [p, i])),
        deckToIndex: Object.fromEntries([...decks].map((d, i) => [d, i])),
    };
}

export function prepareData(games, playerToIndex, deckToIndex, MAX_PLAYERS = 4) {
    const inputs = {
        player_input: [],
        deck_input: [],
    };
    const labels = [];

    games.forEach(game => {
        const players = Object.keys(game).filter(k => k !== 'winner');
        const playerIDs = players.map(p => playerToIndex[p]);
        const deckIDs = players.map(p => deckToIndex[game[p]]);
        const winnerIndex = players.indexOf(game.winner);

        // Pad to MAX_PLAYERS
        while (playerIDs.length < MAX_PLAYERS) {
            playerIDs.push(0);
            deckIDs.push(0);
        }

        inputs.player_input.push(playerIDs);
        inputs.deck_input.push(deckIDs);
        labels.push(winnerIndex);
    });

    return {
        xs: {
            player_input: tf.tensor2d(inputs.player_input, undefined, 'int32'),
            deck_input: tf.tensor2d(inputs.deck_input, undefined, 'int32'),
        },
        ys: tf.tensor1d(labels, 'float32'),

    };
}
