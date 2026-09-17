import "react-native-get-random-values";

import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { io, Socket } from "socket.io-client";

const USER_ID = "user-demo-001";
const USER_TOKEN = "user-token-local-demo";
const PC_ID = "pc-demo-001";

// IMPORTANT : remplace cette IP par l'adresse IPv4 de TON PC.
const DEFAULT_BACKEND_URL = "http://192.168.1.42:3000";

type CommandAction =
	| "volume_up"
	| "volume_down"
	| "window_next"
	| "window_previous"
	| "media_play_pause";

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

const COMMANDS: RemoteCommand[] = [
	{label: "Volume +", action: "volume_up"},
	{label: "Volume −", action: "volume_down"},
	{label: "Fenêtre suivante", action: "window_next"},
	{label: "Fenêtre précédente", action: "window_previous"},
	{label: "Pause / Lecture", action: "media_play_pause"}
];

export default function App() {
	const socketRef = useRef<Socket | null>(null);

	const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
	const [isConnected, setIsConnected] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [status, setStatus] = useState("Déconnectée");
	const [isSending, setIsSending] = useState(false);

	function disconnect() {
		socketRef.current?.disconnect();
		socketRef.current = null;

		setIsConnected(false);
		setIsAuthenticated(false);
		setIsSending(false);
		setStatus("Déconnectée");
	}

	function connect() {
		disconnect();

		const normalizedUrl = backendUrl.trim().replace(/\/$/, "");

		if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
			Alert.alert(
				"Adresse invalide",
				"Utilise par exemple : http://192.168.1.42:3000"
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
			setIsSending(false);

			setStatus(
				result.status === "executed"
					? `Exécutée : ${result.message ?? "OK"}`
					: `Résultat : ${result.status}`
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

	function sendCommand(action: CommandAction) {
		const socket = socketRef.current;

		if (!socket || !isAuthenticated) {
			Alert.alert("Non connectée", "Connecte d'abord l'application au backend.");
			return;
		}

		setIsSending(true);
		setStatus("Transmission de la commande…");

		socket.emit(
			"command:send",
			{
				commandId: randomUUID(),
				pcId: PC_ID,
				action,
				payload: null
			},
			(response: {
				ok: boolean;
				error?: string;
				status?: string;
			}) => {
				if (!response?.ok) {
					setIsSending(false);
					setStatus("Commande refusée");
					Alert.alert(
						"Commande refusée",
						response?.error ?? "Le backend a refusé la commande."
					);
					return;
				}

				setStatus("Commande transmise au PC…");
			}
		);
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
					placeholder="http://192.168.1.42:3000"
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

			<View style={styles.commands}>
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
			</View>

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
	}
});