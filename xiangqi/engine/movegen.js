(function (global) {
  "use strict";

  var Xiangqi = (global.Xiangqi = global.Xiangqi || {});
  var Board = Xiangqi.Board;

  function inPalace(color, r, c) {
    if (c < 3 || c > 5) {
      return false;
    }
    if (color === Board.RED) {
      return r >= 7 && r <= 9;
    }
    return r >= 0 && r <= 2;
  }

  function crossedRiver(color, r) {
    return color === Board.RED ? r <= 4 : r >= 5;
  }

  function pushMove(moves, board, fr, fc, tr, tc) {
    if (!Board.inBounds(tr, tc)) {
      return;
    }
    var target = board[tr][tc];
    var piece = board[fr][fc];
    if (target && Board.getColor(target) === Board.getColor(piece)) {
      return;
    }
    moves.push({
      from: { r: fr, c: fc },
      to: { r: tr, c: tc },
      piece: piece,
      capture: target || null,
    });
  }

  function generateKingMoves(board, r, c, moves) {
    var piece = board[r][c];
    var color = Board.getColor(piece);
    var dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    for (var i = 0; i < dirs.length; i += 1) {
      var tr = r + dirs[i].dr;
      var tc = c + dirs[i].dc;
      if (inPalace(color, tr, tc)) {
        pushMove(moves, board, r, c, tr, tc);
      }
    }
  }

  function generateAdvisorMoves(board, r, c, moves) {
    var piece = board[r][c];
    var color = Board.getColor(piece);
    var dirs = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 },
    ];
    for (var i = 0; i < dirs.length; i += 1) {
      var tr = r + dirs[i].dr;
      var tc = c + dirs[i].dc;
      if (inPalace(color, tr, tc)) {
        pushMove(moves, board, r, c, tr, tc);
      }
    }
  }

  function generateElephantMoves(board, r, c, moves) {
    var piece = board[r][c];
    var color = Board.getColor(piece);
    var dirs = [
      { dr: -2, dc: -2 },
      { dr: -2, dc: 2 },
      { dr: 2, dc: -2 },
      { dr: 2, dc: 2 },
    ];
    for (var i = 0; i < dirs.length; i += 1) {
      var tr = r + dirs[i].dr;
      var tc = c + dirs[i].dc;
      var eyeR = r + dirs[i].dr / 2;
      var eyeC = c + dirs[i].dc / 2;
      if (!Board.inBounds(tr, tc)) {
        continue;
      }
      if (board[eyeR][eyeC]) {
        continue;
      }
      if (color === Board.RED && tr < 5) {
        continue;
      }
      if (color === Board.BLACK && tr > 4) {
        continue;
      }
      pushMove(moves, board, r, c, tr, tc);
    }
  }

  function generateHorseMoves(board, r, c, moves) {
    var steps = [
      { dr: -2, dc: -1 },
      { dr: -2, dc: 1 },
      { dr: -1, dc: -2 },
      { dr: -1, dc: 2 },
      { dr: 1, dc: -2 },
      { dr: 1, dc: 2 },
      { dr: 2, dc: -1 },
      { dr: 2, dc: 1 },
    ];
    for (var i = 0; i < steps.length; i += 1) {
      var tr = r + steps[i].dr;
      var tc = c + steps[i].dc;
      if (!Board.inBounds(tr, tc)) {
        continue;
      }
      var legR = r + (Math.abs(steps[i].dr) === 2 ? steps[i].dr / 2 : 0);
      var legC = c + (Math.abs(steps[i].dc) === 2 ? steps[i].dc / 2 : 0);
      if (board[legR][legC]) {
        continue;
      }
      pushMove(moves, board, r, c, tr, tc);
    }
  }

  function generateRookMoves(board, r, c, moves) {
    var dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    for (var i = 0; i < dirs.length; i += 1) {
      var tr = r + dirs[i].dr;
      var tc = c + dirs[i].dc;
      while (Board.inBounds(tr, tc)) {
        if (!board[tr][tc]) {
          pushMove(moves, board, r, c, tr, tc);
        } else {
          if (Board.getColor(board[tr][tc]) !== Board.getColor(board[r][c])) {
            pushMove(moves, board, r, c, tr, tc);
          }
          break;
        }
        tr += dirs[i].dr;
        tc += dirs[i].dc;
      }
    }
  }

  function generateCannonMoves(board, r, c, moves) {
    var dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    for (var i = 0; i < dirs.length; i += 1) {
      var tr = r + dirs[i].dr;
      var tc = c + dirs[i].dc;
      var hasScreen = false;
      while (Board.inBounds(tr, tc)) {
        var target = board[tr][tc];
        if (!hasScreen) {
          if (!target) {
            pushMove(moves, board, r, c, tr, tc);
          } else {
            hasScreen = true;
          }
        } else {
          if (target) {
            if (Board.getColor(target) !== Board.getColor(board[r][c])) {
              moves.push({
                from: { r: r, c: c },
                to: { r: tr, c: tc },
                piece: board[r][c],
                capture: target,
              });
            }
            break;
          }
        }
        tr += dirs[i].dr;
        tc += dirs[i].dc;
      }
    }
  }

  function generatePawnMoves(board, r, c, moves) {
    var piece = board[r][c];
    var color = Board.getColor(piece);
    var forward = color === Board.RED ? -1 : 1;
    var tr = r + forward;
    var tc = c;
    if (Board.inBounds(tr, tc)) {
      pushMove(moves, board, r, c, tr, tc);
    }
    if (crossedRiver(color, r)) {
      var left = c - 1;
      var right = c + 1;
      if (Board.inBounds(r, left)) {
        pushMove(moves, board, r, c, r, left);
      }
      if (Board.inBounds(r, right)) {
        pushMove(moves, board, r, c, r, right);
      }
    }
  }

  function generatePseudoMovesForPiece(board, r, c) {
    var moves = [];
    var piece = board[r][c];
    if (!piece) {
      return moves;
    }
    var type = Board.getType(piece);
    switch (type) {
      case "K":
        generateKingMoves(board, r, c, moves);
        break;
      case "A":
        generateAdvisorMoves(board, r, c, moves);
        break;
      case "B":
        generateElephantMoves(board, r, c, moves);
        break;
      case "N":
        generateHorseMoves(board, r, c, moves);
        break;
      case "R":
        generateRookMoves(board, r, c, moves);
        break;
      case "C":
        generateCannonMoves(board, r, c, moves);
        break;
      case "P":
        generatePawnMoves(board, r, c, moves);
        break;
      default:
        break;
    }
    return moves;
  }

  function generatePseudoMoves(board, color) {
    var moves = [];
    for (var r = 0; r < Board.ROWS; r += 1) {
      for (var c = 0; c < Board.COLS; c += 1) {
        var piece = board[r][c];
        if (!piece || Board.getColor(piece) !== color) {
          continue;
        }
        var pieceMoves = generatePseudoMovesForPiece(board, r, c);
        for (var i = 0; i < pieceMoves.length; i += 1) {
          moves.push(pieceMoves[i]);
        }
      }
    }
    return moves;
  }

  Xiangqi.MoveGen = {
    generatePseudoMoves: generatePseudoMoves,
    generatePseudoMovesForPiece: generatePseudoMovesForPiece,
  };
})(window);
