export function createModel(NUM_PLAYERS, NUM_DECKS, EMBEDDING_SIZE = 8, MAX_PLAYERS = 4) {
    const playerInput = tf.input({ shape: [MAX_PLAYERS], dtype: 'int32', name: 'player_input' });
    const deckInput = tf.input({ shape: [MAX_PLAYERS], dtype: 'int32', name: 'deck_input' });

    const playerEmbed = tf.layers.embedding({ inputDim: NUM_PLAYERS, outputDim: EMBEDDING_SIZE }).apply(playerInput);
    const deckEmbed = tf.layers.embedding({ inputDim: NUM_DECKS, outputDim: EMBEDDING_SIZE }).apply(deckInput);

    const merged = tf.layers.concatenate().apply([playerEmbed, deckEmbed]);
    const flat = tf.layers.flatten().apply(merged);

    const dense1 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(flat);
    const dense2 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(dense1);

    const output = tf.layers.dense({ units: MAX_PLAYERS, activation: 'softmax' }).apply(dense2);

    const model = tf.model({ inputs: [playerInput, deckInput], outputs: output });

    model.compile({
        loss: 'sparseCategoricalCrossentropy',
        optimizer: tf.train.adam(0.01),
        metrics: ['accuracy'],
    });

    return model;
}
