const { randomUUID } = require("node:crypto");
const { io } = require("socket.io-client");

const BACKEND_URL = "http://localhost:3000";

const USER_ID = "user-demo-001";
const USER_TOKEN = "user-token-local-demo";

const PC_ID = "pc-demo-001";

const socket = io(BACKEND_URL);

socket.on("connect", () => {
	console.log(`[mobile] Connecté au backend : ${socket.id}`);

	socket.emit(
		"mobile:authenticate",
		{
			userId: USER_ID,
			userToken: USER_TOKEN,
		},
		(authResponse) => {
			if (!authResponse.ok) {
				console.error("[mobile] Authentification refusée :", authResponse.error);
				return;
			}

			console.log("[mobile] Authentification acceptée :", authResponse);

			const command = {
				commandId: randomUUID(),
				pcId: PC_ID,
				action: "volume_up",
				payload: null,
			};

			socket.emit("command:send", command, (sendResponse) => {
				console.log("[mobile] Réponse d'envoi :", sendResponse);
			});
		}
	);
});

socket.on("command:result", (result) => {
	console.log("[mobile] Résultat reçu :", result);
});

socket.on("connect_error", (error) => {
	console.error("[mobile] Erreur de connexion :", error.message);
});

socket.on("disconnect", (reason) => {
	console.log(`[mobile] Déconnecté : ${reason}`);
});