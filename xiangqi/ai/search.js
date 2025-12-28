(function (global) {
  "use strict";

  var Xiangqi = (global.Xiangqi = global.Xiangqi || {});
  var Board = Xiangqi.Board;
  var Rules = Xiangqi.Rules;
  var Evaluate = Xiangqi.Evaluate;

  var MATE_SCORE = 20000;

  function moveHeuristic(move) {
    if (!move.capture) {
      return 0;
    }
    var captureType = Board.getType(move.capture);
    var pieceType = Board.getType(move.piece);
    return (Evaluate.pieceValues[captureType] || 0) - (Evaluate.pieceValues[pieceType] || 0) + 500;
  }

  function orderMoves(moves) {
    return moves.sort(function (a, b) {
      return moveHeuristic(b) - moveHeuristic(a);
    });
  }

  // Negamax with alpha-beta pruning.
  function negamax(board, color, depth, alpha, beta, state) {
    if (state.timeLimitMs && Date.now() - state.startTime > state.timeLimitMs) {
      state.timeout = true;
      return Evaluate.evaluate(board, color);
    }

    if (depth === 0) {
      return Evaluate.evaluate(board, color);
    }

    var legalMoves = Rules.generateLegalMoves(board, color);
    if (!legalMoves.length) {
      if (Rules.isInCheck(board, color)) {
        return -MATE_SCORE + state.depth - depth;
      }
      return 0;
    }

    orderMoves(legalMoves);

    var best = -Infinity;
    for (var i = 0; i < legalMoves.length; i += 1) {
      var move = legalMoves[i];
      var captured = Board.applyMove(board, move);
      var score = -negamax(
        board,
        color === Board.RED ? Board.BLACK : Board.RED,
        depth - 1,
        -beta,
        -alpha,
        state
      );
      Board.undoMove(board, move, captured);
      if (state.timeout) {
        break;
      }
      if (score > best) {
        best = score;
      }
      if (best > alpha) {
        alpha = best;
      }
      if (alpha >= beta) {
        break;
      }
    }
    return best;
  }

  function searchRoot(board, color, depth, state) {
    var legalMoves = Rules.generateLegalMoves(board, color);
    orderMoves(legalMoves);
    var scored = [];
    var bestScore = -Infinity;
    var bestMove = null;
    for (var i = 0; i < legalMoves.length; i += 1) {
      var move = legalMoves[i];
      var captured = Board.applyMove(board, move);
      var score = -negamax(
        board,
        color === Board.RED ? Board.BLACK : Board.RED,
        depth - 1,
        -Infinity,
        Infinity,
        state
      );
      Board.undoMove(board, move, captured);
      if (state.timeout) {
        break;
      }
      scored.push({ move: move, score: score });
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return { move: bestMove, score: bestScore, scored: scored };
  }

  function chooseMove(scoredMoves, randomness) {
    if (!scoredMoves.length) {
      return null;
    }
    scoredMoves.sort(function (a, b) {
      return b.score - a.score;
    });
    if (randomness && Math.random() < randomness && scoredMoves.length > 1) {
      var poolSize = Math.min(3, scoredMoves.length);
      var idx = 1 + Math.floor(Math.random() * (poolSize - 1));
      return scoredMoves[idx].move;
    }
    return scoredMoves[0].move;
  }

  function searchBestMove(board, color, options) {
    var opts = options || {};
    var maxDepth = opts.depth || 2;
    var iterative = !!opts.iterative;
    var timeLimitMs = opts.timeLimitMs || 0;
    var randomness = opts.randomness || 0;

    var bestMove = null;
    var bestScore = -Infinity;
    var scoredMoves = [];
    var startTime = Date.now();

    if (iterative) {
      for (var depth = 1; depth <= maxDepth; depth += 1) {
        var state = {
          startTime: startTime,
          timeLimitMs: timeLimitMs,
          timeout: false,
          depth: depth,
        };
        var result = searchRoot(board, color, depth, state);
        if (result.scored.length) {
          scoredMoves = result.scored;
          bestMove = result.move;
          bestScore = result.score;
        }
        if (state.timeout) {
          break;
        }
      }
    } else {
      var fixedState = {
        startTime: startTime,
        timeLimitMs: timeLimitMs,
        timeout: false,
        depth: maxDepth,
      };
      var fixedResult = searchRoot(board, color, maxDepth, fixedState);
      scoredMoves = fixedResult.scored;
      bestMove = fixedResult.move;
      bestScore = fixedResult.score;
    }

    var finalMove = chooseMove(scoredMoves, randomness);
    return { move: finalMove || bestMove, score: bestScore };
  }

  Xiangqi.AI = {
    searchBestMove: searchBestMove,
  };
})(window);
