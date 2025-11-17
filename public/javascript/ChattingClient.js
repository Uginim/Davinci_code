/*
다빈치 코드 - WebSocket 채팅 클라이언트
Ktor WebSocket 서버와 통신
*/

var chatClient = (function() {
    var socket = null;
    var userId = null;
    var roomList = null;
    var roomInfo = null;
    var chatWindows = null;
    var messageHandlers = {};

    // WebSocket 연결
    function connect() {
        var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        var wsUrl = protocol + '//' + window.location.host + '/ws';

        socket = new WebSocket(wsUrl);

        socket.onopen = function() {
            console.log('WebSocket connected');
        };

        socket.onmessage = function(event) {
            try {
                var message = JSON.parse(event.data);
                console.log('Received:', message);

                var type = message.type;
                var data = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;

                if (messageHandlers[type]) {
                    messageHandlers[type](data);
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };

        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };

        socket.onclose = function() {
            console.log('WebSocket disconnected');
            // 재연결 시도
            setTimeout(connect, 3000);
        };
    }

    // 메시지 전송
    function sendMessage(type, data) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            var message = {
                type: type
            };
            // 데이터를 message 객체에 직접 병합
            for (var key in data) {
                message[key] = data[key];
            }
            socket.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    // 메시지 핸들러 등록
    function on(type, handler) {
        messageHandlers[type] = handler;
    }

    // 초기화
    chatWindows = document.getElementById('chatWindows');

    // 방 목록 수신
    on('roomList', function(data) {
        console.log('Room list:', data);
        var roomListElement = document.getElementById("roomList");
        var list = data.roomList;
        roomList = list;
        roomListElement.innerHTML = '';

        for (var i = 0; i < list.length; i++) {
            var roomItem = document.createElement('div');
            roomItem.innerHTML = list[i].roomName + " " + list[i].members.length + "/" + list[i].maxNumOfMembers;
            roomItem.id = list[i].roomId;
            roomListElement.appendChild(roomItem);
        }
    });

    // 방 생성 응답
    on('resCreatingRoom', function(data) {
        roomInfo = data.roomInfo;
        console.log('Room created:', data);
        if (typeof gameClient !== 'undefined') {
            gameClient.setRoomInfo(roomInfo);
        }
    });

    // 방 입장 응답
    on('resEnteringARoom', function(data) {
        roomInfo = data.roomInfo;
        console.log('Entered room:', data);
        if (typeof gameClient !== 'undefined') {
            gameClient.setRoomInfo(roomInfo);
        }
    });

    // 방 퇴실 응답
    on('resLeavingARoom', function(data) {
        console.log('Left room:', data);
    });

    // 사용자 등록 응답
    on('resRegisterUser', function(data) {
        console.log('User registered:', data);
        userId = data.userId;
        document.getElementById("userName").disabled = true;
        document.getElementById("registerUserBtn").disabled = true;
        if (typeof gameClient !== 'undefined') {
            gameClient.setUserId(userId);
        }
    });

    // 채팅 메시지 수신
    on('chatMsg', function(data) {
        console.log('Chat message:', data);
        if (chatWindows) {
            chatWindows.append(data.msg);
            chatWindows.append(document.createElement('br'));
            // 스크롤을 아래로
            chatWindows.scrollTop = chatWindows.scrollHeight;
        }
    });

    // 공개 API
    return {
        connect: connect,
        sendReqMsg: sendMessage,
        on: on,
        getUserId: function() { return userId; },
        getRoomInfo: function() { return roomInfo; },
        get socket() { return { on: on }; } // 호환성을 위해
    };
})();

// WebSocket 연결
chatClient.connect();

// 사용자 등록 버튼
var registerUserBtn = document.getElementById("registerUserBtn");
registerUserBtn.addEventListener("click", function(e) {
    chatClient.sendReqMsg('reqRegisterUser', {
        name: document.getElementById("userName").value
    });
});

// 방 목록 새로고침 버튼
var refreshRoomListBtn = document.getElementById("refreshRoomList");
refreshRoomListBtn.addEventListener("click", function(e) {
    chatClient.sendReqMsg('reqRoomList', {});
});

// 방 생성 버튼
var makeARoomBtn = document.getElementById("makeARoomBtn");
makeARoomBtn.addEventListener("click", function(e) {
    chatClient.sendReqMsg('reqCreatingRoom', {
        userId: chatClient.getUserId(),
        roomName: document.getElementById("roomName").value
    });
});

// 방 선택 (이벤트 위임)
var roomList = document.getElementById("roomList");
roomList.addEventListener("click", function(e) {
    var target = e.target || e.srcElement;
    if (target.id) {
        chatClient.sendReqMsg('reqEnteringARoom', {
            userId: chatClient.getUserId(),
            roomId: target.id
        });
    }
});

// 방 나가기 버튼
var exitRoomBtn = document.getElementById("exitRoomBtn");
if (exitRoomBtn) {
    exitRoomBtn.addEventListener("click", function(e) {
        var roomInfo = chatClient.getRoomInfo();
        if (roomInfo) {
            chatClient.sendReqMsg('reqLeavingARoom', {
                userId: chatClient.getUserId(),
                roomId: roomInfo.roomId
            });
        }
    });
}

// 채팅 전송 버튼
var submitButton = document.getElementById("submitButton");
submitButton.addEventListener("click", function(e) {
    var roomInfo = chatClient.getRoomInfo();
    if (roomInfo) {
        chatClient.sendReqMsg('reqSendMessage', {
            userId: chatClient.getUserId(),
            roomId: roomInfo.roomId,
            msg: document.getElementById("chatMessage").value
        });
        document.getElementById("chatMessage").value = "";
    }
});

// 엔터 키로 채팅 전송
var chatMessage = document.getElementById("chatMessage");
if (chatMessage) {
    chatMessage.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            submitButton.click();
        }
    });
}
