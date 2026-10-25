package expo.modules.roolio.core

import android.app.Application
import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import expo.modules.roolio.core.theme.AppTheme

// Found by Expo autolinking; hooks into the app's start.
class RoolioCorePackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
    listOf(RoolioCoreApplicationListener())
}

private class RoolioCoreApplicationListener : ApplicationLifecycleListener {
  // Before the first activity starts, so Roolio opens in the chosen theme.
  override fun onCreate(application: Application) {
    AppTheme.apply(application)
  }
}
