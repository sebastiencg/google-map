// pages/api/socket.js
import {Server} from "socket.io";

let users = {}; // Objet pour stocker les positions des utilisateurs

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("Initialisation du serveur Socket.IO...");
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Nouvel utilisateur connecté :", socket.id);

      // Recevoir et stocker la position de l'utilisateur
      socket.on("location", (data) => {
        users[socket.id] = data.location;

        // Diffuser la position à tous les autres utilisateurs
        socket.broadcast.emit("updateLocation", {id: socket.id, location: data.location});
      });

      // Supprimer l'utilisateur déconnecté
      socket.on("disconnect", () => {
        console.log("Utilisateur déconnecté :", socket.id);
        delete users[socket.id];
      });
    });

    console.log("Socket.IO initialisé");
  } else {
    console.log("Socket.IO déjà initialisé");
  }
  res.end();
}
//Directory structure:
// └── sebastiencg-google-map/
//     ├── README.md
//     ├── eslint.config.mjs
//     ├── next.config.ts
//     ├── package.json
//     ├── postcss.config.mjs
//     ├── tailwind.config.ts
//     ├── tsconfig.json
//     ├── public/
//     └── src/
//         └── app/
//             ├── globals.css
//             ├── layout.tsx
//             ├── page.tsx
//             └── components/
//                 └── GoogleMaps.tsx
