const {sendVolumeKey} = require("../platform/windows");

const volumeCommands = {
	volume_up: () => sendVolumeKey("volume_up"),
	volume_down: () => sendVolumeKey("volume_down"),
};

module.exports = volumeCommands;
