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

let users = []; // Tableau pour stocker les utilisateurs connectés

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur connecté :", socket.id);

  // Lorsqu'un utilisateur envoie sa position
  socket.on("location", (data) => {
    const existingUserIndex = users.findIndex((user) => user.id === socket.id);

    if (existingUserIndex !== -1) {
      // Mettre à jour la position si l'utilisateur existe déjà
      users[existingUserIndex].location = data.location;
    } else {
      // Ajouter un nouvel utilisateur dans la liste
      users.push({ id: socket.id, location: data.location });
    }

    // Diffuser la liste complète des utilisateurs à tous les clients
    io.emit("userList", users);
  });

  // Lorsqu'un utilisateur se déconnecte
  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
    users = users.filter((user) => user.id !== socket.id); // Supprimer l'utilisateur du tableau

    // Diffuser la liste mise à jour des utilisateurs à tous les clients

    io.emit("userList", users);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Serveur Socket.IO en cours d'exécution sur http://localhost:${PORT}`);
});
