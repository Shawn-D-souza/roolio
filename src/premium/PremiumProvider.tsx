import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  isPremium as readPremium,
  setEarlyAccessPremium,
} from "../../modules/roolio-core";

type PremiumContextType = {
  isPremium: boolean;
  // Turns Premium on or off. During early access it's free.
  setPremium: (on: boolean) => void;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  // Read synchronously so the first render already shows what's locked.
  const [isPremium, setIsPremium] = useState(readPremium);

  const setPremium = useCallback((on: boolean) => {
    setEarlyAccessPremium(on);
    setIsPremium(on);
  }, []);

  const value = useMemo(
    () => ({ isPremium, setPremium }),
    [isPremium, setPremium],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}
