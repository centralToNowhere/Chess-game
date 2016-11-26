var chessBot = (function(){

	/* object shuld have following properties:

		current_side - sting, player side ('white', 'black'), should changes depending on current move
		
		ai_side - string, AI side ('white', 'black'), constant

		current_move - bool, should be always true for single game

		AI - bool, true when bot operates

		data - object with figures names in properties and array values with 2 coordinates figure on board, for example: king_black: [0, 0], pawn_white7: [4,4]

		matrix - 2d array, 1 dimension - rows, 2 dimension - cells, value - string figure name same as in data properties

		all_moves_side(side) - function returns 3n array moves of current side [[[2, 1], [3, 1]],[...]]
		where [2, 1] - start cell, [3, 1] - target cell

			side - string side for which we want to have all moves ('white', 'black') 

		execute_move(start_j, start_k, finish_j, finish_k, embeded_move, object) - function, returns function that update board positions;

			start_j start_k - coordinates of figure before move,

			finish_j finish_k - coordinates of figure after move,

			embeded_move - several moves in pack, for example castling and pawn transforming, not available now, should be empty string '',

			object - game object if you need it(it's true for me)

		so, that function should change your board data by 4 coordinates

	*/

	return function(object){
		var depth = 4;
		var current_depth = 1;
		var side = object.current_side === 'white' ? 'black' : 'white';

		this.all_moves_side_func = function(side){
			return object.all_moves_side(side);
		};

		this.move = function(start_j, start_k, finish_j, finish_k, embeded_move, object){

			object.execute_move(start_j, start_k, finish_j, finish_k, embeded_move, object)();

			return 0;
		};

		this.move_undo = function(){
; 
			object.tools().undo();

			return 0;
		};

		this.set_depth = function(new_depth){
			depth = new_depth;
		};

		this.evaluate = function(){
			var cost = {
				'pawn':1,
				'knight':3,
				'bishop':3,
				'rook':5,
				'queen':9,
				'king':1000
			};
			var amount = 0;
			for(var t in object.data){
				if(object.data[t][0] !== null){
					if(t.split('_')[t.split('_').length-1] === side){
						amount += cost[t.split('_')[0]] === undefined ? cost[t.split('_')[0].substr(0, t.split('_')[0].length-1)] : cost[t.split('_')[0]];
					}else{
						amount -= cost[t.split('_')[0]] === undefined ? cost[t.split('_')[0].substr(0, t.split('_')[0].length-1)] : cost[t.split('_')[0]];
					}
				}
			}
			if(amount !== 0){
				console.log('Amount', amount);
				if(amount === -3){
					debugger;
				}
			}
			return amount;
		};

		this.cloner = {
		    _clone: function _clone(obj) {
		        if (obj instanceof Array) {
		            var out = [];
		            for (var i = 0, len = obj.length; i < len; i++) {
		                var value = obj[i];
		                out[i] = (value !== null && typeof value === "object") ? _clone(value) : value;
		            }
		        } else {
		            var out = {};
		            for (var key in obj) {
		                if (obj.hasOwnProperty(key)) {
		                    var value = obj[key];
		                    out[key] = (value !== null && typeof value === "object") ? _clone(value) : value;
		                }
		            }
		        }
		      	return out;
   			},

		    clone: function(it) {
		        return this._clone({
		        it: it
		        }).it;
		    }
		},

		/*
		all_moves_side_func - function to search all moves of current side

		returns 			- array of move, for example [[2, 1], [3, 1]]
		*/
		this.search = function(){
			object.AI = true;
			var real = object;
			console.log('Real', object.data);
			object = this.cloner.clone(object);
			console.log('Cloner', object.data);
			var node = '';
			var values = '';
			var tmp_branch = 0;
			var initial_node = {
				0:[Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY], // supposed to persist array [node_value, alpha_value, beta_value]
				1:{}, // link to all child objects, -1 - link to self object, -2 - child node id that leads to the best move
				2:0, // link to parent object
				3:'alpha', // alpha or beta node
				4:[] // array of move to reach this node
			};
			initial_node[1][-1] = initial_node; // link to self object
			var tree = branch = initial_node[1];
			var res = 0;
			var calls = 0;
			var move = [];

			var half_move = function half_move(){

				object.current_move = 'true';
				var arr = this.all_moves_side_func(object.current_side);
				for(var i = 0; i < arr.length; i++){
					var m = arr[i];
					if(branch[-1][3] === 'alpha'){
						if(branch[-1][0][0] >= branch[-1][0][2]){
							break;
						}
					}else{
						if(branch[-1][0][0] <= branch[-1][0][1]){
							break;
						}
					}
					node = branch[-1][3] === 'alpha' ? 'beta' : 'alpha';


					values = node === 'alpha' ? [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY] : [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];

					current_depth++;
					
					//move without castling/transforming
					var embeded_move = '';

					this.move(m[0][0], m[0][1], m[1][0], m[1][1], embeded_move, object);

					var parent_node = branch;
					
					branch[i] = {
						0:values, // supposed to persist array [node_value, alpha_value, beta_value]
						1:{}, // branch of next moves after current
						2:parent_node, // link to parent object
						3:node, // alpha or beta node
						4:m // array of move to reach this node
					};

					branch[i][1][-1] = branch[i]; // property that point to parent of same level nodes array
					// go to the lower branches
					branch = branch[i][1];
					
					
					if(current_depth < depth){

						object.current_side = object.current_side === 'white' ? 'black' : 'white';
						half_move.apply(this);
						object.current_side = object.current_side === 'white' ? 'black' : 'white';
						

						// branch there is not an empty node
						//debugger;
						// updating node value, alpha value, beta value
						res = branch[-1][0][0];
						tmp_branch = branch;
						branch = branch[-1][2][-1]; // go to parent node
						if(branch[3] === 'alpha'){
							if(branch[0][1] < res){
								branch[0][1] = res;
								branch[0][0] = res;
								branch[1][-2] = i;
							} 
						}else{
							if(branch[0][2] > res){
								branch[0][2] = res;
								branch[0][0] = res;
								branch[1][-2] = i;
							}
						}
						this.move_undo(m[0][0], m[0][1], m[1][0], m[1][1], embeded_move, object);

						current_depth--;

						branch = branch[1];
					}else{
						res = this.evaluate();
						// branch there is a container for nodes
						// {
						//      ... empty ...
						//      -1:  --- parent node
						// }
						tmp_branch = branch;
						branch = branch[-1][2][-1]; // go to parent node
						if(branch[3] === 'alpha'){
							if(branch[0][1] < res){
								branch[0][1] = res;
								branch[0][0] = res;
								branch[1][-2] = i;
							} 
						}else{
							if(branch[0][2] > res){
								branch[0][2] = res;
								branch[0][0] = res;
								branch[1][-2] = i;
							}
						}
						branch = tmp_branch[-1][2];

						current_depth--;

						this.move_undo(m[0][0], m[0][1], m[1][0], m[1][1], embeded_move, object);

					}

				}
			}.apply(this);
			debugger;
			console.log('OVER', tree);
			object = real; // restore potitions object
			// real move
			object.AI = false;
			this.move(tree[tree[-2]][4][0][0], tree[tree[-2]][4][0][1], tree[tree[-2]][4][1][0], tree[tree[-2]][4][1][1], '', object);
			object.current_side = object.ai_side === 'white' ? 'black' : 'white';
			

			return tree[tree[-2]][4];
		};

	}
}());

var bot = new chessBot(positions);

document.body.addEventListener('AI_turn', function(){
	bot.search();
});































