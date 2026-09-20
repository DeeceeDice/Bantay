# Flutter's embedding and the plugins Bantay uses reflect on these classes,
# so R8 must not strip or rename them.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Geolocator resolves Play Services location at runtime.
-keep class com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.**
