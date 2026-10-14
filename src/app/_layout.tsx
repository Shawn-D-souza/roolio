import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { ThemeProvider } from "../theme/ThemeProvider";
import { DATABASE_NAME, migrateDatabase } from "../db/database";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add-app"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="budget/[packageName]"
            options={{ animation: "slide_from_right" }}
          />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
