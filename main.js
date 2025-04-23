import Data from './data.js';
import { createModel } from './mtgModel.js';

let players = [];
let decks = [];
let originalTitle = "";

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
            const inputTensor = data.inputTensorFromCleanedGames(cleanedGames, players, decks);
            inputTensor.print();
            const targetTensor = data.targetTensorFromWinners(winners, players);
            targetTensor.print();

            const model = createModel(players.length, decks.length);
            console.log(model.summary());

            //train
            //build prediction interface
        });
    };
});