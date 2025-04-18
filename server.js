// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");
const errorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");

app.set("view engine", "ejs");

// Serve static files from the public directory
app.use(express.static("public"));

// Parse JSON request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.redirect(`/room/${uuidV4()}`);
});

app.get("/room/:roomId", (req, res) => {
  res.render("room", { roomId: req.params.roomId });
});

// Handle 404 errors - using a more specific pattern
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    try {
      socket.join(roomId);
      socket.to(roomId).emit("user-connected", userId);

      // Handle screen sharing
      socket.on("screen-sharing", (sharing) => {
        socket.to(roomId).emit("user-screen-sharing", userId, sharing);
      });

      socket.on("disconnect", () => {
        socket.to(roomId).emit("user-disconnected", userId);
      });
    } catch (error) {
      console.error("Socket error:", error);
      socket.emit("error", "An error occurred in the connection");
    }
  });
});

// Apply error handling middleware
app.use(errorHandler);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
