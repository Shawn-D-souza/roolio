import { Stack } from "expo-router";
import { ThemeProvider } from "../theme/ThemeProvider";
import {
  PermissionsProvider,
  usePermissions,
} from "../permissions/PermissionsProvider";
import { useUsageSync } from "../usage/useUsageSync";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <RootStack />
      </PermissionsProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { showWelcome, needsSetup } = usePermissions();
  useUsageSync();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!showWelcome}>
        {/* Roolio can't track or pause apps until its permissions are granted. */}
        <Stack.Protected guard={!needsSetup}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add-app"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="budget/[packageName]"
            options={{ animation: "slide_from_right" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={needsSetup}>
          <Stack.Screen name="permissions" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack.Protected>
      {/* Shown once, on a new install, before setup. */}
      <Stack.Protected guard={showWelcome}>
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
      </Stack.Protected>
    </Stack>
  );
}
