
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');
var userManager = require('./gameplatform/user_manager').user_manager,
	roomManager = require('./gameplatform/room_manager').room_manager,
	gameManager = require('./gameplatform/game_manager').game_manager;

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
var server = http.createServer(app);

//
//var chattingServer = require('./gameplatform/chatting_server');
//console.log(chattingServer);
//chattingServer(io);
/*
 Messages:	
		reqRoomList
		reqCreatingRoom
		reqEnteringARoom
		reqLeavingARoom
		reqRegisterUser
		reqLoginUser
		reqSendMessage
 */
//http.createServer(app).listen(app.get('port'), function(){
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
var io = require('socket.io')(server);
//
io.on('connection',function(socket){
//	console.log("a socket connected",socket);
	console.log("a socket connected");
	//user 등록
	socket.on('reqRegisterUser',function(data){
		var userId;		
		userId=userManager.createUser(data.name);		
//		io.send('resRegisterUser',{msg:'creating_user_success',	userId:userId});
		socket.emit('resRegisterUser',{msg:'creating_user_success',	userId:userId});
	});
	//방목록 조회
	socket.on('reqRoomList',function(data){
		var user;
		console.log("roomlist");
		socket.emit('roomList',{msg:'',
			roomList:roomManager.getRoomList()});	
		
	});
	//방 생성
	socket.on('reqCreatingRoom',function(data){
		var user,roomInfo;
		user = userManager.getUser(data.userId);
		roomInfo = roomManager.createRoom(data.roomName,user,4);
		socket.emit('resCreatingRoom',{msg:'creating_room_success',roomInfo:roomInfo});	
		socket.join(roomInfo.roomId);
		socket.emit('roomlist',{msg:'',
			roomList:roomManager.getRoomList()});
		io.to(roomInfo.roomId).emit('chatMsg',{msg:'[room : '+data.roomName+']room was created'});
		console.log("response");
	});
	//방입장//join
	socket.on('reqEnteringARoom',function(data){
		var user,roomInfo;
		console.log('Enter Room',data);
		user = userManager.getUser(data.userId);
		socket.join(data.roomId);
		roomManager.putUserInRoom(data.roomId,user);
		roomInfo=roomManager.getRoom(data.roomId);
		//userManager.createUser(data.name);
		//입장한 방 이름 필요
		socket.emit('resEnteringARoom',{msg:'join_room_success',roomInfo:roomInfo});		
		//io.to(data.roomId).emit('chatMsg',{msg:user.getUserName()+' entered'});
		io.to(data.roomId).emit('chatMsg',{msg:user.getUserName()+' entered'});
	});
	//방퇴실
	socket.on('reqLeavingARoom',function(data){
		var user;
		
		user = userManager.getUser(data.userId);
		roomManager.letUserGoOutOfRoom(data.roomId,user);
		io.to(data.roomId).emit('chatMsg',{msg:user.getUserName()+' left'});
		socket.leave(data.roomId);
		//userManager.createUser(data.name);
		
		socket.emit('roomlist',{type:'creating_room_success',
			roomList:roomManager.getRoomList()});	
		
	});
	//메시지 전송
	socket.on('reqSendMessage',function(data){
		var user;
		user = userManager.getUser(data.userId);
		io.to(data.roomId).emit('chatMsg',{msg:'['+user.userName+']: '+data.msg});
		socket.emit('roomlist',{type:'sending message success'});
		console.log('roomId:',data.roomId,data)
	});

	// 게임 시작
	socket.on('reqStartGame', function(data) {
		var room = roomManager.getRoom(data.roomId);
		if (!room) {
			socket.emit('resStartGame', {success: false, message: 'Room not found'});
			return;
		}

		// 게임 생성
		var result = gameManager.createGame(data.roomId, room.getMembers());
		if (!result.success) {
			socket.emit('resStartGame', result);
			return;
		}

		// 게임 시작
		var startResult = gameManager.startGame(data.roomId);
		if (startResult.success) {
			room.gameStatus = 'playing';

			// 모든 플레이어에게 게임 시작 알림
			io.to(data.roomId).emit('gameStarted', {
				message: 'Game started!',
				currentPlayer: startResult.currentPlayer
			});

			// 각 플레이어에게 개별 게임 상태 전송
			var game = gameManager.getGame(data.roomId);
			room.getMembers().forEach(function(member) {
				var gameState = game.getGameState(member.userId);
				io.to(data.roomId).emit('gameState', gameState);
			});
		}

		socket.emit('resStartGame', startResult);
	});

	// 타일 뽑기
	socket.on('reqDrawTile', function(data) {
		var game = gameManager.getGame(data.roomId);
		if (!game) {
			socket.emit('resDrawTile', {success: false, message: 'Game not found'});
			return;
		}

		var result = game.drawTile(data.userId, data.fromRevealed || false);

		if (result.success) {
			// 타일을 뽑은 플레이어에게만 타일 정보 전송
			socket.emit('resDrawTile', result);

			// 다른 플레이어들에게는 타일을 뽑았다는 알림만 전송
			socket.to(data.roomId).emit('playerDrewTile', {
				userId: data.userId,
				fromRevealed: data.fromRevealed || false
			});

			// 모든 플레이어에게 업데이트된 게임 상태 전송
			var gameState = game.getGameState(data.userId);
			io.to(data.roomId).emit('gameStateUpdate', gameState);
		} else {
			socket.emit('resDrawTile', result);
		}
	});

	// 숫자 추리
	socket.on('reqGuess', function(data) {
		var game = gameManager.getGame(data.roomId);
		if (!game) {
			socket.emit('resGuess', {success: false, message: 'Game not found'});
			return;
		}

		var result = game.guess(data.userId, data.targetUserId, data.tileIndex, data.guessedNumber);

		if (result.success) {
			// 추리 결과를 방의 모든 사람에게 전송
			io.to(data.roomId).emit('guessResult', {
				guesserId: data.userId,
				targetUserId: data.targetUserId,
				tileIndex: data.tileIndex,
				guessedNumber: data.guessedNumber,
				correct: result.correct,
				tile: result.tile,
				penaltyTile: result.penaltyTile,
				targetEliminated: result.targetEliminated,
				guesserEliminated: result.guesserEliminated,
				message: result.message
			});

			// 업데이트된 게임 상태 전송
			var gameState = game.getGameState(data.userId);
			io.to(data.roomId).emit('gameStateUpdate', gameState);

			// 게임이 끝났는지 확인
			if (gameState.gameStatus === 'ended') {
				io.to(data.roomId).emit('gameEnded', {
					winner: gameState.winner,
					message: 'Game Over!'
				});
			}
		}

		socket.emit('resGuess', result);
	});

	// 턴 종료
	socket.on('reqEndTurn', function(data) {
		var game = gameManager.getGame(data.roomId);
		if (!game) {
			socket.emit('resEndTurn', {success: false, message: 'Game not found'});
			return;
		}

		var result = game.endTurn(data.userId);

		if (result.success) {
			// 턴이 바뀌었음을 모두에게 알림
			io.to(data.roomId).emit('turnChanged', {
				currentPlayer: result.currentPlayer,
				message: 'Turn changed'
			});

			// 업데이트된 게임 상태 전송
			var gameState = game.getGameState(data.userId);
			io.to(data.roomId).emit('gameStateUpdate', gameState);
		}

		socket.emit('resEndTurn', result);
	});

	// 게임 상태 조회
	socket.on('reqGameState', function(data) {
		var game = gameManager.getGame(data.roomId);
		if (!game) {
			socket.emit('resGameState', {success: false, message: 'Game not found'});
			return;
		}

		var gameState = game.getGameState(data.userId);
		socket.emit('resGameState', {success: true, gameState: gameState});
	});

});

