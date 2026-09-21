const volumeCommands = require("./volume");
const windowCommands = require("./windows");
const mediaCommands = require("./media");
const keyboardCommands = require("./keyboard");

const commandHandlers = {
	...volumeCommands,
	...windowCommands,
	...mediaCommands,
	...keyboardCommands,
};

async function executeCommand(command) {
	const handler = commandHandlers[command.action];

	if (!handler) {
		throw new Error(`Commande non supportée : ${command.action}`);
	}

	const result = await handler(command.payload);

	return result ?? `Commande exécutée : ${command.action}`;
}

module.exports = {
	executeCommand,
};
