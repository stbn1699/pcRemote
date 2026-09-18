const {io} = require("socket.io-client");
const {executeCommand} = require("./commands");

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

socket.on("command:execute", async (command) => {
	console.log("");
	console.log("========== COMMANDE REÇUE ==========");
	console.log(`PC cible   : ${command.pcId}`);
	console.log(`Action     : ${command.action}`);
	console.log(`Command ID : ${command.commandId}`);
	console.log("====================================");

	try {
		const message = await executeCommand(command);

		socket.emit("command:result", {
			commandId: command.commandId,
			pcId: PC_ID,
			status: "executed",
			message,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		console.error(`[desktop] Échec de la commande ${command.action} : ${message}`);

		socket.emit("command:result", {
			commandId: command.commandId,
			pcId: PC_ID,
			status: "failed",
			message,
		});
	}
});

socket.on("connect_error", (error) => {
	console.error("[desktop] Erreur de connexion :", error.message);
});

socket.on("disconnect", (reason) => {
	console.log(`[desktop] Déconnecté : ${reason}`);
});
