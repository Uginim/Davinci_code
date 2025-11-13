package com.davinci.models

import com.benasher44.uuid.uuid4
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val userId: String = uuid4().toString(),
    val userName: String
)

@Serializable
data class GameRoom(
    val roomId: String = uuid4().toString(),
    val roomName: String,
    val roomOwner: User,
    val members: MutableList<User> = mutableListOf(),
    val maxNumOfMembers: Int = 4,
    var gameStatus: String = "matching" // matching, playing, ended
) {
    init {
        members.add(roomOwner)
    }
}

@Serializable
data class Tile(
    val number: Int,
    val color: TileColor,
    var isRevealed: Boolean = false
) {
    fun getInfo(hideNumber: Boolean): TileInfo {
        return if (isRevealed || !hideNumber) {
            TileInfo(number, color, isRevealed)
        } else {
            TileInfo(-1, color, isRevealed) // 숨김
        }
    }
}

@Serializable
enum class TileColor {
    BLACK, WHITE
}

@Serializable
data class TileInfo(
    val number: Int,
    val color: TileColor,
    val isRevealed: Boolean
)

@Serializable
data class PlayerState(
    val userId: String,
    val userName: String,
    val tiles: MutableList<Tile> = mutableListOf(),
    var isEliminated: Boolean = false
) {
    fun addTile(tile: Tile) {
        tiles.add(tile)
        sortTiles()
    }

    private fun sortTiles() {
        tiles.sortWith(compareBy({ it.number }, { if (it.color == TileColor.BLACK) 0 else 1 }))
    }

    fun checkElimination(): Boolean {
        isEliminated = tiles.all { it.isRevealed }
        return isEliminated
    }

    fun getTilesInfo(isOwner: Boolean): List<TileInfo> {
        return tiles.map { it.getInfo(!isOwner) }
    }
}

@Serializable
data class GameState(
    val roomId: String,
    val gameStatus: String,
    val currentPlayer: String,
    val players: Map<String, PlayerInfo>,
    val playerOrder: List<String>,
    val deckCount: Int,
    val revealedDeckCount: Int,
    val winner: String? = null
)

@Serializable
data class PlayerInfo(
    val userName: String,
    val tiles: List<TileInfo>,
    val isEliminated: Boolean,
    val tileCount: Int
)

// WebSocket Messages
@Serializable
data class WSMessage(
    val type: String,
    val data: String
)

@Serializable
data class RegisterUserRequest(val name: String)

@Serializable
data class RegisterUserResponse(val msg: String, val userId: String)

@Serializable
data class CreateRoomRequest(val userId: String, val roomName: String)

@Serializable
data class CreateRoomResponse(val msg: String, val roomInfo: GameRoom)

@Serializable
data class EnterRoomRequest(val userId: String, val roomId: String)

@Serializable
data class EnterRoomResponse(val msg: String, val roomInfo: GameRoom)

@Serializable
data class LeaveRoomRequest(val userId: String, val roomId: String)

@Serializable
data class SendMessageRequest(val userId: String, val roomId: String, val msg: String)

@Serializable
data class ChatMessage(val msg: String)

@Serializable
data class RoomListResponse(val msg: String, val roomList: List<GameRoom>)

@Serializable
data class StartGameRequest(val roomId: String, val userId: String)

@Serializable
data class StartGameResponse(
    val success: Boolean,
    val message: String,
    val currentPlayer: String? = null
)

@Serializable
data class DrawTileRequest(val roomId: String, val userId: String, val fromRevealed: Boolean = false)

@Serializable
data class DrawTileResponse(
    val success: Boolean,
    val message: String,
    val tile: TileInfo? = null
)

@Serializable
data class GuessRequest(
    val roomId: String,
    val userId: String,
    val targetUserId: String,
    val tileIndex: Int,
    val guessedNumber: Int
)

@Serializable
data class GuessResponse(
    val success: Boolean,
    val correct: Boolean = false,
    val message: String,
    val tile: TileInfo? = null,
    val penaltyTile: TileInfo? = null,
    val actualNumber: Int? = null,
    val targetEliminated: Boolean = false,
    val guesserEliminated: Boolean = false,
    val canContinue: Boolean = false
)

@Serializable
data class EndTurnRequest(val roomId: String, val userId: String)

@Serializable
data class EndTurnResponse(
    val success: Boolean,
    val message: String,
    val currentPlayer: String? = null
)

@Serializable
data class GameStateRequest(val roomId: String, val userId: String)

@Serializable
data class GameStateResponse(
    val success: Boolean,
    val gameState: GameState? = null,
    val message: String? = null
)
