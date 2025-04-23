import { createModel } from './model.js';
import { rawGames, buildVocab, prepareData } from './data.js';

const MAX_PLAYERS = 4;

const { playerToIndex, deckToIndex } = buildVocab(rawGames);
const NUM_PLAYERS = Object.keys(playerToIndex).length;
const NUM_DECKS = Object.keys(deckToIndex).length;

const { xs, ys } = prepareData(rawGames, playerToIndex, deckToIndex, MAX_PLAYERS);
const model = createModel(NUM_PLAYERS, NUM_DECKS);

// Wrap the training logic in a function
async function trainModel(xs, ys, playerToIndex, deckToIndex) {
    console.log('Training...');

    // Create model with the correct number of players and decks
    const model = createModel(Object.keys(playerToIndex).length, Object.keys(deckToIndex).length);

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

    // ✅ Ensure vocab exists
    if (!playerToIndex || !deckToIndex) {
        throw new Error("Vocab maps not defined!");
    }

    const examplePlayers = ['chuck', 'pk', 'dustin'];
    const exampleDecks = ['windgrace', 'wyleth', 'lita'];

    // Prepare example player and deck inputs
    const player_input_arr = [examplePlayers.map(p => playerToIndex[p] || 0)];
    const deck_input_arr = [exampleDecks.map(d => deckToIndex[d] || 0)];

    // Pad inputs if there are fewer than 4 players or decks
    while (player_input_arr[0].length < 4) {
        player_input_arr[0].push(0);
        deck_input_arr[0].push(0);
    }

    // Convert arrays to tensors for prediction
    const pTensor = tf.tensor2d(player_input_arr, [1, 4], 'int32');
    const dTensor = tf.tensor2d(deck_input_arr, [1, 4], 'int32');

    // Make a prediction and print the result
    model.predict([pTensor, dTensor]).print(); // ✅ This works!
}

// Add an event listener for the button click to start training manually
document.addEventListener('DOMContentLoaded', function () {

    // Optional: Add the Google Sheet button logic as well
    const sheetButton = document.getElementById('loadGoogleSheetButton');
    sheetButton.onclick = () => {
        loadFromGoogleSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMpIhYcYDwpGE_GlsMTClC8WaFgNGAmVa_8SH5QwloJn9aFze3ifL_XPiYJnDQtNZYWsuVZ9xUl8TF/pub?gid=0&single=true&output=csv');
    };
});

// Function to load data from Google Sheet (remains unchanged)
function loadFromGoogleSheet(csvUrl) {
    document.getElementById('title').innerHTML = 'Training from Google Sheet...';
    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const workbook = XLSX.read(text, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });
            console.log(json);

            // Prepare the data from the Google Sheet
            const { playerToIndex, deckToIndex } = buildVocab(json);
            const { xs, ys } = prepareData(json, playerToIndex, deckToIndex, MAX_PLAYERS);

            // Train the model using the prepared data
            trainModel(xs, ys, playerToIndex, deckToIndex);  // Passing vocab maps as well
        });
}