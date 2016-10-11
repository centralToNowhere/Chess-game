
///////// auth /////////////

(function(){

	document.querySelector('.chess-game').addEventListener("submit", function(e){
	  	document.querySelector('.block-notification').innerHTML = '';
	  	e = e || window.e;
		if (e.preventDefault) { 
	    	e.preventDefault(); 
	  	}else{ // IE8-:
	    	e.returnValue = false;
		}
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
						message = "Fields should contain only letters and numbers.";
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
						positions.matrix = t.matrix;
						positions.data = t.data;
						positions.is_it_a_first_move = t.is_it_a_first_move;
						positions.current_side = t.current_side;
						positions.current_move = t.current_move;
						positions.name = t.name;
						positions.password = t.password;
						var chatBox = new MessageBox();
						var onsubmit = function(message){
							var game = positions.name;
							console.log('Submit', id, game);
							chat.chat_publish(id, game, message);
						};
						chatBox.submit(onsubmit);
						if(t.password_player2 !== undefined){
							var message = 'player 2 password: ' + t.password_player2;
							chatBox.push(message);
						}
						document.querySelector('.container-fluid ').style.display = 'block';
						document.querySelector('.modal').style.display = 'none';
						positions.subscribe();
						//positions.set_updates(updates);
						positions.render();
						positions.set_possible_moves();
						var id = Math.random().toString().split('.')[1].slice(0, 3).toString();
						document.addEventListener("load", chat.chat_subscribe(id, positions.name));
					}catch(e){
						console.log(e);
					}	
				}
			}
		}.apply(this));

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
					message = data.message !== undefined ? data.message : '';
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

//////// message bar constructor //////////

var MessageBox = (function(){
	var MessageBox = function(){
		this.box = document.querySelector('#message-box');
		var node = function(){
			var block = document.createElement('div');
			block.className = "message-block";
			var object = {};
			object.block = block;
			object.other = function(){
				object.block.className += ' other-message';
				return object.block;
			}
			object.you = function(){
				object.block.className += ' your-message';
				return object.block;
			}
			object.default = function(){
				return object.block;
			}
			return object;
		};
		this.push = function(message, whose){
			message = message.replace(/\r|\n/g, '<br/>');
			var node_to_push = undefined;
			var scrollTop = this.box.scrollTop;
			var scrollHeight = this.box.scrollHeight;
			switch(whose){
				case 'you':
					node_to_push = node().you();
					break;
				case 'other':
					node_to_push = node().other();
					break;
				default:
					node_to_push = node().default();
					break;
			}
			console.log('NODE', node_to_push);
			node_to_push.innerHTML = message;
			this.box.appendChild(node_to_push);
			if(scrollTop !== scrollHeight){
				this.box.scrollTop = scrollHeight;
			}
		};
		this.init = function(){
			var textarea = document.querySelector("#message-textarea");
			textarea.addEventListener('keydown', function(e){
				if(e.keyCode === 13){
					e = e || window.e;
					if (e.preventDefault) { 
				    	e.preventDefault(); 
				  	}else{ // IE8-:
				    	e.returnValue = false;
					}
					if(e.shiftKey){
						textarea.value += '\r\n';
						return;
					}
					var event_gen = new Event('submit');
					textarea.parentNode.dispatchEvent(event_gen);
					textarea.value = '';
				}
			});
		};
		this.submit = function(onsubmit){
			var form = document.querySelector(".chat-form");
			form.addEventListener('submit', (function(){
				return function(e){
					e = e || window.e;
					if (e.preventDefault) { 
				    	e.preventDefault(); 
				  	}else{ // IE8-:
				    	e.returnValue = false;
					}
					var message = document.querySelector('#message-textarea').value;
					if(message !== ''){
						onsubmit(message);
						this.querySelector('textarea').value = '';		
					}
				}
			}()));
		};
	}
	new MessageBox().init();
	return MessageBox;
}());

(function(){
	window.addEventListener('resize', function(){
		if(document.documentElement.clientWidth <= 510){
			var cells = document.querySelectorAll('.board__cell');
			cells.forEach(function(cell){
				var style = getComputedStyle(cell);
				cell.style.height = style.width;
			});
		}
	}, false);
}());