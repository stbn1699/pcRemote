const {tapKey} = require("../platform/windows");

const mediaCommands = {
	media_play_pause: () => "Commande simulée : media_play_pause",
	youtube_seek_backward: async () => {
		await tapKey(0x25);
		return "Vidéo reculée de 5 secondes";
	},
	youtube_seek_forward: async () => {
		await tapKey(0x27);
		return "Vidéo avancée de 5 secondes";
	},
	youtube_toggle_playback: async () => {
		await tapKey(0x20);
		return "Lecture YouTube basculée";
	},
	youtube_next_video: () => "Commande simulée : youtube_next_video",
	youtube_fullscreen: async () => {
		await tapKey(0x46);
		return "Mode plein écran YouTube activé";
	},
};

module.exports = mediaCommands;
