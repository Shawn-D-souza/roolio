package expo.modules.roolio.core.theme

import android.content.Context
import android.content.res.Configuration
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatDelegate

private const val PREFS_NAME = "roolio_core"
private const val KEY_THEME_MODE = "theme_mode"

/** The user's theme choice. `key` is what JS and the saved preference use. */
internal enum class ThemeMode(val key: String, val nightMode: Int) {
  SYSTEM("system", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM),
  LIGHT("light", AppCompatDelegate.MODE_NIGHT_NO),
  DARK("dark", AppCompatDelegate.MODE_NIGHT_YES);

  companion object {
    fun from(key: String?): ThemeMode? = entries.firstOrNull { it.key == key }
  }
}

/**
 * The theme chosen in Roolio's settings, applied to everything Roolio shows:
 * its screens and dialogs (through AppCompat's night mode, set as the app
 * starts) and the pause screen (through [themed]).
 *
 * Saved in SharedPreferences rather than the database, so it can be read
 * from the main thread as the app starts, before any JS runs. Safe to call
 * from any thread.
 */
internal object AppTheme {
  private val mainHandler = Handler(Looper.getMainLooper())

  fun mode(context: Context): ThemeMode =
    ThemeMode.from(prefs(context).getString(KEY_THEME_MODE, null)) ?: ThemeMode.SYSTEM

  fun setMode(context: Context, mode: ThemeMode) {
    prefs(context).edit().putString(KEY_THEME_MODE, mode.key).apply()
    apply(mode)
  }

  /** Applies the saved choice to Roolio's activity, now and whenever it's recreated. */
  fun apply(context: Context) = apply(mode(context))

  /**
   * `context` with its light or dark resources picked by the saved choice
   * instead of the system. For windows that aren't an activity, which
   * AppCompat's night mode doesn't reach.
   */
  fun themed(context: Context): Context {
    val night =
      when (mode(context)) {
        ThemeMode.SYSTEM -> return context
        ThemeMode.LIGHT -> Configuration.UI_MODE_NIGHT_NO
        ThemeMode.DARK -> Configuration.UI_MODE_NIGHT_YES
      }
    val config = Configuration(context.resources.configuration)
    config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or night
    return context.createConfigurationContext(config)
  }

  /**
   * Whether the phone itself is in dark mode, whatever Roolio's choice. The
   * application's own configuration isn't touched by AppCompat's night mode,
   * which only overrides activities.
   */
  fun isSystemDark(context: Context): Boolean =
    (context.applicationContext.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
      Configuration.UI_MODE_NIGHT_YES

  private fun apply(mode: ThemeMode) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      AppCompatDelegate.setDefaultNightMode(mode.nightMode)
    } else {
      mainHandler.post { AppCompatDelegate.setDefaultNightMode(mode.nightMode) }
    }
  }

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
