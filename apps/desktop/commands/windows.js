const {keyDown, keyUp, tapKey} = require("../platform/windows");

const ALT_KEY = 0x12;
const TAB_KEY = 0x09;
const ENTER_KEY = 0x0D;
const ESCAPE_KEY = 0x1B;
const ARROW_KEYS = {
	window_selector_left: 0x25,
	window_selector_up: 0x26,
	window_selector_right: 0x27,
	window_selector_down: 0x28,
};

let windowSelectorOpen = false;

const windowCommands = {
	window_selector_open: async () => {
		if (windowSelectorOpen) {
			return "Sélecteur de fenêtres déjà ouvert";
		}

		await keyDown(ALT_KEY);
		await tapKey(TAB_KEY);
		windowSelectorOpen = true;
		return "Sélecteur de fenêtres ouvert";
	},
	window_selector_ok: async () => {
		if (!windowSelectorOpen) {
			throw new Error("Le sélecteur de fenêtres n'est pas ouvert.");
		}

		await tapKey(ENTER_KEY);
		await keyUp(ALT_KEY);
		windowSelectorOpen = false;
		return "Fenêtre sélectionnée";
	},
	window_selector_back: async () => {
		if (!windowSelectorOpen) {
			throw new Error("Le sélecteur de fenêtres n'est pas ouvert.");
		}

		await tapKey(ESCAPE_KEY);
		await keyUp(ALT_KEY);
		windowSelectorOpen = false;
		return "Sélecteur fermé sans changer de fenêtre";
	},
};

for (const [action, key] of Object.entries(ARROW_KEYS)) {
	windowCommands[action] = async () => {
		if (!windowSelectorOpen) {
			throw new Error("Le sélecteur de fenêtres n'est pas ouvert.");
		}

		await tapKey(key);
		return "Sélection déplacée";
	};
}

module.exports = windowCommands;
