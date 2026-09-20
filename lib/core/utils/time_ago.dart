import 'package:intl/intl.dart';

import '../i18n/strings.dart';

/// Relative timestamps like "12 min ago", in English or Filipino.
///
/// Hazard reports are only useful if you can tell at a glance how fresh they
/// are, so the app leans on relative time everywhere and only falls back to
/// an absolute date once a report is more than a week old.
class TimeAgo {
  const TimeAgo._();

  static String format(DateTime time, S s, {DateTime? now}) {
    final DateTime reference = now ?? DateTime.now();
    final Duration diff = reference.difference(time);

    if (diff.isNegative) {
      return s.isFilipino ? 'ngayon lang' : 'just now';
    }
    if (diff.inSeconds < 60) {
      return s.isFilipino ? 'ngayon lang' : 'just now';
    }
    if (diff.inMinutes < 60) {
      final int m = diff.inMinutes;
      return s.isFilipino ? '$m min ang nakalipas' : '$m min ago';
    }
    if (diff.inHours < 24) {
      final int h = diff.inHours;
      return s.isFilipino
          ? '$h oras ang nakalipas'
          : '$h ${h == 1 ? 'hour' : 'hours'} ago';
    }
    if (diff.inDays < 7) {
      final int d = diff.inDays;
      return s.isFilipino
          ? '$d ${d == 1 ? 'araw' : 'araw'} ang nakalipas'
          : '$d ${d == 1 ? 'day' : 'days'} ago';
    }
    return DateFormat.yMMMd(s.isFilipino ? 'fil' : 'en').format(time);
  }

  /// Compact form for dense lists: "12m", "3h", "2d".
  static String compact(DateTime time, {DateTime? now}) {
    final Duration diff = (now ?? DateTime.now()).difference(time);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${(diff.inDays / 7).floor()}w';
  }

  /// Duration as a travel-time label: "8 min" or "1 hr 20 min".
  static String duration(Duration d, S s) {
    final int minutes = d.inMinutes;
    if (minutes < 1) return s.isFilipino ? 'wala pang 1 min' : 'under 1 min';
    if (minutes < 60) return '$minutes min';
    final int hours = minutes ~/ 60;
    final int rest = minutes % 60;
    final String hourLabel = s.isFilipino ? 'oras' : 'hr';
    return rest == 0 ? '$hours $hourLabel' : '$hours $hourLabel $rest min';
  }

  /// Clock time for an ETA, e.g. "4:35 PM".
  static String clock(DateTime time, S s) =>
      DateFormat.jm(s.isFilipino ? 'fil' : 'en').format(time);
}
