import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, space } from "../theme/tokens";
import { useInstalledApps } from "../hooks/installedApps/useInstalledApps";
import { useBudgets } from "../hooks/budgets/useBudgets";
import { AppRow, APP_ROW_HEIGHT } from "../components/addApp/AppRow";
import { InstalledApp } from "../../modules/installed-apps";

const SEARCH_HEIGHT = 56;
const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLocaleLowerCase()
    .trim();
}

const keyExtractor = (app: InstalledApp) => app.packageName;

const getItemLayout = (_: unknown, index: number) => ({
  length: APP_ROW_HEIGHT,
  offset: APP_ROW_HEIGHT * index,
  index,
});

export default function AddAppScreen() {
  const { colors } = useAppTheme();
  const {
    apps: installedApps,
    status: appsStatus,
    reload,
  } = useInstalledApps();
  const { budgetedPackages, status: budgetsStatus } = useBudgets();
  // Hold the list until budgets load, so budgeted apps never flash in.
  const status =
    appsStatus === "ready" && budgetsStatus === "loading"
      ? "loading"
      : appsStatus;
  const [query, setQuery] = useState("");
  // Filtering runs at low priority so typing never waits on the list.
  const deferredQuery = useDeferredValue(query);
  const hasSelected = useRef(false);

  // Apps that already have a budget are edited from Home, not added again.
  const apps = useMemo(
    () => installedApps.filter((app) => !budgetedPackages.has(app.packageName)),
    [installedApps, budgetedPackages],
  );

  // Normalize once per app list, not on every keystroke.
  const searchIndex = useMemo(
    () =>
      apps.map((app) => ({
        app,
        haystack: `${normalize(app.appName)}\n${app.packageName.toLowerCase()}`,
      })),
    [apps],
  );

  const filteredApps = useMemo(() => {
    const needle = normalize(deferredQuery);
    if (!needle) return apps;
    return searchIndex
      .filter((entry) => entry.haystack.includes(needle))
      .map((entry) => entry.app);
  }, [apps, searchIndex, deferredQuery]);

  const handleSelect = useCallback((app: InstalledApp) => {
    // Guard against a double tap opening the editor twice.
    if (hasSelected.current) return;
    hasSelected.current = true;
    // Replace the picker so going back from the editor returns to Home.
    router.replace({
      pathname: "/budget/[packageName]",
      params: {
        packageName: app.packageName,
        appName: app.appName,
        iconVersion: String(app.updatedAt),
      },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: InstalledApp }) => (
      <AppRow app={item} onPress={handleSelect} />
    ),
    [handleSelect],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surfaceContainerHigh },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search apps"
          placeholderTextColor={colors.onSurfaceVariant}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.input, { color: colors.onSurface }]}
        />

        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={space.sm}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.iconButton}
          >
            <MaterialIcons
              name="close"
              size={24}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        )}
      </View>

      {status === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centered}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={colors.onSurfaceVariant}
          />
          <Text style={[styles.headline, { color: colors.onSurface }]}>
            Couldn&apos;t load your apps
          </Text>
          <Pressable
            onPress={reload}
            accessibilityRole="button"
            style={styles.textButton}
          >
            <Text style={[styles.textButtonLabel, { color: colors.primary }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      )}

      {status === "ready" && (
        <FlatList
          data={filteredApps}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={14}
          maxToRenderPerBatch={14}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialIcons
                name="search-off"
                size={48}
                color={colors.onSurfaceVariant}
              />
              <Text style={[styles.headline, { color: colors.onSurface }]}>
                {deferredQuery.trim()
                  ? `No apps match "${deferredQuery.trim()}"`
                  : "No apps to show"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    height: SEARCH_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: space.lg,
    marginTop: space.sm,
    marginBottom: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.full,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: space.xs,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: space.xl,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
    gap: space.md,
  },
  headline: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  textButton: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
  },
  textButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
