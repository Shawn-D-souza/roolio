import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { ThemeProvider } from "../theme/ThemeProvider";
import { DATABASE_NAME, migrateDatabase } from "../db/database";
import {
  PermissionsProvider,
  usePermissions,
} from "../permissions/PermissionsProvider";
import { useUsageSync } from "../usage/useUsageSync";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
          <RootStack />
        </SQLiteProvider>
      </PermissionsProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { needsSetup } = usePermissions();
  useUsageSync();

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
    </Stack>
  );
}
