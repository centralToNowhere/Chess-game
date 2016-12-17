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

		this.move = function(start_j, start_k, finish_j, finish_k, embeded_move, object, call){

			object.execute_move(start_j, start_k, finish_j, finish_k, embeded_move, object, call)();

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

		this.set_side = function(new_side){
			side = new_side;
		};

		this.pruning = function(branch){
			if(branch[-1][3] === 'alpha'){
				if(branch[-1][0][0] >= branch[-1][0][2]){
					return 0;
				}
			}else{
				if(branch[-1][0][0] <= branch[-1][0][1]){
					return 0;
				}
			}
		};

		this.ordering  = function(arr){
			var i = 0;
			var count = arr.length;

			arr.sort(function(a,b){

				var a_val = object.matrix[a[1][0]][a[1][1]] !== null ? 1 : 0;
				var b_val = object.matrix[b[1][0]][b[1][1]] !== null ? 1 : 0;

				if(b_val - a_val > 0){
					b[2] = 'attack';
				}else if(b_val - a_val < 0){
					a[2] = 'attack';
				}else if(b_val >= 1 && a_val >= 1){
					b[2] = 'attack';
					a[2] = 'attack';
				}

				return b_val - a_val;
				i++;
			});
			var arr_attacks = [];
			for(var u = 0; u < arr.length; u++){
				if(arr[u][2] === 'attack'){
					arr_attacks.push(arr[u]);
					arr[u].splice(2,1);
					arr.splice(u, 1);
					u--;
				}
			}




			var that = this;
			arr.sort((function(){ 

				return function(a,b){

					function filter(c){
						var figure = object.matrix[c[0][0]][c[0][1]].split('_')[0];
						figure = figure[figure.length-1].match( /[0-9]/) != null ? figure.substr(0, figure.length-1) : figure;
						if(figure.match( /pawn/) != null ){
							figure = figure + '_' + object.matrix[c[0][0]][c[0][1]].split('_')[1];
						}
						return figure;
					}
					var fig_a_type = filter(a);
					var fig_b_type = filter(b);
						
					var fig_a = object.matrix[a[0][0]][a[0][1]];
					var fig_b = object.matrix[b[0][0]][b[0][1]];

					object.matrix[a[0][0]][a[0][1]] = null;
					object.matrix[a[1][0]][a[1][1]] = fig_a;
					object.data[fig_a] = [a[1][0], a[1][1]];
					// that.move(a[0][0], a[0][1], a[1][0], a[1][1], '', object, false);
					var length_a = object.get_moves(object.moves[fig_a_type](), a[1][0], a[1][1], object).possible_attacks.length;
					// that.move_undo();
					object.matrix[a[0][0]][a[0][1]] = fig_a;
					object.matrix[a[1][0]][a[1][1]] = null;
					object.data[fig_a] = [a[0][0], a[0][1]];


					object.matrix[b[0][0]][b[0][1]] = null;
					object.matrix[b[1][0]][b[1][1]] = fig_b;
					object.data[fig_b] = [b[1][0], b[1][1]];

					// that.move(b[0][0], b[0][1], b[1][0], b[1][1], '', object, false);
					var length_b = object.get_moves(object.moves[fig_b_type](), b[1][0], b[1][1], object).possible_attacks.length;
					// that.move_undo();
					object.matrix[b[0][0]][b[0][1]] = fig_b;
					object.matrix[b[1][0]][b[1][1]] = null;
					object.data[fig_b] = [b[0][0], b[0][1]];


					return length_b - length_a;

				};

			}()));
			console.log(arr, arr_attacks);
			return arr_attacks.concat(arr);
		};

		this.evaluate = function(eval_obj){
			object.current_move = true;
			var cost = {
				'pawn':1,
				'knight':3,
				'bishop':3,
				'rook':5,
				'queen':9,
				'king':1000
			};
			var max_moves = {
				'pawn':4,
				'knight':8,
				'bishop':13,
				'rook':14,
				'queen':27,
				'king':8
			};
			var pieces = {};
			if(eval_obj.position){
				var moves_1, moves_2 = 0;

				/// ????????????????????????????????????????????????????????????????????//
				if(object.current_side === side){
					moves_1 = this.all_moves_side_func(side);
					object.current_side = object.current_side === 'white' ? 'black' : 'white';
					moves_2 = this.all_moves_side_func(side === 'black' ? 'white' : 'black');
					object.current_side = object.current_side === 'white' ? 'black' : 'white';
				}else{
					object.current_side = object.current_side === 'white' ? 'black' : 'white';
					moves_1 = this.all_moves_side_func(side);
					object.current_side = object.current_side === 'white' ? 'black' : 'white';
					moves_2 = this.all_moves_side_func(side === 'black' ? 'white' : 'black');
				}
				
				
				var arr = moves_1.concat(moves_2);
				// number of moves for every piece
				for(var y = 0; y < arr.length; y++){
					if(pieces[object.matrix[arr[y][0][0]][arr[y][0][1]]] === undefined){
						pieces[object.matrix[arr[y][0][0]][arr[y][0][1]]] = 0;
					}
					pieces[object.matrix[arr[y][0][0]][arr[y][0][1]]] += 1;
				}
			}
			var amount = 0;
			var abs_value = 0;
			for(var t in object.data){
				if(object.data[t][0] !== null){
					if(eval_obj.material){
						abs_value = cost[t.split('_')[0]] === undefined ? cost[t.split('_')[0].substr(0, t.split('_')[0].length-1)] : cost[t.split('_')[0]];
					}
					if(eval_obj.position){
						if(pieces[t] !== undefined){
							abs_value += pieces[t] / ( max_moves[t.split('_')[0]] === undefined ? max_moves[t.split('_')[0].substr(0, t.split('_')[0].length-1)] : max_moves[t.split('_')[0]] ) * 0.5;
						}
					}
					if(t.split('_')[t.split('_').length-1] === side){
						amount += abs_value;
					}else{
						amount -= abs_value;
					}
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
		ai_settings         - set of boolean eval properties and depth, for example {pruning:true, depth:'3'}  
		returns 			- array of move, for example [[2, 1], [3, 1]]
		*/
		this.search = function(ai_settings){
			// init settings
			if(ai_settings && ai_settings.depth){
				this.set_depth(ai_settings.depth);
			}else{
				return 0;
			}
			var eval_obj = ai_settings.eval;
			var pruning = ai_settings.pruning;
			var ordering = ai_settings.ordering;
			var output = ai_settings.output;
			//init tree
			object.AI = true;
			var real = object;
			object = this.cloner.clone(object);

			//DOM element is not copied???
			object.ai_nodes_checked_elem = real.ai_nodes_checked_elem;
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
			//build nodes
			var half_move = function half_move(){

				object.current_move = 'true';
				var arr = this.all_moves_side_func(object.current_side);

				if(ordering === true){
					arr = this.ordering(arr);
				}
				for(var i = 0; i < arr.length; i++){
					var m = arr[i];

					///pruning
					if(pruning === true){
						if(this.pruning(branch) === 0){
							break;
						};
					}

					node = branch[-1][3] === 'alpha' ? 'beta' : 'alpha';


					values = node === 'alpha' ? [Number.NEGATIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]] : [Number.POSITIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]];
					
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
						this.move_undo();

						current_depth--;

						branch = branch[1];
					}else{
						res = this.evaluate(eval_obj);
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

						this.move_undo();

					}

				}
			}.apply(this);
			real.call = object.call;

			object = real; // restore positions object
			// real move
			object.AI = false;
			this.move(tree[tree[-2]][4][0][0], tree[tree[-2]][4][0][1], tree[tree[-2]][4][1][0], tree[tree[-2]][4][1][1], '', object);
			object.current_side = object.ai_side === 'white' ? 'black' : 'white';
			object.ai_side = '';
			object.call = 0;
			
			return tree[tree[-2]][4];
		};

	}
}());































