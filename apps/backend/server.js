const {createServer} = require("node:http");
const {Server} = require("socket.io");

const PORT = 3000;

const httpServer = createServer();

const io = new Server(httpServer, {
	cors: {
		origin: "*",
	},
});

// Ce Set représente temporairement les PC connectés.
// Plus tard, ces informations seront stockées en base de données.
const connectedPcs = new Set();
const connectedMobiles = new Map();
const pendingCommands = new Map();

const ALLOWED_ACTIONS = new Set([
	"volume_up",
	"volume_down",
	"volume_mute",
	"window_selector_open",
	"window_selector_left",
	"window_selector_up",
	"window_selector_right",
	"window_selector_down",
	"window_selector_ok",
	"window_selector_back",
	"media_play_pause",
	"youtube_toggle_playback",
	"youtube_next_video",
]);

function getPcRoom(pcId) {
	return `pc:${pcId}`;
}

io.on("connection", (socket) => {
	console.log(`[+] Client connecté : ${socket.id}`);

	socket.on("agent:register", (agent, acknowledge) => {
		const {pcId, pcName, agentToken} = agent ?? {};

		if (typeof pcId !== "string" || pcId.length === 0 || typeof pcName !== "string" || pcName.length === 0 || typeof agentToken !== "string" || agentToken.length === 0) {
			acknowledge?.({
				ok: false, error: "Données d'enregistrement invalides.",
			});

			return;
		}

		// Le token est présent dès maintenant dans le protocole,
		// mais il n'est pas encore réellement vérifié.
		socket.data.role = "agent";
		socket.data.pcId = pcId;
		socket.data.pcName = pcName;

		socket.join(getPcRoom(pcId));
		connectedPcs.add(pcId);

		console.log(`[PC en ligne] ${pcName} (${pcId})`);

		acknowledge?.({
			ok: true, pcId, message: "Agent enregistré.",
		});
	});

	socket.on("mobile:authenticate", (mobile, acknowledge) => {
		const { userId, userToken } = mobile ?? {};

		if (
			typeof userId !== "string" ||
			userId.length === 0 ||
			typeof userToken !== "string" ||
			userToken.length === 0
		) {
			acknowledge?.({
				ok: false,
				error: "Données d'authentification mobile invalides.",
			});

			return;
		}

		// Le userToken est volontairement fictif au stade du test.
		socket.data.role = "mobile";
		socket.data.userId = userId;

		connectedMobiles.set(userId, socket.id);

		console.log(`[Mobile connecté] user=${userId}`);

		acknowledge?.({
			ok: true,
			userId,
			message: "Mobile authentifié.",
		});
	});

	socket.on("command:send", (command, acknowledge) => {
		if (socket.data.role !== "mobile" || !socket.data.userId) {
			acknowledge?.({
				ok: false,
				error: "Le client doit être authentifié comme mobile.",
			});

			return;
		}

		const { commandId, pcId, action, payload } = command ?? {};

		if (
			typeof commandId !== "string" ||
			commandId.length === 0 ||
			typeof pcId !== "string" ||
			pcId.length === 0 ||
			typeof action !== "string" ||
			!ALLOWED_ACTIONS.has(action)
		) {
			acknowledge?.({
				ok: false,
				error: "Commande invalide ou action non autorisée.",
			});

			return;
		}

		if (!connectedPcs.has(pcId)) {
			acknowledge?.({
				ok: false,
				error: "Ce PC est hors ligne.",
			});

			return;
		}

		pendingCommands.set(commandId, {
			userId: socket.data.userId,
			pcId,
			createdAt: Date.now(),
		});

		console.log(
			`[Commande] user=${socket.data.userId} → pc=${pcId} : ${action}`
		);

		io.to(getPcRoom(pcId)).emit("command:execute", {
			commandId,
			pcId,
			action,
			payload: payload ?? null,
		});

		acknowledge?.({
			ok: true,
			status: "delivered",
			commandId,
		});
	});

	socket.on("command:result", (result) => {
		if (socket.data.role !== "agent" || !socket.data.pcId) {
			return;
		}

		const { commandId, pcId, status, message } = result ?? {};

		if (
			typeof commandId !== "string" ||
			typeof pcId !== "string" ||
			!["received", "executed", "failed"].includes(status)
		) {
			console.warn("[Résultat ignoré] Format invalide.");
			return;
		}

		if (pcId !== socket.data.pcId) {
			console.warn("[Résultat ignoré] Le PC déclaré ne correspond pas à l'agent.");
			return;
		}

		const pendingCommand = pendingCommands.get(commandId);

		if (!pendingCommand) {
			console.warn(`[Résultat ignoré] Commande inconnue : ${commandId}`);
			return;
		}

		const mobileSocketId = connectedMobiles.get(pendingCommand.userId);

		if (mobileSocketId) {
			io.to(mobileSocketId).emit("command:result", {
				commandId,
				pcId,
				status,
				message: typeof message === "string" ? message : undefined,
			});
		}

		pendingCommands.delete(commandId);

		console.log(
			`[Résultat] pc=${pcId} — ${status} — command=${commandId}`
		);
	});

	socket.on("disconnect", (reason) => {
		if (socket.data.role === "agent" && socket.data.pcId) {
			connectedPcs.delete(socket.data.pcId);

			console.log(
				`[PC hors ligne] ${socket.data.pcName} (${socket.data.pcId}) — ${reason}`
			);
		} else if (socket.data.role === "mobile" && socket.data.userId) {
			const currentSocketId = connectedMobiles.get(socket.data.userId);

			if (currentSocketId === socket.id) {
				connectedMobiles.delete(socket.data.userId);
			}

			console.log(`[Mobile déconnecté] user=${socket.data.userId}`);
		} else {
			console.log(`[-] Client déconnecté : ${socket.id} (${reason})`);
		}
	});
});

httpServer.listen(PORT, "0.0.0.0", () => {
	console.log(`Backend actif sur http://localhost:${PORT}`);
});