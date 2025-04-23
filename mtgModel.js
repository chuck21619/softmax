const epochs = 200;

export function createModel(numPlayers, numDecks) {
    const playerInput = tf.input({ shape: [4], dtype: 'int32', name: 'playerInput' });
    const deckInput = tf.input({ shape: [4], dtype: 'int32', name: 'deckInput' });

    const playerEmbedding = tf.layers.embedding({
        inputDim: numPlayers,
        outputDim: 4, // small embedding size for players
        name: 'playerEmbedding',
    }).apply(playerInput);

    const deckEmbedding = tf.layers.embedding({
        inputDim: numDecks,
        outputDim: 8, // larger embedding size for decks
        name: 'deckEmbedding',
    }).apply(deckInput);

    const playerFlat = tf.layers.flatten().apply(playerEmbedding);
    const deckFlat = tf.layers.flatten().apply(deckEmbedding);

    const combined = tf.layers.concatenate().apply([playerFlat, deckFlat]);

    const dense1 = tf.layers.dense({
        units: 64,
        activation: 'relu',
        name: 'dense_1',
    }).apply(combined);

    const output = tf.layers.dense({
        units: numPlayers, // predicting winner from player list
        activation: 'softmax',
        name: 'output',
    }).apply(dense1);

    const model = tf.model({
        inputs: [playerInput, deckInput],
        outputs: output,
        name: 'PlayerDeckModel',
    });

    model.compile({
        optimizer: 'adam',
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy'],
    });

    return model;
}

export async function trainModel(model, playerTensor, deckTensor, targetTensor, callback) {
    console.log('Training...');
    await model.fit([playerTensor, deckTensor], targetTensor, {
        epochs: epochs,
        batchSize: 16,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (epoch % (epochs/10) == 0) {
                    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, acc = ${logs.acc.toFixed(4)}`);
                }
            }
        }
    });
    callback();
}