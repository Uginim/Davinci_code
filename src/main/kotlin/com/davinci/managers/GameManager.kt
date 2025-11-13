package com.davinci.managers

import com.davinci.models.*

class DaVinciGame(
    val roomId: String,
    players: List<User>
) {
    private val deck = mutableListOf<Tile>()
    private val revealedDeck = mutableListOf<Tile>()
    private val players = mutableMapOf<String, PlayerState>()
    private val playerOrder = mutableListOf<String>()
    private var currentPlayerIndex = 0
    var gameStatus = "waiting" // waiting, playing, ended
    var winner: String? = null

    init {
        // 플레이어 초기화
        players.forEach { user ->
            this.players[user.userId] = PlayerState(user.userId, user.userName)
            playerOrder.add(user.userId)
        }
        initDeck()
    }

    private fun initDeck() {
        // 0-11 숫자의 검은색, 흰색 타일 생성
        for (i in 0..11) {
            deck.add(Tile(i, TileColor.BLACK))
            deck.add(Tile(i, TileColor.WHITE))
        }
        deck.shuffle()
    }

    fun startGame(): StartGameResponse {
        // 각 플레이어에게 4장씩 배분
        repeat(4) {
            playerOrder.forEach { userId ->
                val tile = deck.removeLastOrNull() ?: return StartGameResponse(
                    success = false,
                    message = "Not enough tiles"
                )
                players[userId]?.addTile(tile)
            }
        }

        gameStatus = "playing"
        currentPlayerIndex = 0

        return StartGameResponse(
            success = true,
            message = "Game started",
            currentPlayer = getCurrentPlayer()
        )
    }

    fun getCurrentPlayer(): String {
        return playerOrder[currentPlayerIndex]
    }

    fun drawTile(userId: String, fromRevealed: Boolean): DrawTileResponse {
        if (getCurrentPlayer() != userId) {
            return DrawTileResponse(success = false, message = "Not your turn")
        }

        val tile = if (fromRevealed && revealedDeck.isNotEmpty()) {
            revealedDeck.removeLastOrNull()
        } else if (deck.isNotEmpty()) {
            deck.removeLastOrNull()
        } else {
            null
        } ?: return DrawTileResponse(success = false, message = "No tiles available")

        players[userId]?.addTile(tile)

        return DrawTileResponse(
            success = true,
            message = "Tile drawn",
            tile = tile.getInfo(false)
        )
    }

    fun guess(guesserId: String, targetUserId: String, tileIndex: Int, guessedNumber: Int): GuessResponse {
        if (getCurrentPlayer() != guesserId) {
            return GuessResponse(success = false, message = "Not your turn")
        }

        val targetPlayer = players[targetUserId] ?: return GuessResponse(
            success = false,
            message = "Target player not found"
        )

        if (tileIndex !in targetPlayer.tiles.indices) {
            return GuessResponse(success = false, message = "Invalid tile index")
        }

        val targetTile = targetPlayer.tiles[tileIndex]

        if (targetTile.isRevealed) {
            return GuessResponse(success = false, message = "Tile already revealed")
        }

        val isCorrect = targetTile.number == guessedNumber

        return if (isCorrect) {
            // 정답! 타일 공개
            targetTile.isRevealed = true
            val targetEliminated = targetPlayer.checkElimination()

            GuessResponse(
                success = true,
                correct = true,
                tile = targetTile.getInfo(false),
                message = "Correct guess! Continue guessing or end turn.",
                canContinue = true,
                targetEliminated = targetEliminated
            )
        } else {
            // 틀림! 자신의 타일 중 하나를 공개하고 턴 종료
            val guesser = players[guesserId]!!
            val unrevealedTiles = guesser.tiles.filter { !it.isRevealed }

            val penaltyTile = if (unrevealedTiles.isNotEmpty()) {
                // 가장 작은 숫자 타일 공개
                val minTile = unrevealedTiles.minByOrNull { it.number }!!
                minTile.isRevealed = true
                minTile.getInfo(false)
            } else {
                null
            }

            val guesserEliminated = guesser.checkElimination()

            // 턴 종료
            nextTurn()

            GuessResponse(
                success = true,
                correct = false,
                actualNumber = targetTile.number,
                penaltyTile = penaltyTile,
                message = "Wrong guess! Your tile revealed.",
                guesserEliminated = guesserEliminated
            )
        }
    }

    fun endTurn(userId: String): EndTurnResponse {
        if (getCurrentPlayer() != userId) {
            return EndTurnResponse(success = false, message = "Not your turn")
        }

        nextTurn()

        return EndTurnResponse(
            success = true,
            message = "Turn ended",
            currentPlayer = getCurrentPlayer()
        )
    }

    private fun nextTurn() {
        // 다음 플레이어로 이동 (탈락하지 않은 플레이어)
        var attempts = 0
        val maxAttempts = playerOrder.size

        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.size
            attempts++

            val currentUserId = playerOrder[currentPlayerIndex]
            if (players[currentUserId]?.isEliminated == false) {
                break
            }
        } while (attempts < maxAttempts)

        // 승리 조건 확인
        checkWinCondition()
    }

    private fun checkWinCondition() {
        val activePlayers = playerOrder.filter { players[it]?.isEliminated == false }

        when {
            activePlayers.size == 1 -> {
                gameStatus = "ended"
                winner = activePlayers[0]
            }
            activePlayers.isEmpty() -> {
                gameStatus = "ended"
                winner = null
            }
        }
    }

    fun getGameState(forUserId: String): GameState {
        val playersInfo = players.mapValues { (userId, player) ->
            PlayerInfo(
                userName = player.userName,
                tiles = player.getTilesInfo(userId == forUserId),
                isEliminated = player.isEliminated,
                tileCount = player.tiles.size
            )
        }

        return GameState(
            roomId = roomId,
            gameStatus = gameStatus,
            currentPlayer = getCurrentPlayer(),
            players = playersInfo,
            playerOrder = playerOrder,
            deckCount = deck.size,
            revealedDeckCount = revealedDeck.size,
            winner = winner
        )
    }
}

object GameManager {
    private val games = mutableMapOf<String, DaVinciGame>()

    fun createGame(roomId: String, players: List<User>): Pair<Boolean, String> {
        if (players.size !in 2..4) {
            return false to "Game requires 2-4 players"
        }

        val game = DaVinciGame(roomId, players)
        games[roomId] = game

        return true to "Game created"
    }

    fun getGame(roomId: String): DaVinciGame? {
        return games[roomId]
    }

    fun deleteGame(roomId: String) {
        games.remove(roomId)
    }

    fun startGame(roomId: String): StartGameResponse {
        val game = games[roomId] ?: return StartGameResponse(
            success = false,
            message = "Game not found"
        )

        return game.startGame()
    }
}
