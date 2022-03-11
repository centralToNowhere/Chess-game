addEventListener('message', function (e) {
  self.isWorker = true;

  var positionsPartialCopy = e.data[0],
      algorithm = e.data[1],
      obj = e.data[2],
      ChessBot = new Function('return ' + e.data[3])(),
      positions = function deserializeObject(data) {
    var deserialized = {};

    var isFn = function (value) {
      return new RegExp("^function.*?\(.*?\)\s*\{(.|\n)*\}$").test(value);
    };

    Object.keys(data).forEach(function (key) {
      if (isFn(data[key])) {
        deserialized[key] = new Function('return ' + data[key])();
      } else if (data[key] !== null && typeof data[key] === 'object') {
        deserialized[key] = deserializeObject(data[key]);
      } else {
        deserialized[key] = data[key];
      }
    });
    return deserialized;
  }(e.data[4]),
      positionsFullCopy = function () {
    for (var h in positionsPartialCopy) {
      positions[h] = positionsPartialCopy[h];
    }

    return positions;
  }(),
      chessBot = new ChessBot(positionsFullCopy);

  chessBot.set_side(positionsFullCopy.current_side);

  switch (algorithm) {
    case 'minimax':
      chessBot.alphaBeta(obj);
      break;

    case 'alphaBeta':
      chessBot.alphaBeta(obj);
      break;

    case 'negaScout':
      chessBot.negascout(obj);
      break;
  }
});