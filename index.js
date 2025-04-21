
var decks;
var originalTitle;
var originalImages;
document.addEventListener('DOMContentLoaded', function () {
    setupDropArea();
    originalTitle = document.getElementById('title').innerHTML;

});

function setupDropArea() {
    const dropArea = document.getElementById('drop-area');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropArea.classList.add('highlight');
    }

    function unhighlight(e) {
        dropArea.classList.remove('highlight');
    }

    const fileInput = document.getElementById('fileInput');

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    }

    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        handleFiles(files);
        fileInput.value = '';
    });
}

function handleFiles(files) {
    ([...files]).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            console.log(e.target.result);
        };
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });
                const emptyRowIndex = json.findIndex(row => Object.values(row).every(value => value === null || value === '' || value === undefined));
                const trainingData = json.slice(0, emptyRowIndex);
                const inferenceData = json.slice(emptyRowIndex + 1);

                console.log("training data:", trainingData);
                const deckKeys = ["chuck's deck", "pk's deck", "dustin's deck"];
                decks = [
                    ...new Set(
                        trainingData.flatMap(record =>
                            deckKeys.map(key => record[key])
                        )
                    )
                ].sort();

                console.log(decks);

                const ohi = oneHotInputs(trainingData)
                tf.util.shuffle(ohi);
                const inputs = ohi.map(d => d.input);
                const labels = ohi.map(d => d.label);
                const inputTensor = tf.tensor2d(inputs);
                const labelTensor = tf.tensor1d(labels, 'int32');
                const oneHotLabels = tf.oneHot(labelTensor, 3); // 3 classes: chuck, pk, dustin
                const model = createModel(decks.length);
                console.log("model1:", model);
                train(model, inputTensor, oneHotLabels, function () {

                    const players = ['chuck', 'pk', 'dustin'];
                    const deckToIndex = Object.fromEntries(decks.map((deck, i) => [deck, i]));
                    const numDecks = decks.length;

                    // One-hot function
                    const oneHot = (index, length) =>
                        Array.from({ length }, (_, i) => (i === index ? 1 : 0));

                    console.log("inference data:", inferenceData);
                    const inputVecs = inferenceData.map(game => [
                        ...oneHot(deckToIndex[game["chuck's deck"]], numDecks),
                        ...oneHot(deckToIndex[game["pk's deck"]], numDecks),
                        ...oneHot(deckToIndex[game["dustin's deck"]], numDecks)
                    ]);

                    const inputTensor = tf.tensor2d(inputVecs);

                    const predictions = model.predict(inputTensor);

                    predictions.array().then(results => {
                        // Build table
                        const table = document.createElement('table');
                        table.style.borderCollapse = 'collapse';
                        table.style.marginTop = '1em';
                        table.innerHTML = `
                          <thead>
                            <tr>
                              <th>Game #</th>
                              <th>Chuck's Deck</th>
                              <th>PK's Deck</th>
                              <th>Dustin's Deck</th>
                              <th>Predicted Winner</th>
                              <th>Chuck %</th>
                              <th>PK %</th>
                              <th>Dustin %</th>
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
                            <td>${game["chuck's deck"]}</td>
                            <td>${game["pk's deck"]}</td>
                            <td>${game["dustin's deck"]}</td>
                            <td><strong>${predictedWinner}</strong></td>
                            <td>${(probs[0] * 100).toFixed(1)}%</td>
                            <td>${(probs[1] * 100).toFixed(1)}%</td>
                            <td>${(probs[2] * 100).toFixed(1)}%</td>
                          `;
                            tbody.appendChild(row);
                        });

                        const container = document.getElementById('predictions');
                        container.innerHTML = ''; // Clear any old table
                        container.appendChild(table);
                    });
                });
            };
        } else {
            reader.readAsText(file);
        }
    });
}

function createModel(numberOfDecks) {

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: numberOfDecks * 3, units: 16, activation: 'relu' }));
    //model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    model.summary();
    return model;
}

async function train(model, inputTensor, oneHotLabels, callback) {
    console.log('Training...');
    console.log("model:", model);
    await model.fit(inputTensor, oneHotLabels, {
        epochs: 1000,
        batchSize: 4,
        shuffle: true,
        callbacks: tf.callbacks.earlyStopping({ monitor: 'loss', patience: 10 })
    });
    console.log('Training complete!');
    callback();
}

function oneHotInputs(trainingData) {

    const players = ['chuck', 'pk', 'dustin'];

    const deckToIndex = Object.fromEntries(decks.map((deck, i) => [deck, i]));
    const numDecks = decks.length;

    // One-hot function
    const oneHot = (index, length) =>
        Array.from({ length }, (_, i) => (i === index ? 1 : 0));

    // Build dataset
    const data = trainingData.map(record => {
        const chuckVec = oneHot(deckToIndex[record["chuck's deck"]], numDecks);
        const pkVec = oneHot(deckToIndex[record["pk's deck"]], numDecks);
        const dustinVec = oneHot(deckToIndex[record["dustin's deck"]], numDecks);

        const input = [...chuckVec, ...pkVec, ...dustinVec]; // input features
        const label = players.indexOf(record.winner);        // 0, 1, or 2

        return { input, label };
    });

    return data;
}