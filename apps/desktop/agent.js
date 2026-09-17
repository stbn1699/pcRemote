const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log(`[desktop] Connecté au backend : ${socket.id}`);

  socket.emit("hello", {
    from: "desktop",
    message: "Salut depuis l'agent PC",
  });
});

socket.on("hello:response", (response) => {
  console.log("[desktop] Réponse reçue :", response);
});

socket.on("connect_error", (error) => {
  console.error("[desktop] Erreur de connexion :", error.message);
});

socket.on("disconnect", (reason) => {
  console.log(`[desktop] Déconnecté : ${reason}`);
});