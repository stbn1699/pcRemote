import {SafeAreaView, StyleSheet, Text} from "react-native";

export default function App() {
	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.title}>PC Remote</Text>
			<Text style={styles.subtitle}>Nouvelle application mobile en préparation.</Text>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		backgroundColor: "#111827",
		flex: 1,
		justifyContent: "center",
		padding: 24
	},
	title: {
		color: "#FFFFFF",
		fontSize: 32,
		fontWeight: "800"
	},
	subtitle: {
		color: "#D1D5DB",
		fontSize: 16,
		marginTop: 12,
		textAlign: "center"
	}
});
