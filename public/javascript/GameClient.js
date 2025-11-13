/**
 * Da Vinci Code Game Client
 * 프론트엔드 게임 로직 및 UI 컨트롤
 */

var gameClient = (function() {
    var socket = io.connect();
    var userId = null;
    var roomInfo = null;
    var gameState = null;
    var selectedTile = null;

    // DOM 요소들
    var elements = {
        gameBoard: null,
        playerArea: null,
        opponentArea: null,
        startGameBtn: null,
        drawTileBtn: null,
        endTurnBtn: null,
        guessNumberInput: null,
        submitGuessBtn: null,
        gameStatus: null,
        currentTurnDisplay: null
    };

    // 초기화
    function init(existingSocket, existingUserId, existingRoomInfo) {
        if (existingSocket) socket = existingSocket;
        userId = existingUserId;
        roomInfo = existingRoomInfo;

        // DOM 요소 참조
        elements.gameBoard = document.getElementById('gameBoard');
        elements.playerArea = document.getElementById('playerArea');
        elements.opponentArea = document.getElementById('opponentArea');
        elements.startGameBtn = document.getElementById('startGameBtn');
        elements.drawTileBtn = document.getElementById('drawTileBtn');
        elements.endTurnBtn = document.getElementById('endTurnBtn');
        elements.guessNumberInput = document.getElementById('guessNumberInput');
        elements.submitGuessBtn = document.getElementById('submitGuessBtn');
        elements.gameStatus = document.getElementById('gameStatus');
        elements.currentTurnDisplay = document.getElementById('currentTurnDisplay');

        setupEventListeners();
        setupSocketListeners();

        console.log('Game client initialized');
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        if (elements.startGameBtn) {
            elements.startGameBtn.addEventListener('click', startGame);
        }

        if (elements.drawTileBtn) {
            elements.drawTileBtn.addEventListener('click', drawTile);
        }

        if (elements.endTurnBtn) {
            elements.endTurnBtn.addEventListener('click', endTurn);
        }

        if (elements.submitGuessBtn) {
            elements.submitGuessBtn.addEventListener('click', submitGuess);
        }
    }

    // 소켓 이벤트 리스너 설정
    function setupSocketListeners() {
        // 게임 시작됨
        socket.on('gameStarted', function(data) {
            console.log('Game started!', data);
            updateGameStatus('게임이 시작되었습니다!');
            if (elements.startGameBtn) {
                elements.startGameBtn.style.display = 'none';
            }
        });

        // 게임 상태 업데이트
        socket.on('gameState', function(data) {
            console.log('Game state received:', data);
            gameState = data;
            renderGameState();
        });

        socket.on('gameStateUpdate', function(data) {
            console.log('Game state updated:', data);
            gameState = data;
            renderGameState();
        });

        // 타일 뽑기 응답
        socket.on('resDrawTile', function(data) {
            if (data.success) {
                console.log('Drew tile:', data.tile);
                updateGameStatus('타일을 뽑았습니다: ' + data.tile.color + ' ' + data.tile.number);
            } else {
                alert(data.message);
            }
        });

        // 다른 플레이어가 타일을 뽑음
        socket.on('playerDrewTile', function(data) {
            console.log('Player drew tile:', data.userId);
            updateGameStatus('플레이어가 타일을 뽑았습니다');
        });

        // 추리 결과
        socket.on('guessResult', function(data) {
            console.log('Guess result:', data);
            var message = data.correct ?
                '정답! ' + data.tile.number + '을(를) 맞췄습니다!' :
                '오답! 실제 숫자는 ' + data.tile.number + '입니다.';

            updateGameStatus(message);
            selectedTile = null; // 선택 초기화
        });

        // 턴 변경
        socket.on('turnChanged', function(data) {
            console.log('Turn changed to:', data.currentPlayer);
            updateGameStatus('턴이 바뀌었습니다');
            renderGameState();
        });

        // 게임 종료
        socket.on('gameEnded', function(data) {
            console.log('Game ended:', data);
            var message = data.winner ?
                '게임 종료! 승자: ' + data.winner :
                '게임 종료!';

            updateGameStatus(message);
            alert(message);
        });
    }

    // 게임 시작
    function startGame() {
        if (!roomInfo) {
            alert('방에 입장해주세요');
            return;
        }

        socket.emit('reqStartGame', {
            roomId: roomInfo.roomId,
            userId: userId
        });
    }

    // 타일 뽑기
    function drawTile(fromRevealed) {
        if (!roomInfo) {
            alert('게임이 시작되지 않았습니다');
            return;
        }

        socket.emit('reqDrawTile', {
            roomId: roomInfo.roomId,
            userId: userId,
            fromRevealed: fromRevealed || false
        });
    }

    // 턴 종료
    function endTurn() {
        if (!roomInfo) {
            alert('게임이 시작되지 않았습니다');
            return;
        }

        socket.emit('reqEndTurn', {
            roomId: roomInfo.roomId,
            userId: userId
        });
    }

    // 추리 제출
    function submitGuess() {
        if (!selectedTile) {
            alert('타일을 먼저 선택해주세요');
            return;
        }

        var guessedNumber = parseInt(elements.guessNumberInput.value);
        if (isNaN(guessedNumber) || guessedNumber < 0 || guessedNumber > 11) {
            alert('0-11 사이의 숫자를 입력해주세요');
            return;
        }

        socket.emit('reqGuess', {
            roomId: roomInfo.roomId,
            userId: userId,
            targetUserId: selectedTile.userId,
            tileIndex: selectedTile.index,
            guessedNumber: guessedNumber
        });

        elements.guessNumberInput.value = '';
    }

    // 게임 상태 렌더링
    function renderGameState() {
        if (!gameState || !elements.gameBoard) {
            return;
        }

        // 현재 턴 표시
        var isMyTurn = gameState.currentPlayer === userId;
        if (elements.currentTurnDisplay) {
            var currentPlayerName = gameState.players[gameState.currentPlayer]?.userName || 'Unknown';
            elements.currentTurnDisplay.textContent = isMyTurn ?
                '당신의 턴입니다!' :
                currentPlayerName + '의 턴';
            elements.currentTurnDisplay.style.color = isMyTurn ? '#4CAF50' : '#FF9800';
        }

        // 버튼 활성화/비활성화
        if (elements.drawTileBtn) {
            elements.drawTileBtn.disabled = !isMyTurn;
        }
        if (elements.endTurnBtn) {
            elements.endTurnBtn.disabled = !isMyTurn;
        }
        if (elements.submitGuessBtn) {
            elements.submitGuessBtn.disabled = !isMyTurn || !selectedTile;
        }

        // 플레이어 영역 렌더링
        renderPlayerArea();
        renderOpponentAreas();

        // 덱 정보 표시
        updateGameStatus('남은 타일: ' + gameState.deckCount + '장');
    }

    // 내 타일 영역 렌더링
    function renderPlayerArea() {
        if (!elements.playerArea) return;

        var myPlayer = gameState.players[userId];
        if (!myPlayer) return;

        elements.playerArea.innerHTML = '<h3>내 타일</h3>';

        var tilesContainer = document.createElement('div');
        tilesContainer.className = 'tiles-container';

        myPlayer.tiles.forEach(function(tile, index) {
            var tileElement = createTileElement(tile, index, userId, true);
            tilesContainer.appendChild(tileElement);
        });

        elements.playerArea.appendChild(tilesContainer);
    }

    // 상대 타일 영역 렌더링
    function renderOpponentAreas() {
        if (!elements.opponentArea) return;

        elements.opponentArea.innerHTML = '<h3>상대방 타일</h3>';

        gameState.playerOrder.forEach(function(playerId) {
            if (playerId === userId) return; // 자신 제외

            var player = gameState.players[playerId];
            if (!player) return;

            var playerSection = document.createElement('div');
            playerSection.className = 'opponent-section';

            var playerHeader = document.createElement('h4');
            playerHeader.textContent = player.userName +
                (player.isEliminated ? ' (탈락)' : '');
            playerSection.appendChild(playerHeader);

            var tilesContainer = document.createElement('div');
            tilesContainer.className = 'tiles-container';

            player.tiles.forEach(function(tile, index) {
                var tileElement = createTileElement(tile, index, playerId, false);
                tilesContainer.appendChild(tileElement);
            });

            playerSection.appendChild(tilesContainer);
            elements.opponentArea.appendChild(playerSection);
        });
    }

    // 타일 요소 생성
    function createTileElement(tile, index, playerId, isOwn) {
        var tileDiv = document.createElement('div');
        tileDiv.className = 'tile ' + tile.color;

        if (tile.isRevealed) {
            tileDiv.classList.add('revealed');
            tileDiv.textContent = tile.number;
        } else {
            if (isOwn) {
                // 자신의 타일은 숫자 보임
                tileDiv.textContent = tile.number;
            } else {
                // 상대 타일은 숨김, 클릭 가능
                tileDiv.textContent = '?';
                tileDiv.classList.add('hidden');
                tileDiv.addEventListener('click', function() {
                    selectTile(playerId, index);
                });
            }
        }

        // 선택된 타일 표시
        if (selectedTile && selectedTile.userId === playerId &&
            selectedTile.index === index) {
            tileDiv.classList.add('selected');
        }

        return tileDiv;
    }

    // 타일 선택
    function selectTile(userId, index) {
        selectedTile = {
            userId: userId,
            index: index
        };

        renderGameState(); // 선택 표시를 위해 다시 렌더링
        updateGameStatus('타일이 선택되었습니다. 숫자를 입력하고 추리하세요.');
    }

    // 게임 상태 메시지 업데이트
    function updateGameStatus(message) {
        if (elements.gameStatus) {
            elements.gameStatus.textContent = message;
        }
        console.log('Status:', message);
    }

    // 공개 API
    return {
        init: init,
        startGame: startGame,
        drawTile: drawTile,
        endTurn: endTurn,
        submitGuess: submitGuess,
        setUserId: function(id) { userId = id; },
        setRoomInfo: function(info) { roomInfo = info; },
        getUserId: function() { return userId; },
        getRoomInfo: function() { return roomInfo; }
    };
})();

// 페이지 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', function() {
    // chatClient가 로드될 때까지 대기
    var initInterval = setInterval(function() {
        if (typeof chatClient !== 'undefined' && chatClient.socket) {
            gameClient.init(chatClient.socket, chatClient.getUserId(), chatClient.getRoomInfo());
            clearInterval(initInterval);
        }
    }, 100);
});
