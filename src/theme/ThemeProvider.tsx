import { createContext, useContext, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { colors, space, radius, AppColors } from "./tokens";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  colors: AppColors;
  space: typeof space;
  radius: typeof radius;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The initial default theme is 'system'
  const [mode, setMode] = useState<ThemeMode>("system");

  const systemColorScheme = useColorScheme();
  const isDark =
    mode === "system" ? systemColorScheme === "dark" : mode === "dark";
  const activeColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, colors: activeColors, isDark, space, radius }}
    >
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
