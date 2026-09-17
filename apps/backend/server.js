const { createServer } = require("node:http");
const { Server } = require("socket.io");

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

io.on("connection", (socket) => {
    console.log(`[+] Client connecté : ${socket.id}`);

    socket.on("hello", (message) => {
        console.log(`[hello] ${socket.id} :`, message);

        socket.emit("hello:response", {
            ok: true,
            received: message,
        });
    });

    socket.on("disconnect", (reason) => {
        console.log(`[-] Client déconnecté : ${socket.id} (${reason})`);
    });
});

httpServer.listen(3000, "0.0.0.0", () => {
    console.log("Backend actif sur http://localhost:3000");
});