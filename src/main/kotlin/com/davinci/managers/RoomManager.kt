package com.davinci.managers

import com.davinci.models.GameRoom
import com.davinci.models.User

object RoomManager {
    private val rooms = mutableMapOf<String, GameRoom>()

    fun createRoom(roomName: String, roomOwner: User, maxNumOfMembers: Int = 4): GameRoom {
        val newRoom = GameRoom(
            roomName = roomName,
            roomOwner = roomOwner,
            maxNumOfMembers = maxNumOfMembers
        )
        rooms[newRoom.roomId] = newRoom
        return newRoom
    }

    fun getRoom(roomId: String): GameRoom? {
        return rooms[roomId]
    }

    fun getRoomList(): List<GameRoom> {
        return rooms.values.toList()
    }

    fun deleteRoom(roomId: String) {
        rooms.remove(roomId)
    }

    fun putUserInRoom(roomId: String, user: User): Boolean {
        val room = rooms[roomId] ?: return false
        if (room.members.size >= room.maxNumOfMembers) {
            return false
        }
        if (room.members.any { it.userId == user.userId }) {
            return false // 이미 방에 있음
        }
        room.members.add(user)
        return true
    }

    fun letUserGoOutOfRoom(roomId: String, user: User): Boolean {
        val room = rooms[roomId] ?: return false
        room.members.removeIf { it.userId == user.userId }

        // 방장이 나가면 방 삭제
        if (room.roomOwner.userId == user.userId) {
            deleteRoom(roomId)
            return true
        }

        // 방이 비었으면 삭제
        if (room.members.isEmpty()) {
            deleteRoom(roomId)
        }

        return true
    }
}
