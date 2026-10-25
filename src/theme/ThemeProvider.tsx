import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AppState, ColorSchemeName, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  getThemeMode,
  isSystemDark,
  setThemeMode,
  type ThemeMode,
} from "../../modules/roolio-core";
import { colors, space, radius, AppColors } from "./tokens";

export type { ThemeMode };

export interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  // The phone's own theme, whatever Roolio's choice. For sketches of
  // system screens, which follow it.
  systemColorScheme: ColorSchemeName;
  setMode: (mode: ThemeMode) => void;
  colors: AppColors;
  space: typeof space;
  radius: typeof radius;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Saved natively, which also applies it to native screens and dialogs and
  // to the pause screen.
  const [mode, setModeState] = useState<ThemeMode>(getThemeMode);
  const setMode = (next: ThemeMode) => {
    setThemeMode(next);
    setModeState(next);
  };

  // Follows Roolio's choice once it's applied, so it's the system's only
  // while the mode is "system".
  const appColorScheme = useColorScheme();
  const isDark =
    mode === "system" ? appColorScheme === "dark" : mode === "dark";
  const activeColors = isDark ? colors.dark : colors.light;

  const [systemDark, setSystemDark] = useState(isSystemDark);
  // A change of the phone's theme reaches Roolio as an appearance change
  // while the mode is "system", and on the next return to Roolio otherwise.
  const [seenColorScheme, setSeenColorScheme] = useState(appColorScheme);
  if (seenColorScheme !== appColorScheme) {
    setSeenColorScheme(appColorScheme);
    setSystemDark(isSystemDark());
  }
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setSystemDark(isSystemDark());
    });
    return () => subscription.remove();
  }, []);
  const systemColorScheme: ColorSchemeName = systemDark ? "dark" : "light";

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        systemColorScheme,
        setMode,
        colors: activeColors,
        space,
        radius,
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}
