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

function prepareTrainingData(players, decks, deckStrength, data) {
    const trainingData = { inputs: [], targets: [] };

    data.forEach(game => {
        const { input, target } = oneHotGame(game, players, decks, deckStrength, true);
        trainingData.inputs.push(input);
        trainingData.targets.push(target);
    });

    const inputTensor = tf.tensor(trainingData.inputs);
    const targetTensor = tf.tensor(trainingData.targets);

    return { inputs: inputTensor, targets: targetTensor };
}

function prepareInferenceData(players, decks, deckStrength, game) {
    const inputVector = oneHotGame(game, players, decks, deckStrength, false);
    const inputTensor = tf.tensor([inputVector]);
    return inputTensor;
}

function oneHotGame(game, players, decks, deckStrength, training) {
    const playerParticipationVector = new Array(players.length).fill(0); // Player participation encoding
    const deckInputVectors = new Array(players.length * decks.length).fill(0); // Deck choice encoding (flattened)
    let targetVector = null;

    players.forEach((player, playerIdx) => {
        const deck = game[player];
        if (deck) {
            playerParticipationVector[playerIdx] = 1;

            const deckIdx = decks.indexOf(deck);
            if (deckIdx !== -1) {
                const oneHotIdx = playerIdx * decks.length + deckIdx;
                deckInputVectors[oneHotIdx] = 1;
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

    const inputVector = [...playerParticipationVector, ...deckInputVectors, ...deckStrength];

    return training ? { input: inputVector, target: targetVector } : inputVector;
}

function calculateDeckStrength(decks, data) {
    const winCounts = new Array(decks.length).fill(0);
    const matchCounts = new Array(decks.length).fill(0);

    data.forEach(match => {
        const players = Object.keys(match).filter(key => key !== 'winner');
        
        players.forEach(player => {
            const deck = match[player];
            const deckIndex = decks.indexOf(deck);
            if (deckIndex !== -1) {
                matchCounts[deckIndex] += 1;
            }
        });

        const winner = match.winner;
        const winningDeck = match[winner];
        const winnerIndex = decks.indexOf(winningDeck);
        if (winnerIndex !== -1) {
            winCounts[winnerIndex] += 1;
        }
    });

    const winPercentages = winCounts.map((wins, index) => {
        const matches = matchCounts[index];
        return matches > 0 ? (wins / matches) : 0;
    });

    return winPercentages;
}

