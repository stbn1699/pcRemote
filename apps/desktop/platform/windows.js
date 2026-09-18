const {spawn} = require("node:child_process");

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

function sendVolumeKey(action) {
	const virtualKeyCode = VOLUME_KEYS[action];

	if (!virtualKeyCode) {
		return Promise.reject(new Error(`Commande de volume inconnue : ${action}`));
	}

	if (process.platform !== "win32") {
		return Promise.reject(new Error("Les commandes de volume nécessitent Windows."));
	}

	volumePowerShell ??= createVolumePowerShell();
	volumeCommandQueue = volumeCommandQueue.catch(() => {}).then(() => new Promise((resolve, reject) => {
		volumePowerShellWaiters.push((response) => {
			if (response === "OK") {
				resolve();
			} else {
				reject(new Error(response.replace(/^ERR:/, "")));
			}
		});

		volumePowerShell.stdin.write(`${virtualKeyCode}\n`);
	}));

	return volumeCommandQueue;
}

module.exports = {
	sendVolumeKey,
};
