let players = [];
let decks;
let originalTitle;
let model;

document.addEventListener('DOMContentLoaded', function () {
    setupDropArea();
    originalTitle = document.getElementById('title').innerHTML;
});

const defaultButton = document.createElement('button');
defaultButton.textContent = 'Use Default Google Sheet';
defaultButton.style.marginBottom = '1em';
defaultButton.onclick = () => {
    loadFromGoogleSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMpIhYcYDwpGE_GlsMTClC8WaFgNGAmVa_8SH5QwloJn9aFze3ifL_XPiYJnDQtNZYWsuVZ9xUl8TF/pub?gid=0&single=true&output=csv');
};
document.getElementById('title').prepend(defaultButton);

// Utility to extract players from training data headers
function extractPlayersFromTrainingData(trainingData) {
    const playerSet = new Set();

    trainingData.forEach(row => {
        Object.keys(row).forEach(key => {
            if (key.endsWith("'s deck")) {
                playerSet.add(key.replace(/'s deck$/, ""));
            }
        });
    });

    return Array.from(playerSet);
}

function oneHot(index, length) {
    return Array.from({ length }, (_, i) => (i === index ? 1 : 0));
}

function setupDropArea() {
    const dropArea = document.getElementById('drop-area');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    const fileInput = document.getElementById('fileInput');
    dropArea.addEventListener('click', () => fileInput.click());

    dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });
}

function loadFromGoogleSheet(csvUrl) {
    document.getElementById('title').innerHTML = 'Training from Google Sheet...';

    fetch(csvUrl)
        .then(response => response.text())
        .then(text => {
            const workbook = XLSX.read(text, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });

            const emptyRowIndex = json.findIndex(row => Object.values(row).every(value => !value));
            const trainingData = json.slice(0, emptyRowIndex);
            const inferenceData = json.slice(emptyRowIndex + 1);

            players = extractPlayersFromTrainingData(trainingData);
            decks = [...new Set(trainingData.flatMap(record =>
                players.map(player => record[`${player}'s deck`])
            ))].sort();

            const ohi = oneHotInputs(trainingData);
            tf.util.shuffle(ohi);
            const inputs = ohi.map(d => d.input);
            const labels = ohi.map(d => d.label);
            const inputTensor = tf.tensor2d(inputs);
            const labelTensor = tf.tensor1d(labels, 'int32');
            const oneHotLabels = tf.oneHot(labelTensor, players.length);

            createModel(decks.length);
            train(inputTensor, oneHotLabels, () => {
                const deckToIndex = Object.fromEntries(decks.map((deck, i) => [deck, i]));
                const inputVecs = inferenceData.map(game => players.flatMap(player => {
                    const deckName = game[`${player}'s deck`];
                    if (!deckName || !(deckName in deckToIndex)) {
                        return Array(decks.length).fill(0); // pad
                    }
                    return oneHot(deckToIndex[deckName], decks.length);
                }));
                const inputTensor = tf.tensor2d(inputVecs);
                const predictions = model.predict(inputTensor);
                predictions.array().then(results => {
                    makePredictionsTable(players, inferenceData, results);
                });
                createAdditionalPredictionInterface(players, decks);
            });
        });
}

function handleFiles(files) {
    document.getElementById('title').innerHTML = 'Training...';
    [...files].forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });

            const emptyRowIndex = json.findIndex(row => Object.values(row).every(value => !value));
            const trainingData = json.slice(0, emptyRowIndex);
            const inferenceData = json.slice(emptyRowIndex + 1);

            players = extractPlayersFromTrainingData(trainingData);
            decks = [...new Set(trainingData.flatMap(record =>
                players.map(player => record[`${player}'s deck`])
            ))].sort();

            const ohi = oneHotInputs(trainingData);
            tf.util.shuffle(ohi);
            const inputs = ohi.map(d => d.input);
            const labels = ohi.map(d => d.label);
            const inputTensor = tf.tensor2d(inputs);
            const labelTensor = tf.tensor1d(labels, 'int32');
            const oneHotLabels = tf.oneHot(labelTensor, players.length);

            createModel(decks.length);
            train(inputTensor, oneHotLabels, () => {
                const deckToIndex = Object.fromEntries(decks.map((deck, i) => [deck, i]));
                const inputVecs = inferenceData.map(game => players.flatMap(player => {
                    const deckName = game[`${player}'s deck`];
                    if (!deckName || !(deckName in deckToIndex)) {
                        return Array(decks.length).fill(0); // pad
                    }
                    return oneHot(deckToIndex[deckName], decks.length);
                }));
                const inputTensor = tf.tensor2d(inputVecs);
                const predictions = model.predict(inputTensor);
                predictions.array().then(results => {
                    makePredictionsTable(players, inferenceData, results);
                });
                createAdditionalPredictionInterface(players, decks);
            });
        };

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
}

function oneHotInputs(trainingData) {
    const deckToIndex = Object.fromEntries(decks.map((deck, i) => [deck, i]));
    return trainingData.map(record => {
        const input = players.flatMap(player => {
            const deckName = record[`${player}'s deck`];
            if (!deckName || !(deckName in deckToIndex)) {
                // Missing player: pad with zeros
                return Array(decks.length).fill(0);
            }
            return oneHot(deckToIndex[deckName], decks.length);
        });
        const label = players.indexOf(record.winner);
        return { input, label };
    });
}


function createModel(inputSize) {
    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [inputSize * players.length], units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: players.length, activation: 'softmax' }));
    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
    model.summary();
}

async function train(inputTensor, oneHotLabels, callback) {
    await model.fit(inputTensor, oneHotLabels, {
        epochs: 1000,
        batchSize: 4,
        shuffle: true,
        callbacks: tf.callbacks.earlyStopping({ monitor: 'loss', patience: 10 })
    });
    callback();
}

function makePredictionsTable(players, inferenceData, results) {
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '1em';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game #</th>
                ${players.map(p => `<th>${p}'s Deck</th>`).join('')}
                <th>Predicted Winner</th>
                ${players.map(p => `<th>${p} %</th>`).join('')}
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    results.forEach((probs, i) => {
        const game = inferenceData[i];
        const winnerIndex = probs.indexOf(Math.max(...probs));
        const predictedWinner = players[winnerIndex];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            ${players.map(p => `<td>${game[`${p}'s deck`]}</td>`).join('')}
            <td><strong>${predictedWinner}</strong></td>
            ${probs.map(p => `<td>${(p * 100).toFixed(1)}%</td>`).join('')}
        `;
        tbody.appendChild(row);
    });

    const container = document.getElementById('predictions');
    container.innerHTML = '';
    container.appendChild(table);
    document.getElementById('title').innerHTML = originalTitle;
}

function createAdditionalPredictionInterface(players, decks) {
    const container = document.getElementById('additional-predictions');
    container.innerHTML = '';
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '20px';

    players.forEach(player => {
        const label = document.createElement('label');
        label.textContent = player;
        label.style.display = 'block';
        const select = document.createElement('select');
        select.name = player;
        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck;
            option.textContent = deck;
            select.appendChild(option);
        });
        div.appendChild(label);
        div.appendChild(select);
    });

    const predictButton = document.createElement('button');
    predictButton.textContent = 'Predict';
    predictButton.onclick = handlePrediction;
    div.appendChild(document.createElement('br'));
    div.appendChild(predictButton);
    container.appendChild(div);
}

function handlePrediction() {
    const container = document.getElementById('additional-predictions');
    const selects = container.querySelectorAll('select');
    const values = Array.from(selects).map(select => select.value);
    const deckToIndex = Object.fromEntries(decks.map((deck, i) => [deck, i]));
    const inferenceData = [Object.fromEntries(players.map((p, i) => [`${p}'s deck`, values[i]]))];

    const inputVecs = inferenceData.map(game => players.flatMap(player => {
        const deckName = game[`${player}'s deck`];
        if (!deckName || !(deckName in deckToIndex)) {
            return Array(decks.length).fill(0); // pad
        }
        return oneHot(deckToIndex[deckName], decks.length);
    }));
    const inputTensor = tf.tensor2d(inputVecs);
    const predictions = model.predict(inputTensor);
    predictions.array().then(results => {
        appendPredictionRow(values, results[0], players);
    });
}

function appendPredictionRow(selectedDecks, probs, players) {
    const table = document.querySelector('#predictions table');
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;
    const rowCount = tbody.children.length;
    const winnerIndex = probs.indexOf(Math.max(...probs));
    const predictedWinner = players[winnerIndex];

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        ${selectedDecks.map(deck => `<td>${deck}</td>`).join('')}
        <td><strong>${predictedWinner}</strong></td>
        ${probs.map(p => `<td>${(p * 100).toFixed(1)}%</td>`).join('')}
    `;
    tbody.appendChild(row);
}
