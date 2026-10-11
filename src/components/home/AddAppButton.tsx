import { StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

export const ADD_BUTTON_SIZE = 64;

type AddAppButtonProps = {
  onPress: () => void;
};

export function AddAppButton({ onPress }: AddAppButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={[
        styles.fab,
        { backgroundColor: colors.primary, borderRadius: radius.full },
      ]}
      onPress={onPress}
    >
      <MaterialIcons name="add" size={28} color={colors.onPrimary} />
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
