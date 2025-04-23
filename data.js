// data.js
export function prepareData(games, players, decks, MAX_PLAYERS = 4) {
    const inputs = {
        player_input: [],
        deck_input: [],
    };
    const labels = [];

    games.forEach(game => {
        const playerIDs = Object.keys(game)
            .filter(key => key !== 'winner')
            .map(player => players.indexOf(player));
        const deckIDs = Object.keys(game)
            .filter(key => key !== 'winner')
            .map(player => decks.indexOf(game[player]));
        const winnerIndex = Object.keys(game).indexOf(game.winner);

        // Pad to MAX_PLAYERS
        while (playerIDs.length < MAX_PLAYERS) {
            playerIDs.push(-1);
            deckIDs.push(-1);
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
