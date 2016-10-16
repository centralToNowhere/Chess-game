
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
			var time = new Date(), 
				time_block = document.createElement('div');
			time = time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
			time_block.className = "time_block";
			time_block.innerHTML = time;
			node_to_push.innerHTML = message;
			node_to_push.appendChild(time_block);
			this.box.appendChild(node_to_push);
			if(scrollTop !== scrollHeight){
				this.box.scrollTop = scrollHeight;
			}
		};
		this.init = function(){
			var textarea = document.querySelector("#message-textarea");
			var form = document.querySelector(".chat-form");
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
					var event_gen = new Event('submit', {cancelable: true});
					textarea.parentNode.dispatchEvent(event_gen);
					textarea.value = '';
				}
			});
			/// #message-box + .chat-form should be equal to document.documentElement.clientHeight
			var clientH = document.documentElement.clientHeight;
			if(this.box.offsetHeight + form.offsetHeight < clientH){
				console.log('LESS', clientH, this.box.offsetHeight, form.offsetHeight);
				// add height to chat form
				form.style.height = clientH - this.box.offsetHeight + 'px'; 
			}
		};
		this.submit = function(onsubmit){
			var form = document.querySelector(".chat-form");
			form.addEventListener('submit', (function(){
				return function(e){
					e = e || window.e;
					if (e.preventDefault) { 
						console.log('last');
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