(function (global) {
  "use strict";

  var Xiangqi = (global.Xiangqi = global.Xiangqi || {});
  var Board = Xiangqi.Board;
  var MoveGen = Xiangqi.MoveGen;

  function findKing(board, color) {
    for (var r = 0; r < Board.ROWS; r += 1) {
      for (var c = 0; c < Board.COLS; c += 1) {
        var piece = board[r][c];
        if (piece && Board.getColor(piece) === color && Board.getType(piece) === "K") {
          return { r: r, c: c };
        }
      }
    }
    return null;
  }

  function kingsFace(board) {
    var redKing = findKing(board, Board.RED);
    var blackKing = findKing(board, Board.BLACK);
    if (!redKing || !blackKing) {
      return false;
    }
    if (redKing.c !== blackKing.c) {
      return false;
    }
    var c = redKing.c;
    var start = Math.min(redKing.r, blackKing.r) + 1;
    var end = Math.max(redKing.r, blackKing.r);
    for (var r = start; r < end; r += 1) {
      if (board[r][c]) {
        return false;
      }
    }
    return true;
  }

  // Checks if the given side is in check, including the "kings face" rule.
  function isInCheck(board, color) {
    if (kingsFace(board)) {
      return true;
    }
    var kingPos = findKing(board, color);
    if (!kingPos) {
      return true;
    }
    var enemy = color === Board.RED ? Board.BLACK : Board.RED;
    var enemyMoves = MoveGen.generatePseudoMoves(board, enemy);
    for (var i = 0; i < enemyMoves.length; i += 1) {
      var move = enemyMoves[i];
      if (move.to.r === kingPos.r && move.to.c === kingPos.c) {
        return true;
      }
    }
    return false;
  }

  // Filters pseudo-legal moves by checking self-check after applying a move.
  function generateLegalMoves(board, color) {
    var legal = [];
    var moves = MoveGen.generatePseudoMoves(board, color);
    for (var i = 0; i < moves.length; i += 1) {
      var move = moves[i];
      var captured = Board.applyMove(board, move);
      var inCheck = isInCheck(board, color);
      Board.undoMove(board, move, captured);
      if (!inCheck) {
        legal.push(move);
      }
    }
    return legal;
  }

  function generateLegalMovesForPiece(board, color, r, c) {
    var piece = board[r][c];
    if (!piece || Board.getColor(piece) !== color) {
      return [];
    }
    var moves = MoveGen.generatePseudoMovesForPiece(board, r, c);
    var legal = [];
    for (var i = 0; i < moves.length; i += 1) {
      var move = moves[i];
      var captured = Board.applyMove(board, move);
      var inCheck = isInCheck(board, color);
      Board.undoMove(board, move, captured);
      if (!inCheck) {
        legal.push(move);
      }
    }
    return legal;
  }

  function makeMove(state, move) {
    var captured = Board.applyMove(state.board, move);
    state.history.push({
      move: move,
      captured: captured,
      side: state.sideToMove,
    });
    state.sideToMove = state.sideToMove === Board.RED ? Board.BLACK : Board.RED;
    return captured;
  }

  function undoMove(state) {
    if (!state.history.length) {
      return null;
    }
    var last = state.history.pop();
    Board.undoMove(state.board, last.move, last.captured);
    state.sideToMove = last.side;
    return last;
  }

  function getGameResult(board, sideToMove) {
    var legalMoves = generateLegalMoves(board, sideToMove);
    if (legalMoves.length > 0) {
      return null;
    }
    if (isInCheck(board, sideToMove)) {
      return {
        result: "checkmate",
        winner: sideToMove === Board.RED ? Board.BLACK : Board.RED,
      };
    }
    return { result: "draw", winner: null };
  }

  function validateEngine() {
    var results = [];
    var board = Board.createInitialBoard();
    var redMoves = generateLegalMoves(board, Board.RED);
    var blackMoves = generateLegalMoves(board, Board.BLACK);
    results.push({
      name: "initial-moves-nonempty",
      passed: redMoves.length > 0 && blackMoves.length > 0,
    });

    var cannonBoard = Board.createEmptyBoard();
    cannonBoard[0][4] = Board.BLACK + "K";
    cannonBoard[9][4] = Board.RED + "K";
    cannonBoard[5][4] = Board.RED + "P";
    cannonBoard[4][1] = Board.RED + "C";
    cannonBoard[4][3] = Board.RED + "P";
    cannonBoard[4][5] = Board.BLACK + "R";
    var cannonMoves = generateLegalMovesForPiece(cannonBoard, Board.RED, 4, 1);
    var foundCannonCapture = cannonMoves.some(function (move) {
      return move.to.r === 4 && move.to.c === 5;
    });
    results.push({
      name: "cannon-capture-with-screen",
      passed: foundCannonCapture,
    });

    var faceBoard = Board.createEmptyBoard();
    faceBoard[0][4] = Board.BLACK + "K";
    faceBoard[9][4] = Board.RED + "K";
    results.push({
      name: "kings-face-detected",
      passed: isInCheck(faceBoard, Board.RED) && isInCheck(faceBoard, Board.BLACK),
    });

    var passedAll = results.every(function (item) {
      return item.passed;
    });

    return { passed: passedAll, results: results };
  }

  Xiangqi.Rules = {
    findKing: findKing,
    kingsFace: kingsFace,
    isInCheck: isInCheck,
    generateLegalMoves: generateLegalMoves,
    generateLegalMovesForPiece: generateLegalMovesForPiece,
    makeMove: makeMove,
    undoMove: undoMove,
    getGameResult: getGameResult,
    validateEngine: validateEngine,
  };
})(window);
