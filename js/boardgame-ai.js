(function (root) {
    var BoardGameAI = {
        createTranspositionTable(maxEntries) {
            maxEntries = maxEntries || 20000;
            var store = new Map();

            return {
                clear: function () {
                    store.clear();
                },
                get: function (key, minDepth) {
                    minDepth = minDepth || 0;
                    var entry = store.get(key);
                    if (!entry || entry.depth < minDepth) return null;
                    return entry.value;
                },
                set: function (key, depth, value) {
                    if (store.size >= maxEntries) {
                        var oldestKey = store.keys().next().value;
                        if (oldestKey !== undefined) store.delete(oldestKey);
                    }
                    store.set(key, { depth: depth, value: value });
                }
            };
        },

        hashBoard: function (board, serializeCell) {
            return board
                .map(function (row) {
                    return row.map(function (cell) {
                        return serializeCell ? serializeCell(cell) : cell;
                    }).join(',');
                })
                .join('/');
        },

        scorePattern: function (total, openEnds, weights) {
            var cappedTotal = Math.min(total, 5);
            var cappedOpenEnds = Math.min(openEnds, 2);
            var key = cappedTotal + ':' + cappedOpenEnds;
            return (weights && weights[key]) || 0;
        },

        centerBias: function (row, col, centerRow, centerCol, scale, base) {
            scale = scale || 2;
            base = base || 16;
            return base - (Math.abs(row - centerRow) + Math.abs(col - centerCol)) * scale;
        },

        orderMoves: function (moves, scorer) {
            return moves
                .map(function (move) {
                    return { move: move, score: scorer(move) };
                })
                .sort(function (a, b) {
                    return b.score - a.score;
                })
                .map(function (item) {
                    return item.move;
                });
        }
    };

    root.BoardGameAI = BoardGameAI;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
