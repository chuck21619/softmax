class Data {

    constructor() {

        this.fetchTrainingData = async function fetchTrainingData(callback) {
            console.log("fetchTrainingData()");
            document.getElementById('title').innerHTML = 'Training...';
            const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMpIhYcYDwpGE_GlsMTClC8WaFgNGAmVa_8SH5QwloJn9aFze3ifL_XPiYJnDQtNZYWsuVZ9xUl8TF/pub?gid=0&single=true&output=csv';
            fetch(csvUrl)
                .then(response => response.text())
                .then(text => {
                    const workbook = XLSX.read(text, { type: 'string' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const games = XLSX.utils.sheet_to_json(worksheet, { blankrows: true });

                    callback(games);
                });
        }

        this.cleanedGamesAndWinners = function cleanedGamesAndWinners(games) {
            const cleanedGames = games.map(({ __rowNum__, winner, ...rest }) => rest);
            const winners = games.map(obj => obj.winner);
            return { cleanedGames, winners };
        }

        this.uniquePlayers = function uniquePlayers(games) {
            const uniquePlayers = new Set();
            games.forEach(game => {
                Object.keys(game).forEach(key => {
                    uniquePlayers.add(key);
                });
            });
            return [...uniquePlayers].sort();
        }

        this.uniqueDecks = function uniqueDecks(games) {
            const uniqueDecks = new Set();
            games.forEach(game => {
                Object.values(game).forEach(value => {
                    uniqueDecks.add(value);
                });
            });
            return [...uniqueDecks].sort();
        }

        this.inputTensorsFromCleanedGames = function inputTensorsFromCleanedGames(games, players, decks) {
            const paddedGames = this.padData(games);
            let playerData = [];
            let deckData = [];
        
            paddedGames.forEach((game) => {
                let playerRow = [];
                let deckRow = [];
                for (const [key, value] of Object.entries(game)) {
                    playerRow.push(players.indexOf(key));
                    deckRow.push(decks.indexOf(value));
                }
                playerData.push(playerRow);
                deckData.push(deckRow);
            });
        
            const playerTensor = tf.tensor2d(playerData, [playerData.length, 4]);
            const deckTensor = tf.tensor2d(deckData, [deckData.length, 4]);
        
            return { playerTensor, deckTensor };
        };        

        this.padData = function padData(games) {
            games.forEach(function (game) {
                let count = 0;
                while (Object.keys(game).length < 4) {
                    let key = count === 0 ? 'NONE' : 'NONE' + count;
                    game[key] = 'NONE';
                    count++;
                }
            });
            return games;
        };

        this.targetTensorFromWinners = function targetTensorFromWinners(winners, players) {
            const encodedWinners = winners.map( function (winner) {
                return players.indexOf(winner);
            });
            const targetTensor = tf.tensor1d(encodedWinners);
            return targetTensor;
        }
    }
}

export default Data;