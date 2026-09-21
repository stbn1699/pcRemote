const {keyDown, keyUp, tapKey} = require("../platform/windows");

const SHIFT_KEY = 0x10;
const N_KEY = 0x4E;
const P_KEY = 0x50;

async function tapShiftedKey(key) {
	await keyDown(SHIFT_KEY);
	try {
		await tapKey(key);
	} finally {
		await keyUp(SHIFT_KEY);
	}
}

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
	youtube_previous_video: async () => {
		await tapShiftedKey(P_KEY);
		return "Vidéo YouTube précédente";
	},
	youtube_next_video: async () => {
		await tapShiftedKey(N_KEY);
		return "Vidéo YouTube suivante";
	},
	youtube_open_search: async () => {
		await tapKey(0xBF);
		return "Recherche YouTube ouverte";
	},
	youtube_fullscreen: async () => {
		await tapKey(0x46);
		return "Mode plein écran YouTube activé";
	},
};

module.exports = mediaCommands;
