import 'package:flutter/widgets.dart';

/// Every user-facing string in Bantay, in English and Filipino.
///
/// Implemented as typed getters rather than a key-to-string map so a missing
/// or misspelled string is a compile error instead of a blank label that only
/// shows up in the Filipino build.
///
/// Filipino copy uses the code-switched register people actually read on
/// Philippine public-safety notices: Tagalog sentence structure with English
/// kept for terms that are not translated in practice ("flood", "barangay",
/// "verified"), rather than stilted literal translation.
class S {
  const S({required this.isFilipino});

  final bool isFilipino;

  static S of(BuildContext context) =>
      Localizations.localeOf(context).languageCode == 'fil'
      ? const S(isFilipino: true)
      : const S(isFilipino: false);

  /// Picks between English and Filipino.
  String _t(String en, String fil) => isFilipino ? fil : en;

  // --- Global ------------------------------------------------------------
  String get appName => 'Bantay';
  String get tagline => _t('Know before you go.', 'Alamin bago umalis.');
  String get skip => _t('Skip', 'Laktawan');
  String get next => _t('Next', 'Susunod');
  String get back => _t('Back', 'Bumalik');
  String get done => _t('Done', 'Tapos');
  String get cancel => _t('Cancel', 'Kanselahin');
  String get save => _t('Save', 'I-save');
  String get delete => _t('Delete', 'Burahin');
  String get undo => _t('Undo', 'I-undo');
  String get confirm => _t('Confirm', 'Kumpirmahin');
  String get close => _t('Close', 'Isara');
  String get retry => _t('Try again', 'Subukan ulit');
  String get yes => _t('Yes', 'Oo');
  String get no => _t('No', 'Hindi');
  String get getStarted => _t('Get Started', 'Magsimula');
  String get loading => _t('Loading...', 'Naglo-load...');
  String get somethingWentWrong =>
      _t('Something went wrong.', 'May nangyaring mali.');

  // --- Onboarding --------------------------------------------------------
  String get onboardTitle1 =>
      _t('See hazards in real time', 'Makita ang panganib sa oras na iyon');
  String get onboardBody1 => _t(
    'Flooded roads, landslides and blocked bridges reported by commuters '
        'around you, the moment they happen.',
    'Mga baha, landslide at saradong tulay na ireport ng mga commuter sa '
        'paligid mo, sa mismong oras na mangyari ito.',
  );
  String get onboardTitle2 =>
      _t('Verified by your barangay', 'Beripikado ng inyong barangay');
  String get onboardBody2 => _t(
    'Barangay officials and school admins confirm every report, so you '
        'can trust what you see on the map.',
    'Kinukumpirma ng mga opisyal ng barangay at school admin ang bawat '
        'report, para masisiguro mong totoo ang nasa mapa.',
  );
  String get onboardTitle3 =>
      _t('Get alerted before you leave', 'Maabisuhan bago ka umalis');
  String get onboardBody3 => _t(
    'Save your daily route and Bantay will warn you when a new hazard '
        'blocks it, even over SMS when you are offline.',
    'I-save ang araw-araw mong ruta at babalaan ka ng Bantay kapag may '
        'bagong panganib dito, kahit sa SMS kapag walang internet.',
  );

  // --- Auth --------------------------------------------------------------
  String get logIn => _t('Log In', 'Mag-log In');
  String get signUp => _t('Sign Up', 'Mag-sign Up');
  String get logOut => _t('Log Out', 'Mag-log Out');
  String get email => _t('Email', 'Email');
  String get password => _t('Password', 'Password');
  String get fullName => _t('Full name', 'Buong pangalan');
  String get forgotPassword =>
      _t('Forgot password?', 'Nakalimutan ang password?');
  String get resetPassword => _t('Reset password', 'I-reset ang password');
  String get newPassword => _t('New password', 'Bagong password');
  String get continueWithGoogle =>
      _t('Continue with Google', 'Magpatuloy gamit ang Google');
  String get continueWithFacebook =>
      _t('Continue with Facebook', 'Magpatuloy gamit ang Facebook');
  String get noAccountYet => _t("Don't have an account?", 'Wala pang account?');
  String get alreadyHaveAccount =>
      _t('Already have an account?', 'May account na?');
  String get orDivider => _t('or', 'o');
  String get welcomeBack => _t('Welcome back', 'Maligayang pagbabalik');
  String get createAccount => _t('Create your account', 'Gumawa ng account');
  String get emailRequired => _t('Email is required.', 'Kailangan ang email.');
  String get emailInvalid =>
      _t('Enter a valid email address.', 'Maglagay ng tamang email address.');
  String get passwordRequired =>
      _t('Password is required.', 'Kailangan ang password.');
  String get passwordTooShort => _t(
    'Password must be at least 8 characters.',
    'Dapat hindi bababa sa 8 karakter ang password.',
  );
  String get nameRequired => _t('Name is required.', 'Kailangan ang pangalan.');
  String get resetLinkSent => _t(
    'If that email is registered, a reset link is on its way.',
    'Kung nakarehistro ang email na iyan, padala na ang reset link.',
  );
  String get passwordUpdated => _t(
    'Password updated. Please log in.',
    'Na-update ang password. Mag-log in.',
  );

  // --- Roles -------------------------------------------------------------
  String get chooseRole => _t('Choose your role', 'Piliin ang iyong role');
  String get chooseRoleSub => _t(
    'This decides what you can do in Bantay. You can change it later in '
        'your profile.',
    'Ito ang magtatakda ng magagawa mo sa Bantay. Mapapalitan mo ito sa '
        'iyong profile.',
  );
  String get roleCommuter => _t('Commuter / Resident', 'Commuter / Residente');
  String get roleCommuterDesc => _t(
    'Report hazards and get alerts for your routes.',
    'Mag-report ng panganib at makatanggap ng alerto para sa iyong ruta.',
  );
  String get roleBarangay => _t('Barangay Official', 'Opisyal ng Barangay');
  String get roleBarangayDesc => _t(
    'Verify reports in your barangay so everyone can trust them.',
    'Beripikahin ang mga report sa inyong barangay para mapagkatiwalaan.',
  );
  String get roleSchoolAdmin => _t('School Admin', 'School Admin');
  String get roleSchoolAdminDesc => _t(
    'Verify hazards near your campus and alert your students.',
    'Beripikahin ang panganib malapit sa campus at abisuhan ang estudyante.',
  );
  String get roleBusiness => _t('Business Owner', 'May-ari ng Negosyo');
  String get roleBusinessDesc => _t(
    'Keep staff and customers informed about nearby conditions.',
    'Panatilihing updated ang staff at customer sa kalagayan sa paligid.',
  );

  // --- Location permission ------------------------------------------------
  String get locationTitle =>
      _t('Turn on your location', 'I-on ang iyong lokasyon');
  String get locationBody => _t(
    'Bantay uses your location to centre the map, warn you about hazards '
        'nearby and place your reports accurately. Your location is never '
        'shared with other users.',
    'Ginagamit ng Bantay ang lokasyon mo para i-centro ang mapa, bigyan ka '
        'ng babala sa panganib sa paligid, at maitama ang lugar ng iyong '
        'report. Hindi ito ibinabahagi sa ibang user.',
  );
  String get allowLocation => _t('Allow location', 'Payagan ang lokasyon');
  String get notNow => _t('Not now', 'Hindi muna');
  String get locationDeniedNotice => _t(
    'Location is off. The map is centred on Manila; you can still browse '
        'and report by placing a pin manually.',
    'Naka-off ang lokasyon. Nakasentro ang mapa sa Maynila; maaari ka '
        'pa ring mag-browse at mag-report sa pamamagitan ng manual na pin.',
  );

  // --- Navigation tabs ----------------------------------------------------
  String get tabMap => _t('Map', 'Mapa');
  String get tabReport => _t('Report', 'Report');
  String get tabAlerts => _t('Alerts', 'Alerto');
  String get tabSafeSpots => _t('Safe Spots', 'Ligtas');
  String get tabProfile => _t('Profile', 'Profile');

  // --- Map ----------------------------------------------------------------
  String get searchHint =>
      _t('Search a place or street', 'Maghanap ng lugar o kalye');
  String get amISafeHere => _t('Am I Safe Here?', 'Ligtas ba Ako Dito?');
  String get checkingSurroundings =>
      _t('Checking your surroundings...', 'Sinusuri ang iyong paligid...');
  String get safeZoneTitle =>
      _t("You're in a safe zone", 'Nasa ligtas kang lugar');
  String get safeZoneBody => _t(
    'No verified hazards reported within your alert radius.',
    'Walang beripikadong panganib sa loob ng iyong alert radius.',
  );
  String get hazardNearbyTitle =>
      _t('Hazard reported nearby', 'May panganib sa malapit');
  String get jumpToHazard => _t('View hazard', 'Tingnan');
  String get filters => _t('Filters', 'Mga Filter');
  String get showVerifiedOnly => _t('Show verified only', 'Beripikado lang');
  String get showSafeSpots =>
      _t('Show safe spots', 'Ipakita ang ligtas na lugar');
  String get showPendingReports =>
      _t('Show pending reports', 'Ipakita ang naghihintay');
  String get offlineBanner => _t(
    'You are offline. Showing last saved map.',
    'Offline ka. Ipinapakita ang huling na-save na mapa.',
  );
  String get offlineSmsExplainer => _t(
    'While offline, Bantay still sends critical alerts by SMS to your '
        'registered number. Reports you file are queued and uploaded once you '
        'are back online.',
    'Habang offline, nagpapadala pa rin ang Bantay ng mahahalagang alerto '
        'sa SMS sa iyong numero. Ang mga report mo ay naka-queue at '
        'ia-upload kapag may internet na.',
  );
  String get recenter => _t('Recentre', 'Ibalik sa gitna');
  String get stillThereQuestion =>
      _t('Is this still here?', 'Nandiyan pa ba ito?');
  String get confirmations => _t('confirmations', 'kumpirmasyon');
  String get thanksForConfirming =>
      _t('Thanks for confirming.', 'Salamat sa pagkumpirma.');
  String get reportInaccurate => _t('Report inaccurate', 'I-report na mali');
  String get flaggedForReview => _t(
    'Flagged for review. Thank you.',
    'Naiulat para sa pagsusuri. Salamat.',
  );
  String get alreadyVoted =>
      _t('You already voted on this report.', 'Bumoto ka na dito.');
  String get getDirections => _t('Get Directions', 'Kumuha ng Direksyon');
  String get verifiedBadge => _t('Verified', 'Beripikado');
  String get pendingBadge =>
      _t('Pending verification', 'Naghihintay ng beripikasyon');
  String get reportedBy => _t('Reported by', 'Iniulat ni');
  String get verifiedByLabel => _t('Verified by', 'Bineripika ni');

  // --- Hazard types -------------------------------------------------------
  String get hazardFlooded => _t('Flooded Road', 'Binahang Kalsada');
  String get hazardLandslide => _t('Landslide', 'Landslide');
  String get hazardFallenTree =>
      _t('Fallen Tree / Debris', 'Bumagsak na Puno / Kalat');
  String get hazardPowerLine =>
      _t('Power Line Down', 'Bumagsak na Linya ng Kuryente');
  String get hazardBridge => _t('Impassable Bridge', 'Hindi Madaanang Tulay');
  String get hazardOther => _t('Other', 'Iba pa');

  // --- Severity -----------------------------------------------------------
  String get severityCaution =>
      _t('Passable with caution', 'Madadaanan nang may ingat');
  String get severityNotPassable => _t('Not passable', 'Hindi madaanan');
  String get severityLifeThreatening =>
      _t('Life-threatening', 'Delikado sa buhay');

  // --- Report flow --------------------------------------------------------
  String get reportHazard => _t('Report a Hazard', 'Mag-report ng Panganib');
  String get stepOf => _t('Step', 'Hakbang');
  String get stepLocationTitle =>
      _t('Where is the hazard?', 'Nasaan ang panganib?');
  String get stepLocationBody => _t(
    'Drag the map to move the pin. It starts at your current location.',
    'I-drag ang mapa para igalaw ang pin. Nagsisimula ito sa lokasyon mo.',
  );
  String get stepTypeTitle =>
      _t('What kind of hazard?', 'Anong klaseng panganib?');
  String get stepSeverityTitle => _t('How bad is it?', 'Gaano ito kalala?');
  String get stepPhotoTitle => _t('Add a photo', 'Magdagdag ng litrato');
  String get stepPhotoBody => _t(
    'A photo is required so officials can verify your report quickly.',
    'Kailangan ang litrato para mabilis itong ma-verify ng mga opisyal.',
  );
  String get takePhoto => _t('Take photo', 'Kumuha ng litrato');
  String get chooseFromGallery =>
      _t('Choose from gallery', 'Pumili sa gallery');
  String get retakePhoto => _t('Replace photo', 'Palitan ang litrato');
  String get descriptionOptional =>
      _t('Description (optional)', 'Deskripsyon (opsyonal)');
  String get descriptionHint => _t(
    'e.g. Knee-deep near the underpass',
    'hal. Hanggang tuhod malapit sa underpass',
  );
  String get submitReport => _t('Submit report', 'Isumite ang report');
  String get photoRequiredNotice => _t(
    'Attach a photo to submit.',
    'Maglakip ng litrato para makapagsumite.',
  );
  String get reportSubmittedTitle =>
      _t('Thanks! Report submitted.', 'Salamat! Naisumite na.');
  String get reportSubmittedBody => _t(
    'Your report is pending verification by a barangay official. It is '
        'already visible on the map as an orange pin.',
    'Naghihintay ng beripikasyon ang report mo mula sa opisyal ng '
        'barangay. Nakikita na ito sa mapa bilang orange na pin.',
  );
  String get backToMap => _t('Back to map', 'Bumalik sa mapa');

  // --- Verification -------------------------------------------------------
  String get verificationPanel =>
      _t('Verification Panel', 'Verification Panel');
  String get pendingInYourArea =>
      _t('Pending in your area', 'Naghihintay sa inyong lugar');
  String get verify => _t('Verify', 'Beripikahin');
  String get reject => _t('Reject', 'Tanggihan');
  String get listView => _t('List', 'Listahan');
  String get mapView => _t('Map', 'Mapa');
  String get rejectConfirmTitle =>
      _t('Reject this report?', 'Tanggihan ang report?');
  String get rejectConfirmBody => _t(
    'It will be removed from the map and the reporter will be notified. '
        'This cannot be undone.',
    'Aalisin ito sa mapa at aabisuhan ang nag-report. Hindi na ito '
        'mababawi.',
  );
  String get reportVerifiedToast => _t(
    'Report verified. It is now live for everyone.',
    'Beripikado na. Live na ito sa lahat.',
  );
  String get reportRejectedToast =>
      _t('Report rejected and removed.', 'Tinanggihan at inalis ang report.');
  String get nothingToVerify => _t(
    'No pending reports in your area right now.',
    'Walang naghihintay na report sa inyong lugar ngayon.',
  );

  // --- Alerts -------------------------------------------------------------
  String get alerts => _t('Alerts', 'Mga Alerto');
  String get mySavedRoutes => _t('My Saved Routes', 'Mga Nakasave na Ruta');
  String get everywhereNearby =>
      _t('Everywhere Nearby', 'Kahit Saan sa Malapit');
  String get markAllRead => _t('Mark all as read', 'Markahan lahat na nabasa');
  String get noAlerts => _t('No alerts yet.', 'Wala pang alerto.');
  String get noRouteAlerts => _t(
    'No alerts on your saved routes. That is good news.',
    'Walang alerto sa mga nakasave mong ruta. Magandang balita iyan.',
  );
  String get allCaughtUp => _t('All caught up.', 'Wala nang bago.');

  // --- Safe spots ---------------------------------------------------------
  String get safeSpots => _t('Safe Spots', 'Ligtas na Lugar');
  String get allCategories => _t('All', 'Lahat');
  String get categoryMalls => _t('Malls', 'Mall');
  String get categorySchools => _t('Schools', 'Paaralan');
  String get categoryEvacuation =>
      _t('Evacuation Centers', 'Evacuation Center');
  String get categoryTerminals => _t('Terminals', 'Terminal');
  String get openNow => _t('Open now', 'Bukas ngayon');
  String get closedNow => _t('Closed', 'Sarado');
  String get subscribe => _t('Subscribe', 'Mag-subscribe');
  String get subscribed => _t('Subscribed', 'Naka-subscribe');
  String get subscribedToast => _t(
    'Subscribed. We will alert you when this changes.',
    'Naka-subscribe. Aabisuhan ka namin kapag nagbago ito.',
  );
  String get unsubscribedToast =>
      _t('Unsubscribed.', 'Hindi na naka-subscribe.');
  String get hours => _t('Hours', 'Oras');
  String get capacity => _t('Capacity', 'Kapasidad');
  String get contact => _t('Contact', 'Kontak');
  String get walk => _t('walk', 'lakad');

  // --- Saved routes -------------------------------------------------------
  String get savedRoutes => _t('Saved Routes', 'Nakasave na Ruta');
  String get addRoute => _t('Add route', 'Magdagdag ng ruta');
  String get newRoute => _t('New route', 'Bagong ruta');
  String get routeName => _t('Route name', 'Pangalan ng ruta');
  String get routeNameHint =>
      _t('e.g. Home to School', 'hal. Bahay papuntang Eskwela');
  String get setStart => _t('Set start point', 'Itakda ang simula');
  String get setEnd => _t('Set end point', 'Itakda ang dulo');
  String get startPoint => _t('Start', 'Simula');
  String get endPoint => _t('End', 'Dulo');
  String get tapMapToSet => _t(
    'Tap the map to place this point.',
    'I-tap ang mapa para ilagay ang puntong ito.',
  );
  String get statusClear => _t('Clear', 'Malinis');
  String get routeDeleted => _t('Route deleted', 'Nabura ang ruta');
  String get noSavedRoutes => _t(
    'No saved routes yet. Add your daily commute to get alerts about it.',
    'Wala pang nakasave na ruta. Idagdag ang araw-araw mong biyahe para '
        'makatanggap ng alerto.',
  );
  String get saveRoute => _t('Save route', 'I-save ang ruta');
  String get routeSavedToast => _t('Route saved.', 'Na-save ang ruta.');

  // --- Directions ---------------------------------------------------------
  String get routePreview => _t('Route preview', 'Preview ng ruta');
  String get startNavigation =>
      _t('Start Navigation', 'Simulan ang Nabigasyon');
  String get endNavigation => _t('End', 'Tapusin');
  String get eta => _t('ETA', 'ETA');
  String get arriveIn => _t('Arrive in', 'Darating sa');
  String get avoidingHazards => _t(
    'Route avoids reported hazards.',
    'Iniiwasan ng ruta ang mga naiulat na panganib.',
  );
  String get navigatingTo => _t('Navigating to', 'Papunta sa');
  String get youHaveArrived => _t('You have arrived.', 'Nakarating ka na.');

  // --- Profile ------------------------------------------------------------
  String get profile => _t('Profile', 'Profile');
  String get reportsSubmitted => _t('Submitted', 'Naisumite');
  String get reportsVerifiedStat => _t('Verified', 'Beripikado');
  String get trustScore => _t('Trust score', 'Trust score');
  String get verificationsDone => _t('Verifications', 'Beripikasyon');
  String get notificationPreferences =>
      _t('Notification preferences', 'Setting ng abiso');
  String get pushAlerts => _t('Push alerts', 'Push alert');
  String get pushAlertsDesc => _t(
    'Get notified when a hazard is verified near you.',
    'Maabisuhan kapag may beripikadong panganib sa malapit.',
  );
  String get smsFallback => _t('SMS fallback', 'SMS fallback');
  String get smsFallbackDesc => _t(
    'Receive critical alerts by text when you have no internet.',
    'Tumanggap ng mahalagang alerto sa text kapag walang internet.',
  );
  String get alertRadius => _t('Alert radius', 'Alert radius');
  String get alertRadiusDesc => _t(
    'How far from you a hazard must be before Bantay alerts you.',
    'Gaano kalayo ang panganib bago ka abisuhan ng Bantay.',
  );
  String get language => _t('Language', 'Wika');
  String get english => 'English';
  String get filipino => 'Filipino';
  String get helpAndSupport => _t('Help & Support', 'Tulong at Suporta');
  String get myReports => _t('My reports', 'Aking mga report');
  String get noReportsYet => _t(
    'You have not filed any reports yet.',
    'Wala ka pang naisumiteng report.',
  );
  String get logOutConfirmTitle => _t('Log out?', 'Mag-log out?');
  String get logOutConfirmBody => _t(
    'You will need to log in again to report hazards.',
    'Kailangan mong mag-log in ulit para makapag-report.',
  );
  String get editProfile => _t('Edit profile', 'I-edit ang profile');
  String get changeRole => _t('Change role', 'Palitan ang role');
  String get resetDemoData =>
      _t('Reset sample data', 'I-reset ang sample data');
  String get resetDemoDataDesc => _t(
    'Restores the bundled sample hazards and safe spots.',
    'Ibinabalik ang sample na panganib at ligtas na lugar.',
  );
  String get resetDoneToast =>
      _t('Sample data restored.', 'Naibalik ang sample data.');

  // --- Help ---------------------------------------------------------------
  String get faqQ1 =>
      _t('How do I report a hazard?', 'Paano mag-report ng panganib?');
  String get faqA1 => _t(
    'Tap the red "+" button on the map, place the pin, choose the hazard '
        'type and severity, attach a photo and submit. Your report appears '
        'immediately as an orange pin while it waits for verification.',
    'I-tap ang pulang "+" sa mapa, ilagay ang pin, piliin ang uri at bigat '
        'ng panganib, maglakip ng litrato at isumite. Agad itong lalabas '
        'bilang orange na pin habang naghihintay ng beripikasyon.',
  );
  String get faqQ2 => _t('Who verifies reports?', 'Sino ang nagbeberipika?');
  String get faqA2 => _t(
    'Barangay officials and school admins registered in the affected area '
        'review each report. Once verified, the pin turns red and is shown to '
        'everyone.',
    'Ang mga opisyal ng barangay at school admin na nakarehistro sa lugar '
        'ang sumusuri sa bawat report. Kapag beripikado na, nagiging pula ang '
        'pin at nakikita ng lahat.',
  );
  String get faqQ3 =>
      _t('What if I have no internet?', 'Paano kung walang internet?');
  String get faqA3 => _t(
    'Bantay keeps the last map you loaded and still sends critical alerts '
        'by SMS. Reports you file offline are queued and uploaded '
        'automatically when you reconnect.',
    'Itinatago ng Bantay ang huling mapa at nagpapadala pa rin ng '
        'mahalagang alerto sa SMS. Ang mga report na ginawa offline ay '
        'awtomatikong ia-upload kapag may koneksyon na.',
  );
  String get faqQ4 => _t(
    'How is my trust score calculated?',
    'Paano kinakalkula ang trust score ko?',
  );
  String get faqA4 => _t(
    'It starts at 50 and moves with the share of your reports that get '
        'verified rather than rejected, plus a small bonus for consistent '
        'accurate reporting.',
    'Nagsisimula ito sa 50 at gumagalaw base sa bahagi ng mga report mong '
        'nabeberipika kaysa natatanggihan, kasama ang maliit na bonus sa '
        'tuloy-tuloy na tamang pag-report.',
  );
  String get faqQ5 =>
      _t('Is my location shared?', 'Naibabahagi ba ang lokasyon ko?');
  String get faqA5 => _t(
    'No. Your live location stays on your device. Only the coordinates of '
        'hazards you choose to report are published, and they are attributed '
        'to your display name, never your exact position.',
    'Hindi. Nananatili sa device mo ang live mong lokasyon. Ang koordinada '
        'lang ng panganib na pinili mong i-report ang inilalathala, at nakalagay '
        'ito sa display name mo, hindi sa eksaktong kinaroroonan mo.',
  );
}
