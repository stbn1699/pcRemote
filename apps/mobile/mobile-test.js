const {randomUUID} = require("node:crypto");
const readline = require("node:readline");
const {io} = require("socket.io-client");

const BACKEND_URL = "http://localhost:3000";

const USER_ID = "user-demo-001";
const USER_TOKEN = "user-token-local-demo";

const PC_ID = "pc-demo-001";

const COMMANDS = {
	"1": {
		label: "Volume +",
		action: "volume_up",
	},
	"2": {
		label: "Volume -",
		action: "volume_down",
	},
	"3": {
		label: "Fenêtre suivante",
		action: "window_next",
	},
	"4": {
		label: "Fenêtre précédente",
		action: "window_previous",
	},
	"5": {
		label: "Pause / lecture média",
		action: "media_play_pause",
	},
};

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const socket = io(BACKEND_URL);

function showMenu() {
	console.log("");
	console.log("Que veux-tu envoyer ?");

	for (const [key, command] of Object.entries(COMMANDS)) {
		console.log(`${key}. ${command.label}`);
	}

	console.log("6. Quitter");

	rl.question("> ", handleMenuChoice);
}

function handleMenuChoice(choice) {
	const trimmedChoice = choice.trim();

	if (trimmedChoice === "6") {
		console.log("[mobile] Fermeture du client.");
		socket.disconnect();
		rl.close();
		process.exit(0);
	}

	const selectedCommand = COMMANDS[trimmedChoice];

	if (!selectedCommand) {
		console.log("[mobile] Choix invalide.");
		showMenu();
		return;
	}

	const command = {
		commandId: randomUUID(),
		pcId: PC_ID,
		action: selectedCommand.action,
		payload: null,
	};

	console.log(`[mobile] Envoi : ${selectedCommand.label}`);

	socket.emit("command:send", command, (sendResponse) => {
		if (!sendResponse.ok) {
			console.error("[mobile] Commande refusée :", sendResponse.error);
			showMenu();
			return;
		}

		console.log("[mobile] Commande transmise au PC.");
	});
}

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
				console.error(
					"[mobile] Authentification refusée :",
					authResponse.error
				);
				process.exit(1);
			}

			console.log("[mobile] Authentification acceptée.");
			showMenu();
		}
	);
});

socket.on("command:result", (result) => {
	console.log("");
	console.log("[mobile] Résultat du PC :");
	console.log(`- Statut : ${result.status}`);
	console.log(`- Message : ${result.message ?? "Aucun message"}`);

	showMenu();
});

socket.on("connect_error", (error) => {
	console.error("[mobile] Erreur de connexion :", error.message);
});

socket.on("disconnect", (reason) => {
	console.log(`[mobile] Déconnecté : ${reason}`);
});