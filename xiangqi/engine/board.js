(function (global) {
  "use strict";

  var Xiangqi = (global.Xiangqi = global.Xiangqi || {});

  var ROWS = 10;
  var COLS = 9;
  var RED = "r";
  var BLACK = "b";

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function createEmptyBoard() {
    var board = [];
    for (var r = 0; r < ROWS; r += 1) {
      var row = new Array(COLS);
      for (var c = 0; c < COLS; c += 1) {
        row[c] = null;
      }
      board.push(row);
    }
    return board;
  }

  function createInitialBoard() {
    var board = createEmptyBoard();
    var backRank = ["R", "N", "B", "A", "K", "A", "B", "N", "R"];
    var c;

    for (c = 0; c < COLS; c += 1) {
      board[0][c] = BLACK + backRank[c];
      board[9][c] = RED + backRank[c];
    }

    board[2][1] = BLACK + "C";
    board[2][7] = BLACK + "C";
    board[7][1] = RED + "C";
    board[7][7] = RED + "C";

    for (c = 0; c < COLS; c += 2) {
      board[3][c] = BLACK + "P";
      board[6][c] = RED + "P";
    }

    return board;
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.slice();
    });
  }

  function getColor(piece) {
    return piece ? piece.charAt(0) : null;
  }

  function getType(piece) {
    return piece ? piece.charAt(1) : null;
  }

  function isSameColor(piece, color) {
    return piece && getColor(piece) === color;
  }

  function isEnemyColor(piece, color) {
    return piece && getColor(piece) !== color;
  }

  function applyMove(board, move) {
    var piece = board[move.from.r][move.from.c];
    var captured = board[move.to.r][move.to.c];
    board[move.to.r][move.to.c] = piece;
    board[move.from.r][move.from.c] = null;
    return captured || null;
  }

  function undoMove(board, move, captured) {
    var piece = board[move.to.r][move.to.c];
    board[move.from.r][move.from.c] = piece;
    board[move.to.r][move.to.c] = captured || null;
  }

  function createGameState() {
    return {
      board: createInitialBoard(),
      sideToMove: RED,
      history: [],
      gameOver: false,
      result: null,
    };
  }

  Xiangqi.Board = {
    ROWS: ROWS,
    COLS: COLS,
    RED: RED,
    BLACK: BLACK,
    inBounds: inBounds,
    createEmptyBoard: createEmptyBoard,
    createInitialBoard: createInitialBoard,
    cloneBoard: cloneBoard,
    getColor: getColor,
    getType: getType,
    isSameColor: isSameColor,
    isEnemyColor: isEnemyColor,
    applyMove: applyMove,
    undoMove: undoMove,
    createGameState: createGameState,
  };
})(window);
