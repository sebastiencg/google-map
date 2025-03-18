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
  console.log("Nouvel utilisateur connecté :", socket.id);

  // On stocke l'user même sans position au départ
  users.push({ id: socket.id, location: null });

  // Envoyer la liste des users à tout le monde (y compris au nouveau)
  io.emit("userList", users);


  // Écoute de la position de l'utilisateur
  socket.on("location", (data) => {
    const existingUserIndex = users.findIndex((user) => user.id === socket.id);

    if (existingUserIndex !== -1) {
      users[existingUserIndex].location = data.location;
    } else {
      users.push({ id: socket.id, location: data.location });
    }

    // 1️⃣ Emit global pour que les autres voient ta position
    io.emit("userList", users);

    // 2️⃣ Emit uniquement à toi pour récupérer les autres users déjà connectés
    socket.emit("userList", users);
  });

  // Écoute d'un nouvel itinéraire
  socket.on("newRoute", (data) => {
    console.log(`Trajet reçu de ${socket.id}`);

    if (data.route) {
      routes[socket.id] = data.route; // Stocker le trajet

      // Diffuser le trajet à tous les autres utilisateurs
      socket.broadcast.emit("receiveRoute", { id: socket.id, route: data.route });
    }
    io.emit("userList", users);

  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);

    // Retirer l'utilisateur de la liste
    users = users.filter((user) => user.id !== socket.id);
    delete routes[socket.id]; // Supprimer son trajet stocké

    // 1. Notifier tout le monde que cet utilisateur est parti
    io.emit("userDisconnected", { id: socket.id });

    // 2. Envoyer la nouvelle liste des users restants
    io.emit("userList", users);
  });

});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO en cours d'exécution sur http://localhost:${PORT}`);
});
