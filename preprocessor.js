function preprocessData(data) {

    console.log("data:", data);

    let players = Array.from(new Set(data.flatMap(game => Object.keys(game).filter(key => key !== 'winner'))));
    players.sort();

    let uniqueDecks = [];
    data.forEach(game => {
        Object.keys(game).forEach(player => {
            if (player !== "winner" && !uniqueDecks.includes(game[player])) {
                uniqueDecks.push(game[player]);
            }
        });
    });
    uniqueDecks.sort();

    let encodedGames = data.map(game => {
        let gameEncoding = players.map(player => {
            let playerEncoding = new Array(uniqueDecks.length).fill(0);
            if (game.hasOwnProperty(player)) {
                let deckUsed = game[player];
                playerEncoding[uniqueDecks.indexOf(deckUsed)] = 1;
            }
            return playerEncoding;
        });
    
        return {
            encoded: gameEncoding,
            winner: game.winner
        };
    });
    
    return { processedPlayers: players, processedDecks: uniqueDecks, processedGames: encodedGames };

}

// Core function to prepare the input data for both training and inference
function prepareGameInput(encodedGame) {
    // Flatten the 2D array into 1D
    return encodedGame.flat();
}


// Function to prepare training data
function prepareTrainingData(players, uniqueDecks, encodedGames) {
    console.log("prepareTrainingData");
    console.log("players:", players);
    console.log("uniqueDecks:", uniqueDecks);
    console.log("encodedGames:", encodedGames);
    const X = [];
    const y = [];

    encodedGames.forEach(game => {
        const gameInput = prepareGameInput(game.encoded);
        const winnerIndex = players.indexOf(game.winner);

        if (winnerIndex === -1) {
            console.warn("Winner not found in players list:", game.winner);
            return; // skip this game if the winner is missing
        }

        X.push(gameInput);
        y.push(winnerIndex);
    });

    // Convert X and y to tensors
    const inputTensor = tf.tensor2d(X);
    const targetTensor = tf.tensor2d(y, [y.length, 1]);

    return { inputTensor, targetTensor };
}

// Function to prepare inference data (without target labels)
function prepareInferenceData(players, uniqueDecks, game) {
    const X = [];

    // Create a full encoding for the game using all players and decks
    let gameEncoding = players.map(player => {
        let playerEncoding = new Array(uniqueDecks.length).fill(0); // Fill with 0s for all decks
        if (game.hasOwnProperty(player)) {
            let deckUsed = game[player];
            playerEncoding[uniqueDecks.indexOf(deckUsed)] = 1; // Set the correct deck as 1
        }
        return playerEncoding;
    });

    // Ensure the game encoding has the correct shape (flatten to 1D)
    const gameInput = prepareGameInput(gameEncoding);  // Flattened encoding for the model

    // For inference, no target data is needed, just the input
    X.push(gameInput);

    // Convert the encoded data into a tensor and return it
    const inputTensor = tf.tensor2d(X);  // This should have shape [1, 322] now
    return inputTensor;
}