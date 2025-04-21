import Univarite from './methods/Univariate.js';
import MultipleVariable from './methods/MultipleVariable.js';
import Polynomial from './methods/Polynomial.js';
import PolynomialCubed from './methods/PolynomialCubed.js';
import LogisticRegression from './methods/LogisticRegression.js';
import NeuralNetworkBinaryClassification from './methods/NeuralNetworkBinaryClassification.js';
import MultipleLogisticRegression from './methods/MultipleLogisticRegression.js';

var method;
function onNavButtonClick(file) {
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => link.classList.remove('active'));
    const clickedLink = document.querySelector(`nav ul li a[data-jsFile="${file}"]`);
    clickedLink.classList.add('active');

    document.getElementById('drop-area').hidden = false;
    setChartVisible(false);
    document.getElementById('equation').innerText = '';
    document.getElementById('predictions').innerHTML = '';
    if (file == 'About.js') {
        document.getElementById('drop-area').hidden = true;
        document.getElementById('title').innerHTML = originalTitle;
        document.getElementById('subtitle').innerHTML = originalSubtitle;
        document.getElementById('equation').innerHTML = originalEquation;
        document.getElementById('images').innerHTML = originalImages;
    }
    else {
        document.getElementById('images').innerHTML = '';
        if (file == 'Univariate.js') {
            method = new Univarite(myChart);
            document.getElementById('title').innerHTML = "Univariate<br>Linear Regression";
            document.getElementById('subtitle').innerHTML = "Mean Normalized. Non-polynomial.";
        }
        else if (file == 'MultipleVariable.js') {
            document.getElementById('title').innerHTML = "Multiple Variable<br>Linear Regression";
            document.getElementById('subtitle').innerHTML = "Mean Normalized. Non-polynomial with no feature interaction.";
            method = new MultipleVariable(myChart);
        }
        else if (file == 'Polynomial.js') {
            document.getElementById('title').innerHTML = "Polynomial Univariate<br>Linear Regression";
            document.getElementById('subtitle').innerHTML = "Mean Normalized. Features are input and input squared.";
            method = new Polynomial(myChart);
        }
        else if (file == 'PolynomialCubed.js') {
            document.getElementById('title').innerHTML = "Polynomial Univariate<br>Linear Regression";
            document.getElementById('subtitle').innerHTML = "Mean Normalized. Features are input, input squared, and input cubed.";
            method = new PolynomialCubed(myChart);
        }
        else if (file == 'LogisticRegression.js') {
            document.getElementById('title').innerHTML = "Univariate<br>Logistic Regression";
            document.getElementById('subtitle').innerHTML = "Mean Normalized. Non-polynomial.";
            method = new LogisticRegression(myChart);
        }
        else if (file == 'MultipleLogisticRegression.js') {
            document.getElementById('title').innerHTML = "Multiple Variable<br>Logistic Regression";
            document.getElementById('subtitle').innerHTML = "Mean Normalized. Non-polynomial with no feature interaction";
            method = new MultipleLogisticRegression(myChart);
        }
        else if (file == 'NeuralNetworkBinaryClassification.js') {
            document.getElementById('title').innerHTML = "Binary Classication<br>Neural Network";
            document.getElementById('subtitle').innerHTML = "ReLu hidden activations. Sigmoid output activation. 0.0075 learning rate.";
            method = new NeuralNetworkBinaryClassification(myChart);
        }
    }
    document.getElementById('nnOptions').style.display = file == 'NeuralNetworkBinaryClassification.js' ? 'block' : 'none';
}

window.addEventListener('resize', function () {
    updateChartMaxHeight();
});

function updateChartMaxHeight() {
    if (document.getElementById('myChart').style.visibility == 'hidden') {
        document.getElementById('myChart').style.maxHeight = 0 + 'px';
    }
    else {
        const chartElement = document.getElementById('myChart');
        const chartBottom = chartElement.getBoundingClientRect().top;
        const windowHeight = window.innerHeight - 20;
        const maxChartHeight = windowHeight - chartBottom;
        chartElement.style.maxHeight = maxChartHeight + 'px';
    }
}

var originalTitle;
var originalSubtitle;
var originalEquation;
var originalImages;
document.addEventListener('DOMContentLoaded', function () {
    hookUpNavButtons();
    setupDropArea();
    createChart();
    setChartVisible(false);
    originalTitle = document.getElementById('title').innerHTML;
    originalSubtitle = document.getElementById('subtitle').innerHTML;
    originalEquation = document.getElementById('equation').innerHTML;
    originalImages = document.getElementById('images').innerHTML;

    //set About button active
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => link.classList.remove('active'));
    const clickedLink = document.querySelector(`nav ul li a[data-jsFile="${'About.js'}"]`);
    clickedLink.classList.add('active');
});


var myChart;
function createChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [] },
        options: {
            backgroundColor: 'rgb(255, 255, 255)',
            color: 'rgb(255, 255, 255)',
            responsive: true,
            plugins: {
                legend: {
                    onClick: function (event, legendItem) {
                        if (method instanceof MultipleVariable || method instanceof MultipleLogisticRegression) {
                            const index = legendItem.datasetIndex;
                            const dataset = myChart.data.datasets[index];
                            const label = dataset.label;
                            myChart.data.datasets.forEach((dataset) => {
                                dataset.hidden = dataset.label != label;
                            });
                            myChart.update();
                        }
                        else {
                            const datasetIndex = legendItem.datasetIndex;
                            const dataset = myChart.data.datasets[datasetIndex];
                            dataset.hidden = !dataset.hidden;
                            myChart.update();
                        }
                    },
                    labels: {
                        // Use a custom legend label to combine the line and scatter appearance
                        generateLabels: (chart) => {
                            const uniqueLabels = chart.data.datasets.filter((dataset, index, self) => {
                                return self.findIndex(d => d.label === dataset.label) === index;
                            });
                            return uniqueLabels.map(function (dataset, i) {
                                // Retrieve the dataset label
                                var meta = chart.getDatasetMeta(i);
                                var style = meta.controller.getStyle(0);

                                return {
                                    text: dataset.label,  // The dataset's label (e.g., "Sales", "Revenue")
                                    fillStyle: style.backgroundColor || style.borderColor,  // Dataset's fill color
                                    strokeStyle: style.borderColor,  // Border color
                                    lineWidth: style.borderWidth,  // Border width
                                    hidden: !chart.isDatasetVisible(i),  // Whether the dataset is visible or hidden
                                    datasetIndex: i,  // Index of the dataset
                                };
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: { color: 'rgb(0, 0, 0)' },
                    ticks: { color: 'rgb(0, 0, 0)' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgb(0, 0, 0)' },
                    ticks: { color: 'rgb(0, 0, 0)' }
                }
            }
        }
    });
}

function hookUpNavButtons() {
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        const jsFile = link.getAttribute('data-jsFile');
        link.addEventListener('click', () => onNavButtonClick(jsFile));
    });
}

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
                document.getElementById('predictions').innerHTML = '';
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });
                const emptyRowIndex = json.findIndex(row => Object.values(row).every(value => value === null || value === '' || value === undefined));
                const trainingData = json.slice(0, emptyRowIndex);
                const dataToPredict = json.slice(emptyRowIndex + 1);

                if (method instanceof NeuralNetworkBinaryClassification) {
                    method.configuration[NeuralNetworkBinaryClassification.layer_nodes] = [...neuronCounts, 1];
                    method.configuration[NeuralNetworkBinaryClassification.iterations] = document.getElementById('iterationDropdown').value;
                }

                method.trainModelAndGraphData(trainingData, () => {
                    updateChartMaxHeight();
                    setChartVisible(true);
                    myChart.update();
                    if (method instanceof MultipleVariable || MultipleLogisticRegression) {
                        for (let i = 1; i < myChart.data.datasets.length; i++) {
                            myChart.data.datasets[i].hidden = true;
                        }
                    }
                }, function (equationString, featureImpacts) {
                    const keys = Object.keys(json[0]);
                    var featureImpactsString = ""
                    if (featureImpacts.length > 0) {
                        if (method instanceof MultipleVariable || MultipleLogisticRegression) {
                            featureImpactsString = featureImpacts.reduce((string, impact, index) => {
                                return string + keys[index] + "=" + (impact * 100).toFixed(0) + "% ";
                            }, "feature importance: ");
                        }
                    }
                    document.getElementById('equation').style.display = equationString.length > 0 ? 'block' : 'none';
                    document.getElementById('equation').innerHTML = "Prediction = " + equationString + "<br><br>" + featureImpactsString;
                    updateChartMaxHeight();

                    function generateTableHTML(data, lastColumnData) {
                        if (data.length === 0) return '';
                        const headers = Object.keys(data[0]);
                        headers.push(keys.at(-1) + " prediction");
                        const headerHTML = headers.map(header => `<th>${header}</th>`).join('');
                        const rowsHTML = data.map((row, index) => {
                            return `<tr>` +
                                headers.slice(0, -1).map(header => `<td>${row[header]}</td>`).join('') +
                                `<td>${lastColumnData[index].toFixed(2)}</td>` +
                                `</tr>`;
                        }).join('');
                        const tableHTML = `
                            <table border="1">
                                <thead>
                                    <tr>${headerHTML}</tr>
                                </thead>
                                <tbody>
                                    ${rowsHTML}
                                </tbody>
                            </table>
                        `;

                        return tableHTML;
                    }
                    if (emptyRowIndex != -1) {
                        const predictions = method.parseJsonAndPredict(dataToPredict);
                        const tableHTML = generateTableHTML(dataToPredict, predictions);
                        document.getElementById('predictions').innerHTML = tableHTML;
                    }
                });
            };
        } else {
            reader.readAsText(file);
        }
    });
}

function setChartVisible(showChart) {
    if (showChart) {
        document.getElementById('myChart').style.visibility = 'visible';
    }
    else {
        document.getElementById('myChart').style.visibility = 'hidden';
        myChart.clear();
    }
    updateChartMaxHeight();
}


const table = document.getElementById('nnTable');
let numLayers = 1;
let neuronCounts = [5]; // Initialize with a default value for the first layer
createTable(); // Initial table creation
function createTable() {
    table.innerHTML = ''; // Clear the table
    let buttonRow = table.insertRow();
    let labelRow = table.insertRow();
    let dropdownRow = table.insertRow();

    // Add labels to the beginning of each row
    let buttonLabelCell = buttonRow.insertCell(0);
    buttonLabelCell.innerHTML = "Add/Remove";
    let labelLabelCell = labelRow.insertCell(0);
    labelLabelCell.innerHTML = "Hidden Layer";
    let dropdownLabelCell = dropdownRow.insertCell(0);
    dropdownLabelCell.innerHTML = "# of Neurons";

    for (let i = 0; i < numLayers; i++) {
        let buttonCell = buttonRow.insertCell();
        let removeButton = document.createElement('button');
        removeButton.textContent = '-';
        removeButton.addEventListener('click', () => removeLayer(i));
        buttonCell.appendChild(removeButton);

        let labelCell = labelRow.insertCell();
        let layerLabel = document.createElement('span');
        layerLabel.textContent = `${i + 1}`;
        labelCell.appendChild(layerLabel);

        // Hide remove button if only one layer
        if (numLayers === 1) {
            removeButton.style.display = 'none';
        } else {
            removeButton.style.display = '';
        }

        // Dropdown Row (Neuron Selection)
        let dropdownCell = dropdownRow.insertCell();
        let dropdown = document.createElement('select');
        dropdown.id = `layer${i + 1}`; // Add an ID to the dropdown
        for (let j = 1; j <= 1000; j++) {
            let option = document.createElement('option');
            option.value = j;
            option.text = j;
            dropdown.add(option);
        }
        dropdown.value = neuronCounts[i]; // Set the selected value
        dropdown.addEventListener('change', storeNeuronCounts); // Add event listener
        dropdownCell.appendChild(dropdown);
    }

    // Add the "+" button column
    let buttonCell = buttonRow.insertCell();
    let labelCell = labelRow.insertCell();
    let dropdownCell = dropdownRow.insertCell();

    let addLayerBtn = document.createElement('button');
    addLayerBtn.textContent = '+';
    addLayerBtn.addEventListener('click', addLayer);

    buttonCell.appendChild(addLayerBtn);
}

function addLayer() {
    // Store current neuron counts
    storeNeuronCounts();
    numLayers++;
    neuronCounts.push(1); // Default value for the new layer
    createTable();
    restoreNeuronCounts();
}

function removeLayer(index) {
    if (numLayers > 1) {
        // Store current neuron counts
        storeNeuronCounts();
        numLayers--;
        neuronCounts.splice(index, 1); // Remove the neuron count for the removed layer
        createTable();
        restoreNeuronCounts();
    }
}

function storeNeuronCounts() {
    neuronCounts = [];
    for (let i = 1; i <= numLayers; i++) {
        let dropdown = document.getElementById(`layer${i}`);
        neuronCounts.push(parseInt(dropdown.value));
    }
}

function restoreNeuronCounts() {
    for (let i = 1; i <= numLayers; i++) {
        let dropdown = document.getElementById(`layer${i}`);
        dropdown.value = neuronCounts[i - 1];
    }
}
