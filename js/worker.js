importScripts('main.js');
importScripts('chessBot.js');
addEventListener('message', function(e){

	var positionsPartialCopy = e.data[0],
		algorithm = e.data[1],
		obj = e.data[2],
		positionsFullCopy = (function(){
			for(var h in positionsPartialCopy){
				positions[h] = positionsPartialCopy[h];
			}
			return positions;
		}()),
		chessBot = new ChessBot(positionsFullCopy);
		
	chessBot.set_side(positionsFullCopy.current_side);

	self.isWorker = true;


	switch(algorithm){
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