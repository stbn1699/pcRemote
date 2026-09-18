const {spawn} = require("node:child_process");

const VOLUME_KEYS = {
	volume_up: 0xAF,
	volume_down: 0xAE,
	volume_mute: 0xAD,
};

let commandQueue = Promise.resolve();
let powerShell;
let powerShellBuffer = "";
const powerShellWaiters = [];

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
		$parts = $line.Split(":")
		$key = [byte][int]$parts[1]
		if ($parts[0] -eq "down") {
			[NativeMethods]::keybd_event($key, 0, 0, [UIntPtr]::Zero)
		} elseif ($parts[0] -eq "up") {
			[NativeMethods]::keybd_event($key, 0, 2, [UIntPtr]::Zero)
		} elseif ($parts[0] -eq "tap") {
			[NativeMethods]::keybd_event($key, 0, 0, [UIntPtr]::Zero)
			[NativeMethods]::keybd_event($key, 0, 2, [UIntPtr]::Zero)
		} else {
			throw "Type de touche inconnu : $($parts[0])"
		}
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
		powerShellBuffer += chunk;

		while (powerShellBuffer.includes("\n")) {
			const newlineIndex = powerShellBuffer.indexOf("\n");
			const response = powerShellBuffer.slice(0, newlineIndex).trim();
			powerShellBuffer = powerShellBuffer.slice(newlineIndex + 1);
			powerShellWaiters.shift()?.(response);
		}
	});

	child.on("error", (error) => {
		while (powerShellWaiters.length > 0) {
			powerShellWaiters.shift()?.(`ERR:${error.message}`);
		}
	});

	return child;
}

function sendWindowsInput(inputs) {
	if (process.platform !== "win32") {
		return Promise.reject(new Error("Les commandes Windows nécessitent Windows."));
	}

	powerShell ??= createVolumePowerShell();
	commandQueue = commandQueue.catch(() => {}).then(async () => {
		for (const input of inputs) {
			await new Promise((resolve, reject) => {
				powerShellWaiters.push((response) => {
					if (response === "OK") {
						resolve();
					} else {
						reject(new Error(response.replace(/^ERR:/, "")));
					}
				});

				powerShell.stdin.write(`${input.type}:${input.key}\n`);
			});
		}
	});

	return commandQueue;
}

function sendVolumeKey(action) {
	const virtualKeyCode = VOLUME_KEYS[action];

	if (!virtualKeyCode) {
		return Promise.reject(new Error(`Commande de volume inconnue : ${action}`));
	}

	return sendWindowsInput([{type: "tap", key: virtualKeyCode}]);
}

function tapKey(key) {
	return sendWindowsInput([{type: "tap", key}]);
}

function keyDown(key) {
	return sendWindowsInput([{type: "down", key}]);
}

function keyUp(key) {
	return sendWindowsInput([{type: "up", key}]);
}

module.exports = {
	keyDown,
	keyUp,
	sendVolumeKey,
	tapKey,
};
