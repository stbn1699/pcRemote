import "react-native-get-random-values";

import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { io, Socket } from "socket.io-client";

const USER_ID = "user-demo-001";
const USER_TOKEN = "user-token-local-demo";
const PC_ID = "pc-demo-001";

// IMPORTANT : remplace cette IP par l'adresse IPv4 de TON PC.
const DEFAULT_BACKEND_URL = "http://192.168.1.2:3000";

type CommandAction =
	| "volume_up"
	| "volume_down"
	| "volume_mute"
	| "window_selector_open"
	| "window_selector_left"
	| "window_selector_up"
	| "window_selector_right"
	| "window_selector_down"
	| "window_selector_ok"
	| "window_selector_back"
	| "youtube_toggle_playback"
	| "youtube_fullscreen"
	| "keyboard_text"
	| "keyboard_clear";

type CommandResult = {
	commandId: string;
	pcId: string;
	status: "received" | "executed" | "failed";
	message?: string;
};

type RemoteCommand = {
	label: string;
	action: CommandAction;
};

type KeyboardPayload = {
	text: string;
	submit?: boolean;
};

const COMMANDS: RemoteCommand[] = [
	/*{label: "Volume +", action: "volume_up"},
	{label: "Volume −", action: "volume_down"},
	{label: "Mute", action: "volume_mute"},
	{label: "Choisir une fenêtre", action: "window_selector_open"}*/
];

const YOUTUBE_COMMANDS: RemoteCommand[] = [
	{label: "Play / Pause", action: "youtube_toggle_playback"},
	{label: "Plein écran", action: "youtube_fullscreen"}
];

export default function App() {
	const socketRef = useRef<Socket | null>(null);

	const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
	const [isConnected, setIsConnected] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [status, setStatus] = useState("Déconnectée");
	const [isSending, setIsSending] = useState(false);
	const [isWindowSelectorOpen, setIsWindowSelectorOpen] = useState(false);
	const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
	const [keyboardText, setKeyboardText] = useState("");
	const keyboardTextRef = useRef("");
	const pendingActionsRef = useRef(new Map<string, CommandAction>());
	const pendingKeyboardTextsRef = useRef(new Map<string, string>());

	function disconnect() {
		socketRef.current?.disconnect();
		socketRef.current = null;

		setIsConnected(false);
		setIsAuthenticated(false);
		setIsSending(false);
		setIsWindowSelectorOpen(false);
		setIsKeyboardOpen(false);
		setKeyboardText("");
		keyboardTextRef.current = "";
		pendingActionsRef.current.clear();
		pendingKeyboardTextsRef.current.clear();
		setStatus("Déconnectée");
	}

	function connect() {
		disconnect();

		const normalizedUrl = backendUrl.trim().replace(/\/$/, "");

		if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
			Alert.alert(
				"Adresse invalide",
				"Utilise par exemple : http://192.168.1.2:3000"
			);
			return;
		}

		setStatus("Connexion au backend…");

		const socket = io(normalizedUrl, {
			transports: ["websocket"],
			autoConnect: true
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			setIsConnected(true);
			setStatus("Authentification…");

			socket.emit(
				"mobile:authenticate",
				{
					userId: USER_ID,
					userToken: USER_TOKEN
				},
				(response: { ok: boolean; error?: string }) => {
					if (!response?.ok) {
						setStatus("Authentification refusée");
						Alert.alert(
							"Authentification refusée",
							response?.error ?? "Erreur inconnue."
						);
						return;
					}

					setIsAuthenticated(true);
					setStatus("Connectée au PC");
				}
			);
		});

		socket.on("command:result", (result: CommandResult) => {
			const action = pendingActionsRef.current.get(result.commandId);
			pendingActionsRef.current.delete(result.commandId);
			const sentKeyboardText = pendingKeyboardTextsRef.current.get(result.commandId);
			pendingKeyboardTextsRef.current.delete(result.commandId);

			if (action !== "keyboard_text" && action !== "keyboard_clear") {
				setIsSending(false);
			} else if (
				result.status === "executed" &&
				sentKeyboardText !== undefined &&
				keyboardTextRef.current === sentKeyboardText
			) {
				keyboardTextRef.current = "";
				setKeyboardText("");
			} else if (result.status === "executed" && action === "keyboard_clear") {
				keyboardTextRef.current = "";
				setKeyboardText("");
			}

			if (result.status === "executed" && action === "window_selector_open") {
				setIsWindowSelectorOpen(true);
			} else if (
				result.status === "executed" &&
				(action === "window_selector_ok" || action === "window_selector_back")
			) {
				setIsWindowSelectorOpen(false);
			}

			setStatus(
				result.status === "executed"
					? `Exécutée : ${result.message ?? "OK"}`
					: `Échec : ${result.message ?? result.status}`
			);
		});

		socket.on("connect_error", (error) => {
			setIsConnected(false);
			setIsAuthenticated(false);
			setStatus("Connexion impossible");

			console.error("[mobile] Erreur Socket.IO :", error.message);
		});

		socket.on("disconnect", (reason) => {
			setIsConnected(false);
			setIsAuthenticated(false);
			setIsSending(false);
			setStatus(`Déconnectée : ${reason}`);
		});
	}

	function sendCommand(action: CommandAction, payload: KeyboardPayload | null = null) {
		const socket = socketRef.current;

		if (!socket || !isAuthenticated) {
			Alert.alert("Non connectée", "Connecte d'abord l'application au backend.");
			return;
		}

		const commandId = randomUUID();
		pendingActionsRef.current.set(commandId, action);
		if (action === "keyboard_text" && payload) {
			pendingKeyboardTextsRef.current.set(commandId, payload.text);
		}

		if (action !== "keyboard_text") {
			setIsSending(true);
			setStatus("Transmission de la commande…");
		}

		socket.emit(
			"command:send",
			{
				commandId,
				pcId: PC_ID,
				action,
				payload
			},
			(response: {
				ok: boolean;
				error?: string;
				status?: string;
			}) => {
				if (!response?.ok) {
					pendingActionsRef.current.delete(commandId);
					pendingKeyboardTextsRef.current.delete(commandId);
					if (action !== "keyboard_text") {
						setIsSending(false);
						setStatus("Commande refusée");
						Alert.alert(
							"Commande refusée",
							response?.error ?? "Le backend a refusé la commande."
						);
					} else {
						console.error("[mobile] Commande clavier refusée :", response?.error);
					}
					return;
				}

				if (action !== "keyboard_text") {
					setStatus("Commande transmise au PC…");
				}
			}
		);
	}

	function toggleKeyboard() {
		if (isKeyboardOpen) {
			Keyboard.dismiss();
			setIsKeyboardOpen(false);
			keyboardTextRef.current = "";
			setKeyboardText("");
			return;
		}

		keyboardTextRef.current = "";
		setKeyboardText("");
		setIsKeyboardOpen(true);
	}

	function sendKeyboardText() {
		if (keyboardText.length === 0) {
			return;
		}

		sendCommand("keyboard_text", {text: keyboardText, submit: true});
	}

	function clearKeyboardText() {
		sendCommand("keyboard_clear");
	}

	useEffect(() => {
		return () => {
			socketRef.current?.disconnect();
		};
	}, []);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>PC Remote</Text>
				<Text style={styles.subtitle}>Prototype de télécommande</Text>
			</View>

			<View style={styles.card}>
				<Text style={styles.label}>Adresse du backend</Text>

				<TextInput
					value={backendUrl}
					onChangeText={setBackendUrl}
					editable={!isConnected}
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="url"
					placeholder="http://192.168.1.2:3000"
					placeholderTextColor="#6b7280"
					style={styles.input}
				/>

				<Pressable
					onPress={isConnected ? disconnect : connect}
					style={[
						styles.connectionButton,
						isConnected ? styles.disconnectButton : styles.connectButton
					]}
				>
					<Text style={styles.connectionButtonText}>
						{isConnected ? "Se déconnecter" : "Se connecter"}
					</Text>
				</Pressable>
			</View>

			<View style={styles.statusRow}>
				<View
					style={[
						styles.statusDot,
						isAuthenticated ? styles.statusOnline : styles.statusOffline
					]}
				/>
				<Text style={styles.statusText}>{status}</Text>
			</View>

			{isWindowSelectorOpen ? (
				<View style={styles.selector}>
					<Text style={styles.selectorTitle}>Choisir une fenêtre</Text>

					<View style={styles.selectorRow}>
						<View style={styles.selectorSpacer}/>
						<Pressable
							disabled={isSending}
							onPress={() => sendCommand("window_selector_up")}
							style={[styles.directionButton, isSending && styles.buttonDisabled]}
						>
							<Text style={styles.directionButtonText}>↑</Text>
						</Pressable>
						<View style={styles.selectorSpacer}/>
					</View>

					<View style={styles.selectorRow}>
						<Pressable
							disabled={isSending}
							onPress={() => sendCommand("window_selector_left")}
							style={[styles.directionButton, isSending && styles.buttonDisabled]}
						>
							<Text style={styles.directionButtonText}>←</Text>
						</Pressable>
						<Pressable
							disabled={isSending}
							onPress={() => sendCommand("window_selector_ok")}
							style={[styles.directionButton, styles.okButton, isSending && styles.buttonDisabled]}
						>
							<Text style={styles.directionButtonText}>OK</Text>
						</Pressable>
						<Pressable
							disabled={isSending}
							onPress={() => sendCommand("window_selector_right")}
							style={[styles.directionButton, isSending && styles.buttonDisabled]}
						>
							<Text style={styles.directionButtonText}>→</Text>
						</Pressable>
					</View>

					<View style={styles.selectorRow}>
						<View style={styles.selectorSpacer}/>
						<Pressable
							disabled={isSending}
							onPress={() => sendCommand("window_selector_down")}
							style={[styles.directionButton, isSending && styles.buttonDisabled]}
						>
							<Text style={styles.directionButtonText}>↓</Text>
						</Pressable>
						<View style={styles.selectorSpacer}/>
					</View>

					<Pressable
						disabled={isSending}
						onPress={() => sendCommand("window_selector_back")}
						style={[styles.backButton, isSending && styles.buttonDisabled]}
					>
						<Text style={styles.commandButtonText}>Retour</Text>
					</Pressable>
				</View>
			) : (
				<View style={styles.commands}>
					<Pressable
						disabled={!isAuthenticated}
						onPress={toggleKeyboard}
						style={[styles.keyboardButton, !isAuthenticated && styles.buttonDisabled]}
					>
						<Text style={styles.commandButtonText}>
							{isKeyboardOpen ? "Fermer le clavier" : "Ouvrir le clavier"}
						</Text>
					</Pressable>

					{isKeyboardOpen && (
						<View style={styles.keyboardRow}>
							<TextInput
								autoFocus
								value={keyboardText}
								onChangeText={(text) => {
									keyboardTextRef.current = text;
									setKeyboardText(text);
								}}
								editable={isAuthenticated}
								autoCapitalize="sentences"
								autoCorrect={false}
								returnKeyType="send"
								onSubmitEditing={sendKeyboardText}
								placeholder="Tapez ici pour écrire sur le PC"
								placeholderTextColor="#9CA3AF"
								style={styles.keyboardInput}
							/>
							<Pressable
								accessibilityLabel="Envoyer le texte au PC"
								disabled={!isAuthenticated || keyboardText.length === 0}
								onPress={sendKeyboardText}
								style={[
									styles.sendButton,
									(!isAuthenticated || keyboardText.length === 0) && styles.buttonDisabled
								]}
							>
								<Text style={styles.sendButtonText}>➤</Text>
							</Pressable>
						</View>
					)}

					{isKeyboardOpen && (
						<Pressable
							accessibilityLabel="Effacer le champ texte du PC"
							disabled={!isAuthenticated}
							onPress={clearKeyboardText}
							style={[styles.clearButton, !isAuthenticated && styles.buttonDisabled]}
						>
							<Text style={styles.clearButtonText}>Ctrl+A · Effacer</Text>
						</Pressable>
					)}

					{COMMANDS.map((command) => (
						<Pressable
							key={command.action}
							disabled={!isAuthenticated || isSending}
							onPress={() => sendCommand(command.action)}
							style={[
								styles.commandButton,
								(!isAuthenticated || isSending) && styles.buttonDisabled
							]}
						>
							<Text style={styles.commandButtonText}>{command.label}</Text>
						</Pressable>
					))}

					<Text style={styles.sectionTitle}>YouTube</Text>

					{YOUTUBE_COMMANDS.map((command) => (
						<Pressable
							key={command.action}
							disabled={!isAuthenticated || isSending}
							onPress={() => sendCommand(command.action)}
							style={[
								styles.commandButton,
								(!isAuthenticated || isSending) && styles.buttonDisabled
							]}
						>
							<Text style={styles.commandButtonText}>{command.label}</Text>
						</Pressable>
					))}
				</View>
			)}

			{isSending && (
				<View style={styles.loadingRow}>
					<ActivityIndicator color="#a78bfa"/>
					<Text style={styles.loadingText}>Attente du PC…</Text>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#111827",
		padding: 20
	},
	header: {
		marginTop: 28,
		marginBottom: 30
	},
	title: {
		color: "#FFF",
		fontSize: 32,
		fontWeight: "800"
	},
	subtitle: {
		color: "#9CA3AF",
		fontSize: 16,
		marginTop: 4
	},
	card: {
		backgroundColor: "#1F2937",
		borderColor: "#374151",
		borderRadius: 16,
		borderWidth: 1,
		padding: 16
	},
	label: {
		color: "#D1D5DB",
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 8
	},
	input: {
		backgroundColor: "#111827",
		borderColor: "#4B5563",
		borderRadius: 10,
		borderWidth: 1,
		color: "#FFF",
		fontSize: 16,
		paddingHorizontal: 12,
		paddingVertical: 12
	},
	connectionButton: {
		alignItems: "center",
		borderRadius: 10,
		marginTop: 12,
		paddingVertical: 14
	},
	connectButton: {
		backgroundColor: "#7C3AED"
	},
	disconnectButton: {
		backgroundColor: "#B91C1C"
	},
	connectionButtonText: {
		color: "#FFF",
		fontSize: 16,
		fontWeight: "700"
	},
	statusRow: {
		alignItems: "center",
		flexDirection: "row",
		marginVertical: 22
	},
	statusDot: {
		borderRadius: 6,
		height: 12,
		marginRight: 8,
		width: 12
	},
	statusOnline: {
		backgroundColor: "#22c55e"
	},
	statusOffline: {
		backgroundColor: "#EF4444"
	},
	statusText: {
		color: "#D1D5DB",
		flex: 1,
		fontSize: 14
	},
	commands: {
		gap: 12
	},
	commandButton: {
		alignItems: "center",
		backgroundColor: "#312E81",
		borderColor: "#6366F1",
		borderRadius: 14,
		borderWidth: 1,
		paddingVertical: 18
	},
	commandButtonText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "700"
	},
	sectionTitle: {
		borderBottomColor: "#374151",
		borderBottomWidth: 1,
		color: "#A78BFA",
		fontSize: 15,
		fontWeight: "800",
		marginTop: 8,
		paddingBottom: 8,
		textTransform: "uppercase"
	},
	keyboardButton: {
		alignItems: "center",
		backgroundColor: "#047857",
		borderColor: "#10B981",
		borderRadius: 14,
		borderWidth: 1,
		paddingVertical: 18
	},
	keyboardInput: {
		backgroundColor: "#FFF",
		borderRadius: 12,
		color: "#111827",
		fontSize: 18,
		flex: 1,
		minHeight: 54,
		paddingHorizontal: 14,
		paddingVertical: 12
	},
	keyboardRow: {
		alignItems: "center",
		flexDirection: "row",
		gap: 8
	},
	sendButton: {
		alignItems: "center",
		backgroundColor: "#7C3AED",
		borderRadius: 12,
		height: 54,
		justifyContent: "center",
		width: 54
	},
	sendButtonText: {
		color: "#FFF",
		fontSize: 24,
		fontWeight: "800",
		transform: [{rotate: "-25deg"}]
	},
	clearButton: {
		alignItems: "center",
		backgroundColor: "#4B5563",
		borderRadius: 10,
		marginTop: 8,
		paddingVertical: 10
	},
	clearButtonText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600"
	},
	buttonDisabled: {
		opacity: 0.4
	},
	loadingRow: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "center",
		marginTop: 24
	},
	loadingText: {
		color: "#A78BFA",
		marginLeft: 10
	},
	selector: {
		alignItems: "center",
		backgroundColor: "#1F2937",
		borderColor: "#374151",
		borderRadius: 16,
		borderWidth: 1,
		padding: 16
	},
	selectorTitle: {
		color: "#FFF",
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 20
	},
	selectorRow: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 12
	},
	selectorSpacer: {
		height: 64,
		width: 64
	},
	directionButton: {
		alignItems: "center",
		backgroundColor: "#312E81",
		borderColor: "#6366F1",
		borderRadius: 14,
		borderWidth: 1,
		height: 64,
		justifyContent: "center",
		width: 64
	},
	directionButtonText: {
		color: "#FFF",
		fontSize: 22,
		fontWeight: "800"
	},
	okButton: {
		backgroundColor: "#047857"
	},
	backButton: {
		alignItems: "center",
		backgroundColor: "#4B5563",
		borderRadius: 14,
		marginTop: 8,
		paddingVertical: 16,
		width: "100%"
	}
});