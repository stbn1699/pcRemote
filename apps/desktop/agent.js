const {io} = require("socket.io-client");
const {spawn} = require("node:child_process");

const BACKEND_URL = "http://localhost:3000";

const PC_ID = "pc-demo-001";
const PC_NAME = "PC de Bastien";

// Valeur provisoire : plus tard, elle sera créée lors de l'appairage
// et sauvegardée localement dans l'agent.
const AGENT_TOKEN = "agent-token-local-demo";

const VOLUME_KEYS = {
	volume_up: 0xAF,
	volume_down: 0xAE,
};

let volumeCommandQueue = Promise.resolve();
let volumePowerShell;
let volumePowerShellBuffer = "";
const volumePowerShellWaiters = [];

function createVolumePowerShell() {
	if (process.platform !== "win32") {
		return null;
	}

	const powershellScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeMethods {
	[DllImport("user32.dll")]
	public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, UIntPtr extraInfo);
}
"@
while ($null -ne ($line = [Console]::In.ReadLine())) {
	try {
		$key = [byte][int]$line
		[NativeMethods]::keybd_event($key, 0, 0, [UIntPtr]::Zero)
		[NativeMethods]::keybd_event($key, 0, 2, [UIntPtr]::Zero)
		[Console]::Out.WriteLine("OK")
	} catch {
		[Console]::Out.WriteLine("ERR:" + $_.Exception.Message)
	}
	[Console]::Out.Flush()
}
`;

	const child = spawn("powershell.exe", [
		"-NoLogo",
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy",
		"Bypass",
		"-Command",
		powershellScript,
	], {
		windowsHide: true,
	});

	child.stdout.setEncoding("utf8");
	child.stdout.on("data", (chunk) => {
		volumePowerShellBuffer += chunk;

		while (volumePowerShellBuffer.includes("\n")) {
			const newlineIndex = volumePowerShellBuffer.indexOf("\n");
			const response = volumePowerShellBuffer.slice(0, newlineIndex).trim();
			volumePowerShellBuffer = volumePowerShellBuffer.slice(newlineIndex + 1);
			volumePowerShellWaiters.shift()?.(response);
		}
	});

	child.on("error", (error) => {
		while (volumePowerShellWaiters.length > 0) {
			volumePowerShellWaiters.shift()?.(`ERR:${error.message}`);
		}
	});

	return child;
}

function executeVolumeAction(action) {
	const virtualKeyCode = VOLUME_KEYS[action];

	if (!virtualKeyCode) {
		return Promise.resolve(false);
	}

	if (process.platform !== "win32") {
		return Promise.reject(new Error("Les commandes de volume nécessitent Windows."));
	}

	volumePowerShell ??= createVolumePowerShell();
	volumeCommandQueue = volumeCommandQueue.catch(() => {}).then(() => new Promise((resolve, reject) => {
		volumePowerShellWaiters.push((response) => {
			if (response === "OK") {
				resolve(true);
			} else {
				reject(new Error(response.replace(/^ERR:/, "")));
			}
		});

		volumePowerShell.stdin.write(`${virtualKeyCode}\n`);
	}));

	return volumeCommandQueue;
}

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
		const executed = await executeVolumeAction(command.action);

		socket.emit("command:result", {
			commandId: command.commandId,
			pcId: PC_ID,
			status: "executed",
			message: executed
				? `Commande exécutée : ${command.action}`
				: `Commande simulée : ${command.action}`,
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