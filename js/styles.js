document.querySelector('.chess-game').addEventListener("submit", function(e){
  	
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
			if(this.responseText === 'data-error'){
				var message = "Fields should contain only letters and numbers";
				alert(message);
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
					if(t.password_player2 !== undefined){
						document.querySelector('.info-box').innerHTML += 'player 2 password:\n' + t.password_player2;
					}
					document.querySelector('.container').style.display = 'block';
					document.querySelector('.modal').style.display = 'none';
					positions.subscribe();
					//positions.set_updates(updates);
					positions.render();
					positions.set_possible_moves();
				}catch(e){
					console.log(e);
				}	
			}
		}
	}.apply(this));

}, false);