
///////// auth /////////////

(function(){
	//radio buttons
	var rads = document.querySelector('.game-auth').mode;
	// checked initialy
	var prev = document.querySelector('#check_multi');
	document.querySelector('#check_single').nextElementSibling.focus();

	var modeToggle = function (e){
		debugger;
		if(e.type === 'keydown'){
			if(e.keyCode !== 13){
				return;
			}
			e.preventDefault();
		}

		if(prev !== this){
			prev.removeAttribute("checked");
			prev = this;
		}
		this.setAttribute("checked", "checked");

		if(this.htmlFor === 'check_single' || this.dataset.check === 'single'){
			document.querySelector('#game_pass').setAttribute('disabled', 'disabled');
			document.querySelector('#game_name').setAttribute('disabled', 'disabled');
			document.querySelector('.game-auth > input[type="submit"]').focus();
		}
		if(this.htmlFor === 'check_multi' || this.dataset.check === 'multi'){
			document.querySelector('#game_pass').removeAttribute('disabled');
			document.querySelector('#game_name').removeAttribute('disabled');
			document.querySelector('.game-auth > #game_name').focus();
		}
	}
	for(var i = 0; i < rads.length; i++){
		rads[i].addEventListener('click', modeToggle);
		rads[i].nextElementSibling.addEventListener('keydown', modeToggle.bind(rads[i]));
	}

	document.querySelector('.game-auth').addEventListener("submit", function(e){
	  	document.querySelector('.block-notification').innerHTML = '';
	  	e = e || window.e;
		if (e.preventDefault) { 
	    	e.preventDefault(); 
	  	}else{ // IE8-:
	    	e.returnValue = false;
		}
		if(document.querySelector('#check_multi').checked === true){

			//multiplayer
			(function(){
				var xhr = new XMLHttpRequest();
				xhr.open('POST', '/auth', true);
				var game = this.querySelector('#game_name').value;
				var pass = this.querySelector('#game_pass').value;
				var data = {
					name: game,
					password: pass
				};
				xhr.send(JSON.stringify(data));
				xhr.onload = function(){
					var message = '';

					if(this.responseText === 'data-error' || this.responseText === 'Unauthorized'){
						if(this.responseText === 'data-error'){
							message = "Fields should contain only letters and numbers (3 to 12).";
						}
						if(this.responseText === 'Unauthorized' || xhr.status === 401){
							message = "Game and password do not match.";
						}
						if(xhr.status >= 500){
							message = "Internal server error";
						}
					document.querySelector('.block-notification').innerHTML = message;
					}else{
						
						try{

							var t = JSON.parse(this.responseText);

							positions.game_mode = 'multi';
							positions.matrix = t.matrix;
							positions.data = t.data;
							positions.is_it_a_first_move = t.is_it_a_first_move;
							positions.current_side = t.current_side;
							positions.current_move = t.current_move;
							positions.name = t.name;
							positions.password = t.password;


							document.querySelector('.container-fluid ').style.display = 'block';
							document.querySelector('.modal').style.display = 'none';

							////???????
							scale();
							window.addEventListener('optimizedResize', scale, false);
							/////???????

							/// First chat is loaded
							/// Then board positions is loaded
							/// This is so because positions.set_game_status 
							/// uses MessageBox as system output
							/// and (most important) the chat height
							/// should be 100% of window.
							/// Since app first screen is auth modal
							/// we need to load that chat after authentication
							/// when it's display is block;
							/// But it loads asynchroniusly way and positions by that time had alredy loaded. Of course, we could load chat as usual and call some code when auth has passed and stretch chat height, 
							/// but it is better to tune chat styles
							/// from inner method MessageBox.init. 
							/// So we have autonomous chatbox.

							loadScript('js/chat.js', function(){

								var chatBox = new MessageBox();
								chat.set_pushFunction(chatBox, chatBox.push);
								positions.tools.set_messageBoxModule(chatBox);

								document.querySelector('.chat-container').style.display = "block";
								document.querySelector('.ai-settings__x-mark-menu p').innerHTML = 'Chat';
									
								var onsubmit = function(message){
									var game = positions.name;
									console.log('Submit', id, game);
									chat.chat_publish(id, game, message);
								};

								positions.messageBoxModule.submit(onsubmit);

								if(t.password_player2 !== undefined){
									message = 'player 2 password: ' + t.password_player2;
									positions.messageBoxModule.push(message);
								}

								if(t.win !== undefined){
									positions.win = t.win;
								}

								if(t.game_status !== undefined){
									positions.game_status = t.game_status;
									switch(positions.game_status){
										case 'progress':
											message = 'Game is in progress';
											break;
										case 'end':
											message = 'Game over. ';
											if(positions.win !== '' && positions.win !== 'stalemate'){
												message += positions.win[0].toUpperCase() + positions.win.slice(1) + ' won.';
											}else if(positions.win === 'stalemate'){
												message += 'Stalemate.';
											}
											break;
									}
									positions.messageBoxModule.push(message);
								}


								


								positions.subscribe();
								positions.render();
								positions.set_possible_moves();
								// var e = new Event('click_king');
								// var king = document.querySelector('.king_' + positions.current_side);

								// king.addEventListener('click_king', function(){
								// 	this.click();
								// 	document.body.click();
								// });
								var id = Math.random().toString().split('.')[1].slice(0, 3).toString();

								chat.chat_subscribe(id, positions.name);


							});
						}catch(e){
							console.log(e);
						}	
					}
				}
			}.apply(this));
		}else{
			// single
			(function(){
				positions.game_mode = 'single';
				positions.current_move = true;
				positions.current_side = 'white';

				loadScript('js/chessBot.js', function(){
					

					//AI init
					var bot = new ChessBot(positions),
						workerInProgress = false;

										// creates ui for AI
					var board = document.querySelector('.board-container'),
						icon_menu = document.querySelector('.container__icon-menu'),
						ai_settings = document.querySelector('.ai-settings'),
						icon_menu_wrapper = document.querySelector('.container__icon-menu_wrapper'),
						ai_settings_content = document.createElement('ul'),
						nodes_count_label = document.createElement('span'),
						nodes_count_div = document.createElement('div'),
						container__nodes_count = document.createElement('div'),
						pruning_label = document.createElement('span'),
						pruning_div = document.createElement('div'),
						container__pruning = document.createElement('div'),
						container__mobile_metrics = document.createElement('div'),
						progressBar = document.createElement('progress'),
						undo_arrow = document.createElement('img'),
						forward_arrow = document.createElement('img'),
						autoplay = document.createElement('img'),
						metrics = document.createElement('img'),
						intervalId = 0;

					container__nodes_count.classList.add('container__ai-info-output');
					container__pruning.classList.add('container__ai-info-output');
					container__mobile_metrics.classList.add('container__mobile_metrics');
					progressBar.classList.add('container__progressBar');

					undo_arrow.src = './images/arrow.png';
					forward_arrow.src = './images/arrow.png';
					autoplay.src = './images/autoplay.png';
					metrics.src = './images/icon-metrics.png';
					undo_arrow.classList.add('container__undo-arrow');
					forward_arrow.classList.add('container__forward-arrow');
					autoplay.classList.add('container__auto');
					metrics.classList.add('container__metrics');
					ai_settings.appendChild(ai_settings_content); 
					ai_settings_content.outerHTML = '<ul class="ai-settings__list">Search algorithm <li class="ai-settings__item">Minimax <input type="radio" name="check_algo" value="minimax" id="algo_minimax"> <label for="algo_minimax"></label> </li><li class="ai-settings__item">Alpha-Beta <input type="radio" name="check_algo" value="alphaBeta" id="algo_alphaBeta" checked> <label for="algo_alphaBeta"></label> <ul class="ai-settings__list"> <li class="ai-settings__item">Ordering <input type="checkbox" id="algo_alphaBeta_ordering" checked> <label for="algo_alphaBeta_ordering"></label> </li></ul> </li><li class="ai-settings__item">NegaScout <input type="radio" name="check_algo" value="negaScout" id="algo_negaScout"> <label for="algo_negaScout"></label> </li><li class="ai-settings__item"> Depth <div class="ai-settings__item-select-div"> <select name="depth"> <option value="2">2</option> <option value="3" selected>3</option> <option value="4">4</option> <option value="5">5</option> </select> <div class="ai-settings__item-select">3</div><ul class="ai-settings__item-select-list"> <li class="ai-settings__item-select-item" data-value="2">2</li><li class="ai-settings__item-select-item" data-value="3">3</li><li class="ai-settings__item-select-item" data-value="4">4</li><li class="ai-settings__item-select-item" data-value="5">5</li></ul> </div></li><li class="ai-settings__item">Evaluation <ul class="ai-settings__list"> <li class="ai-settings__item"> Material <input type="checkbox" id="check_eval_material" checked> <label for="check_eval_material"></label> </li><li class="ai-settings__item"> Position <input type="checkbox" id="check_eval_position" checked> <label for="check_eval_position"></label> </li></ul> </li></ul>';

					nodes_count_label.textContent = "Checked nodes: ";
					pruning_label.textContent = "Cut-offs: ";
					document.querySelector('.ai-settings__x-mark-menu p').innerHTML = 'Settings';

					container__nodes_count.appendChild(nodes_count_label);
					container__nodes_count.appendChild(nodes_count_div);

					container__pruning.appendChild(pruning_label);
					container__pruning.appendChild(pruning_div);

					//wrapper for scrollbar (overflow-x: auto/scroll/hidden; overflow-y:visible problem)
					icon_menu.appendChild(icon_menu_wrapper);

					icon_menu_wrapper.appendChild(undo_arrow);
					icon_menu_wrapper.appendChild(autoplay);
					icon_menu_wrapper.appendChild(forward_arrow);
					icon_menu_wrapper.appendChild(metrics);
					icon_menu_wrapper.appendChild(container__nodes_count);

					icon_menu_wrapper.parentNode.insertBefore(container__mobile_metrics, icon_menu_wrapper.nextElementSibling);


					var undo_func = function(e){
							this.classList.add('active');
							var that = this;
							e.stopPropagation();
							if(window.Worker && workerInProgress){
								return;
							}else{
								setTimeout(function(){
									positions.tools.undo();
									positions.render();
									that.classList.remove('active');
								}, 0);
							}

						},
						forward_func = function(e){
							this.classList.add('active');
							var that = this;
							e.stopPropagation();

							if(window.Worker && !workerInProgress){

								if(positions.win === "black" || positions.win === "white"){

									that.classList.remove('active');
									return;

								}else{

									positions.tools.ai_move();

								}

							}else if(workerInProgress){

								return;

							}else{
								setTimeout(function(){

									if(positions.win === "black" || positions.win === "white"){

										that.classList.remove('active');
										return;


									}else{

										positions.tools.ai_move();
										that.classList.remove('active');

									}

								}, 0);
							}
						},

						workerCircle = function(){

							if(positions.win === ""){

								positions.tools.ai_move();

							}else{

								document.removeEventListener('workerReady', workerCircle);
								this.classList.toggle('active');

								undo_arrow.addEventListener('click', undo_func);
								forward_arrow.addEventListener('click', forward_func);
							}

						}.bind(autoplay),

						autoplay_func =	function(e){
							e.stopPropagation();
							this.classList.toggle('active');

							var circle = function(){

								if(autoplay_func.isWorking){
									
									if(positions.win === ""){

										positions.tools.ai_move();
										setTimeout(circle, 0);


									}else{

										autoplay.classList.toggle('active');

										undo_arrow.addEventListener('click', undo_func);
										forward_arrow.addEventListener('click', forward_func);

									}

								}

							};

							if(this.classList.contains('active')){
								undo_arrow.removeEventListener('click', undo_func);
								forward_arrow.removeEventListener('click', forward_func);

								if(window.Worker){
									
									document.addEventListener('workerReady', workerCircle);

									if(!workerInProgress){
										workerCircle();
									}

								}else{

									setTimeout(function(){
										autoplay_func.isWorking = true;
										circle();
									}, 0);

								}

							}else{
								if(window.Worker){
									
									document.removeEventListener('workerReady', workerCircle);
									
								}else{

									autoplay_func.isWorking = false;

								}

								undo_arrow.addEventListener('click', undo_func);
								forward_arrow.addEventListener('click', forward_func);

							}

						},
						metrics_func = function(e){
							e.stopPropagation();
							this.classList.toggle('active');

							function showMobileMetrics(elem_metrics){
								if(elem_metrics.parentNode === icon_menu_wrapper){
									icon_menu_wrapper.removeChild(elem_metrics);
									container__mobile_metrics.appendChild(elem_metrics);
								}else{
									container__mobile_metrics.removeChild(elem_metrics);
									icon_menu_wrapper.appendChild(elem_metrics);
								}
							}

							showMobileMetrics(container__nodes_count);
							showMobileMetrics(container__pruning);

						}

					// no gui updates - no pruning
					if(window.Worker){
						icon_menu_wrapper.appendChild(container__pruning);
					}

					//start metrix
					pruning_div.textContent = '0.00%';
					nodes_count_div.textContent = '0';


					console.log('ChessBot loaded');
					// var aiTurn = 0;
					document.body.addEventListener('AI_turn', function(){

						// for cutoff acccuracy text
						
						// aiTurn++;
						// if(!!!(aiTurn % 2)){
						// 	positions.tools.undo();
						// 	positions.render();
						// 	algorithm = 'minimax';
						// }else{
						// 	algorithm = 'alphaBeta';
						// }

						// check if game is already finished (if mate)
						var king = document.querySelector('.king_' + positions.current_side);
						king.click();
						document.body.click();

						if(positions.win !== ""){
							pruning_div.textContent = '0.00%';
							nodes_count_div.textContent = '0';
							return;
						}

						var obj = {};
							// bot = {},
							algorithm = document.querySelector('input[name="check_algo"]:checked').value;

						//reset metrics
						pruning_div.textContent = '0.00%';
						nodes_count_div.textContent = '0';
						progressBar.value = 0;
						icon_menu_wrapper.appendChild(progressBar);

						bot.set_side(positions.current_side);
						positions.ai_side = positions.current_side;

						switch(algorithm){
							case 'minimax':
								obj = {
									pruning: false,
									ordering: true,
									depth: +document.getElementsByName('depth')[0].value,
									eval: {
										material: document.querySelector('#check_eval_material').checked,
										position: document.querySelector('#check_eval_position').checked,
									},
									output: document.querySelector('.container__ai-output'),
								};
								break;
							case 'alphaBeta':
								obj = {
									pruning: true,
									ordering: document.querySelector('#algo_alphaBeta_ordering').checked,
									depth: +document.getElementsByName('depth')[0].value,
									eval: {
										material: document.querySelector('#check_eval_material').checked,
										position: document.querySelector('#check_eval_position').checked,
									},
									output: document.querySelector('.container__ai-output'),
								};
								break;
							case 'negaScout':
								obj = {

									depth: +document.getElementsByName('depth')[0].value,
									eval: {
										material: document.querySelector('#check_eval_material').checked,
										position: document.querySelector('#check_eval_position').checked,
									},
									output: document.querySelector('.container__ai-output'),

								};
								break;
						}

						var execAlgorithm = function(bot, algorithm, obj){
							switch(algorithm){

								case 'minimax':
									bot.alphaBeta(obj);
									break;

								case 'alphaBeta':
									bot.alphaBeta(obj);
									break;

								case 'negaScout':
									bot.negascout(obj);
									break;

							}
							return;
						}.bind(undefined, bot, algorithm, obj);

						if(window.Worker){

							var worker = new Worker('js/worker.js');

							worker.addEventListener('message', function(e){
								var subject = e.data.shift();

								// message about main.js object
								if(subject === 'positions'){
									var property = e.data.shift();

									if(property === 'execute_move'){
										e.data.push(positions);
										positions[property].apply(positions, e.data)();

									}else if(typeof positions[property] === 'function'){
										positions[property].apply(positions, e.data);

									}else{
										positions[property] = e.data[0];
									}
									return;
								}

								// message about worker status 
								if(subject === 'status'){
									var property = e.data.shift();
									if(property === 'finished'){
										workerInProgress = false;
										forward_arrow.classList.remove('active');

										// check if game is already finished (if mate)
										var king = document.querySelector('.king_' + positions.current_side);
										king.click();
										document.body.click();

										if(progressBar.nodeName === 'DIV'){
											progressBar.style.width = "0";
										}else if(progressBar.nodeName === 'PROGRESS'){
											progressBar.value = "0";
										}
										icon_menu_wrapper.removeChild(progressBar);
										positions.ai_output_pruning_sum = 0;
										positions.ai_output_researched_sum = 0;
										console.log('finished');
										document.dispatchEvent(new Event('workerReady'));
									}
									return this.terminate();
								}

								// message for GUI 
								if(subject === 'guiUpdate'){
									var property = e.data.shift();
									if(property === 'nodes'){
										positions.tools.ai_output_nodes_checked(e.data[0]);
										return;
									}
									if(property === 'progressBar'){
										positions.tools.ai_output_progressBar(e.data[0], e.data[1]);
										return;
									}
									if(property === 'pruning'){
										positions.tools.ai_output_pruning(e.data[0], e.data[1], e.data[2]);
										return;
									}
								}

								if(subject === 'storage'){
									var property = e.data.shift();
									if(property === 'cuttOffAccuracyTest'){
										localStorage.setItem('cuttOffAccuracyTest', (localStorage.getItem('cuttOffAccuracyTest') ? (localStorage.getItem('cuttOffAccuracyTest') + ' ' + e.data.shift() + ' ' + e.data.shift() + ' ' + e.data.shift() + ' ' + e.data.shift()) : (e.data.shift() + ' ' + e.data.shift() + ' ' + e.data.shift() + ' ' + e.data.shift())));
										return;
									}
								}

							});
							var partialCopy = {},
								deletePositionsMethods = function(object){
									var copy = {},
										props = ['call', 'data', 'matrix', 'is_it_a_first_move', 'password', 'move_status', 'current_side', 'current_move', 'name', 'game_status', 'win', 'check', 'game_mode', 'ai_side', 'AI', 'moves_stack'];
										
									props.forEach(function(p){
										copy[p] = object[p];
									});

									return copy;
								};
								
							partialCopy = deletePositionsMethods(positions); 
							workerInProgress = true;
							worker.postMessage([partialCopy, algorithm, obj]);
						}else{
							execAlgorithm();
						}
						
					});

					/// move/undo/AIvsAI control 
					undo_arrow.addEventListener('click', undo_func);
					forward_arrow.addEventListener('click', forward_func);
					autoplay.addEventListener('click', autoplay_func);
					metrics.addEventListener('click', metrics_func);

					// set arrow keys
					document.addEventListener('keydown', function(e){
		    			if((e.keyCode == '39' || e.keyCode == '68') && !e.ctrlKey && !e.shiftKey && !e.altKey){
		    				e.stopPropagation();
							forward_func.call(forward_arrow, e);
							return;
		    			}
		    			if((e.keyCode == '37' || e.keyCode == '65') && !e.ctrlKey && !e.shiftKey && !e.altKey){
		    				e.stopPropagation();
	    					undo_func.call(undo_arrow, e);
	    					return;
		    			}
		    			if(e.keyCode == '82' && !e.ctrlKey && !e.shiftKey && !e.altKey){
		    				e.stopPropagation();
	    					autoplay_func.call(autoplay, e);
	    					return;
		    			}
					});

					/// show board
					document.querySelector('.container-fluid ').style.display = 'block';
					document.querySelector('.modal').style.display = 'none';


					//custom select box
					[].forEach.call(document.querySelectorAll('.ai-settings__item-select'), function(select){
						select.style.width = getComputedStyle(select.nextElementSibling).width.substr(0, getComputedStyle(select.nextElementSibling).width.search('px')) - 0 + 20 + 'px';
						select.addEventListener('click', function(e){

							e.stopPropagation();
							select.classList.toggle('active');
							select.nextElementSibling.classList.toggle('active');

						});

					});
					[].forEach.call(document.querySelectorAll('.ai-settings__item-select-item'), function(item){

						item.addEventListener('click', function(e){
							e.stopPropagation();
							this.parentNode.previousElementSibling.innerHTML = this.dataset.value;
							var that = this;
							this.parentNode.classList.toggle('active');
							this.parentNode.previousElementSibling.classList.toggle('active');
							[].forEach.call(this.parentNode.parentNode.querySelector('select').children, function(elem){
									elem.removeAttribute('selected', 'selected');
									if(elem.value === that.dataset.value){

										elem.setAttribute('selected', 'selected');

									}

							});

						});

					});

					document.body.addEventListener('click', function(){
						var lists = document.querySelectorAll('.ai-settings__item-select-list');
						lists.forEach(function(list){

							if(list.classList.contains('active')){
								list.classList.remove('active');
								list.previousElementSibling.classList.remove('active');
							}

						});

					});


					////??????? scale board
					scale();
					window.addEventListener('optimizedResize', scale, false);

					positions.tools.set_output_nodes_checked(nodes_count_div);
					positions.tools.set_output_progressBar(progressBar);
					positions.tools.set_output_pruning(pruning_div);


					positions.render();
					positions.set_possible_moves();

					//bad hack
					var king = document.querySelector('.king_' + positions.current_side);
					king.addEventListener('click_king', function(){
						this.click();
						document.body.click();
					});
					king.dispatchEvent(e); 
				});
			}());
		}
		document.querySelector('.ai-settings__x-mark-menu').firstElementChild.addEventListener('click', function(e){
			e.stopPropagation();
			this.parentNode.parentNode.parentNode.classList.remove('row_compressed');

		});
		document.querySelector('.ai-settings__x-mark-menu').firstElementChild.addEventListener('keydown', function(e){
			if(e.keyCode == '13'){
				this.parentNode.parentNode.parentNode.classList.remove('row_compressed');
			}

		});

		document.querySelector('.container__menu-button').addEventListener('click', function(e){
			e.stopPropagation();
			this.parentNode.parentNode.parentNode.classList.add('row_compressed');

		});
		document.querySelector('.container__menu-button').addEventListener('keydown', function(e){
			if(e.keyCode == '13'){
				this.parentNode.parentNode.parentNode.classList.add('row_compressed');
			}

		});	

	}, false);
}());


//////// chat ///////////////

var chat = (function(){
	return {
		set_pushFunction: function(obj, fn){

			this.pushFunction = fn.bind(obj);

		},
		chat_subscribe: function(id, game){
			var xhr = new XMLHttpRequest();
			xhr.open('POST', '/chat_subscribe', true);
			var data = {
				id: id,
				name: game
			};
			xhr.send(JSON.stringify(data));

			xhr.onload = function(){
				try{
					console.log('RESPONSE', xhr.responseText);
					var data = JSON.parse(xhr.responseText);
					var message = data.message !== undefined ? data.message : '';
					var whose = data.whose;
					// var chatBox = new MessageBox();

					this.pushFunction(message, whose);

				}catch(e){
					console.log(e);
				}
				chat.chat_subscribe(id, game);
			}.bind(this);
		},

		chat_publish:	function(id, game, message){
			var data = {
				id: id,
				name: game,
				message: message
			}
			var xhr = new XMLHttpRequest();
	    	xhr.open("POST", "/chat_publish", true);
	  		xhr.send(JSON.stringify(data));
		}
	};
}());


/// for optimized resizer

(function() {
    var throttle = function(type, name, obj) {
        obj = obj || window;
        var running = false;
        var func = function() {
            if (running) { return; }
            running = true;
             requestAnimationFrame(function() {
                obj.dispatchEvent(new CustomEvent(name));
                running = false;
            });
        };
        obj.addEventListener(type, func);
    };

    /* init - you can init any event */
    throttle("resize", "optimizedResize");
})();


/// requestAnimationFrame polyfill

(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();


// scales board cells if window size changes

var scale = (function(){

	//set height ai_settings block  === ClientWidth if no set yet 

	function setSidebarAiSettingsHeight(){
		setSidebarAiSettingsHeight.ai_settings = setSidebarAiSettingsHeight.ai_settings || document.querySelector('.ai-settings');
		var currentUsedHeight = getComputedStyle(setSidebarAiSettingsHeight.ai_settings).height;
		var clientH = document.documentElement.clientHeight;
		if(clientH > parseInt(currentUsedHeight)){
			setSidebarAiSettingsHeight.ai_settings.style.height = clientH + "px";
		}
	};

	var scale = function(){
		setSidebarAiSettingsHeight();
		if(document.documentElement.clientWidth <= 510){
			var cells = document.querySelectorAll('.board__cell');
			var width = cells[0].offsetWidth;
			for(var h = 0; h < cells.length;h++){
				cells[h].style.height = width + "px";
			}
		}
	}
	return scale;
}());



var loadScript = (function(){
	return function(src, callback){
		var script = document.createElement('script');


		var afterLoad = function() {
			
		};

		var result = {};

		var setScript = function(src){
			script.src = src;
			document.body.appendChild(script);

			script.onload = script.onerror = (function() {
				return function(){
					if(!this.executed){
				    	this.executed = true;
				    	afterLoad();
				  	}
			  	}
			}());

			script.onreadystatechange = function() {
				var self = this;
				if(this.readyState == "complete" || this.readyState == "loaded") {
					setTimeout(function(){
			    		self.onload();
			    	}, 0); 
			  	}
			};
		};

		var setCallback = function(callback){

			afterLoad = callback;

		};
		setCallback(callback);
		setScript(src);

		return result;
	};
}());

var testCutOffAcc = (function(){
	return function(){
		var str = localStorage.getItem('cuttOffAccuracyTest'),
			arr = str.split(' '),
			res = [],
			resObj = {};

		arr.forEach(function(a, index){
			if(!(index % 8)){
				res.push({
					errHardPred: Math.abs(100 - (a / arr[index+4] * 100) - arr[index+2]),
					errEasePred: Math.abs(100 - (a / arr[index+4] * 100) - arr[index+3]),
					errMinimax: Math.abs((arr[index+1] - arr[index+4]) / arr[index+4] * 100)
				});
			}
		});

		resObj.average = (function(){
			var r = {},
				obj = res.reduce(function(a, b){
					return {
						errHardPred: a.errHardPred + b.errHardPred,
						errEasePred: a.errEasePred + b.errEasePred,
						errMinimax: a.errMinimax + b.errMinimax
					}
				});
			for(var i in obj){
				r[i] = obj[i] / (arr.length / 8);
			}	
			return r;
		}());	

		resObj.median = (function(){
			var r = {},
				tmp = {
					errHardPred: [],
					errEasePred: [],
					errMinimax: []
				};

			res.forEach(function(a){
				tmp.errHardPred.push(a.errHardPred);
				tmp.errEasePred.push(a.errEasePred);
				tmp.errMinimax.push(a.errMinimax);
			});

			for(var i in tmp){
				r[i] = function(c){
					c.sort(function(a, b){
						return a - b;
					});
					return c.length % 2 !== 0 ? c[(c.length - 1) / 2] : (c[c.length / 2] + c[(c.length / 2) - 1]) / 2 ;
				}(tmp[i]);
			}

			return r;
		}());

		console.log('Average: \n');
		console.log('        errHardPred:' + resObj.average.errHardPred + '\n');
		console.log('        errEasePred:' + resObj.average.errEasePred + '\n');
		console.log('        errMinimaxPred:' + resObj.average.errMinimax + '\n');
		console.log('Median: \n');
		console.log('        errHardPred:' + resObj.median.errHardPred + '\n');
		console.log('        errEasePred:' + resObj.median.errEasePred + '\n');
		console.log('        errMinimaxPred:' + resObj.median.errMinimax + '\n')

		localStorage.removeItem('cuttOffAccuracyTest');
	}
}()); 