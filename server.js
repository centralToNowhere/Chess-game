var http = require('http');
var fs = require('fs');
var url = require('url');
var md5 = require('js-md5');
var chokidar = require('graceful-chokidar');
const DATA = "/data.json";

http.createServer(function(req, res) {
    var urlParsed = url.parse(req.url);
    req.setEncoding('utf8');
    switch (urlParsed.pathname) {
        case '/':
            sendFile("/index.html", res);
            break;
        case '/auth':
            var data = '';

            req
                .on('readable', function(){
                    data = onReadable(data, req, res);
                })
                .on('end', function() {
                    try {
                        auth_validate(data, res);
                    } catch (e) {
                        console.log(e);
                        res.statusCode = 400;
                        res.end("Bad Request");
                        return;
                    }
                    //res.end("ok");
                });

            break;

        case '/subscribe':
            console.log('subscribe');
            chess.subscribe(req, res);
            break;

        case '/publish':
            console.log('publish');
            var data = '';

            req
                .on('readable', function(){
                    data = onReadable(data, req, res);
                })
                .on('end', function() {
                    try {
                        chess.publish(data);
                    } catch (e) {
                        res.statusCode = 400;
                        res.end("Bad Request");
                        return;
                    }
                    res.end("ok");
                });

      break;

    default:
        if(urlParsed.pathname.match(/\/css\/+./) || 
            urlParsed.pathname.match(/\/js\/+./) || 
            urlParsed.pathname.match(/\/images\/+./)){

            sendFile(urlParsed.pathname, res);

        }else{
            res.statusCode = 404;
            res.end("Not found");
        }
    }
}).listen(3000);


// setInterval((function(){

//     var t = [undefined, 0];

//     return function(){
//         //console.log(t);
//         scanActiveGame(t[0]);
//         deleteGame(t[1], t[0]);
//     }

// })(), 1000); // 15 min
scanActiveGame();

function scanActiveGame(games_old){
    if(games_old == undefined){
        games_old = '';
    }
    var games = '';
    var global = '';
    var save = [];
    var readStream = fs.createReadStream(__dirname + DATA);
    readStream
        .on('readable', function(){
            games = onReadable(games, readStream);
        })
        .on('end', function() {
            try{
                var parsed = JSON.parse(games);
            }catch(e){
                console.log('data.json is empty. No active games found.');
                var watcher = chokidar.watch(__dirname + DATA, {persistent: true});
                watcher
                    .on('change', function(){
                        console.log('changed');
                        watcher.close();
                        scanActiveGame();
                    });
                return;
            }     
            for(var name in parsed){
                if(games_old[name]){
                    for(var j = 0;j < 8; j++){
                        for(var k = 0;k < 8; k++){
                            if(parsed[name].matrix[j][k] === games_old[name].matrix[j][k]){
                                continue;
                            }else{
                                j, k = 8;
                                save.push(name);
                            }
                        }                
                    }
                }
            }
            setTimeout((function(){
                var games_old = parsed;
                var to_save = save;
                return function(){
                    //console.log(to_save);
                    scanActiveGame(games_old);
                    deleteGame(to_save, games_old);
                }; 
            })(), 900000);

        });
};

function deleteGame(save, games_old){
    for(var i in games_old){
        //console.log(i, save.indexOf(i));
        if(save.indexOf(i) === -1){
            delete games_old[i];
        }
    }
    var writeStream = fs.createWriteStream(__dirname + DATA);
    writeStream.write(JSON.stringify(games_old));
}

function sendFile(fileName, res) {
    var fileStream = fs.createReadStream(__dirname + fileName);
    fileStream
        .on('error', function() {
        res.statusCode = 500;
        res.end('Server error');
    })
    .pipe(res)
    .on('close', function() {
        fileStream.destroy();
    });
}

function onReadable(data, req, res){
    var chunk = req.read();
    if(chunk !== null){
        data += chunk;
        //console.log('data.length:', data.length);
        if (data.length > 1e4 && res !== undefined){
            res.statusCode = 413;
            res.end("Not enought memory");
        }
    }
    return data;
}

function auth_validate(data, res){
    var data = JSON.parse(data);
    var file = '';
    if(data.name.match(/^[A-Za-z0-9]{3,8}$/) && data.password.match(/^[A-Za-z0-9]{3,6}$/)){
        var readStream = fs.createReadStream(__dirname + DATA);
        readStream
            .on('error', function() {
                res.statusCode = 500;
                res.end('Server error');
            })
            .on('readable', function(){
                file = onReadable(file, readStream);
            })
            .on('close', function(){
                var games = JSON.parse(file);
                if(games[data.name] !== undefined){
                    if(md5(data.password) === games[data.name][0].password
                        || md5(data.password) === games[data.name][1].password){

                        console.log('authorized');

                        if(md5(data.password) === games[data.name][0].password){
                            var updates1 = {
                                data: games[data.name].data,
                                matrix: games[data.name].matrix,
                                is_it_a_first_move: games[data.name].is_it_a_first_move,
                                current_side: games[data.name][0].current_side,
                                current_move: games[data.name][0].current_move,
                                name: games[data.name][0].name,
                                password: data.password,
                            };
                            
                            res.end(JSON.stringify(updates1));
                        }else{
                            var updates2 = {
                                data: games[data.name].data,
                                matrix: games[data.name].matrix,
                                is_it_a_first_move: games[data.name].is_it_a_first_move,
                                current_side: games[data.name][1].current_side,
                                current_move: games[data.name][1].current_move,
                                name: games[data.name][1].name,
                                password: data.password,
                            };
                            
                            res.end(JSON.stringify(updates2));
                        }
                    }else{

                        console.log('unauthorized');

                        res.statusCode = 401;
                        res.end('Unauthorized');
                    }
                }else{
                    games[data.name] = new game();
                    games[data.name][0] = {};
                    games[data.name][0].name = data.name;
                    games[data.name][0].password = md5(data.password);
                    games[data.name][0].current_side = 'white';
                    games[data.name][0].current_move = true;

                    var number_of_chars = Math.round(3 + Math.random() * 3);
                    var password_player2 = '';
                    for(var i = 0; i < number_of_chars; i++){
                        password_player2 +=  Math.round(Math.random() * 9);
                    }

                    games[data.name][1] = {};
                    games[data.name][1].name = data.name;
                    games[data.name][1].password = md5(password_player2);
                    games[data.name][1].current_side = 'black';
                    games[data.name][1].current_move = false;

                    var updates1 = {
                        data: games[data.name].data,
                        matrix: games[data.name].matrix,
                        is_it_a_first_move: games[data.name].is_it_a_first_move,
                        current_side: games[data.name][0].current_side,
                        current_move: games[data.name][0].current_move,
                        name: games[data.name][0].name,
                        password: data.password,
                        password_player2: password_player2
                    };

                    var writeStream = fs.createWriteStream(__dirname + DATA);
                    writeStream.write(JSON.stringify(games));
                    res.end(JSON.stringify(updates1));
                }
                readStream.destroy();
            });
    }else{
        console.log('bad,', data.name, data.password);
        res.end("data-error");
    }
}

var chess = {

    clients: [],

    persist_data: function(j, k, transform, l, m){
        if(transform !== undefined){
            this.matrix[j][k] = transform;
        }else{
            this.matrix[l][m] = this.matrix[j][k];
        }
    },

    delete_data: function(j, k){
        this.matrix[j][k] = null;
    },

    publish: function (updates){
        updates = JSON.parse(updates);
        var games = '';
        var readStream = fs.createReadStream(__dirname + DATA);
        readStream
            .on('error', function() {
                return;
            })
            .on('readable', function(){
                games = onReadable(games, readStream);
            })
            .on('close', function(){
                    // try{
                        var parsed = JSON.parse(games);
                        var buffer = [];
                        if(parsed[updates.name] !== undefined){
                            if(parsed[updates.name][0].password === md5(updates.password) ||
                            parsed[updates.name][1].password === md5(updates.password)){
                                var id = parsed[updates.name][0].password === md5(updates.password) ? 0 : 1;
                                if(updates.current_side === parsed[updates.name][id].current_side){
                                    for(var i in updates){
                                        if(i.match(/^\d_\d$/)){
                                            var j = i.split('_')[0] - 0;
                                            var k = i.split('_')[1] - 0;
                                            if(typeof updates[i] == 'string'){
                                                var transform = updates[i];
                                            }else{
                                                var l = updates[i][0];
                                                var m = updates[i][1];
                                            }
                                            var figure = parsed[updates.name].matrix[j][k].split('_')[0];
                                            var figure_original = parsed[updates.name].matrix[j][k];
                                            figure = figure[figure.length-1].match( /[0-9]/) != null ? figure.substr(0, figure.length-1) : figure;
                                            if(figure.match( /pawn/) != null ){
                                                figure = figure + '_' + parsed[updates.name].matrix[j][k].split('_')[1];
                                            }
                                            var object = {
                                                current_side: parsed[updates.name][id].current_side,
                                                matrix: parsed[updates.name].matrix,
                                                data: parsed[updates.name].data,
                                                is_it_a_first_move: parsed[updates.name].is_it_a_first_move,
                                            }
                                            var res = chess.get_moves(chess.moves[figure](), j, k, object);


                                            //matrix update


                                            if(transform !== undefined){  
                                                if(figure === 'pawn_' + parsed[updates.name][id].current_side ){
                                                    if(parsed[updates.name][id].current_side === 'white'){
                                                        if(j === 0){
                                                            chess.persist_data.call(parsed[updates.name], j, k, transform);
                                                        }
                                                    }else{
                                                        if(j === 7){
                                                            chess.persist_data.call(parsed[updates.name], j, k, transform);
                                                        }
                                                    }
                                                }                                          
                                            }else{
                                                for(var o in res.possible_cells){
                                                    if(res.possible_cells[o][0] === l && res.possible_cells[o][1] === m)
                                                        chess.persist_data.call(parsed[updates.name], j, k, undefined, l, m);
                                                }
                                                for(var o in res.possible_attacks){
                                                    if(res.possible_attacks[o][0] === l && res.possible_attacks[o][1] === m)
                                                        chess.persist_data.call(parsed[updates.name], j, k, undefined, l, m);
                                                }
                                            }
                                            if(updates.deleted !== undefined){
                                                for(var o in updates.deleted){
                                                    if( l !== undefined && m !== undefined){
                                                        if(updates.deleted[o][0] === l && updates.deleted[o][1] === m){
                                                            chess.delete_data.call(parsed[updates.name], l, m);
                                                        }
                                                    }
                                                    if(updates.deleted[o][0] === j && updates.deleted[o][1] === k){
                                                        chess.delete_data.call(parsed[updates.name], j, k);
                                                    }
                                                }


                                                // code for taking a pass delete 
                                                // not yet
                                                //

                                            }


                                            //is_it_a_first_move update


                                            if(updates.is_it_a_first_move !== undefined){
                                                for(var e in updates.is_it_a_first_move){
                                                    if(figure_original === e){
                                                        parsed[updates.name].is_it_a_first_move[e] = false;
                                                        updates.is_it_a_first_move[e] = false;
                                                    }
                                                }
                                            }
                                        }

                                    }
                                                 
                                }
                                
                            }
                        }


                        // current_move update


                        var current_move = {
                            white: '',
                            black: ''
                        };

                        parsed[updates.name][0].current_move = id === 0 ? false : true;
                        current_move.white = parsed[updates.name][0].current_move;
                        parsed[updates.name][1].current_move = id === 0 ? true : false;
                        current_move.black = parsed[updates.name][1].current_move;


                        
                        //parsed to data.json

                        var writeStream = fs.createWriteStream(__dirname + DATA);
                        writeStream.write(JSON.stringify(parsed));
                        
                        updates.current_move = current_move;
                        delete updates.password;
                        delete updates.current_side;

                        updates = JSON.stringify(updates);
                        chess.clients.forEach(function(res){
                            res.end(updates);
                        });
                        chess.clients = [];
                    // }catch(e){
                    //     console.log('Can\'t parse data.json', e);
                    // }
            })
    },

    subscribe: function(req, res){
        this.clients.push(res);
        var object = this;
        res.on('close', function(){
                object.clients.splice(object.clients.indexOf(res), 1);
            });
        //setTimeout(function(){req.destroy()}, 5000);
        console.log(chess.clients.length);
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
                if(coordinates[0] + moves.vectors[i][0] < 8 && coordinates[1] + moves.vectors[i][1] < 8 && coordinates[1] + moves.vectors[i][1] >= 0 && coordinates[0] + moves.vectors[i][0] >= 0){
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
        }
        var moves = {
                possible_cells: possible_cells,
                possible_attacks: possible_attacks
            };
        return moves;
    },
    moves: {

        king: function(){

            // moves 
            // [[ possiple directions from figure position]][distance]
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
    }
};



function game(){

    this.data = {

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

    this.matrix = [ [ 'rook1_black',
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
      [ null, null, null, null, null, null, null, null ],
      [ null, null, null, null, null, null, null, null ],
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
    this.is_it_a_first_move = {
        rook1_white: true,
        rook2_white: true,
        rook1_black: true,
        rook2_black: true,
        king_white: true,
        king_black: true
    }
};