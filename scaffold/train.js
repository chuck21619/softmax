import { createModel } from './model.js';
import { prepareData } from './data.js';

const MAX_PLAYERS = 4;  // Define this globally at the top

let players = [];  // Global variable for players
let decks = [];    // Global variable for decks
let model;

document.getElementById('predictButton').addEventListener('click', predictWinner);

document.addEventListener('DOMContentLoaded', function () {
    const sheetButton = document.getElementById('loadGoogleSheetButton');
    sheetButton.onclick = () => {
        loadFromGoogleSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMpIhYcYDwpGE_GlsMTClC8WaFgNGAmVa_8SH5QwloJn9aFze3ifL_XPiYJnDQtNZYWsuVZ9xUl8TF/pub?gid=0&single=true&output=csv');
    };

    // Disable predict button initially, will enable after training
    document.getElementById('predictButton').disabled = true;
});

// Function to train the model using the loaded data
async function trainModel(xs, ys) {
    console.log('Training...');
    model = createModel(players.length, decks.length);

    await model.fit(xs, ys, {
        epochs: 100,
        batchSize: 8,
        shuffle: true,
        validationSplit: 0.2,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, acc = ${logs.acc.toFixed(4)}`);
            }
        }
    });

    console.log('Training Complete!');
    updateUIAfterTraining();  // Update the UI with the vocab after training

    // Enable predict button once training is complete
    document.getElementById('predictButton').disabled = false;
}

// Function to update the UI with player and deck options after training
function updateUIAfterTraining() {
    document.getElementById('predictionSection').style.display = 'block';

    console.log('Players:', players);
    console.log('Decks:', decks);

    for (let i = 1; i <= 4; i++) {
        const playerDropdown = document.getElementById(`player${i}`);
        const deckDropdown = document.getElementById(`deck${i}`);

        playerDropdown.innerHTML = '';
        deckDropdown.innerHTML = '';

        playerDropdown.add(new Option('Select Player', ''));
        deckDropdown.add(new Option('Select Deck', ''));

        players.forEach(player => {
            playerDropdown.add(new Option(player, player));
        });

        decks.forEach(deck => {
            deckDropdown.add(new Option(deck, deck));
        });
    }
}

function prepareInferenceData() {
    const playersSelection = [];
    const decksSelection = [];

    for (let i = 1; i <= 4; i++) {
        const player = document.getElementById(`player${i}`).value;
        const deck = document.getElementById(`deck${i}`).value;
        playersSelection.push(players.indexOf(player) !== -1 ? players.indexOf(player) : -1);
        decksSelection.push(decks.indexOf(deck) !== -1 ? decks.indexOf(deck) : -1);
    }

    while (playersSelection.length < 4) {
        playersSelection.push(-1);
        decksSelection.push(-1);
    }

    return { players: playersSelection, decks: decksSelection };
}

function predictWinner() {
    const inferenceData = prepareInferenceData();
    console.log('Inference Data:', inferenceData);
    
    // Prepare tensors for prediction
    const playerTensor = tf.tensor2d([inferenceData.players], [1, 4], 'int32');
    const deckTensor = tf.tensor2d([inferenceData.decks], [1, 4], 'int32');

    // Get prediction data
    const prediction = model.predict([playerTensor, deckTensor]).dataSync();  // Use .dataSync() to get raw data from tensor
    console.log('Prediction:', prediction);

    // Map prediction values to percentages and associate them with selected players
    const playerPercentages = inferenceData.players.map((playerIndex, idx) => {
        if (playerIndex !== -1) {
            return {
                player: players[playerIndex],  // The player name
                percentage: (prediction[idx] * 100).toFixed(2)  // Convert prediction to percentage
            };
        }
        return null;
    }).filter(item => item !== null);  // Filter out null values (unselected players)

    // Find the expected winner by looking for the player with the highest prediction
    const expectedWinner = playerPercentages.reduce((max, player) => {
        return player.percentage > max.percentage ? player : max;
    }, playerPercentages[0]);

    // Create a message for the alert
    let message = 'Prediction Results:\n\n';

    playerPercentages.forEach(player => {
        message += `${player.player}: ${player.percentage}%\n`;
    });

    message += `\nExpected Winner: ${expectedWinner.player}`;

    // Display the alert with the prediction results
    alert(message);
}




async function loadFromGoogleSheet(csvUrl) {
    document.getElementById('title').innerHTML = 'Training from Google Sheet...';
    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const workbook = XLSX.read(text, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });

            console.log(json);

            const playerSet = new Set();
            const deckSet = new Set();

            json.forEach(game => {
                Object.keys(game).forEach(key => {
                    if (key !== 'winner') {
                        playerSet.add(key);
                        deckSet.add(game[key]);
                    }
                });
            });

            players = Array.from(playerSet).sort();
            decks = Array.from(deckSet).sort();

            console.log('Sorted Players:', players);
            console.log('Sorted Decks:', decks);

            const { xs, ys } = prepareData(json, players, decks, MAX_PLAYERS);

            trainModel(xs, ys);
        });
}
