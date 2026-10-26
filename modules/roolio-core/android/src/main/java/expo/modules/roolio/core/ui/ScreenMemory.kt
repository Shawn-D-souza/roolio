package expo.modules.roolio.core.ui

import android.content.Context

// The same file as the theme choice.
private const val PREFS_NAME = "roolio_core"

/** A choice on screen that Roolio keeps, with the values it can take. */
internal enum class Remembered(val key: String, val values: Set<String>) {
  /** The last of Home and Stats the user was on. Settings isn't kept. */
  TAB("last_tab", setOf("home", "stats")),

  /** Stats' Day, Week or Month. */
  STATS_RANGE("stats_range", setOf("day", "week", "month")),

  /** The chart Stats shows time used with. */
  STATS_CHART("stats_chart", setOf("ring", "stacked", "daily")),
}

/**
 * Where the user left Roolio's screens, so it opens the way they left it.
 * Saved by name, never by position, so reordering a screen's choices keeps
 * what's saved. Kept in SharedPreferences rather than the database so the
 * first render can read it synchronously. Safe to call from any thread.
 */
internal object ScreenMemory {
  /** The saved value, or null when there's none or it's no longer a choice. */
  fun get(context: Context, item: Remembered): String? =
    prefs(context).getString(item.key, null)?.takeIf { it in item.values }

  /** Saves `value`, or returns false without saving when it isn't one of the choices. */
  fun set(context: Context, item: Remembered, value: String): Boolean {
    if (value !in item.values) return false
    prefs(context).edit().putString(item.key, value).apply()
    return true
  }

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
