var ChessBot = (function(){

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


		this.cost = {
			'pawn':100,
			'knight':320,
			'bishop':330,
			'rook':500,
			'queen':900,
			'king':10000
		};

		this.all_moves_side_func = function(side){

			return object.all_moves_side(side);

		};

		this.move = function(start_j, start_k, finish_j, finish_k, embeded_move, object){

			object.execute_move(start_j, start_k, finish_j, finish_k, embeded_move, object)();

			return 0;
		};

		this.move_undo = function(){

			object.tools.undo();

			return 0;
		};

		this.set_depth = function(new_depth){
			depth = new_depth;
		};

		this.set_side = function(new_side){
			side = new_side;
		};

		this.throttleProgressBar = function(){
			var calls = 0,
				tmp = 0,
				fractionSum = 0,
				postProgress = function(fraction){
					self.postMessage(['guiUpdate', 'progressBar', fraction]);
				},
				throttle = function(fn, fraction, isLast){
					fractionSum += fraction;

					// last tick - show all amount of remainng nodes 
					if(isLast === true){
						fn.call(self, fractionSum);
						fractionSum = 0;
						return;
					}

					if(calls >= tmp){
						tmp = 1.7070* Math.pow(calls, 0.9673);
						fn.call(self, fractionSum);
						fractionSum = 0;
					}
					calls++;

				}.bind(undefined, postProgress);

			return throttle;

		};

		this.throttlePostNodesCheckedAmount = function(){
			var calls = 0,
				tmp = 0,
				postNodes = function(){
					self.postMessage(['guiUpdate', 'nodes', object.call]);
				},
				throttle = function(fn, isLast){

					// last tick - show all amount of remainng nodes 
					if(isLast === true){
						fn.apply(self);
						return;
					}

					if(calls >= tmp){
						tmp = 1.7070* Math.pow(calls, 0.9673);
						fn.apply(self);
					}
					calls++;

				}.bind(undefined, postNodes);

			return throttle;
		};

		this.pruning = function(branch){

			if(branch[-1][3] === 'alpha'){
				// value >= beta (beta cut-off)
				if(branch[-1][0][0] > branch[-1][0][2]){
					return 0;
				}
			}else{
				// value <= alpha 
				if(branch[-1][0][0] < branch[-1][0][1]){
					return 0;
				}
			}

		};

		this.ordering  = function(arr){
			var i = 0;
			var count = arr.length;
			var that = this;

			arr.sort(function(a,b){
				// taking (attacks)

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

			// less valuable atacker / most valuable victim
			arr_attacks.sort(function(a, b){
				function cost(move){
					try{
						var name1 = object.matrix[move[0][0]][move[0][1]],
							name2 = object.matrix[move[1][0]][move[1][1]],
							type1 = name1.split('_')[0],
							type2 = name2.split('_')[0],
							// color1 = name1.split('_')[name1.split('_').length-1],
							// color2 = name2.split('_')[name2.split('_').length-1],
							cost1 = that.cost[type1] === undefined ? that.cost[type1.substr(0, type1.length-1)] : that.cost[type1],
							cost2 = that.cost[type2] === undefined ? that.cost[type2.substr(0, type2.length-1)] : that.cost[type2];
						}catch(e){
							debugger;
							console.log(e);
						}




					return cost2 - cost1;
				}

				return cost(b) - cost(a);

			});



			arr.sort((function(){ 

				return function(a,b){
					// threats

					function filter(c){
						var figure = object.matrix[c[0][0]][c[0][1]].split('_')[0];
						figure = figure[figure.length-1].match( /[0-9]/) != null ? figure.substr(0, figure.length-1) : figure;
						if(figure.match( /pawn/) != null ){
							figure = figure + '_' + object.matrix[c[0][0]][c[0][1]].split('_')[1];
						}
						return figure;
					}


					var getMovesAmount = function(c){

						var type = filter(c),
							pieceFromMatrix = object.matrix[c[0][0]][c[0][1]],
							pieceFromData = '',
							transformed = function findTransformedPieces(){

								if(object.data[pieceFromMatrix][0] !== c[0][0] && object.data[pieceFromMatrix][1] !== c[0][1]){
									for(var h in object.data){
										if(object.data[h][0] === c[0][0] &&  object.data[h][1] === c[0][1]){
											return h;
										}
									}
								}else{
									return false;
								}

							}(),
							length = 0;



						//make virtual move
						object.matrix[c[0][0]][c[0][1]] = null;
						object.matrix[c[1][0]][c[1][1]] = pieceFromMatrix;
						if(transformed){
							object.data[transformed] = [c[1][0], c[1][1]];
						}else{
							object.data[pieceFromMatrix] = [c[1][0], c[1][1]];
						}

						// get number of attack moves
						length = object.get_moves(object.moves[type](), c[1][0], c[1][1], object).possible_attacks.length;

						// undo virtual move
						object.matrix[c[0][0]][c[0][1]] = pieceFromMatrix;
						object.matrix[c[1][0]][c[1][1]] = null;
						if(transformed){
							object.data[transformed] = [c[0][0], c[0][1]];
						}else{
							object.data[pieceFromMatrix] = [c[0][0], c[0][1]];
						}

						return length;

					}

					return getMovesAmount(b) - getMovesAmount(a);

				};

			}()));

			return arr_attacks.concat(arr);
		};

		this.orderingStrict = function(arr, node){
			var buffer = [],
				res = 0,
				sortedArr = [];

			arr.forEach(function(m, index){
				this.move(m[0][0], m[0][1], m[1][0], m[1][1], m[1][2], object);
				res = this.evaluate({
					position: true,
					material: true
				})
				this.move_undo();
				buffer.push([res, index]);
			}, this);

			buffer.sort(function(a, b){
				if(node === 'alpha'){
					return b[0] - a[0];
				}else if(node === 'beta'){
					return a[0] - b[0];
				}
			}).forEach(function(elem, index){
				sortedArr.push(arr[elem[1]]);
			});

			return sortedArr;
		}

		this.evaluate = function(eval_obj){
			object.current_move = true;

			var costTable = {
				pawn: [[0,0,0,0,0,0,0,0],
						[99,99,99,99,99,99,99,99],
						[50,50,50,50,50,50,50,50],
						[5,5,10,25,25,10,5,5],
						[0,0,0,20,20,0,0,0],
						[5,-5,-10,0,0,-10,-5,5],
						[5,10,10,-20,-20,10,10,5],
						[0,0,0,0,0,0,0,0]],
				knight: [[-50,-40,-30,-30,-30,-30,-40,-50],
						[-40,-20,0,0,0,0,-20,-40],
						[-30,0,10,15,15,10,0,-30],
						[-30,5,15,20,20,15,5,-30],
						[-30,0,15,20,20,15,0,-30],
						[-30,5,10,15,15,10,5,-30],
						[-40,-20,0,5,5,0,-20,-40],
						[-50,-40,-30,-30,-30,-30,-40,-50]],
				bishop: [[-20,-10,-10,-10,-10,-10,-10,-20],
						[-10,0,0,0,0,0,0,-10],
						[-10,0,5,10,10,5,0,-10],
						[-10,5,5,10,10,5,5,-10],
						[-10,0,10,10,10,10,0,-10],
						[-10,10,10,10,10,10,10,-10],
						[-10,5,0,0,0,0,5,-10],
						[-20,-10,-10,-10,-10,-10,-10,-20]],
				rook: 	[[0,0,0,0,0,0,0,0],
						[5,10,10,10,10,10,10,5],
						[-5,0,0,0,0,0,0,-5],
						[-5,0,0,0,0,0,0, -5],
						[-5,0,0,0,0,0,0, -5],
						[-5,0,0,0,0,0,0, -5],
						[-5,0,0,0,0,0,0, -5],
						[0,0,0,5,5,0,0,0]],
				queen: [[-20,-10,-10,-5,-5,-10,-10,-20],
						[-10,0,0,0,0,0,0,-10],
						[-10,0,5,5,5,5,0,-10],
						[-5,0,5,5,5,5,0,-5],
						[0,0,5,5,5,5,0,-5],
						[-10,5,5,5,5,5,0,-10],
						[-10,0,5,0,0,0,0,-10],
						[-20,-10,-10,-5,-5,-10,-10,-20]],
				king:  [[-30,-40,-40,-50,-50,-40,-40,-30],
						[-30,-40,-40,-50,-50,-40,-40,-30],
						[-30,-40,-40,-50,-50,-40,-40,-30],
						[-30,-40,-40,-50,-50,-40,-40,-30],
						[-20,-30,-30,-40,-40,-30,-30,-20],
						[-10,-20,-20,-20,-20,-20,-20,-10],
						[20,20,0,0,0,0,20,20],
						[0,30,10,0,0,10,30,0]]
			};
			var max_moves = {
				'pawn':4,
				'knight':8,
				'bishop':13,
				'rook':14,
				'queen':27,
				'king':8
			};
			// var pieces = {};
			// if(eval_obj.position){
			// 	var moves_1, moves_2 = 0;

			// 	/// ????????????????????????????????????????????????????????????????????//
			// 	if(object.current_side === side){
			// 		moves_1 = this.all_moves_side_func(side);
			// 		object.current_side = object.current_side === 'white' ? 'black' : 'white';
			// 		moves_2 = this.all_moves_side_func(side === 'black' ? 'white' : 'black');
			// 		object.current_side = object.current_side === 'white' ? 'black' : 'white';
			// 	}else{
			// 		object.current_side = object.current_side === 'white' ? 'black' : 'white';
			// 		moves_1 = this.all_moves_side_func(side);
			// 		object.current_side = object.current_side === 'white' ? 'black' : 'white';
			// 		moves_2 = this.all_moves_side_func(side === 'black' ? 'white' : 'black');
			// 	}
				
				
			// 	var arr = moves_1.concat(moves_2);
			// 	// // number of moves for every piece
			// 	// for(var y = 0; y < arr.length; y++){
			// 	// 	if(pieces[object.matrix[arr[y][0][0]][arr[y][0][1]]] === undefined){
			// 	// 		pieces[object.matrix[arr[y][0][0]][arr[y][0][1]]] = 0;
			// 	// 	}
			// 	// 	pieces[object.matrix[arr[y][0][0]][arr[y][0][1]]] += 1;
			// 	// }
			// }
			var amount = 0,
				abs_value = 0,
				cost = 0,
				piece_type = '',
				piece_color = '',
				i = null,
				j = null;

			for(var t in object.data){
				i = object.data[t][0];
				j = object.data[t][1];
				piece_type = t.split('_')[0];
				piece_color = t.split('_')[t.split('_').length-1];
				if(i !== null){
					if(eval_obj.material){
						abs_value = this.cost[piece_type] === undefined ? this.cost[piece_type.substr(0, piece_type.length-1)] : this.cost[piece_type];
					}

					if(eval_obj.position){
						// position 1
						// if(pieces[t] !== undefined){
						// 	abs_value += pieces[t] / ( max_moves[piece_type] === undefined ? max_moves[piece_type.substr(0, piece_type.length-1)] : max_moves[piece_type] ) * 0.5;
						// }
						// position 2
						if(piece_color === 'white'){
							cost = costTable[piece_type] === undefined ? costTable[piece_type.substr(0, piece_type.length-1)][i][j] : costTable[piece_type][i][j]; 
						}else if(piece_color === 'black'){
							cost = costTable[piece_type] === undefined ? costTable[piece_type.substr(0, piece_type.length-1)][7 - i][j] : costTable[piece_type][7 - i][j]; 
						}
					}
					if(piece_color === side){
						amount += abs_value;
						amount += cost;
					}else{
						amount -= abs_value;
						amount -= cost;
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

		this.negascout = function(ai_settings){

			

			// init settings
			if(ai_settings && ai_settings.depth){
				this.set_depth(ai_settings.depth);
			}else{
				return 0;
			}

			var eval_obj = ai_settings.eval;
			var output = ai_settings.output;

			//init tree
			object.AI = true;
			var real = object;
			object = this.cloner.clone(object);
			// now in object methods var 'positions' point to real object. We need to set object self context. So, inside object do
			//  'positions = this'
			object.setSelfContext(); 
			
			var postNodes;

			// set throttle for posting amount of checked nodes to main thread
			if(self.isWorker){
				postNodes = this.throttlePostNodesCheckedAmount();
				progressBar = this.throttleProgressBar();
			}

			//DOM element is not copied???
			object.ai_nodes_checked_elem = real.ai_nodes_checked_elem;
			var node = '';
			var values = '';
			var search_window = 1;
			var tmp_branch = 0;
			var initial_node = {
				0:[Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY], // supposed to persist array [node_value, alpha_value, beta_value, m]
				1:{}, // link to all child objects, -1 - link to self object, -2 - child node id that leads to the best move
				2:0, // link to parent object
				3:'alpha', // alpha or beta node
				4:[], // array of move to reach this node
				6:1 // fraction to show calculating progress
			};

			initial_node[1][-1] = initial_node; // link to self object
			initial_node[1][-2] = 0;
			var tree = branch = initial_node[1];
			var res = 0;
			var calls = 0;
			var move = [];


			//build nodes (branch  - child nodes) 
			var half_move = function half_move(research_id){

				object.current_move = 'true';

				var arr = this.all_moves_side_func(object.current_side);

				// ordering
				// arr = this.orderingStrict(arr, branch[-1][3]);
				arr = this.ordering(arr);

				for(var i = 0; i < arr.length; i++){

					// fraction = parent fraction / arr.length
					var fraction = branch[-1][6] / arr.length;

					if(typeof research_id !== 'undefined' && i !== research_id){
						continue;
					}

					// move coordinates
					var m = arr[i];

					if(this.pruning(branch) === 0){
						progressBar((arr.length - i) * fraction);
						break;
					};


					node = branch[-1][3] === 'alpha' ? 'beta' : 'alpha';


					//set window
					if(i !== 0){
						values = node === 'alpha' ? [Number.NEGATIVE_INFINITY, branch[-1][0][2] - 1, branch[-1][0][2]] : [Number.POSITIVE_INFINITY, branch[-1][0][1], branch[-1][0][1] + 1];
						search_window = 0;
					}else{
						values = node === 'alpha' ? [Number.NEGATIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]] : [Number.POSITIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]];
						search_window = 1;
					}

					if(typeof research_id !== 'undefined' && i === research_id){
						values = node === 'alpha' ? [Number.NEGATIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]] : [Number.POSITIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]];
						search_window = 1;
					}

					current_depth++;

					if(self.isWorker){
						postNodes();
					}

					this.move(m[0][0], m[0][1], m[1][0], m[1][1], m[1][2], object);

					var parent_node = branch;
					
					branch[i] = {
						0:values, // supposed to persist array [node_value, alpha_value, beta_value]
						1:{}, // branch of next moves after current
						2:parent_node, // link to parent object
						3:node, // alpha or beta node
						4:m, // array of move to reach this node
						5:search_window, // search window, 0 - null window, 1 - full search
						6:fraction 
					};

					branch[i][1][-1] = branch[i]; // property that point to parent of same level nodes array
					// number of current best move in a row, store it in branch[-2]
					if(i === 0 && typeof branch[-2] === 'undefined'){
						branch[-2] = 0;
					}
					// go to the lower branches
					branch = branch[i][1];
					
					var trig = 0;

					if(current_depth < depth){

						object.current_side = object.current_side === 'white' ? 'black' : 'white';

						half_move.apply(this);

						object.current_side = object.current_side === 'white' ? 'black' : 'white';
						


						// branch there is not an empty node
						// updating node value, alpha value, beta value
						res = branch[-1][0][0]; //value
						null_search = branch[-1][5];
						tmp_branch = branch;
						branch = branch[-1][2][-1]; // go to parent node

						
						if(branch[3] === 'alpha'){

							if(null_search === 0){ // null window?

								//re-search
								if(i !== 0 &&  res > branch[0][1] && res < branch[0][2]){

									// delete child node
									branch[1][i] = null;

									// object.current_side = object.current_side === 'white' ? 'black' : 'white';

									branch = branch[1];

									this.move_undo();

									current_depth--;

									trig = 1;

									half_move.apply(this, [i]);

									// object.current_side = object.current_side === 'white' ? 'black' : 'white';

									res = branch[i][0][0]; //value
									tmp_branch = branch;
									branch = branch[-1];

								}

							}

							// value > max
							if(res > branch[0][0]){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// value > alpha
							if(res > branch[0][1]){
								branch[0][1] = res;
							}

						}else{

							if(null_search === 0){ // null window?

								//re-search
								if(i !== 0 && res > branch[0][1] && res < branch[0][2]){

									// delete child node
									branch[1][i] = null;

									// object.current_side = object.current_side === 'white' ? 'black' : 'white';

									branch = branch[1];

									this.move_undo();

									current_depth--;

									trig = 1;

									half_move.apply(this, [i]); 

									// object.current_side = object.current_side === 'white' ? 'black' : 'white';

									res = branch[i][0][0]; //value
									tmp_branch = branch;
									branch = branch[-1]; // go to parent node
								}

							}

							// value < min
							if(res < branch[0][0]){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// value < beta
							if(res < branch[0][2]){
								branch[0][2] = res;
							}
						}


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

							// value > max
							if(res > branch[0][0]){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// value > alpha
							if(res > branch[0][1]){
								branch[0][1] = res;
							}

						}else{

							// value > min
							if(res < branch[0][0]){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// value < beta
							if(res < branch[0][2]){
								branch[0][2] = res;
							}
						}


						// update progressBar
						if(self.isWorker){
							self.progressBar(tmp_branch[-1][6]);
						}


						branch = tmp_branch[-1][2];


					}

					if(trig === 0){

						this.move_undo();

						current_depth--;

					}else{

						trig = 0;

					}


				}
			}.apply(this);
			real.call = object.call;

			object = real; // restore positions object
			// real move
			if(self.isWorker){
				self.postMessage(['positions', 'AI', false]);
				self.postMessage(['positions', 'execute_move', tree[tree[-2]][4][0][0], tree[tree[-2]][4][0][1], tree[tree[-2]][4][1][0], tree[tree[-2]][4][1][1], tree[tree[-2]][4][1][2]]);
				object.current_side = object.ai_side === 'white' ? 'black' : 'white';
				self.postMessage(['positions', 'current_side', object.current_side]);
				self.postMessage(['positions', 'ai_side', '']);

				// show remaining nodes amount on last tick
				postNodes(true);
				progressBar(0, true);

				// 50 ms to show last tick on progressbar, then hide it
				setTimeout(function(){
					self.postMessage(['positions', 'call', 0]);
					self.postMessage(['positions', 'ai_output_fraction_sum', 0]);
					self.postMessage(['status', 'finished']);
				}.bind(self), 50);


			}else{
				object.AI = false;
				this.move(tree[tree[-2]][4][0][0], tree[tree[-2]][4][0][1], tree[tree[-2]][4][1][0], tree[tree[-2]][4][1][1], tree[tree[-2]][4][1][2], object);
				object.current_side = object.ai_side === 'white' ? 'black' : 'white';
				object.ai_side = '';
				object.call = 0;
			}

			
			return tree[tree[-2]][4];
		};

		/*
		all_moves_side_func - function to search all moves of current side
		ai_settings         - set of boolean eval properties and depth, for example {pruning:true, depth:'3'}  
		returns 			- array of move, for example [[2, 1], [3, 1]]
		*/
		this.alphaBeta = function(ai_settings){
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

			// now in object methods var 'positions' point to real object. We need to set object self context. So, inside object do
			//  'positions = this'
			object.setSelfContext(); 

			var postNodes;

			// set throttle for posting amount of checked nodes to main thread
			if(self.isWorker){
				postNodes = this.throttlePostNodesCheckedAmount();
				progressBar = this.throttleProgressBar();
			}

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
				4:[], // array of move to reach this node
				5: 1 // fraction to show calculating progress
			};

			initial_node[1][-1] = initial_node; // link to self object
			initial_node[1][-2] = 0;
			var tree = branch = initial_node[1];
			var res = 0;
			var calls = 0;
			var move = [];

			// branch here is an inner node
			// {
			//      ... empty ...
			//      -1:  --- self
			// }
			//build nodes
			var half_move = function half_move(){

				debugger;
				object.current_move = 'true';
				var arr = this.all_moves_side_func(object.current_side);

				if(ordering === true){
					// arr = this.orderingStrict(arr, branch[-1][3]);
					arr = this.ordering(arr);
				}
				for(var i = 0; i < arr.length; i++){

					// fraction = parent fraction / arr.length
					var fraction = branch[-1][5] / arr.length;

					// move coordinates
					var m = arr[i];

					///pruning
					if(pruning === true){
						if(this.pruning(branch) === 0){
							progressBar((arr.length - i) * fraction);
							break;
						};
					}

					node = branch[-1][3] === 'alpha' ? 'beta' : 'alpha';

					values = node === 'alpha' ? [Number.NEGATIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]] : [Number.POSITIVE_INFINITY, branch[-1][0][1], branch[-1][0][2]];	

					current_depth++;

					if(self.isWorker){
						postNodes();
					}
					
					this.move(m[0][0], m[0][1], m[1][0], m[1][1], m[1][2], object);

					var parent_node = branch;
					
					branch[i] = {
						0:values, // supposed to persist array [node_value, alpha_value, beta_value]
						1:{}, // branch of next moves after current
						2:parent_node, // link to parent object
						3:node, // alpha or beta node
						4:m, // array of move to reach this node
						5:fraction
					};

					branch[i][1][-1] = branch[i]; // property that point to parent of same level nodes array
					// number of current best move in a row, store it in branch[-2]
					if(i === 0 && typeof branch[-2] === 'undefined'){
						branch[-2] = 0;
					}
					// go to the lower branches
					branch = branch[i][1];	
					
					
					if(current_depth < depth){

						object.current_side = object.current_side === 'white' ? 'black' : 'white';
						
						// branch before
						// {
						//      ... empty ...
						//      -1:  --- self
						// }

						half_move.apply(this);

						//	branch after
						// inner node
						// {
						//      0: {}
						//		1: {}
						//		2: {}
						//		.....
						//      -1:  --- self
						// }

						object.current_side = object.current_side === 'white' ? 'black' : 'white';
						

						// branch there is not an empty node
						// inner node
						// {
						//      0: {}
						//		1: {}
						//		2: {}
						//		...
						//      -1:  --- self
						//		-2: ...
						// }
						// updating node value, alpha value, beta value
						res = branch[-1][0][0]; //value
						tmp_branch = branch;
						branch = branch[-1][2][-1]; // go to parent node
						if(branch[3] === 'alpha'){

							if(branch[0][0] < res){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// if alpha < result
							if(branch[0][1] < res){
								branch[0][1] = res;
							} 
						}else{
							
							if(branch[0][0] > res){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// if beta > result
							if(branch[0][2] > res){
								branch[0][2] = res;
							}
						}
						this.move_undo();

						current_depth--;

						branch = branch[1];
						// inner node
						// {
						//      0: {}
						//		1: {}
						//		2: {}
						//      -1:  --- self
						// }
					}else{
						res = this.evaluate(eval_obj);
						// branch there is a container for nodes
						// inner node
						// {
						//      ... empty ...
						//      -1:  --- self
						// }
						tmp_branch = branch;
						branch = branch[-1][2][-1]; // go to parent node
						//	branch - outer node
						// {
						// 		0:values,
						// 		1:{}
						// 		2:parent_node
						// 		3:node
						// 		4:m
						//	}

						if(branch[3] === 'alpha'){

							if(branch[0][0] < res){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// if alpha < value
							if(branch[0][1] < res){
								branch[0][1] = res;
							} 
						}else{
							
							if(branch[0][0] > res){
								branch[0][0] = res;
								branch[1][-2] = i;
							}
							// if beta > value 
							if(branch[0][2] > res){
								branch[0][2] = res;
							}
						}

						// update progressBar
						if(self.isWorker){
							self.progressBar(tmp_branch[-1][5]);
						}


						branch = tmp_branch[-1][2];
						// inner node
						// {
						//      0: {}
						//		1: {}
						//		2: {}
						//      -1:  --- self
						// }

						current_depth--;

						this.move_undo();

					}
				}
			}.apply(this);

			real.call = object.call;

			object = real; // restore positions object
			// real move
			if(self.isWorker){
				self.postMessage(['positions', 'AI', false]);
				self.postMessage(['positions', 'execute_move', tree[tree[-2]][4][0][0], tree[tree[-2]][4][0][1], tree[tree[-2]][4][1][0], tree[tree[-2]][4][1][1], tree[tree[-2]][4][1][2]]);
				object.current_side = object.ai_side === 'white' ? 'black' : 'white';
				self.postMessage(['positions', 'current_side', object.current_side]);
				self.postMessage(['positions', 'ai_side', '']);

				// show remaining nodes amount on last tick
				postNodes(true);
				progressBar(0, true);

				// 50 ms to show last tick on progressbar, then hide it
				setTimeout(function(){
					self.postMessage(['positions', 'call', 0]);
					self.postMessage(['positions', 'ai_output_fraction_sum', 0]);
					self.postMessage(['status', 'finished']);
				}.bind(self), 50);


			}else{
				object.AI = false;
				this.move(tree[tree[-2]][4][0][0], tree[tree[-2]][4][0][1], tree[tree[-2]][4][1][0], tree[tree[-2]][4][1][1], tree[tree[-2]][4][1][2], object);
				object.current_side = object.ai_side === 'white' ? 'black' : 'white';
				object.ai_side = '';
				object.call = 0;
			}
			
			return tree[tree[-2]][4];
		};

	}
}());































