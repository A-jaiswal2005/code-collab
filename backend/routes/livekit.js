const express = require("express");
const { AccessToken } = require("livekit-server-sdk");

const router = express.Router();

router.get("/getToken", async (req, res) => {
  const { roomId, username } = req.query;

  if (!roomId || !username) {
    return res.status(400).json({ error: "Missing roomId or username" });
  }

  try {
    // Create a new token for the user
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: username, // LiveKit uses this to uniquely identify the user
        name: username,     // This is the display name shown on their video tile
      }
    );

    // Grant permission to join the specific room and publish/subscribe to media
    at.addGrant({ 
      roomJoin: true, 
      room: roomId, 
      canPublish: true, 
      canSubscribe: true 
    });

    // Generate the JWT string
    const token = await at.toJwt();
    
    res.json({ token });
  } catch (error) {
    console.error("Token generation failed:", error);
    res.status(500).json({ error: "Failed to generate video token" });
  }
});

module.exports = router;