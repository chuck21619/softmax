export function createModel(numPlayers, numDecks) {
    const playerEmbeddingSize = 4;
    const deckEmbeddingSize = 8;

    // Input: shape [8] (4 player IDs and 4 deck IDs)
    const input = tf.input({ shape: [8], dtype: 'int32' });

    // Manually slice using tf.slice in separate layers
    const playerInput = tf.layers.embedding({
        inputDim: numPlayers,
        outputDim: playerEmbeddingSize,
        inputLength: 4,
    }).apply(tf.layers.lambda({
        func: x => tf.slice(x, [0, 0], [-1, 1]).concat(
            tf.slice(x, [0, 2], [-1, 1])).concat(
                tf.slice(x, [0, 4], [-1, 1])).concat(
                    tf.slice(x, [0, 6], [-1, 1]))
    }).apply(input));

    const deckInput = tf.layers.embedding({
        inputDim: numDecks,
        outputDim: deckEmbeddingSize,
        inputLength: 4,
    }).apply(tf.layers.lambda({
        func: x => tf.slice(x, [0, 1], [-1, 1]).concat(
            tf.slice(x, [0, 3], [-1, 1])).concat(
                tf.slice(x, [0, 5], [-1, 1])).concat(
                    tf.slice(x, [0, 7], [-1, 1]))
    }).apply(input));

    // Flatten embeddings
    const flatPlayers = tf.layers.flatten().apply(playerInput);
    const flatDecks = tf.layers.flatten().apply(deckInput);

    // Combine everything
    const combined = tf.layers.concatenate().apply([flatPlayers, flatDecks]);

    // Dense layers
    const dense1 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(combined);
    const output = tf.layers.dense({ units: numPlayers, activation: 'softmax' }).apply(dense1);

    // Compile model
    const model = tf.model({ inputs: input, outputs: output });

    model.compile({
        optimizer: 'adam',
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy'],
    });

    return model;
}
