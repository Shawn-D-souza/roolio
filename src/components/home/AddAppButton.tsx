import { StyleSheet, Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";
import { LockBadge } from "../ui/LockBadge";

export const ADD_BUTTON_SIZE = 64;

type AddAppButtonProps = {
  onPress: () => void;
  // Another app needs Premium: the button shows a lock and opens Premium.
  locked?: boolean;
};

export function AddAppButton({ onPress, locked = false }: AddAppButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={[
        styles.fab,
        { backgroundColor: colors.primary, borderRadius: radius.full },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? "Add app, needs Premium" : "Add app"}
    >
      {/* Wrapped so the lock sits on the icon's corner. */}
      <View>
        <MaterialIcons name="add" size={28} color={colors.onPrimary} />
        {locked && <LockBadge ringColor={colors.primary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
