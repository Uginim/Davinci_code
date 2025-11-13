package com.davinci

import com.davinci.managers.GameManager
import com.davinci.managers.RoomManager
import com.davinci.managers.UserManager
import com.davinci.models.*
import io.ktor.serialization.kotlinx.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.time.Duration

// WebSocket 세션 관리
class WebSocketSession(val session: DefaultWebSocketSession) {
    var userId: String? = null
    var currentRoomId: String? = null
}

val sessions = mutableMapOf<DefaultWebSocketSession, WebSocketSession>()
val roomSessions = mutableMapOf<String, MutableSet<WebSocketSession>>()

fun main() {
    embeddedServer(Netty, port = 3000, host = "0.0.0.0") {
        configureSerialization()
        configureWebSockets()
        configureRouting()
    }.start(wait = true)
}

fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }
}

fun Application.configureWebSockets() {
    install(WebSockets) {
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(15)
        maxFrameSize = Long.MAX_VALUE
        masking = false
        contentConverter = KotlinxWebsocketSerializationConverter(Json)
    }
}

fun Application.configureRouting() {
    routing {
        // 정적 파일 제공
        static("/") {
            staticRootFolder = File("public")
            files(".")
            static("javascript") {
                files("javascript")
            }
            static("stylesheets") {
                files("stylesheets")
            }
            default("index.html")
        }

        // 홈 페이지
        get("/") {
            call.respondText(
                File("views/index.html").readText(),
                io.ktor.http.ContentType.Text.Html
            )
        }

        // WebSocket
        webSocket("/ws") {
            val wsSession = WebSocketSession(this)
            sessions[this] = wsSession

            println("New WebSocket connection")

            try {
                for (frame in incoming) {
                    when (frame) {
                        is Frame.Text -> {
                            val receivedText = frame.readText()
                            println("Received: $receivedText")
                            handleMessage(wsSession, receivedText)
                        }
                        else -> {}
                    }
                }
            } catch (e: ClosedReceiveChannelException) {
                println("WebSocket connection closed")
            } catch (e: Exception) {
                println("Error in WebSocket: ${e.message}")
                e.printStackTrace()
            } finally {
                // 연결 종료 시 정리
                wsSession.currentRoomId?.let { roomId ->
                    roomSessions[roomId]?.remove(wsSession)
                    wsSession.userId?.let { userId ->
                        UserManager.getUser(userId)?.let { user ->
                            RoomManager.letUserGoOutOfRoom(roomId, user)
                        }
                    }
                }
                sessions.remove(this)
            }
        }
    }
}

suspend fun handleMessage(wsSession: WebSocketSession, message: String) {
    try {
        val json = Json { ignoreUnknownKeys = true }
        val parsedMessage = json.decodeFromString<Map<String, String>>(message)
        val type = parsedMessage["type"] ?: return

        when (type) {
            "reqRegisterUser" -> {
                val name = parsedMessage["name"] ?: "Unknown"
                val user = UserManager.createUser(name)
                wsSession.userId = user.userId

                val response = RegisterUserResponse(
                    msg = "creating_user_success",
                    userId = user.userId
                )
                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resRegisterUser", "data" to Json.encodeToString(response))
                )))
            }

            "reqRoomList" -> {
                val rooms = RoomManager.getRoomList()
                val response = RoomListResponse(msg = "", roomList = rooms)
                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "roomList", "data" to Json.encodeToString(response))
                )))
            }

            "reqCreatingRoom" -> {
                val userId = parsedMessage["userId"] ?: return
                val roomName = parsedMessage["roomName"] ?: return
                val user = UserManager.getUser(userId) ?: return

                val room = RoomManager.createRoom(roomName, user, 4)
                wsSession.currentRoomId = room.roomId

                // 방 세션에 추가
                roomSessions.getOrPut(room.roomId) { mutableSetOf() }.add(wsSession)

                val response = CreateRoomResponse(msg = "creating_room_success", roomInfo = room)
                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resCreatingRoom", "data" to Json.encodeToString(response))
                )))

                // 채팅 메시지
                broadcastToRoom(room.roomId, "chatMsg", ChatMessage("[room : $roomName] room was created"))

                // 방 목록 업데이트
                val rooms = RoomManager.getRoomList()
                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "roomlist", "data" to Json.encodeToString(RoomListResponse("", rooms)))
                )))
            }

            "reqEnteringARoom" -> {
                val userId = parsedMessage["userId"] ?: return
                val roomId = parsedMessage["roomId"] ?: return
                val user = UserManager.getUser(userId) ?: return

                RoomManager.putUserInRoom(roomId, user)
                val room = RoomManager.getRoom(roomId) ?: return
                wsSession.currentRoomId = roomId

                // 방 세션에 추가
                roomSessions.getOrPut(roomId) { mutableSetOf() }.add(wsSession)

                val response = EnterRoomResponse(msg = "join_room_success", roomInfo = room)
                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resEnteringARoom", "data" to Json.encodeToString(response))
                )))

                // 입장 메시지
                broadcastToRoom(roomId, "chatMsg", ChatMessage("${user.userName} entered"))
            }

            "reqLeavingARoom" -> {
                val userId = parsedMessage["userId"] ?: return
                val roomId = parsedMessage["roomId"] ?: return
                val user = UserManager.getUser(userId) ?: return

                roomSessions[roomId]?.remove(wsSession)
                wsSession.currentRoomId = null

                broadcastToRoom(roomId, "chatMsg", ChatMessage("${user.userName} left"))
                RoomManager.letUserGoOutOfRoom(roomId, user)

                val rooms = RoomManager.getRoomList()
                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "roomlist", "data" to Json.encodeToString(RoomListResponse("creating_room_success", rooms)))
                )))
            }

            "reqSendMessage" -> {
                val userId = parsedMessage["userId"] ?: return
                val roomId = parsedMessage["roomId"] ?: return
                val msg = parsedMessage["msg"] ?: return
                val user = UserManager.getUser(userId) ?: return

                broadcastToRoom(roomId, "chatMsg", ChatMessage("[${user.userName}]: $msg"))
            }

            "reqStartGame" -> {
                val roomId = parsedMessage["roomId"] ?: return
                val room = RoomManager.getRoom(roomId) ?: return

                val (success, message) = GameManager.createGame(roomId, room.members)
                if (!success) {
                    wsSession.session.send(Frame.Text(Json.encodeToString(
                        mapOf("type" to "resStartGame", "data" to Json.encodeToString(
                            StartGameResponse(success = false, message = message)
                        ))
                    )))
                    return
                }

                val startResult = GameManager.startGame(roomId)
                if (startResult.success) {
                    room.gameStatus = "playing"

                    // 모든 플레이어에게 게임 시작 알림
                    broadcastToRoom(roomId, "gameStarted", mapOf(
                        "message" to "Game started!",
                        "currentPlayer" to (startResult.currentPlayer ?: "")
                    ))

                    // 각 플레이어에게 게임 상태 전송
                    val game = GameManager.getGame(roomId)
                    room.members.forEach { member ->
                        val gameState = game?.getGameState(member.userId)
                        broadcastToRoom(roomId, "gameState", gameState)
                    }
                }

                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resStartGame", "data" to Json.encodeToString(startResult))
                )))
            }

            "reqDrawTile" -> {
                val roomId = parsedMessage["roomId"] ?: return
                val userId = parsedMessage["userId"] ?: return
                val fromRevealed = parsedMessage["fromRevealed"]?.toBoolean() ?: false

                val game = GameManager.getGame(roomId)
                if (game == null) {
                    wsSession.session.send(Frame.Text(Json.encodeToString(
                        mapOf("type" to "resDrawTile", "data" to Json.encodeToString(
                            DrawTileResponse(success = false, message = "Game not found")
                        ))
                    )))
                    return
                }

                val result = game.drawTile(userId, fromRevealed)

                if (result.success) {
                    wsSession.session.send(Frame.Text(Json.encodeToString(
                        mapOf("type" to "resDrawTile", "data" to Json.encodeToString(result))
                    )))

                    broadcastToRoomExcept(roomId, wsSession, "playerDrewTile", mapOf(
                        "userId" to userId,
                        "fromRevealed" to fromRevealed
                    ))

                    val gameState = game.getGameState(userId)
                    broadcastToRoom(roomId, "gameStateUpdate", gameState)
                } else {
                    wsSession.session.send(Frame.Text(Json.encodeToString(
                        mapOf("type" to "resDrawTile", "data" to Json.encodeToString(result))
                    )))
                }
            }

            "reqGuess" -> {
                val roomId = parsedMessage["roomId"] ?: return
                val userId = parsedMessage["userId"] ?: return
                val targetUserId = parsedMessage["targetUserId"] ?: return
                val tileIndex = parsedMessage["tileIndex"]?.toIntOrNull() ?: return
                val guessedNumber = parsedMessage["guessedNumber"]?.toIntOrNull() ?: return

                val game = GameManager.getGame(roomId)
                if (game == null) {
                    wsSession.session.send(Frame.Text(Json.encodeToString(
                        mapOf("type" to "resGuess", "data" to Json.encodeToString(
                            GuessResponse(success = false, message = "Game not found")
                        ))
                    )))
                    return
                }

                val result = game.guess(userId, targetUserId, tileIndex, guessedNumber)

                if (result.success) {
                    broadcastToRoom(roomId, "guessResult", mapOf(
                        "guesserId" to userId,
                        "targetUserId" to targetUserId,
                        "tileIndex" to tileIndex,
                        "guessedNumber" to guessedNumber,
                        "correct" to result.correct,
                        "tile" to result.tile,
                        "penaltyTile" to result.penaltyTile,
                        "targetEliminated" to result.targetEliminated,
                        "guesserEliminated" to result.guesserEliminated,
                        "message" to result.message
                    ))

                    val gameState = game.getGameState(userId)
                    broadcastToRoom(roomId, "gameStateUpdate", gameState)

                    if (gameState.gameStatus == "ended") {
                        broadcastToRoom(roomId, "gameEnded", mapOf(
                            "winner" to (gameState.winner ?: ""),
                            "message" to "Game Over!"
                        ))
                    }
                }

                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resGuess", "data" to Json.encodeToString(result))
                )))
            }

            "reqEndTurn" -> {
                val roomId = parsedMessage["roomId"] ?: return
                val userId = parsedMessage["userId"] ?: return

                val game = GameManager.getGame(roomId)
                if (game == null) {
                    wsSession.session.send(Frame.Text(Json.encodeToString(
                        mapOf("type" to "resEndTurn", "data" to Json.encodeToString(
                            EndTurnResponse(success = false, message = "Game not found")
                        ))
                    )))
                    return
                }

                val result = game.endTurn(userId)

                if (result.success) {
                    broadcastToRoom(roomId, "turnChanged", mapOf(
                        "currentPlayer" to (result.currentPlayer ?: ""),
                        "message" to "Turn changed"
                    ))

                    val gameState = game.getGameState(userId)
                    broadcastToRoom(roomId, "gameStateUpdate", gameState)
                }

                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resEndTurn", "data" to Json.encodeToString(result))
                )))
            }

            "reqGameState" -> {
                val roomId = parsedMessage["roomId"] ?: return
                val userId = parsedMessage["userId"] ?: return

                val game = GameManager.getGame(roomId)
                val response = if (game != null) {
                    val gameState = game.getGameState(userId)
                    GameStateResponse(success = true, gameState = gameState)
                } else {
                    GameStateResponse(success = false, message = "Game not found")
                }

                wsSession.session.send(Frame.Text(Json.encodeToString(
                    mapOf("type" to "resGameState", "data" to Json.encodeToString(response))
                )))
            }
        }
    } catch (e: Exception) {
        println("Error handling message: ${e.message}")
        e.printStackTrace()
    }
}

suspend fun broadcastToRoom(roomId: String, type: String, data: Any) {
    val sessions = roomSessions[roomId] ?: return
    val message = Json.encodeToString(mapOf("type" to type, "data" to Json.encodeToString(data)))

    sessions.forEach { wsSession ->
        try {
            wsSession.session.send(Frame.Text(message))
        } catch (e: Exception) {
            println("Error broadcasting to session: ${e.message}")
        }
    }
}

suspend fun broadcastToRoomExcept(roomId: String, exceptSession: WebSocketSession, type: String, data: Any) {
    val sessions = roomSessions[roomId] ?: return
    val message = Json.encodeToString(mapOf("type" to type, "data" to Json.encodeToString(data)))

    sessions.filter { it != exceptSession }.forEach { wsSession ->
        try {
            wsSession.session.send(Frame.Text(message))
        } catch (e: Exception) {
            println("Error broadcasting to session: ${e.message}")
        }
    }
}
