import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useBudget } from "../../hooks/budgets/useBudget";
import { createBudget, updateBudget } from "../../budgets/repository";
import {
  convertBudget,
  defaultSettings,
  settingsEqual,
} from "../../budgets/rules";
import { formatPeriods, periodLabel, periodNoun } from "../../budgets/format";
import type {
  BudgetPeriod,
  BudgetSettings,
  BudgetWithUsage,
  BudgetedApp,
} from "../../budgets/types";
import { AppIcon } from "../../components/addApp/AppIcon";
import { UsageSummary } from "../../components/budget/UsageSummary";
import { PeriodSelector } from "../../components/budget/PeriodSelector";
import { DurationStepper } from "../../components/budget/DurationStepper";
import { CountStepper } from "../../components/budget/CountStepper";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

type Params = {
  packageName: string;
  appName?: string;
  iconVersion?: string;
};

export default function BudgetScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<Params>();
  const { budget, status, reload } = useBudget(params.packageName);

  // Create mode relies on the app details passed by the picker.
  const iconVersion = Number(params.iconVersion);
  const newApp: BudgetedApp | null =
    params.appName && Number.isFinite(iconVersion)
      ? {
          packageName: params.packageName,
          appName: params.appName,
          iconVersion,
        }
      : null;

  // Fix the mode on first load so saving a new budget (which makes `budget`
  // non-null) doesn't flip the screen into edit mode while it closes.
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  if (mode === null && status === "ready") {
    setMode(budget ? "edit" : "create");
  }

  const app: BudgetedApp | null = mode === "edit" ? budget : newApp;
  const isNew = mode === null ? newApp !== null : mode === "create";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text
          style={[styles.topBarTitle, { color: colors.onSurface }]}
          accessibilityRole="header"
        >
          {isNew ? "New budget" : "Edit budget"}
        </Text>
      </View>

      {status === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {(status === "error" || (status === "ready" && !app)) && (
        <View style={styles.centered}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={colors.onSurfaceVariant}
          />
          <Text style={[styles.headline, { color: colors.onSurface }]}>
            {status === "error"
              ? "Couldn't load this budget"
              : "This app isn't available"}
          </Text>
          <Pressable
            onPress={status === "error" ? reload : () => router.back()}
            accessibilityRole="button"
            style={styles.textButton}
          >
            <Text style={[styles.textButtonLabel, { color: colors.primary }]}>
              {status === "error" ? "Try again" : "Go back"}
            </Text>
          </Pressable>
        </View>
      )}

      {status === "ready" && app && (
        <BudgetForm app={app} budget={mode === "edit" ? budget : null} />
      )}
    </SafeAreaView>
  );
}

type BudgetFormProps = {
  app: BudgetedApp;
  // The stored budget when editing, or null when adding a new one.
  budget: BudgetWithUsage | null;
};

function BudgetForm({ app, budget }: BudgetFormProps) {
  const { colors } = useAppTheme();
  const db = useSQLiteContext();

  const saved: BudgetSettings | null = budget && {
    period: budget.period,
    budgetMinutes: budget.budgetMinutes,
    rolloverCeiling: budget.rolloverCeiling,
    borrowCap: budget.borrowCap,
  };

  const [form, setForm] = useState<BudgetSettings>(saved ?? defaultSettings());
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // While a time is being typed, the bottom button commits it ("Done").
  const [typingTime, setTypingTime] = useState(false);
  // `dialog` keeps its content while `dialogOpen` animates it out.
  const [dialog, setDialog] = useState<"switch-period" | "save-error">(
    "switch-period",
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = (kind: typeof dialog) => {
    setDialog(kind);
    setDialogOpen(true);
  };

  const isEditing = budget !== null;
  const canSave = !saving && (!saved || !settingsEqual(form, saved));
  const buttonEnabled = typingTime || canSave;
  const periodChanged = saved !== null && form.period !== saved.period;

  const update = (changes: Partial<BudgetSettings>) =>
    setForm((current) => ({ ...current, ...changes }));

  const changePeriod = (period: BudgetPeriod) =>
    setForm((current) => ({
      ...current,
      period,
      budgetMinutes: convertBudget(
        current.budgetMinutes,
        current.period,
        period,
      ),
    }));

  const persist = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (isEditing) {
        await updateBudget(db, app.packageName, form);
      } else {
        await createBudget(db, app, form);
      }
      router.back();
    } catch {
      savingRef.current = false;
      setSaving(false);
      openDialog("save-error");
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    // Switching periods restarts how time is counted, so confirm first.
    if (periodChanged) {
      openDialog("switch-period");
      return;
    }
    void persist();
  };

  const newPeriod = periodLabel(form.period).toLowerCase();
  const dialogContent =
    dialog === "switch-period"
      ? {
          /* TODO(borrowing): When the app has borrowed periods, PRD §7 requires
           * this dialog to offer "Clear the borrowed" (future periods return to
           * full budget) and "Keep the borrowed" (owed minutes are deducted
           * from the new period's budgets). Add both actions once borrowing
           * is built. */
          title: `Switch to ${newPeriod}?`,
          message: `Your budget will reset ${newPeriod} from now on. Time you've already used counts toward the new ${periodNoun(form.period)}.`,
          actions: [
            { label: "Cancel" },
            { label: "Switch now", onPress: () => void persist() },
          ],
        }
      : {
          title: "Couldn't save budget",
          message: "Your changes weren't saved. Please try again.",
          actions: [{ label: "OK" }],
        };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appHeader}>
          <AppIcon
            packageName={app.packageName}
            appName={app.appName}
            updatedAt={app.iconVersion}
            size={56}
          />
          <Text
            style={[styles.appName, { color: colors.onSurface }]}
            numberOfLines={2}
          >
            {app.appName}
          </Text>
        </View>

        {budget && <UsageSummary budget={budget} />}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Period
          </Text>
          <PeriodSelector value={form.period} onChange={changePeriod} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Budget
          </Text>
          <DurationStepper
            minutes={form.budgetMinutes}
            period={form.period}
            onChange={(budgetMinutes) => update({ budgetMinutes })}
            editing={typingTime}
            onEditingChange={setTypingTime}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Rollover and borrowing
          </Text>
          <View
            style={[
              styles.group,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <CountStepper
              title="Rollover"
              description={rolloverDescription(form)}
              value={form.rolloverCeiling}
              onChange={(rolloverCeiling) => update({ rolloverCeiling })}
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.outlineVariant },
              ]}
            />
            <CountStepper
              title="Borrowing"
              description={borrowDescription(form)}
              value={form.borrowCap}
              onChange={(borrowCap) => update({ borrowCap })}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[styles.bottomBar, { borderTopColor: colors.outlineVariant }]}
      >
        <PrimaryButton
          // Dismissing the keyboard commits the typed time.
          onPress={typingTime ? Keyboard.dismiss : handleSave}
          disabled={!buttonEnabled}
          busy={saving}
          label={
            typingTime ? "Done" : isEditing ? "Save changes" : "Add budget"
          }
        />
      </View>

      <ConfirmDialog
        visible={dialogOpen}
        title={dialogContent.title}
        message={dialogContent.message}
        actions={dialogContent.actions}
        onDismiss={() => setDialogOpen(false)}
      />
    </>
  );
}

function rolloverDescription({ rolloverCeiling, period }: BudgetSettings) {
  if (rolloverCeiling === 0) return "Unused time is lost at reset";
  return `Bank unused time, up to ${formatPeriods(rolloverCeiling, period)} of budget`;
}

function borrowDescription({ borrowCap, period }: BudgetSettings) {
  if (borrowCap === 0) return "Borrowing is off";
  return `Borrow up to ${borrowCap} upcoming ${periodNoun(period, borrowCap)} when you run out`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xs,
    gap: space.xs,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.xl,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingTop: space.sm,
  },
  appName: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    gap: space.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: space.xs,
  },
  group: {
    borderRadius: radius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.lg,
  },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
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
