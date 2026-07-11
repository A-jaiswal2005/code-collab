/**
 * roomManager.js
 * ---------------------------------------------------------------
 * Updated with Admin tracking and strict join validation.
 * ---------------------------------------------------------------
 */

class RoomManager {
  constructor() {
    // roomId -> { admin: socketId, users: Map<socketId, { username, socketId }> }
    this.rooms = new Map();
  }

  createRoom(roomId, socketId, username) {
    if (this.rooms.has(roomId)) {
      return { error: "Room already exists." };
    }
    
    const usersMap = new Map();
    usersMap.set(socketId, { username, socketId });
    
    // Register the creator as the admin
    this.rooms.set(roomId, {
      admin: socketId,
      users: usersMap
    });
    
    return { users: this.getUsers(roomId) };
  }

  joinRoom(roomId, socketId, username) {
    // Strict Gatekeeper: If room isn't in the Map, reject them.
    if (!this.rooms.has(roomId)) {
      return { error: "Invalid Room ID. Please check the code." };
    }
    
    const room = this.rooms.get(roomId);
    room.users.set(socketId, { username, socketId });
    
    return { users: this.getUsers(roomId) };
  }

  leaveRoom(roomId, socketId) {
    if (!this.rooms.has(roomId)) return;
    
    const room = this.rooms.get(roomId);
    room.users.delete(socketId);
    
    // If empty, clean up memory
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
    } 
    // Optional: Reassign admin if the admin leaves but others remain
    else if (room.admin === socketId) {
      room.admin = Array.from(room.users.keys())[0];
    }
  }

  leaveAllRooms(socketId) {
    const affectedRooms = [];
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socketId)) {
        room.users.delete(socketId);
        affectedRooms.push(roomId);
        
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        } else if (room.admin === socketId) {
          room.admin = Array.from(room.users.keys())[0];
        }
      }
    }
    return affectedRooms;
  }

  getUsers(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).users.values());
  }

  getAdmin(roomId) {
    if (!this.rooms.has(roomId)) return null;
    return this.rooms.get(roomId).admin;
  }
}

module.exports = new RoomManager();
