import { useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

// Turns `target` into an image, all of it, including any part scrolled out of
// view, and opens the system share sheet with it.
export function ShareButton({
  target,
}: {
  target: RefObject<View | null>;
}) {
  const { colors } = useAppTheme();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) return;
      const uri = await captureRef(target, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your stats",
      });
    } catch {
      // Nothing to recover: a screenshot still works.
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.clip}>
      <Pressable
        onPress={handleShare}
        disabled={sharing}
        accessibilityRole="button"
        accessibilityLabel="Share"
        accessibilityHint="Shares these stats as an image"
        android_ripple={{ color: colors.surfaceContainerHighest }}
        style={styles.button}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <MaterialIcons name="share" size={20} color={colors.primary} />
        )}
        <Text style={[styles.label, { color: colors.primary }]}>Share</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: radius.full,
    overflow: "hidden",
    // Lines the label up with the content's edge; the padding is touch area.
    marginRight: -space.lg,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
