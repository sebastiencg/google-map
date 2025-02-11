const { Server } = require("socket.io");
const express = require("express");
const https = require("https");
const fs = require("fs");
const localhost = require("https-localhost")();

const app = express();

// Charger les certificats générés par https-localhost
const options = {
  key: loclhost.key,
  cert: localhost.cert,
};


// Créer un serveur HTTPS natif avec les certificats
const server = https.createServer(options, app);
const io = new Server(server, {
  cors: {
    origin: "*", // Autoriser Next.js en HTTPS
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur connecté :", socket.id);

  socket.on("location", (data) => {
    console.log("Position reçue :", data);
    socket.broadcast.emit("updateLocation", { id: socket.id, location: data.location });
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serveur HTTPS Socket.IO lancé sur https://localhost:${PORT}`);
});
