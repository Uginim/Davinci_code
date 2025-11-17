package com.davinci.managers

import com.davinci.models.User

object UserManager {
    private val users = mutableMapOf<String, User>()

    fun createUser(userName: String): User {
        val newUser = User(userName = userName)
        users[newUser.userId] = newUser
        return newUser
    }

    fun getUser(userId: String): User? {
        return users[userId]
    }

    fun getUserList(): List<User> {
        return users.values.toList()
    }

    fun removeUser(userId: String) {
        users.remove(userId)
    }
}
