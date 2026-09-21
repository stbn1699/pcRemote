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

	[StructLayout(LayoutKind.Sequential)]
	public struct KEYBDINPUT {
		public ushort wVk;
		public ushort wScan;
		public uint dwFlags;
		public uint time;
		public UIntPtr dwExtraInfo;
	}

	[StructLayout(LayoutKind.Explicit, Size = 40)]
	public struct INPUT {
		[FieldOffset(0)]
		public uint type;
		[FieldOffset(8)]
		public KEYBDINPUT ki;
	}

	[DllImport("user32.dll", SetLastError = true)]
	public static extern uint SendInput(uint numberOfInputs, INPUT[] inputs, int size);

	public static void unicode_keybd_event(ushort character) {
		var inputs = new INPUT[2];
		inputs[0].type = 1;
		inputs[0].ki.wScan = character;
		inputs[0].ki.dwFlags = 4;
		inputs[1].type = 1;
		inputs[1].ki.wScan = character;
		inputs[1].ki.dwFlags = 6;
		var sent = SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
		if (sent != 2) {
			throw new Exception("Impossible d'envoyer le caractère Unicode. Code Win32 : " + Marshal.GetLastWin32Error());
		}
	}
}
"@
while ($null -ne ($line = [Console]::In.ReadLine())) {
	try {
		$parts = $line.Split(":")
		$key = [int]$parts[1]
		if ($parts[0] -eq "down") {
			[NativeMethods]::keybd_event([byte]$key, 0, 0, [UIntPtr]::Zero)
		} elseif ($parts[0] -eq "up") {
			[NativeMethods]::keybd_event([byte]$key, 0, 2, [UIntPtr]::Zero)
		} elseif ($parts[0] -eq "tap") {
			[NativeMethods]::keybd_event([byte]$key, 0, 0, [UIntPtr]::Zero)
			[NativeMethods]::keybd_event([byte]$key, 0, 2, [UIntPtr]::Zero)
		} elseif ($parts[0] -eq "unicode") {
			[NativeMethods]::unicode_keybd_event([uint16]$key)
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

function sendText(text) {
	const inputs = text.split("").map((character) => ({
		type: character === "\b" || character === "\n" ? "tap" : "unicode",
		key: character === "\b" ? 0x08 : character === "\n" ? 0x0D : character.charCodeAt(0),
	}));

	return sendWindowsInput(inputs);
}

module.exports = {
	keyDown,
	keyUp,
	sendText,
	sendVolumeKey,
	tapKey,
};
