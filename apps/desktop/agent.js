const {io} = require("socket.io-client");

const BACKEND_URL = "http://localhost:3000";

const PC_ID = "pc-demo-001";
const PC_NAME = "PC de Bastien";

// Valeur provisoire : plus tard, elle sera créée lors de l'appairage
// et sauvegardée localement dans l'agent.
const AGENT_TOKEN = "agent-token-local-demo";

const socket = io(BACKEND_URL);

socket.on("connect", () => {
	console.log(`[desktop] Connecté au backend : ${socket.id}`);

	socket.emit(
		"agent:register",
		{
			pcId: PC_ID,
			pcName: PC_NAME,
			agentToken: AGENT_TOKEN,
		},
		(response) => {
			if (!response.ok) {
				console.error("[desktop] Inscription refusée :", response.error);
				return;
			}

			console.log("[desktop] Enregistrement accepté :", response);
		}
	);
});

socket.on("command:execute", (command) => {
	console.log("");
	console.log("========== COMMANDE REÇUE ==========");
	console.log(`PC cible   : ${command.pcId}`);
	console.log(`Action     : ${command.action}`);
	console.log(`Command ID : ${command.commandId}`);
	console.log("====================================");

	// Plus tard, ici on exécutera réellement la commande Windows.
	// Pour le moment, on confirme uniquement au backend.
	socket.emit("command:result", {
		commandId: command.commandId,
		pcId: PC_ID,
		status: "executed",
		message: `Commande simulée : ${command.action}`,
	});
});

socket.on("connect_error", (error) => {
	console.error("[desktop] Erreur de connexion :", error.message);
});

socket.on("disconnect", (reason) => {
	console.log(`[desktop] Déconnecté : ${reason}`);
});