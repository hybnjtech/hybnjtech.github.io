(function () {
  "use strict";

  var Board = Xiangqi.Board;
  var Rules = Xiangqi.Rules;
  var AI = Xiangqi.AI;

  var canvas = document.getElementById("board");
  var ctx = canvas.getContext("2d");
  var statusEl = document.getElementById("status");
  var difficultySelect = document.getElementById("difficulty");
  var sideSelect = document.getElementById("playerSide");
  var newGameBtn = document.getElementById("newGame");
  var undoBtn = document.getElementById("undo");
  var swapBtn = document.getElementById("swap");
  var resignBtn = document.getElementById("resign");
  var musicToggleBtn = document.getElementById("musicToggle");
  var musicVolume = document.getElementById("musicVolume");
  var musicStatus = document.getElementById("musicStatus");
  var musicEngine = Xiangqi.Music;

  var view = {
    margin: 40,
    cell: 60,
  };

  var pieceLabels = {
    K: { r: "帅", b: "将" },
    A: { r: "仕", b: "士" },
    B: { r: "相", b: "象" },
    N: { r: "马", b: "马" },
    R: { r: "车", b: "车" },
    C: { r: "炮", b: "炮" },
    P: { r: "兵", b: "卒" },
  };

  var difficultySettings = {
    easy: { depth: 2, randomness: 0.15, iterative: false },
    medium: { depth: 4, randomness: 0.05, iterative: false },
    hard: { depth: 6, randomness: 0.0, iterative: true, timeLimitMs: 1200 },
  };

  var state = Board.createGameState();
  var humanColor = Board.RED;
  var aiColor = Board.BLACK;
  var selected = null;
  var legalMovesForSelected = [];
  var lastMove = null;
  var thinking = false;
  var aiTaskId = 0;

  function colorName(color) {
    return color === Board.RED ? "红方" : "黑方";
  }

  function setHumanColor(color) {
    humanColor = color;
    aiColor = color === Board.RED ? Board.BLACK : Board.RED;
  }

  function resetSelection() {
    selected = null;
    legalMovesForSelected = [];
  }

  function newGame() {
    aiTaskId += 1;
    state = Board.createGameState();
    state.sideToMove = Board.RED;
    state.gameOver = false;
    state.result = null;
    lastMove = null;
    resetSelection();
    thinking = false;
    updateStatus();
    draw();
    maybeAIMove();
  }

  function swapSides() {
    setHumanColor(humanColor === Board.RED ? Board.BLACK : Board.RED);
    sideSelect.value = humanColor === Board.RED ? "red" : "black";
    newGame();
  }

  function updateStatus(extra) {
    if (state.gameOver && state.result) {
      statusEl.textContent = state.result.message;
      return;
    }
    var text = "轮到：" + colorName(state.sideToMove);
    if (Rules.isInCheck(state.board, state.sideToMove)) {
      text += "（将军）";
    }
    if (thinking) {
      text += " | AI 思考中…";
    }
    if (extra) {
      text += " | " + extra;
    }
    statusEl.textContent = text;
  }

  function updateMusicUI() {
    if (!musicEngine || !musicToggleBtn) {
      return;
    }
    var playing = musicEngine.isPlaying();
    musicToggleBtn.textContent = playing ? "关闭音乐" : "开启音乐";
    if (musicStatus) {
      musicStatus.textContent = playing ? "古典氛围乐进行中" : "默认关闭（点击启用）";
    }
  }

  function handleGameResult(result) {
    if (!result) {
      return;
    }
    var message;
    if (result.result === "checkmate") {
      message = colorName(result.winner) + "获胜（将死）";
    } else {
      message = "平局（无子可走）";
    }
    state.gameOver = true;
    state.result = { result: result.result, winner: result.winner, message: message };
    updateStatus();
    setTimeout(function () {
      alert(message);
    }, 30);
  }

  function checkGameOver() {
    if (state.gameOver) {
      return;
    }
    var result = Rules.getGameResult(state.board, state.sideToMove);
    handleGameResult(result);
  }

  function makeMove(move) {
    Rules.makeMove(state, move);
    lastMove = move;
    resetSelection();
    draw();
    checkGameOver();
    updateStatus();
    maybeAIMove();
  }

  function maybeAIMove() {
    if (state.gameOver || thinking) {
      return;
    }
    if (state.sideToMove !== aiColor) {
      return;
    }
    thinking = true;
    var taskId = (aiTaskId += 1);
    updateStatus();
    setTimeout(function () {
      if (taskId !== aiTaskId) {
        thinking = false;
        updateStatus();
        return;
      }
      if (state.gameOver || state.sideToMove !== aiColor) {
        thinking = false;
        updateStatus();
        return;
      }
      var difficulty = difficultySelect.value;
      var settings = difficultySettings[difficulty] || difficultySettings.medium;
      var result = AI.searchBestMove(state.board, aiColor, settings);
      if (result && result.move) {
        Rules.makeMove(state, result.move);
        lastMove = result.move;
      } else {
        handleGameResult({ result: "draw", winner: null });
      }
      thinking = false;
      draw();
      checkGameOver();
      updateStatus();
    }, 50);
  }

  function handleUndo() {
    if (thinking || !state.history.length) {
      return;
    }
    Rules.undoMove(state);
    if (state.sideToMove !== humanColor && state.history.length) {
      Rules.undoMove(state);
    }
    state.gameOver = false;
    state.result = null;
    lastMove = state.history.length ? state.history[state.history.length - 1].move : null;
    resetSelection();
    draw();
    updateStatus();
  }

  function handleResign() {
    if (state.gameOver) {
      return;
    }
    aiTaskId += 1;
    var winner = humanColor === Board.RED ? Board.BLACK : Board.RED;
    var message = colorName(winner) + "获胜（认输）";
    state.gameOver = true;
    state.result = { result: "resign", winner: winner, message: message };
    updateStatus();
    setTimeout(function () {
      alert(message);
    }, 30);
  }

  function toCanvasPos(r, c) {
    return {
      x: view.margin + c * view.cell,
      y: view.margin + r * view.cell,
    };
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4d9a4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#553414";
    ctx.lineWidth = 2;

    var left = view.margin;
    var top = view.margin;
    var width = view.cell * 8;
    var height = view.cell * 9;
    ctx.strokeRect(left, top, width, height);

    for (var r = 0; r < Board.ROWS; r += 1) {
      var y = top + r * view.cell;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
    }

    for (var c = 1; c < Board.COLS - 1; c += 1) {
      var x = left + c * view.cell;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + view.cell * 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, top + view.cell * 5);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }

    drawPalaceDiagonals(left, top);
    drawRiverText(left, top, width);
  }

  function drawPalaceDiagonals(left, top) {
    ctx.beginPath();
    ctx.moveTo(left + view.cell * 3, top);
    ctx.lineTo(left + view.cell * 5, top + view.cell * 2);
    ctx.moveTo(left + view.cell * 5, top);
    ctx.lineTo(left + view.cell * 3, top + view.cell * 2);

    ctx.moveTo(left + view.cell * 3, top + view.cell * 7);
    ctx.lineTo(left + view.cell * 5, top + view.cell * 9);
    ctx.moveTo(left + view.cell * 5, top + view.cell * 7);
    ctx.lineTo(left + view.cell * 3, top + view.cell * 9);
    ctx.stroke();
  }

  function drawRiverText(left, top, width) {
    ctx.save();
    ctx.fillStyle = "#7b5b3b";
    ctx.font = "22px 'STKaiti', 'KaiTi', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var centerY = top + view.cell * 4.5;
    ctx.fillText("楚河", left + width * 0.25, centerY);
    ctx.fillText("汉界", left + width * 0.75, centerY);
    ctx.restore();
  }

  function drawHighlights() {
    if (lastMove) {
      drawMarker(lastMove.from.r, lastMove.from.c, "rgba(255, 216, 106, 0.6)", 16);
      drawMarker(lastMove.to.r, lastMove.to.c, "rgba(255, 216, 106, 0.8)", 16);
    }

    for (var i = 0; i < legalMovesForSelected.length; i += 1) {
      var move = legalMovesForSelected[i];
      if (state.board[move.to.r][move.to.c]) {
        drawMarker(move.to.r, move.to.c, "rgba(201, 69, 50, 0.4)", 20, true);
      } else {
        drawMarker(move.to.r, move.to.c, "rgba(86, 132, 76, 0.6)", 8);
      }
    }
  }

  function drawMarker(r, c, color, radius, ring) {
    var pos = toCanvasPos(r, c);
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = ring ? 3 : 0;
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    if (ring) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPieces() {
    for (var r = 0; r < Board.ROWS; r += 1) {
      for (var c = 0; c < Board.COLS; c += 1) {
        var piece = state.board[r][c];
        if (!piece) {
          continue;
        }
        drawPiece(r, c, piece);
      }
    }
  }

  function drawPiece(r, c, piece) {
    var pos = toCanvasPos(r, c);
    var color = Board.getColor(piece);
    var type = Board.getType(piece);
    var radius = view.cell * 0.42;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "#fdf4e2";
    ctx.strokeStyle = color === Board.RED ? "#b4362f" : "#1f1b17";
    ctx.lineWidth = 2.5;
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color === Board.RED ? "#b4362f" : "#1f1b17";
    ctx.font = "bold " + Math.round(view.cell * 0.45) + "px 'STKaiti', 'KaiTi', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pieceLabels[type][color], pos.x, pos.y + 1);
    ctx.restore();
  }

  function drawSelection() {
    if (!selected) {
      return;
    }
    drawMarker(selected.r, selected.c, "rgba(41, 104, 162, 0.6)", view.cell * 0.48, true);
  }

  function draw() {
    drawBoard();
    drawHighlights();
    drawPieces();
    drawSelection();
  }

  function getBoardPos(evt) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (evt.clientX - rect.left) * scaleX;
    var y = (evt.clientY - rect.top) * scaleY;
    var col = Math.round((x - view.margin) / view.cell);
    var row = Math.round((y - view.margin) / view.cell);
    if (!Board.inBounds(row, col)) {
      return null;
    }
    var target = toCanvasPos(row, col);
    var dx = x - target.x;
    var dy = y - target.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > view.cell * 0.45) {
      return null;
    }
    return { r: row, c: col };
  }

  function handleCanvasClick(evt) {
    if (state.gameOver || thinking) {
      return;
    }
    if (state.sideToMove !== humanColor) {
      return;
    }
    var pos = getBoardPos(evt);
    if (!pos) {
      return;
    }
    var piece = state.board[pos.r][pos.c];

    if (selected) {
      for (var i = 0; i < legalMovesForSelected.length; i += 1) {
        var move = legalMovesForSelected[i];
        if (move.to.r === pos.r && move.to.c === pos.c) {
          makeMove(move);
          return;
        }
      }
    }

    if (piece && Board.getColor(piece) === humanColor) {
      selected = { r: pos.r, c: pos.c };
      legalMovesForSelected = Rules.generateLegalMovesForPiece(state.board, humanColor, pos.r, pos.c);
    } else {
      resetSelection();
    }
    draw();
  }

  canvas.addEventListener("click", handleCanvasClick);
  newGameBtn.addEventListener("click", newGame);
  undoBtn.addEventListener("click", handleUndo);
  swapBtn.addEventListener("click", swapSides);
  resignBtn.addEventListener("click", handleResign);
  difficultySelect.addEventListener("change", updateStatus);
  sideSelect.addEventListener("change", function (evt) {
    setHumanColor(evt.target.value === "red" ? Board.RED : Board.BLACK);
    newGame();
  });
  if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", function () {
      if (!musicEngine.isSupported()) {
        alert("当前浏览器不支持音频播放。");
        return;
      }
      musicEngine.toggle();
      updateMusicUI();
    });
  }
  if (musicVolume) {
    musicEngine.setVolume(parseFloat(musicVolume.value || 0.35));
    musicVolume.addEventListener("input", function (evt) {
      var value = parseFloat(evt.target.value);
      if (!isNaN(value)) {
        musicEngine.setVolume(value);
      }
    });
  }

  var validation = Rules.validateEngine();
  if (!validation.passed) {
    console.warn("Engine validation failed:", validation.results);
    updateStatus("引擎自测未通过，请看控制台");
  } else {
    console.log("Engine validation passed:", validation.results);
  }

  draw();
  updateMusicUI();
})();
