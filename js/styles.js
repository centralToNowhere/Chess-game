
///////// auth /////////////

(function(){
	var rads = document.querySelector('.game-auth').mode;
	[].concat.apply(rads, document.querySelectorAll('.check_mode'));
	var prev = null;
	for(var i = 0; i < rads.length; i++){
		rads[i].onclick = function(){
			if(this !== prev){
				prev = this;
			}
			if(this.htmlFor === 'check_single' || this.dataset.check === 'single'){
				document.querySelector('#game_pass').setAttribute('disabled', 'disabled');
				document.querySelector('#game_name').setAttribute('disabled', 'disabled');
			}
			if(this.htmlFor === 'check_multi' || this.dataset.check === 'multi'){
				document.querySelector('#game_pass').removeAttribute('disabled');
				document.querySelector('#game_name').removeAttribute('disabled');
			}
		}
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

			//with human
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
								document.querySelector('.chat-container').style.display = "block";
								document.querySelector('.ai-settings__x-mark-menu p').innerHTML = 'Chat';

								window.chatBox = new MessageBox();
									
								var onsubmit = function(message){
									var game = positions.name;
									console.log('Submit', id, game);
									chat.chat_publish(id, game, message);
								};
								chatBox.submit(onsubmit);

								if(t.password_player2 !== undefined){
									message = 'player 2 password: ' + t.password_player2;
									chatBox.push(message);
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
									chatBox.push(message);
								}


								positions.subscribe();
								//positions.set_updates(updates);
								positions.render();
								positions.set_possible_moves();
								var e = new Event('click_king');
								var king = document.querySelector('.king_' + positions.current_side);

								king.addEventListener('click_king', function(){
									this.click();
									document.body.click();
								});
								var id = Math.random().toString().split('.')[1].slice(0, 3).toString();
								document.addEventListener("load", chat.chat_subscribe(id, positions.name));
							});
						}catch(e){
							console.log(e);
						}	
					}
				}
			}.apply(this));
		}else{
			// with AI
			(function(){
				positions.game_mode = 'single';
				positions.current_move = true;
				positions.current_side = 'white';

				loadScript('js/chessBot.js', function(){
					
					//AI init
					var bot = new ChessBot(positions);

					document.body.addEventListener('AI_turn', function(){
						bot.set_side(positions.current_side);
						positions.ai_side = positions.current_side;
						debugger;
						bot.search((function(){
							var obj = {

								pruning: document.querySelector('#check_pruning').checked,
								ordering: document.querySelector('#check_order').checked,
								depth: +document.getElementsByName('depth')[0].value,
								eval: {
									material: document.querySelector('#check_eval_material').checked,
									position: document.querySelector('#check_eval_position').checked,
								},
								output: document.querySelector('.container__ai-output'),

							}; 
							return obj;
						}()));
					});

					// creates ui for AI
					var board = document.querySelector('.board-container'),
						icon_menu = document.querySelector('.container__icon-menu'),
						ai_settings = document.querySelector('.ai-settings'),
						ai_settings_content = document.createElement('ul');
						nodes_checked = document.createElement('div'),
						nodes_count_label = document.createElement('span'),
						undo_arrow = document.createElement('img'),
						forward_arrow = document.createElement('img'),
						autoplay = document.createElement('img'),
						intervalId = 0;

					nodes_checked.classList.add('container__nodes-checked');

					undo_arrow.src = './images/arrow.png';
					forward_arrow.src = './images/arrow.png';
					autoplay.src = './images/autoplay.png';
					undo_arrow.classList.add('container__undo-arrow');
					forward_arrow.classList.add('container__forward-arrow');
					autoplay.classList.add('container__auto');
					ai_settings.appendChild(ai_settings_content); 
					ai_settings_content.outerHTML = '<ul class="ai-settings__list"><li class="ai-settings__item">Pruning<input type="checkbox" id="check_pruning" checked><label for="check_pruning"></label></li><li class="ai-settings__item">Move ordering<input type="checkbox" id="check_order" checked><label for="check_order"></label></li><li class="ai-settings__item">Depth<div class="ai-settings__select-div"><select name="depth"><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option></select><div class="ai-settings__item-select">4</div><ul class="ai-settings__item-select-list"><li class="ai-settings__item-select-item" data-value="3">3</li><li class="ai-settings__item-select-item" data-value="4">4</li><li class="ai-settings__item-select-item" data-value="5">5</li></ul></div></li><li class="ai-settings__item">Evaluation<ul class="ai-settings__list"><li class="ai-settings__item">Material<input type="checkbox" id="check_eval_material" checked><label for="check_eval_material"></label></li><li class="ai-settings__item">Position<input type="checkbox" id="check_eval_position" checked><label for="check_eval_position"></label></li></ul></li></ul>';

					nodes_count_label.textContent = "Nodes checked: ";
					document.querySelector('.ai-settings__x-mark-menu p').innerHTML = 'Settings';

					icon_menu.appendChild(undo_arrow);
					icon_menu.appendChild(autoplay);
					icon_menu.appendChild(forward_arrow);
					icon_menu.appendChild(nodes_count_label);
					icon_menu.appendChild(nodes_checked);

					console.log('ChessBot loaded');
					var undo_func = function(e){
						this.classList.add('active');
						var that = this;
						e.stopPropagation();
						setTimeout(function(){
							try{
								positions.tools().undo();
							}catch(e){

							}
							positions.render();
							that.classList.remove('active');
						}, 0);
					};
					undo_arrow.addEventListener('click', undo_func);
					var forward_func = function(e){
						this.classList.add('active');
						var that = this;
						e.stopPropagation();
						setTimeout(function(){
							positions.tools().ai_move();
							that.classList.remove('active');
						}, 0);
					};
					forward_arrow.addEventListener('click', forward_func);
					autoplay.addEventListener('click', function(e){
						e.stopPropagation();
						this.classList.toggle('active');
						if(this.classList.contains('active')){
							undo_arrow.removeEventListener('click', undo_func);
							forward_arrow.removeEventListener('click', forward_func);
						}else{
							undo_arrow.addEventListener('click', undo_func);
							forward_arrow.addEventListener('click', forward_func);
						}
						var that = this;
						var circle = function(){
							if(!that.classList.contains('active')){
								return 0;
							}
							positions.tools().ai_move();
							setTimeout(circle, 0);
						};
						setTimeout(function(){
							circle();
						}, 0);
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

					positions.tools().set_output_nodes_checked(nodes_checked);
					positions.render();
					positions.set_possible_moves();

					//bad hack
					var e = new Event('click_king');
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

		document.querySelector('.container__menu-button').addEventListener('click', function(e){
			e.stopPropagation();
			this.parentNode.parentNode.classList.add('row_compressed');

		});	

	}, false);
}());


//////// chat ///////////////

var chat = (function(){
	return {
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
					console.log('RESPONSE', this.responseText);
					var data = JSON.parse(this.responseText);
					var message = data.message !== undefined ? data.message : '';
					var whose = data.whose;
					var chatBox = new MessageBox();

					chatBox.push(message, whose);

				}catch(e){
					console.log(e);
				}
				chat.chat_subscribe(id, game);
			}
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
	var throttle = function(type, name, obj) {
        obj = obj || window;
        var running = false;
        var func = function() {
            if (running) { return; }
            running = true;
             requestAnimationFrame(function() {
                obj.dispatchEvent(new CustomEvent(name));
            });
        };
        obj.addEventListener(type, func);
    };
    throttle("resize", "optimizedResize");

	var scale = function(){

		if(document.documentElement.clientWidth <= 510){
			var cells = document.querySelectorAll('.board__cell');
			var width = cells[0].offsetWidth;
			for(var h = 0; h < cells.length;h++){
				cells[h].style.height = width + "px";
			}
		}
		// if(document.documentElement.clientHeight < document.documentElement.scrollHeight){
		// 	if(document.documentElement.clientWidth >= 977){
		// 		document.querySelector('.board-container').style.paddingRight = 398.66 + "px";
		// 	}else{
		// 		document.querySelector('.board-container').style.paddingRight = 15 + "px";
		// 	}
		// }else{
		// 	console.log('sdfsdfds');
		// 	if(document.documentElement.clientWidth >= 992){
		// 		document.querySelector('.board-container').style.paddingRight = 398.66 + "px";
		// 	}else{
		// 		document.querySelector('.board-container').style.paddingRight = 15 + "px";
		// 	}
		// }
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
