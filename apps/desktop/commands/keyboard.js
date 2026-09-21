const {keyDown, keyUp, sendText, tapKey} = require("../platform/windows");

const MAX_TEXT_LENGTH = 200;
const ENTER_KEY = 0x0D;
const CONTROL_KEY = 0x11;
const A_KEY = 0x41;
const BACKSPACE_KEY = 0x08;

function keyboardText(payload) {
	const text = payload?.text;

	if (typeof text !== "string" || text.length === 0 || text.length > MAX_TEXT_LENGTH) {
		throw new Error("Texte de clavier invalide.");
	}

	return sendText(text)
		.then(() => payload.submit ? tapKey(ENTER_KEY) : undefined)
		.then(() => payload.submit ? "Texte envoyé et validé sur le PC" : "Texte envoyé au PC");
}

async function clearKeyboardText() {
	await keyDown(CONTROL_KEY);
	try {
		await tapKey(A_KEY);
	} finally {
		await keyUp(CONTROL_KEY);
	}
	await tapKey(BACKSPACE_KEY);
	return "Champ texte effacé sur le PC";
}

module.exports = {
	keyboard_clear: clearKeyboardText,
	keyboard_text: keyboardText,
};
