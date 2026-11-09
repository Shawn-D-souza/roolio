import * as Linking from "expo-linking";

// Where feedback on Roolio goes. The website's contact email
// (`site/src/config.ts`) is the same address.
export const FEEDBACK_EMAIL = "shawndsouz@gmail.com";

/** Opens the user's email app with a new message to FEEDBACK_EMAIL. */
export function sendFeedback() {
  const subject = encodeURIComponent("Roolio feedback");
  // Rejects when the phone has no email app. The address is on screen to copy.
  Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}`).catch(
    () => {},
  );
}
