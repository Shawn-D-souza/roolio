package expo.modules.roolio.usage

import android.content.Context
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

private const val PREFS_NAME = "roolio_usage"
private const val KEY_APPS = "tracked_apps"
private const val KEY_FIRST_DAY_OF_WEEK = "first_day_of_week"

internal data class TrackedApp(val packageName: String, val period: BudgetPeriod)

/**
 * The apps with a budget, as last sent by JS. Kept in SharedPreferences so the
 * tracker can resume after a restart without starting the JS runtime.
 */
internal data class TrackerConfig(
  val apps: List<TrackedApp>,
  // A java.util.Calendar day, e.g. Calendar.MONDAY.
  val firstDayOfWeek: Int,
) {
  val packages: Set<String> = apps.mapTo(HashSet(apps.size)) { it.packageName }

  fun save(context: Context) {
    val array = JSONArray()
    for (app in apps) {
      array.put(JSONObject().put("p", app.packageName).put("t", app.period.name))
    }
    prefs(context)
      .edit()
      .putString(KEY_APPS, array.toString())
      .putInt(KEY_FIRST_DAY_OF_WEEK, firstDayOfWeek)
      .apply()
  }

  companion object {
    val EMPTY = TrackerConfig(emptyList(), Calendar.MONDAY)

    fun load(context: Context): TrackerConfig {
      val prefs = prefs(context)
      val json = prefs.getString(KEY_APPS, null) ?: return EMPTY
      val array =
        try {
          JSONArray(json)
        } catch (ignored: org.json.JSONException) {
          return EMPTY
        }
      val apps =
        (0 until array.length()).mapNotNull { index ->
          val item = array.optJSONObject(index) ?: return@mapNotNull null
          val period =
            BudgetPeriod.entries.firstOrNull { it.name == item.optString("t") } ?: BudgetPeriod.DAY
          TrackedApp(item.optString("p").ifEmpty { return@mapNotNull null }, period)
        }
      return TrackerConfig(apps, prefs.getInt(KEY_FIRST_DAY_OF_WEEK, Calendar.MONDAY))
    }

    private fun prefs(context: Context) =
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }
}
