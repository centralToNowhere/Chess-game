var positions = {

	set_updates: function(updates){
		for(var t in updates){

			if(t !== 'deleted' && t !== 'current_move' && t !== 'current_side' && t !== 'name' && t !== 'password' && t !== 'is_it_a_first_move'){
				if(typeof updates[t] !== 'string'){
					this.matrix[updates[t][0]][updates[t][1]] = this.matrix[t.split('_')[0]][t.split('_')[1]];
					console.log(updates[t], this.matrix[t.split('_')[0]][t.split('_')[1]]);
					var transformed_figure_found = false;
					for(var h in this.data){
						if(this.data[h][0] === updates[t][0] && this.data[h][1] === updates[t][1]){
							this.data[h] = [null, null];
						}
						if(h.match(/.+_.+_\d+/)){
							if(this.data[h][0] === t.split('_')[0] - 0 && this.data[h][1] === t.split('_')[1] - 0){
								this.data[h] = updates[t];
								transformed_figure_found = true;
								break;
							}
						}
					}
					if(transformed_figure_found === false){
						this.data[this.matrix[t.split('_')[0]][t.split('_')[1]]] = updates[t];
					}
				}else{
					this.matrix[t.split('_')[0]][t.split('_')[1]] = updates[t];
					var regex = '^' + updates[t].split('_')[0] + '_' + updates[t].split('_')[1] + '_+\\d$';
					var regex = new RegExp(regex);
					console.log(regex, 'queen_black'.match(regex));
					for(var i in this.data){
		                if(i.match(regex)){
		                    var num = i.split('_')[2] - 0; // to number
		                    var color = i.split('_')[1];
		                    this.data[updates[t].split('_')[0] + '_' + color + '_' + ++num] = [t.split('_')[0] - 0, t.split('_')[1] - 0];
		                }else{
		                	this.data[updates[t] + '_1'] = [t.split('_')[0] - 0, t.split('_')[1] - 0];
		                }
		            }
				}
			}
		}
		for(var l = 0; l < updates.deleted.length; l++){
			this.matrix[updates.deleted[l][0]][updates.deleted[l][1]] = null;
		}
		this.is_it_a_first_move = updates.is_it_a_first_move;
		this.current_move = updates.current_move[this.current_side];
	},
	// add css classes to DOM elements from matrix object 
	render: function(pos_cells, flag){
		if(typeof pos_cells == 'undefined' || typeof flag == 'undefined'){
			for(var i = 0; i < this.board_cells.length; i++){
				var j = Math.floor(i / 8);
				var k = i % 8;
				var name = this.board_cells[i].className.split(' ')[2];
				
				//console.log(this.matrix[j][k], this.board_cells[i].className);
				if(typeof name !== 'undefined'){
					if(name !== this.matrix[j][k]){
						this.board_cells[i].className = this.board_cells[i].className.replace(name, this.matrix[j][k]);
					}
				}else{
					this.board_cells[i].className = this.board_cells[i].className += " " + this.matrix[j][k];
				}
			}
		// green moves
		}else{

			if( typeof pos_cells.possible_cells != 'undefined' ){
				for(var i = 0; i < this.board_cells.length; i++){
					var j = Math.floor(i / 8);
					var k = i % 8;

					for(var t = 0; t < pos_cells.possible_cells.length; t++){
						if( j == pos_cells.possible_cells[t][0] && k == pos_cells.possible_cells[t][1]){
							if(this.board_cells[i].className.match(/.+ green/)){
								this.board_cells[i].className = this.board_cells[i].className.replace(/ green/, "");
							}
							this.board_cells[i].className += " " + 'green';
							this.move_status = 'selection';
							document.addEventListener('click', function(){
								var y = i;
								var object = this;
								return function(){
									object.move_status = null;
									object.board_cells[y].className = object.board_cells[y].className.replace(/ green/, "");
									for(var i = 0; i < object.callbacks.length; i++){
										object.board_cells[object.callbacks[i][1]].removeEventListener('click', object.callbacks[i][0], false);
									} 
								};
							}.apply(this), false); 
						}
					}
				}
			}

			// red moves (attacks)
			if( typeof pos_cells.possible_attacks != 'undefined' ){ 
				for(var i = 0; i < this.board_cells.length; i++){
					var j = Math.floor(i / 8);
					var k = i % 8;

					for(var t = 0; t < pos_cells.possible_attacks.length; t++){
						if( j == pos_cells.possible_attacks[t][0] && k == pos_cells.possible_attacks[t][1]){
							if(this.board_cells[i].className.match(/.+ red/)){
								this.board_cells[i].className = this.board_cells[i].className.replace(/ red/, "");
							}
							this.board_cells[i].className += " " + 'red';
							this.move_status = 'selection';
							document.addEventListener('click', function(){
								var y = i;
								var object = this;
								return function(){
									object.move_status = null;
									object.board_cells[y].className = object.board_cells[y].className.replace(/ red/, "");
									for(var i = 0; i < object.callbacks.length; i++){
										object.board_cells[object.callbacks[i][1]].removeEventListener('click', object.callbacks[i][0], false);
									}
								};
							}.apply(this), false); 
						}
					}
				}
			}
		}
	},
	get_moves: function(moves, j, k, object){
				var possible_cells = [];
				var possible_attacks = [];
				var coordinates = [j, k];
				for(var i = 0; i < moves.vectors.length; i++){

					if(moves.distance === 0){

						for(var j = coordinates[0], k = coordinates[1]; j < 8 && k < 8 && j >= 0 && k >= 0; ){
							if( j !== coordinates[0] || k !== coordinates[1]){
								if( object.matrix[j][k] === null){
									possible_cells.push([j, k]);
								}else{ // positions for attack
									if(  object.matrix[j][k].split('_')[1] !== object.current_side ){
										possible_attacks.push([j, k]);
									}
									break;
								}
							}		
							j = j + moves.vectors[i][0];
							k = k + moves.vectors[i][1];
						}

					}

					if(moves.distance === 1){
						for(var j = coordinates[0], k = coordinates[1]; 
							j <= coordinates[0] + 1 && k <= coordinates[1] + 1 && j >= coordinates[0] - 1 && k >= coordinates[1] - 1 && 
							j < 8 && k < 8 && j >= 0 && k >= 0;){
							if( j !== coordinates[0] || k !== coordinates[1]){


								//castling


								if(object.matrix[coordinates[0]][coordinates[1]] === 'king_white'){
									if(object.is_it_a_first_move.king_white){
										if('rook1_white' in object.data ){
											if(object.is_it_a_first_move.rook1_white){
												if(object.matrix[7][1] === null &&
													object.matrix[7][2] === null &&
													object.matrix[7][3] === null){
														for(var h in this.data){

														}
															possible_cells.push([object.data.king_white[0], object.data.king_white[1] - 2, ['castling', object.data.rook1_white[0], object.data.rook1_white[1], object.data.king_white[0], object.data.king_white[1] - 1]]);
												}
											}
										}
										if('rook2_white' in object.data ){
											if(object.is_it_a_first_move.rook2_white){
												if(object.matrix[7][5] === null &&
													object.matrix[7][6] === null){
														possible_cells.push([object.data.king_white[0], object.data.king_white[1] + 2, ['castling', object.data.rook2_white[0], object.data.rook2_white[1], object.data.king_white[0], object.data.king_white[1] + 1]]);
												}
											}
										}
									}
								}
								if(object.matrix[coordinates[0]][coordinates[1]] === 'king_black'){
									if(object.is_it_a_first_move.king_black){
										if('rook1_black' in object.data ){
											if(object.is_it_a_first_move.rook1_black){
												if(object.matrix[0][1] === null &&
													object.matrix[0][2] === null &&
													object.matrix[0][3] === null){
														possible_cells.push([object.data.king_black[0], object.data.king_black[1] - 2, ['castling', object.data.rook1_black[0], object.data.rook1_black[1], object.data.king_black[0], object.data.king_black[1] - 1]]);
												}
											}
										}
										if('rook2_black' in object.data ){
											if(object.is_it_a_first_move.rook2_black){
												if(object.matrix[0][5] === null &&
													object.matrix[0][6] === null){
														possible_cells.push([object.data.king_black[0], object.data.king_black[1] + 2, ['castling', object.data.rook2_black[0], object.data.rook2_black[1], object.data.king_black[0], object.data.king_black[1] + 1]]);
												}
											}
										}
									}
								}
								if( object.matrix[j][k] === null ){
									possible_cells.push([j, k]);
								}else{ // positions for attack
									if(  object.matrix[j][k].split('_')[1] !== object.current_side ){
										possible_attacks.push([j, k]);
									}
									break;
								}

							}
							j = j + moves.vectors[i][0];
							k = k + moves.vectors[i][1];
						}

					}

					if(moves.distance === -1 || moves.distance === 2){

						

						if(coordinates[0] + moves.vectors[i][0] < 8 && coordinates[1] + moves.vectors[i][1] < 8 && coordinates[1] + moves.vectors[i][1] >= 0 && coordinates[0] + moves.vectors[i][0] >= 0)
							if(object.matrix[coordinates[0] +
								moves.vectors[i][0]][coordinates[1] +
								moves.vectors[i][1]] === null ){ 
								if(object.matrix[coordinates[0]][coordinates[1]].split('_')[0].match(/pawn\d/)){
									if(i === 1 || i === 2){
										continue;
									}
									if(object.current_side === 'white'){
										if(coordinates[0] !== 6){
							                if(i === 3){
												continue;                    
											}

											//transform queen

											if(coordinates[0] === 1){
												possible_cells.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1], ['transform', 'queen_' + object.current_side]]);
												continue;                      
											}
										}
										possible_cells.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1]]);                      
									}else{         
								    	if(coordinates[0] !== 1){
											if(i === 3){ 
												continue; 
						                    }
						                    //transform queen
						                    if(coordinates[0] === 6){
												possible_cells.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1], ['transform', 'queen_' + object.current_side]]);
												continue;                      
											}
				                       	}
										possible_cells.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1]]);
									}
								}else{
									possible_cells.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1]]);           
							    }     
							}else{
								if(object.matrix[coordinates[0] + moves.vectors[i][0]][coordinates[1] + moves.vectors[i][1]].split('_')[1] !== object.current_side){
									if(object.matrix[coordinates[0]][coordinates[1]].split('_')[0].match(/pawn\d/)){
						                if(i === 3 || i === 0){
						                	if(i === 0){
						                		delete moves.vectors[3];
						                		moves.vectors.length = moves.vectors.length-1;
						                	}
											continue;                    
										}else{
											if(object.current_side === 'white'){
												if(coordinates[0] === 1){
													possible_attacks.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1], ['transform', 'queen_' + object.current_side]]);
													continue;
												}
											}else{
												if(coordinates[0] === 6){
													possible_attacks.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1], ['transform', 'queen_' + object.current_side]]);
													continue;
												}
											}
											possible_attacks.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1]]);
										}
									}else{
										possible_attacks.push([coordinates[0] + moves.vectors[i][0], coordinates[1] + moves.vectors[i][1]]);
									}
					         	}     
					        	//break;    
					        }
						}
					}
					var moves = {
						possible_cells: possible_cells,
						possible_attacks: possible_attacks
					};
				return moves;

				},
	execute_move: function(start_j, start_k, finish_j, finish_k, embeded_move, object){

					//store callbacks to remove it later
					object.callbacks.push([callback, finish_j*8 + finish_k]);



					function callback(e){

						var updates = {
							deleted: [],
						};

						for(var i = 0; i < object.callbacks.length; i++){
							object.board_cells[object.callbacks[i][1]].removeEventListener('click', object.callbacks[i][0], false);
						}

						//castling
						if(object.matrix[start_j][start_k] === 'king_' + object.current_side){
							object.is_it_a_first_move['king_' + object.current_side] = false;
						}
						if(object.matrix[start_j][start_k] === 'rook1_' + object.current_side){
							object.is_it_a_first_move['rook1_' + object.current_side] = false;
						}
						if(object.matrix[start_j][start_k] === 'rook2_' + object.current_side){
							object.is_it_a_first_move['rook2_' + object.current_side] = false;
						}



					//	object.board_cells[finish_j*8 + finish_k].className = object.board_cells[finish_j*8 + finish_k].className.replace(' ' + object.matrix[finish_j][finish_k], "");
						// if(object.matrix[finish_j][finish_k] !== null){
						// 	updates.deleted.push([finish_j, finish_k]);
						// }
						if(finish_j !== start_j || finish_k !== start_k){
							updates.deleted.push([start_j, start_k]);
						}
					//	object.matrix[finish_j][finish_k] = object.matrix[start_j][start_k];
						updates[start_j + '_' + start_k] = [finish_j, finish_k];
					//	object.board_cells[start_j*8 + start_k].className = object.board_cells[start_j*8 + start_k].className.replace(' ' + object.matrix[start_j][start_k], "");
					//	object.matrix[start_j][start_k] = null;
						if(typeof embeded_move === 'object'){
							if(embeded_move[0] === 'castling'){
							//	object.board_cells[embeded_move[3]*8 + embeded_move[4]].className = object.board_cells[embeded_move[3]*8 + embeded_move[4]].className.replace(' ' + object.matrix[embeded_move[3]][embeded_move[4]], "");
							//	object.matrix[embeded_move[3]][embeded_move[4]] = object.matrix[embeded_move[1]][embeded_move[2]];
								updates[embeded_move[1] + '_' + embeded_move[2]] = [embeded_move[3], embeded_move[4]];
								updates.deleted.push([embeded_move[1], embeded_move[2]]);
							//	object.board_cells[embeded_move[1]*8 + embeded_move[2]].className = object.board_cells[embeded_move[1]*8 + embeded_move[2]].className.replace(' ' + object.matrix[embeded_move[1]][embeded_move[2]], "");
							//	object.matrix[embeded_move[1]][embeded_move[2]] = null;
							//	object.is_it_a_first_move['king_' + object.current_side] = false;
							}
							if(embeded_move[0] === 'transform'){
								if(typeof embeded_move[1] === 'string'){
								//	object.board_cells[finish_j*8 + finish_k].className = object.board_cells[finish_j*8 + finish_k].className.replace(' ' + object.matrix[finish_j][finish_k], "");
								//	object.matrix[finish_j][finish_k] = embeded_move[1];
									//delete updates[start_j + '_' + start_k];
									updates[finish_j + '_' + finish_k] = embeded_move[1];
								}
							}
						}
						updates.current_side = object.current_side;
						updates.is_it_a_first_move = object.is_it_a_first_move;
						updates.name = object.name;
						updates.password = object.password;
						updates.current_move = object.current_move;
						

						

						// send position object to server
						object.publish(updates);

						// render board
						// object.render();

					}


					return callback;
				},

	set_possible_moves: function(){
		for(var i = 0;i < this.board_cells.length; i++){
			var object = this;
			this.board_cells[i].addEventListener('click', (function(){
				var r = i;
				var moves = {

					king: function(){

						// moves 
						// [[ possible directions from figure position]][distance]
						// distance possible values: 
						// 1 - one cell from current position
						// 0 - INFINITY cells from current position
						// -1 - Discrete cells (vectors turns to array of possible cells to move)
						// 2 - pawn
						// d - documentation

						var moves = {

							vectors: [

								[1, 0],
								[1, -1],
								[1, 1],
								[0, 1],
								[0, -1],
								[-1, 0],
								[-1, 1],
								[-1, -1]

							],

							distance: 1,

							spec: function(){

							}
						};

						return moves;
					},

					queen: function(){

						var moves = {

							vectors: [

								[1, 0],
								[1, -1],
								[1, 1],
								[0, 1],
								[0, -1],
								[-1, 0],
								[-1, 1],
								[-1, -1]

							],

							distance: 0
						};

						return moves;
					},
					bishop: function(){

						var moves = {

							vectors: [

								[1, -1],
								[1, 1],
								[-1, 1],
								[-1, -1]

							],

							distance: 0
						};

						return moves;
					},
					rook: function(){

						var moves = {

							vectors: [

								[1, 0],
								[0, 1],
								[0, -1],
								[-1, 0],

							],

							distance: 0
						};

						return moves;
					},
					knight: function(){

						var moves = {

							vectors: [

								[2, -1],
								[2, 1],
								[-2, -1],
								[-2, 1],
								[1, 2],
								[-1, 2],
								[-1, -2],
								[1, -2]

							],

							distance: -1
						};

						return moves;
					},
					pawn_black: function(){

						var moves = {

							vectors: [

								[1, 0],
					         [1, 1],
					         [1, -1],
					         [2, 0]


							],

							distance: 2
						};

						return moves;
					},		
					pawn_white: function(){

						var moves = {

							vectors: [

								[-1, 0],
								[-1, 1],
								[-1, -1],
								[-2, 0]

							],

							distance: 2
						};

						return moves;
					},
					backlight_move: function(e){

							var j = Math.floor(r / 8);
							var k = r % 8;
							return function(){
								if(this.move_status !== 'selection'){
									e.stopPropagation();
								}

								// setting callbacks only on allies figures and not on enemies and empty spots
								// and only if current_move == true
								if(this.current_move === true && this.matrix[j][k] !== null && this.matrix[j][k].split('_')[1] === this.current_side){
									for(var p in this.data){
										if(this.data[p][0] === j && this.data[p][1] === k){
											var data_figure = p;
										}
									}
									var figure = this.matrix[j][k].split('_')[0];
									figure = figure[figure.length-1].match( /[0-9]/) != null ? figure.substr(0, figure.length-1) : figure;
									if(figure.match( /pawn/) != null ){
										figure = figure + '_' + this.matrix[j][k].split('_')[1];
									}

									// calculate moves
									var res = this.get_moves(moves[figure](), j, k, object);

									//set callbacks on each of the possible cells for move
									var arr = res.possible_cells.concat(res.possible_attacks);

									//scan check or stalemate
									//delete moves from arr to prevent king's vanishing
									var to_delete = moves.scanCheckmate();


									for(var y in to_delete){
										if(y === data_figure){
											to_delete[y].forEach(function(deleted){
												arr.forEach(function(el2, index){
													if(deleted[0] === el2[0] && deleted[1] === el2[1]){
														arr.splice(index, 1);
													}
												});
												res.possible_cells.forEach(function(el1, index){
													if(deleted[0] === el1[0] && deleted[1] === el1[1]){
														res.possible_cells.splice(index, 1);
													}
												});
												res.possible_attacks.forEach(function(el1, index){
													if(deleted[0] === el1[0] && deleted[1] === el1[1]){
														res.possible_attacks.splice(index, 1);
													}
												});
											});	
										}
									}
									console.log('TO DELETE RESULT:\n', arr, to_delete, res);
									

									// set executions of moves
									for(var i = 0; i < arr.length; i++){							
										this.board_cells[arr[i][0]*8 + arr[i][1]].addEventListener('click', 
											this.execute_move(j, k, arr[i][0], arr[i][1], arr[i][2], this), false);
									}
									return this.render(res, 'selection');

								}else{

									return 0;

								}

							}.apply(object, arguments);
						},
					scanCheckmate: function(){
						var op_side = this.current_side === 'black' ? 'white' : 'black';
						var side = this.current_side;
						var reg1 = new RegExp('.+_' + op_side);
						var reg2 = new RegExp('.+_' + side);
						var moves_for_delete = {};
						moves_for_delete['king' + '_' + this.current_side] = [];
						Function.prototype.curry = function(){
						    var fn = this, args = Array.prototype.slice.call(arguments);
						    return function(){
						        return fn.apply(this, Array.prototype.slice.call(arguments).concat(args));
						    };
						}
						var fn = moves.tools.moves_intersection.curry(moves_for_delete, reg2);		
						var king = this.data['king_' + this.current_side];
						var king_nearist_cells = [[king[0] + 1, king[1] + 1],
												[king[0] - 1, king[1] - 1],
												[king[0] + 1, king[1]],
												[king[0] - 1, king[1]],
												[king[0], king[1] + 1],
												[king[0], king[1] - 1],
												[king[0] + 1, king[1] - 1],
												[king[0] - 1, king[1] + 1]];

						for(var h in this.data){
							if(h.match(reg1)){
								var figure = h.split('_')[0];
								var j = this.data[h][0];
								var k = this.data[h][1];
								figure = figure[figure.length-1].match( /[0-9]/) != null ? figure.substr(0, figure.length-1) : figure;
								if(figure.match(/pawn/) != null ){
									figure = figure + '_' + h.split('_')[1];
								}
								var temp = moves[figure]().vectors;
								if(figure === 'knight' || figure === 'king'){
									temp.forEach(function(move){
										king_nearist_cells.forEach(function(cell){
											if(j + move[0] === cell[0] && k + move[1] === cell[1]){
												moves_for_delete['king' + '_' + this.current_side].push(cell);
											}
											if(j + move[0] === king[0] && k + move[1] === king[1]){
												moves_for_delete = fn([j, k], this.data);
											}
										}, object);
									}, object);
								}
								if(figure.match(/pawn/)){
									king_nearist_cells.forEach(function(cell){
										if((j + temp[1][0] === cell[0] && k + temp[1][1] === cell[1]) || (j + temp[2][0] === cell[0] && k + temp[2][1] === cell[1])){
											moves_for_delete['king' + '_' + this.current_side].push(cell);
										}
										if((j + temp[1][0] === king[0] && k + temp[1][1] === king[1]) || (j + temp[2][0] === king[0] && k + temp[2][1] === king[1])){
											moves_for_delete = fn([j, k], this.data);
										}
									}, object);
								}
								if(figure === 'bishop' || figure === 'rock' || figure === 'queen'){
									console.log(figure);
									for(var z = 0; z < temp.length; z++){
										var move = temp[z];
										var cells = [];
										var buf = [];
										for(var l = move[0], m = move[1], j = this.data[h][0] + l, k = this.data[h][1] + m; j < 8 && k < 8 && j >= 0 && k >= 0; j = j + l, k = k + m){
											console.log(j, k);	
											if(cells.length === 0 ){
												cells.push([j - l, k - m]);
											}
											cells.push([j, k]);
											if((this.matrix[j][k] + '').match(reg1) || (this.matrix[j][k] + '').match(reg2)){
												if(this.matrix[j][k] !== 'king_' + side){
													buf.push(this.matrix[j][k]);
												}
											}

											for(var w = 0; w < king_nearist_cells.length; w++){
												var cell = king_nearist_cells[w];
												if((cell[0] === j && cell[1] === k) || (king[0] === j && king[1] === k)){
													console.log(cells, buf);
													if(buf.length === 0){
														moves_for_delete['king' + '_' + this.current_side].push([j, k]);
														
														if((king[0] === j + l && king[1] === k + m) || (king[0] === j  && king[1] === k)){
															moves_for_delete = fn(cells, this.data);
														}
													}
													if(buf.length === 1){
														if(buf[0].split('_')[1] === op_side){
															king_nearist_cells.forEach(function(cell){
																if(cell[0] === this.data[buf[0]][0] && cell[1] === this.data[buf[0]][1]){
																	moves_for_delete['king' + '_' + this.current_side].push(cell);
																}
															}, object);
														}
														if(buf[0].split('_')[1] === side){

															// if this figure protect the king from check

															if(king[0] === j + l && king[1] === k + m){
																moves_for_delete = fn(cells, buf[0]);
															}
														}
													}
												}	
											}
										}
									}
								}
							}
						}
						return moves_for_delete;
					}.bind(object),

					tools: {

						moves_intersection: function(arr, object){
							console.log('Object:', arguments);
							var moves_for_delete = arguments[2];
							var reg2 = arguments[3];
							if(typeof object === 'string'){
								var str = object;
								object = {};
								object[str] = 0;
							}
							for(var t in object){

								if(t.match(reg2) && t.match(/^king/) === null && this.data[t][0] !== null){
									var f = t.split('_')[0];
									f = f[f.length-1].match( /[0-9]/) != null ? f.substr(0, f.length-1) : f;
									if(f.match(/pawn/) != null ){
										f = f + '_' + t.split('_')[1];
									}
									var all_moves = this.get_moves(moves[f](), this.data[t][0], this.data[t][1], this);
									all_moves = all_moves.possible_cells.concat(all_moves.possible_attacks);
									for(var b = 0; b < all_moves.length; b++){
										for(var c = 0; c < arr.length; c++){
											var trig = 0;
											if(arr[c][0] === all_moves[b][0] && arr[c][1] === all_moves[b][1]){
												trig = 1;
												break;
											}
										}
										if(trig === 0){
											if(moves_for_delete[t]){
												moves_for_delete[t].push(all_moves[b]);
											}else{
												moves_for_delete[t] = [];
												moves_for_delete[t].push(all_moves[b]);
											}
										}
									}
								}
							}
							return moves_for_delete;
						}.bind(object),
					}
				}
				return moves.backlight_move;

			})(), false);
		}
	},
	publish: function(updates){
		var xhr = new XMLHttpRequest();
    	xhr.open("POST", "/publish", true);
  		xhr.send(JSON.stringify(updates));
  		return;
	},
	subscribe: function(){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "/subscribe?rand=" + Math.random().toString().split('.')[1], true);
		xhr.onload = function() {
			var updates = JSON.parse(this.responseText);
			console.log('UPDATES', updates);
			positions.set_updates(updates);
			positions.render();
			positions.subscribe();
		}
		xhr.onerror = function(){
			console.log('TIMEOUT');
			setTimeout(positions.subscribe, 500);
		};

		xhr.send('');
	},
	board_cells: (function(){

		return document.querySelectorAll('.board__cell');

	})(),
    data:{

		king_black: [0, 4],
		queen_black: [0, 3],
		rook1_black: [0, 0],
		rook2_black: [0, 7],
		knight1_black: [0, 1],
		knight2_black: [0, 6],
		bishop1_black: [0, 2],
		bishop2_black: [0, 5],
		pawn1_black: [1, 0],
		pawn2_black: [1, 1],
		pawn3_black: [1, 2],
		pawn4_black: [1, 3],
		pawn5_black: [1, 4],
		pawn6_black: [1, 5],
		pawn7_black: [1, 6],
		pawn8_black: [1, 7],
		king_white: [7, 4],
		queen_white: [7, 3],
		rook1_white: [7, 0],
		rook2_white: [7, 7],
		knight1_white: [7, 1],
		knight2_white: [7, 6],
		bishop1_white: [7, 2],
		bishop2_white: [7, 5],
		pawn1_white: [6, 0],
		pawn2_white: [6, 1],
		pawn3_white: [6, 2],
		pawn4_white: [6, 3],
		pawn5_white: [6, 4],
		pawn6_white: [6, 5],
		pawn7_white: [6, 6],
		pawn8_white: [6, 7]

	},

	matrix:[ [ 'rook1_black',
    'knight1_black',
    'bishop1_black',
    'queen_black',
    'king_black',
    'bishop2_black',
    'knight2_black',
    'rook2_black' ],
  [ 'pawn1_black',
    'pawn2_black',
    'pawn3_black',
    'pawn4_black',
    'pawn5_black',
    'pawn6_black',
    'pawn7_black',
    'pawn8_black' ],
  [ null, null, null, null, null, null, 'pawn4_white', null ],
  [ null, 'queen_white', null, null, null, 'queen_white', null, null ],
  [ null, null, null, null, null, null, null, null ],
  [ null, null, null, null, null, null, null, null ],
  [ 'pawn1_white',
    'pawn2_white',
    'pawn3_white',
    'pawn4_white',
    'pawn5_white',
    'pawn6_white',
    'pawn7_white',
    'pawn8_white' ],
  [ 'rook1_white',
    'knight1_white',
    'bishop1_white',
    'queen_white',
    'king_white',
    'bishop2_white',
    'knight2_white',
    'rook2_white' ] ],
   	is_it_a_first_move: {
    	rook1_white: true,
    	rook2_white: true,
    	rook1_black: true,
    	rook2_black: true,
    	king_white: true,
    	king_black: true
    },
    password: '',
    move_status: null,
    current_side: 'black',
    current_move: '',
    callbacks: [],
    name: '',
};




