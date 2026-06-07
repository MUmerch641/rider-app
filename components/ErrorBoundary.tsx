import { Colors } from "@/constants/theme";
import * as Updates from "expo-updates";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * App-wide error boundary. A render error anywhere in the tree would otherwise
 * unmount everything and leave a BLANK WHITE SCREEN (the symptom seen when
 * quickly browsing). This catches it and shows a recoverable fallback instead.
 * Error boundaries must be class components.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep a trace instead of a silent white screen.
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught a render error:", error, info);
  }

  private reset = () => this.setState({ hasError: false });

  private reload = () => {
    // Full JS reload recovers cleanly; fall back to a local reset if it fails.
    Updates.reloadAsync().catch(this.reset);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          حدث خطأ ما — please try again.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.reload} activeOpacity={0.85}>
          <Text style={styles.btnText}>Reload</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B6B6B", textAlign: "center", marginBottom: 24 },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors?.primary ?? "#3F1A96",
  },
  btnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
