import { Stack } from "expo-router";
import { ThemeProvider } from "../theme/ThemeProvider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-app"
          options={{ animation: "slide_from_bottom" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
