import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useBudgets } from "../../hooks/budgets/useBudgets";
import type { AppBudget } from "../../budgets/types";
import { EmptyState } from "../../components/home/EmptyState";
import {
  AddAppButton,
  ADD_BUTTON_SIZE,
} from "../../components/home/AddAppButton";
import { BudgetCard } from "../../components/home/BudgetCard";

const keyExtractor = (budget: AppBudget) => budget.packageName;

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { budgets, status, reload } = useBudgets();

  const handleAddApp = () => {
    router.push("/add-app");
  };

  const handleOpenBudget = useCallback((budget: AppBudget) => {
    router.push({
      pathname: "/budget/[packageName]",
      params: { packageName: budget.packageName },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AppBudget }) => (
      <BudgetCard budget={item} onPress={handleOpenBudget} />
    ),
    [handleOpenBudget],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            Couldn&apos;t load your budgets
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

      {status === "ready" && budgets.length === 0 && <EmptyState />}

      {status === "ready" && budgets.length > 0 && (
        <FlatList
          data={budgets}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <Text
              style={[styles.title, { color: colors.onSurface }]}
              accessibilityRole="header"
            >
              Budgets
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddAppButton onPress={handleAddApp} />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    // Keep the last card clear of the floating add button.
    paddingBottom: ADD_BUTTON_SIZE + space.xxl * 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: space.xl,
  },
  separator: {
    height: space.md,
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
