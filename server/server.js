const { Server } = require("socket.io");
const express = require("express");

const app = express();
const server = require("http").createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Accepter toutes les origines
    methods: ["GET", "POST"],
  },
});

let users = []; // Liste des utilisateurs connectés
let routes = {}; // Stocke les trajets (id utilisateur => trajet)

// Lorsqu'un client se connecte
io.on("connection", (socket) => {
  console.log("Nouvel utilisateur connecté  guy:", socket.id);
  users.push({ id: socket.id });
  // Diffuser la liste des utilisateurs
  io.emit("userList", users);
  socket.broadcast.emit("receiveRoute", { id: socket.id, route: data.route });

  // Écoute de la position de l'utilisateur
  socket.on("location", (data) => {
    const existingUserIndex = users.findIndex((user) => user.id === socket.id);

    if (existingUserIndex !== -1) {
      users[existingUserIndex].location = data.location;
    } else {
      users.push({ id: socket.id, location: data.location });
    }

    // Diffuser la liste des utilisateurs
    io.emit("userList", users);
  });

  // Écoute d'un nouvel itinéraire
  socket.on("newRoute", (data) => {
    console.log(`Trajet reçu de ${socket.id}`);

    if (data.route) {
      routes[socket.id] = data.route; // Stocker le trajet

      // Diffuser le trajet à tous les autres utilisateurs
      socket.broadcast.emit("receiveRoute", { id: socket.id, route: data.route });
    }
  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
    users = users.filter((user) => user.id !== socket.id);
    delete routes[socket.id]; // Supprimer son trajet

    // Diffuser la mise à jour des utilisateurs et des trajets
    io.emit("userList", users);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO en cours d'exécution sur http://localhost:${PORT}`);
});
