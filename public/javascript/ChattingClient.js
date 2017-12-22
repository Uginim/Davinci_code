/*

클라이언트 시나리오

접속
1.접속(세션 처음 or 로그인)
2.방목록 요청

방입장
1.방 목록 중 1선택
2.입장 요청
3.입장

채팅
	-채팅메시지 입력
		1.사용자가 전송 
		2.입력된 텍스트 서버 전송
	-채팅메시지 수신
		1.서버측으로 부터 메시지 수신
		2.메시지 갱신

게임 시작
	1.방장권한 유저가 게임시작 버튼 클릭
		-방장권한 유저만 시작 버튼을 가지고 있음
	2.서버로 게임 시작 요청
	3.서버응답
		-게임 가능 인원(혹은 상태)이면 게임시작 메시지 수신
		-불가능할 경우 서버로 부터 메시지 수신

*/
var chatClient = (function (){
	var socket = io.connect();
	//roomlist 요청
	socket.emit('requestRoomList',{});
	socket.on('roomList',(data)=>{
		console.log(data);
		//roomlist갱신
	});
	//생성
	//request 생성
	socket.emit('reqCreatingRoom',{room:roomId});
	//생성 응답
	socket.on('resCreatingRoom',(data)=>{
		
	});
	//입장
	//request 입장
	//user정보,room정보
	socket.emit('reqEnteringARoom',{room:roomId});
	//방 입장 응답
	socket.on('resEnteringARoom',(data)=>{
		
	});
	//퇴실
	//user정보,room정보
	socket.emit('reqLeavingARoom',{room:roomId})
	//방 퇴실 응답
	socket.on('resLeavingARoom',(data)=>{
		
	});
	
	
	//채팅
	//입실한 모든 요청 중에 상태인지 확인!
	//request Sending Message
	//채팅 보내진거 response필요한가..(전송확인 필요한듯??)
	//response 
	
	//새 메시지 수신..
	
})();