function extractPlayers(data) {
    const uniquePlayers = new Set();
    data.forEach(entry => {
        Object.keys(entry).forEach(key => {
            if (key !== 'winner') {
                uniquePlayers.add(key);
            }
        });
    });

    return [...uniquePlayers].sort();
}

function extractDecks(data) {
    const uniqueDecks = new Set();
    data.forEach(entry => {
        for (const [key, value] of Object.entries(entry)) {
            if (key !== 'winner' && key !== '__rowNum__') {
                uniqueDecks.add(value);
            }
        }
    });
    return [...uniqueDecks].sort();
}

function prepareTrainingData(players, decks, data) {
    const trainingData = {
        inputs: [],
        targets: []
    };

    data.forEach(game => {
        const { input, target } = oneHotGame(game, players, decks, true);
        trainingData.inputs.push(input);
        trainingData.targets.push(target);
    });

    console.log("inputs:", trainingData.inputs);
    const inputTensor = tf.tensor(trainingData.inputs);
    console.log("targets:", trainingData.targets);
    const targetTensor = tf.tensor(trainingData.targets);

    return { inputs: inputTensor, targets: targetTensor };
}

function prepareInferenceData(players, decks, game) {
    const inputVector = oneHotGame(game, players, decks, false);
    const inputTensor = tf.tensor([inputVector]);
    return inputTensor;
}

function oneHotGame(game, players, decks, training) {
    const deckInputVector = new Array(players.length * decks.length).fill(0); // Deck choice encoding
    const playerParticipationVector = new Array(players.length).fill(0); // Player participation encoding
    let targetVector = null;

    players.forEach((player, playerIdx) => {
        const deck = game[player];
        if (deck) {
            // Player is participating
            playerParticipationVector[playerIdx] = 1;

            // Find the index of the deck in the decks list
            const deckIdx = decks.indexOf(deck);
            if (deckIdx !== -1) {
                // Set deck encoding to 1
                const oneHotIdx = playerIdx * decks.length + deckIdx;
                deckInputVector[oneHotIdx] = 1;
            }
        }
    });

    if (training && game.winner) {
        targetVector = new Array(players.length).fill(0);
        const winnerIdx = players.indexOf(game.winner);
        if (winnerIdx !== -1) {
            targetVector[winnerIdx] = 1;
        }
    }

    // Combine player participation and deck choices as input
    const inputVector = [...playerParticipationVector, ...deckInputVector];

    return training ? { input: inputVector, target: targetVector } : inputVector;
}
