(function (root) {
    const BoardGameAI = {
        createTranspositionTable(maxEntries = 20000) {
            const store = new Map();

            return {
                clear() {
                    store.clear();
                },
                get(key, minDepth = 0) {
                    const entry = store.get(key);
                    if (!entry || entry.depth < minDepth) return null;
                    return entry.value;
                },
                set(key, depth, value) {
                    if (store.size >= maxEntries) {
                        const oldestKey = store.keys().next().value;
                        if (oldestKey !== undefined) store.delete(oldestKey);
                    }
                    store.set(key, { depth, value });
                }
            };
        },

        hashBoard(board, serializeCell) {
            return board
                .map(row => row.map(cell => serializeCell(cell)).join(','))
                .join('/');
        },

        scorePattern(total, openEnds, weights) {
            const cappedTotal = Math.min(total, 5);
            const cappedOpenEnds = Math.min(openEnds, 2);
            return weights[`${cappedTotal}:${cappedOpenEnds}`] || 0;
        },

        centerBias(row, col, centerRow, centerCol, scale = 2, base = 16) {
            return base - (Math.abs(row - centerRow) + Math.abs(col - centerCol)) * scale;
        },

        orderMoves(moves, scorer) {
            return moves
                .map(move => ({ move, score: scorer(move) }))
                .sort((a, b) => b.score - a.score)
                .map(item => item.move);
        }
    };

    root.BoardGameAI = BoardGameAI;
})(typeof window !== 'undefined' ? window : globalThis);
