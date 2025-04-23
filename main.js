let players = [];
let decks = [];
let deckStrength = [];
let model;

document.addEventListener('DOMContentLoaded', function () {
    setupDropArea();
    const defaultButton = document.getElementById('loadGoogleSheetButton');
    defaultButton.onclick = () => {
        loadFromGoogleSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMpIhYcYDwpGE_GlsMTClC8WaFgNGAmVa_8SH5QwloJn9aFze3ifL_XPiYJnDQtNZYWsuVZ9xUl8TF/pub?gid=0&single=true&output=csv', preprocess);
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
    dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files, preprocess), false);
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files, preprocess);
        fileInput.value = '';
    });
}

function preprocess(data) {
    console.log("data:", data);
    players = extractPlayers(data);
    console.log("players:", players);
    decks = extractDecks(data);
    console.log("decks:", decks);
    deckStrength = calculateDeckStrength(decks, data);
    createModel(players.length, decks.length);
    const trainingData = prepareTrainingData(players, decks, deckStrength, data);
    console.log("trianing data:", trainingData);
    trainModel(trainingData.inputs, trainingData.targets, () => {
        console.log("finished training");
        createPredictionInterface(players, decks);
    });
}

function createModel(numberOfPlayers, numberOfDecks) {
    const inputShape = (numberOfDecks * numberOfPlayers) + numberOfPlayers + numberOfDecks;
    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape, units: 256, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: numberOfPlayers, activation: 'softmax' }));

    model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    console.log(model.summary());
}

async function trainModel(inputTensor, targetTensor, callback) {
    await model.fit(inputTensor, targetTensor, {
        epochs: 100,
        batchSize: 4,
        shuffle: false,
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
    console.log("-------");
    const selects = document.querySelectorAll("select");
    let game = {};
    selects.forEach(select => {
        const playerName = select.name;
        const selectedDeck = select.value;
        if (selectedDeck !== '') {
            game[playerName] = selectedDeck;
        }
    });
    let inputTensor = prepareInferenceData(players, decks, deckStrength, game);
    console.log(inputTensor.arraySync());
    const prediction = model.predict(inputTensor);
    prediction.print();
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