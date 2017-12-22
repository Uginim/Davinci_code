
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');
var userManager = require('./gameplatform/user_manager').user_manager,
	roomManager = require('./gameplatform/room_manager').room_manager;

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
var io = require('socket.io')(server);
io.on('connection',function(socket){
	console.log("a user connected");
	socket.on('register_user',function(data){
		var userId;
		console.log("name:"+data.name);		
		userId=userManager.createUser(data.name);		
		io.emit('myresponse',{type:'creating_user_success',
			userId:userId});
		console.log("response");
	});
	socket.on('register_room',function(data){
		var user;
		//console.log("name:"+data.roomName);
		//console.log("userId:"+data.userId);
		//console.log("roomManager:"+Object.keys(roomManager));
		user = userManager.getUser(data.userId);
		roomManager.createRoom(data.roomName,user,4);
		//userManager.createUser(data.name);
		
		io.emit('roomlist',{type:'creating_room_success',
			roomList:roomManager.getRoomList()});	
		console.log("response");
	});
});
//http.createServer(app).listen(app.get('port'), function(){
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
