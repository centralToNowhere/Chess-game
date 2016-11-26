
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
								document.querySelector('.board-container').style.paddingRight = 398.66 + "px";

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
								var e = new Event('click'); 
								document.querySelector('.king_' + positions.current_side).dispatchEvent(e);
								document.body.click();
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

			positions.game_mode = 'single';
			positions.current_move = true;
			positions.current_side = 'white';
			positions.ai_side = positions.current_side === 'white' ? 'black' : 'white';

			loadScript('js/chessBot.js', function(){
				


				console.log('ChessBot loaded', positions.data);
				/// PLAY WITH BOT
				document.querySelector('.container-fluid ').style.display = 'block';
				document.querySelector('.modal').style.display = 'none';

				////???????
				scale();
				window.addEventListener('optimizedResize', scale, false);

				/////???????

				positions.subscribe();
				//positions.set_updates(updates);
				positions.render();
				positions.set_possible_moves();
				var e = new Event('click'); 
				document.querySelector('.king_' + positions.current_side).dispatchEvent(e);
				document.body.click();
			});
		}	
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
