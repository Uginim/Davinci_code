/**
 * Da Vinci Code Game Manager
 * Author: Claude
 *
 * 다빈치 코드 게임 규칙:
 * - 0-11 숫자의 타일 (검은색/흰색 각 12장)
 * - 플레이어는 타일을 오름차순으로 배열
 * - 타일을 뽑고 다른 플레이어의 타일을 추리
 * - 맞추면 계속, 틀리면 자신의 타일 공개 후 턴 종료
 */

exports.game_manager = (function() {
    var games = {};

    // 타일 색상
    const COLOR = {
        BLACK: 'black',
        WHITE: 'white'
    };

    // 타일 클래스
    function Tile(number, color) {
        this.number = number;
        this.color = color;
        this.isRevealed = false;
    }

    Tile.prototype.reveal = function() {
        this.isRevealed = true;
    };

    Tile.prototype.getInfo = function(hideNumber) {
        if (this.isRevealed || !hideNumber) {
            return {
                number: this.number,
                color: this.color,
                isRevealed: this.isRevealed
            };
        }
        return {
            number: -1, // 숨김
            color: this.color,
            isRevealed: this.isRevealed
        };
    };

    // 플레이어 상태 클래스
    function PlayerState(userId, userName) {
        this.userId = userId;
        this.userName = userName;
        this.tiles = [];
        this.isEliminated = false;
    }

    PlayerState.prototype.addTile = function(tile) {
        this.tiles.push(tile);
        this.sortTiles();
    };

    PlayerState.prototype.sortTiles = function() {
        this.tiles.sort(function(a, b) {
            if (a.number !== b.number) {
                return a.number - b.number;
            }
            // 같은 숫자면 검은색이 먼저
            return a.color === COLOR.BLACK ? -1 : 1;
        });
    };

    PlayerState.prototype.removeTile = function(index) {
        if (index >= 0 && index < this.tiles.length) {
            this.tiles.splice(index, 1);
        }
    };

    PlayerState.prototype.checkElimination = function() {
        // 모든 타일이 공개되었는지 확인
        this.isEliminated = this.tiles.every(function(tile) {
            return tile.isRevealed;
        });
        return this.isEliminated;
    };

    PlayerState.prototype.getTilesInfo = function(isOwner) {
        return this.tiles.map(function(tile) {
            return tile.getInfo(!isOwner);
        });
    };

    // 게임 클래스
    function DaVinciGame(roomId, players) {
        this.roomId = roomId;
        this.deck = [];
        this.revealedDeck = []; // 공개된 타일들
        this.players = {};
        this.playerOrder = [];
        this.currentPlayerIndex = 0;
        this.gameStatus = 'waiting'; // waiting, playing, ended
        this.winner = null;
        this.lastAction = null;

        // 플레이어 초기화
        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            this.players[player.userId] = new PlayerState(player.userId, player.userName);
            this.playerOrder.push(player.userId);
        }

        this.initDeck();
    }

    DaVinciGame.prototype.initDeck = function() {
        // 0-11 숫자의 검은색, 흰색 타일 생성
        for (var i = 0; i <= 11; i++) {
            this.deck.push(new Tile(i, COLOR.BLACK));
            this.deck.push(new Tile(i, COLOR.WHITE));
        }
        this.shuffleDeck();
    };

    DaVinciGame.prototype.shuffleDeck = function() {
        for (var i = this.deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this.deck[i];
            this.deck[i] = this.deck[j];
            this.deck[j] = temp;
        }
    };

    DaVinciGame.prototype.startGame = function() {
        // 각 플레이어에게 4장씩 배분
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < this.playerOrder.length; j++) {
                var userId = this.playerOrder[j];
                var tile = this.deck.pop();
                this.players[userId].addTile(tile);
            }
        }

        this.gameStatus = 'playing';
        this.currentPlayerIndex = 0;

        return {
            success: true,
            message: 'Game started',
            currentPlayer: this.getCurrentPlayer()
        };
    };

    DaVinciGame.prototype.getCurrentPlayer = function() {
        return this.playerOrder[this.currentPlayerIndex];
    };

    DaVinciGame.prototype.drawTile = function(userId, fromRevealed) {
        if (this.getCurrentPlayer() !== userId) {
            return { success: false, message: 'Not your turn' };
        }

        var tile;
        if (fromRevealed && this.revealedDeck.length > 0) {
            // 공개된 덱에서 가져오기
            tile = this.revealedDeck.pop();
        } else if (this.deck.length > 0) {
            // 일반 덱에서 뽑기
            tile = this.deck.pop();
        } else {
            return { success: false, message: 'No tiles available' };
        }

        this.players[userId].addTile(tile);

        return {
            success: true,
            tile: tile.getInfo(false),
            message: 'Tile drawn'
        };
    };

    DaVinciGame.prototype.guess = function(guesserId, targetUserId, tileIndex, guessedNumber) {
        if (this.getCurrentPlayer() !== guesserId) {
            return { success: false, message: 'Not your turn' };
        }

        var targetPlayer = this.players[targetUserId];
        if (!targetPlayer) {
            return { success: false, message: 'Target player not found' };
        }

        if (tileIndex < 0 || tileIndex >= targetPlayer.tiles.length) {
            return { success: false, message: 'Invalid tile index' };
        }

        var targetTile = targetPlayer.tiles[tileIndex];

        if (targetTile.isRevealed) {
            return { success: false, message: 'Tile already revealed' };
        }

        var isCorrect = targetTile.number === guessedNumber;

        if (isCorrect) {
            // 정답! 타일 공개
            targetTile.reveal();

            // 상대가 탈락했는지 확인
            targetPlayer.checkElimination();

            return {
                success: true,
                correct: true,
                tile: targetTile.getInfo(false),
                message: 'Correct guess! Continue guessing or end turn.',
                canContinue: true,
                targetEliminated: targetPlayer.isEliminated
            };
        } else {
            // 틀림! 자신의 타일 중 하나를 공개하고 턴 종료
            var guesser = this.players[guesserId];

            // 공개되지 않은 타일 찾기
            var unrevealedTiles = [];
            for (var i = 0; i < guesser.tiles.length; i++) {
                if (!guesser.tiles[i].isRevealed) {
                    unrevealedTiles.push(i);
                }
            }

            var penaltyTile = null;
            if (unrevealedTiles.length > 0) {
                // 가장 작은 숫자 타일 공개
                var minIndex = unrevealedTiles[0];
                guesser.tiles[minIndex].reveal();
                penaltyTile = guesser.tiles[minIndex].getInfo(false);

                // 자신이 탈락했는지 확인
                guesser.checkElimination();
            }

            // 턴 종료
            this.nextTurn();

            return {
                success: true,
                correct: false,
                actualNumber: targetTile.number,
                penaltyTile: penaltyTile,
                message: 'Wrong guess! Your tile revealed.',
                guesserEliminated: guesser.isEliminated
            };
        }
    };

    DaVinciGame.prototype.endTurn = function(userId) {
        if (this.getCurrentPlayer() !== userId) {
            return { success: false, message: 'Not your turn' };
        }

        this.nextTurn();

        return {
            success: true,
            message: 'Turn ended',
            currentPlayer: this.getCurrentPlayer()
        };
    };

    DaVinciGame.prototype.nextTurn = function() {
        // 다음 플레이어로 이동 (탈락하지 않은 플레이어)
        var attempts = 0;
        var maxAttempts = this.playerOrder.length;

        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
            attempts++;

            var currentUserId = this.playerOrder[this.currentPlayerIndex];
            if (!this.players[currentUserId].isEliminated) {
                break;
            }
        } while (attempts < maxAttempts);

        // 승리 조건 확인
        this.checkWinCondition();
    };

    DaVinciGame.prototype.checkWinCondition = function() {
        var activePlayers = [];

        for (var i = 0; i < this.playerOrder.length; i++) {
            var userId = this.playerOrder[i];
            if (!this.players[userId].isEliminated) {
                activePlayers.push(userId);
            }
        }

        if (activePlayers.length === 1) {
            this.gameStatus = 'ended';
            this.winner = activePlayers[0];
        } else if (activePlayers.length === 0) {
            // 무승부 (거의 발생하지 않음)
            this.gameStatus = 'ended';
            this.winner = null;
        }

        return this.gameStatus === 'ended';
    };

    DaVinciGame.prototype.getGameState = function(forUserId) {
        var playersInfo = {};

        for (var userId in this.players) {
            var player = this.players[userId];
            playersInfo[userId] = {
                userName: player.userName,
                tiles: player.getTilesInfo(userId === forUserId),
                isEliminated: player.isEliminated,
                tileCount: player.tiles.length
            };
        }

        return {
            roomId: this.roomId,
            gameStatus: this.gameStatus,
            currentPlayer: this.getCurrentPlayer(),
            players: playersInfo,
            playerOrder: this.playerOrder,
            deckCount: this.deck.length,
            revealedDeckCount: this.revealedDeck.length,
            winner: this.winner
        };
    };

    // 게임 매니저 메소드들
    function createGame(roomId, players) {
        if (players.length < 2 || players.length > 4) {
            return { success: false, message: 'Game requires 2-4 players' };
        }

        var game = new DaVinciGame(roomId, players);
        games[roomId] = game;

        return { success: true, game: game };
    }

    function getGame(roomId) {
        return games[roomId];
    }

    function deleteGame(roomId) {
        delete games[roomId];
    }

    function startGame(roomId) {
        var game = games[roomId];
        if (!game) {
            return { success: false, message: 'Game not found' };
        }

        return game.startGame();
    }

    return {
        createGame: createGame,
        getGame: getGame,
        deleteGame: deleteGame,
        startGame: startGame
    };
})();
