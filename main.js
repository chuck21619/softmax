let players = [];
let decks = [];
let model;

document.addEventListener('DOMContentLoaded', function () {
    setupDropArea();
    const defaultButton = document.getElementById('loadGoogleSheetButton');
    defaultButton.onclick = () => {
        loadFromGoogleSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMpIhYcYDwpGE_GlsMTClC8WaFgNGAmVa_8SH5QwloJn9aFze3ifL_XPiYJnDQtNZYWsuVZ9xUl8TF/pub?gid=0&single=true&output=csv', passToPreprocessor);
    };
});

function setupDropArea() {
    const dropArea = document.getElementById('drop-area');

    // Prevent default behavior for drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // Highlight the drop area when a file is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    // Remove highlight when the drag leaves or the file is dropped
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    // When clicking the drop area, open the file input dialog
    const fileInput = document.getElementById('fileInput');
    dropArea.addEventListener('click', () => fileInput.click());

    // Handle the file selection
    dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files, passToPreprocessor), false);
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files, passToPreprocessor);
        fileInput.value = '';
    });
}

function passToPreprocessor(data) {
    console.log("data:", data);
    let { processedPlayers, processedDecks, processedGames } = preprocessData(data);
    players = processedPlayers;
    console.log("players: ", processedPlayers);
    decks = processedDecks;
    console.log("decks: ", decks);
    console.log("games: ", processedGames);
    createModel(players.length, decks.length);
    const { inputTensor, targetTensor } = prepareTrainingData(players, decks, processedGames);
    console.log("input tensor: ", inputTensor);
    console.log("target tensor: ", targetTensor);
    trainModel(inputTensor, targetTensor, () => {
        console.log("finished training");
        createPredictionInterface(players, decks);
    });
}

function createModel(numberOfPlayers, numberOfDecks) {

    const inputShape = numberOfDecks * numberOfPlayers;

    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape, units: 2000, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1000, activation: 'relu' }));
    model.add(tf.layers.dense({ units: numberOfPlayers, activation: 'softmax' }));

    model.compile({
        optimizer: 'adam',
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy']
    });

    console.log(model.summary());
}

async function trainModel(inputTensor, targetTensor, callback) {
    console.log("target sensor shape:",targetTensor.shape); // should be [numExamples]
    console.log("target sensor:", targetTensor.arraySync()); // should show integers (0, 1, 2, ...)
    await model.fit(inputTensor, targetTensor, {
        epochs: 1000,
        batchSize: 4,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if ((epoch + 1) % 100 === 0) {
                    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc?.toFixed(4)}`);
                }
            }
        }
    });
    callback();
}

function handlePrediction() {
    const selects = document.querySelectorAll("select");
    let game = {};
    selects.forEach(select => {
        const playerName = select.name;
        const selectedDeck = select.value;
        if (selectedDeck !== '') {
            game[playerName] = selectedDeck;
        }
    });
    console.log("game:", game);
    let inputTensor = prepareInferenceData(players, decks, game);
    console.log(inputTensor);
    const prediction = model.predict(inputTensor);
    prediction.print(); // Optional: logs the prediction tensor
    const predictedIndex = prediction.argMax(-1).dataSync()[0];
    const predictedWinner = players[predictedIndex];
    console.log("Predicted winner:", predictedWinner);
}

function createPredictionInterface(players, decks) {
    const container = document.getElementById("predictionInterface");
    container.innerHTML = "";

    players.forEach(player => {
        const label = document.createElement("label");
        label.textContent = `Choose a deck for ${player}: `;

        const select = document.createElement("select");
        select.name = player;

        const nullOption = document.createElement("option");
        nullOption.value = "";
        nullOption.textContent = "";
        nullOption.selected = true;
        select.appendChild(nullOption);

        decks.forEach(deck => {
            const option = document.createElement("option");
            option.value = deck;
            option.textContent = deck;
            select.appendChild(option);
        });

        container.appendChild(label);
        container.appendChild(select);
        container.appendChild(document.createElement("br"));
    });

    const predictButton = document.createElement("button");
    predictButton.textContent = "Predict";
    predictButton.onclick = handlePrediction;
    container.appendChild(predictButton);
}