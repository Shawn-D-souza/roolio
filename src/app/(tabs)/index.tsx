import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/ThemeProvider";
import { EmptyState } from "../../components/home/EmptyState";
import { AddAppButton } from "../../components/home/AddAppButton";

export default function HomeScreen() {
  const { colors } = useAppTheme();

  const handleAddApp = () => {
    console.log("Navigating to Add App...");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <EmptyState />
      <AddAppButton onPress={handleAddApp} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
