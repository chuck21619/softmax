import Data from './data.js';
import { createModel } from './mtgModel.js';
import { trainModel } from './mtgModel.js';

let players = [];
let decks = [];
let originalTitle = "";
let model;

document.addEventListener('DOMContentLoaded', function () {
    const data = new Data();
    originalTitle = document.getElementById('title').innerHTML;
    const trainButton = document.getElementById('train');
    trainButton.onclick = () => {
        data.fetchTrainingData((games) => {
            console.log("json:", games);

            const { cleanedGames, winners } = data.cleanedGamesAndWinners(games);
            console.log("cleaned games:", cleanedGames);
            console.log("winners:", winners);
            players = data.uniquePlayers(cleanedGames);
            console.log("players:", players);
            decks = data.uniqueDecks(cleanedGames);
            console.log("decks:", decks);
            const { playerTensor, deckTensor } = data.inputTensorsFromCleanedGames(cleanedGames, players, decks);
            playerTensor.print();
            deckTensor.print();
            const targetTensor = data.targetTensorFromWinners(winners, players);
            targetTensor.print();

            model = createModel(players.length, decks.length);
            console.log(model.summary());
            trainModel(model, playerTensor, deckTensor, targetTensor, () => {
                console.log("training complete");
                document.getElementById('title').innerHTML = originalTitle;
                populateInferenceUI();
                document.getElementById('predictionSection').style.display = 'block';
            });

            //build prediction interface
        });
    };

    document.getElementById('predictButton').onclick = () => {
        const playerIds = [];
        const deckIds = [];
        const chosenPlayers = [];
    
        for (let i = 1; i <= 4; i++) {
            const player = document.getElementById(`player${i}`).value;
            const deck = document.getElementById(`deck${i}`).value;
    
            if (player && deck) {
                playerIds.push(players.indexOf(player));
                deckIds.push(decks.indexOf(deck));
                chosenPlayers.push(player);
            }
        }
    
        if (playerIds.length < 2) {
            alert("Please select at least 2 players and their decks.");
            return;
        }
    
        // Pad with -1s for missing players/decks to get shape [1, 4]
        while (playerIds.length < 4) {
            playerIds.push(-1);
            deckIds.push(-1);
        }
    
        const playerTensor = tf.tensor2d([playerIds], [1, 4], 'int32');
        const deckTensor = tf.tensor2d([deckIds], [1, 4], 'int32');
    
        model.predict([playerTensor, deckTensor]).array().then(predictions => {
            const prediction = predictions[0];
    
            // Filter only the players that were selected
            const selectedPredictions = chosenPlayers.map(p => {
                const index = players.indexOf(p);
                return { name: p, prob: prediction[index] };
            });
    
            // Sort by highest chance first
            selectedPredictions.sort((a, b) => b.prob - a.prob);
    
            // Format the predictions for the alert
            const formatted = selectedPredictions.map(p => {
                const percent = (p.prob * 100).toFixed(2);
                return `${p.name}: ${percent}%`;
            }).join('\n');
    
            // Get the highest predicted winner
            const highest = selectedPredictions[0];
            const winnerText = `Predicted Winner: ${highest.name} (${(highest.prob * 100).toFixed(2)}%)`;
    
            // Show the alert with the individual percentages and the predicted winner
            alert(`Prediction:\n\n${formatted}\n\n${winnerText}`);
        });
    };
});

function populateInferenceUI() {
    for (let i = 1; i <= 4; i++) {
        const playerSelect = document.getElementById(`player${i}`);
        const deckSelect = document.getElementById(`deck${i}`);

        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            playerSelect.appendChild(option);
        });

        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck;
            option.textContent = deck;
            deckSelect.appendChild(option);
        });
    }
}