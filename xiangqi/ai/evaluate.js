(function (global) {
  "use strict";

  var Xiangqi = (global.Xiangqi = global.Xiangqi || {});
  var Board = Xiangqi.Board;

  var pieceValues = {
    K: 10000,
    R: 600,
    N: 300,
    B: 250,
    A: 250,
    C: 350,
    P: 100,
  };

  function pawnBonus(color, r) {
    var advance = color === Board.RED ? 9 - r : r;
    var bonus = advance * 2;
    if (color === Board.RED ? r <= 4 : r >= 5) {
      bonus += 10;
    }
    return bonus;
  }

  function evaluate(board, color) {
    var score = 0;
    for (var r = 0; r < Board.ROWS; r += 1) {
      for (var c = 0; c < Board.COLS; c += 1) {
        var piece = board[r][c];
        if (!piece) {
          continue;
        }
        var pieceColor = Board.getColor(piece);
        var type = Board.getType(piece);
        var value = pieceValues[type] || 0;
        if (type === "P") {
          value += pawnBonus(pieceColor, r);
        }
        score += pieceColor === color ? value : -value;
      }
    }
    return score;
  }

  Xiangqi.Evaluate = {
    evaluate: evaluate,
    pieceValues: pieceValues,
  };
})(window);
