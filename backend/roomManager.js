/**
 * roomManager.js
 * ---------------------------------------------------------------
 * Simple in-memory registry of rooms and the users inside them.
 * This is intentionally NOT persisted to a database - rooms are
 * ephemeral collaboration sessions. If you need durability across
 * server restarts, swap this out for Redis.
 * ---------------------------------------------------------------
 */

class RoomManager {
  constructor() {
    // roomId -> Map<socketId, { username, socketId }>
    this.rooms = new Map();
  }

  joinRoom(roomId, socketId, username) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    this.rooms.get(roomId).set(socketId, { username, socketId });
    return this.getUsers(roomId);
  }

  leaveRoom(roomId, socketId) {
    if (!this.rooms.has(roomId)) return;
    this.rooms.get(roomId).delete(socketId);
    if (this.rooms.get(roomId).size === 0) {
      this.rooms.delete(roomId);
    }
  }

  // Removes a socket from every room it was part of (used on disconnect)
  leaveAllRooms(socketId) {
    const affectedRooms = [];
    for (const [roomId, users] of this.rooms.entries()) {
      if (users.has(socketId)) {
        users.delete(socketId);
        affectedRooms.push(roomId);
        if (users.size === 0) this.rooms.delete(roomId);
      }
    }
    return affectedRooms;
  }

  getUsers(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).values());
  }

  roomExists(roomId) {
    return this.rooms.has(roomId);
  }
}

module.exports = new RoomManager();