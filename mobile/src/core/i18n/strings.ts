/**
 * Every user-facing string in Bantay, in English and Filipino.
 *
 * Implemented as a typed object rather than a key lookup so a missing or
 * misspelled string is a compile error instead of a blank label that only
 * shows up in the Filipino build.
 *
 * Filipino copy uses the code-switched register people actually read on
 * Philippine public-safety notices: Tagalog sentence structure with English
 * kept for terms that are not translated in practice ("flood", "barangay",
 * "verified"), rather than stilted literal translation.
 */
export type Language = 'en' | 'fil';

type Pair = readonly [en: string, fil: string];

const COPY = {
  appName: ['Bantay', 'Bantay'],
  tagline: ['Know before you go.', 'Alamin bago umalis.'],
  skip: ['Skip', 'Laktawan'],
  next: ['Next', 'Susunod'],
  back: ['Back', 'Bumalik'],
  done: ['Done', 'Tapos'],
  cancel: ['Cancel', 'Kanselahin'],
  deleteLabel: ['Delete', 'Burahin'],
  undo: ['Undo', 'I-undo'],
  confirm: ['Confirm', 'Kumpirmahin'],
  close: ['Close', 'Isara'],
  yes: ['Yes', 'Oo'],
  no: ['No', 'Hindi'],
  getStarted: ['Get Started', 'Magsimula'],
  somethingWentWrong: ['Something went wrong.', 'May nangyaring mali.'],

  onboardTitle1: ['See hazards in real time', 'Makita ang panganib sa oras na iyon'],
  onboardBody1: [
    'Flooded roads, landslides and blocked bridges reported by commuters around you, the moment they happen.',
    'Mga baha, landslide at saradong tulay na ireport ng mga commuter sa paligid mo, sa mismong oras na mangyari ito.',
  ],
  onboardTitle2: ['Verified by your barangay', 'Beripikado ng inyong barangay'],
  onboardBody2: [
    'Barangay officials and school admins confirm every report, so you can trust what you see on the map.',
    'Kinukumpirma ng mga opisyal ng barangay at school admin ang bawat report, para masisiguro mong totoo ang nasa mapa.',
  ],
  onboardTitle3: ['Get alerted before you leave', 'Maabisuhan bago ka umalis'],
  onboardBody3: [
    'Save your daily route and Bantay will warn you when a new hazard blocks it, even over SMS when you are offline.',
    'I-save ang araw-araw mong ruta at babalaan ka ng Bantay kapag may bagong panganib dito, kahit sa SMS kapag walang internet.',
  ],

  logIn: ['Log In', 'Mag-log In'],
  signUp: ['Sign Up', 'Mag-sign Up'],
  logOut: ['Log Out', 'Mag-log Out'],
  email: ['Email', 'Email'],
  password: ['Password', 'Password'],
  fullName: ['Full name', 'Buong pangalan'],
  forgotPassword: ['Forgot password?', 'Nakalimutan ang password?'],
  noAccountYet: ["Don't have an account?", 'Wala pang account?'],
  alreadyHaveAccount: ['Already have an account?', 'May account na?'],
  welcomeBack: ['Welcome back', 'Maligayang pagbabalik'],
  createAccount: ['Create your account', 'Gumawa ng account'],
  emailRequired: ['Email is required.', 'Kailangan ang email.'],
  emailInvalid: ['Enter a valid email address.', 'Maglagay ng tamang email address.'],
  passwordRequired: ['Password is required.', 'Kailangan ang password.'],
  passwordTooShort: [
    'Password must be at least 8 characters.',
    'Dapat hindi bababa sa 8 karakter ang password.',
  ],
  nameRequired: ['Name is required.', 'Kailangan ang pangalan.'],
  checkYourEmail: ['Check your email', 'Tingnan ang iyong email'],

  chooseRole: ['Choose your role', 'Piliin ang iyong role'],
  chooseRoleSub: [
    'This decides what you can do in Bantay. You can change it later in your profile.',
    'Ito ang magtatakda ng magagawa mo sa Bantay. Mapapalitan mo ito sa iyong profile.',
  ],
  roleCommuter: ['Commuter / Resident', 'Commuter / Residente'],
  roleCommuterDesc: [
    'Report hazards and get alerts for your routes.',
    'Mag-report ng panganib at makatanggap ng alerto para sa iyong ruta.',
  ],
  roleBarangay: ['Barangay Official', 'Opisyal ng Barangay'],
  roleBarangayDesc: [
    'Verify reports in your barangay so everyone can trust them.',
    'Beripikahin ang mga report sa inyong barangay para mapagkatiwalaan.',
  ],
  roleSchoolAdmin: ['School Admin', 'School Admin'],
  roleSchoolAdminDesc: [
    'Verify hazards near your campus and alert your students.',
    'Beripikahin ang panganib malapit sa campus at abisuhan ang estudyante.',
  ],
  roleBusiness: ['Business Owner', 'May-ari ng Negosyo'],
  roleBusinessDesc: [
    'Keep staff and customers informed about nearby conditions.',
    'Panatilihing updated ang staff at customer sa kalagayan sa paligid.',
  ],

  locationTitle: ['Turn on your location', 'I-on ang iyong lokasyon'],
  locationBody: [
    'Bantay uses your location to centre the map, warn you about hazards nearby and place your reports accurately. Your location is never shared with other users.',
    'Ginagamit ng Bantay ang lokasyon mo para i-centro ang mapa, bigyan ka ng babala sa panganib sa paligid, at maitama ang lugar ng iyong report. Hindi ito ibinabahagi sa ibang user.',
  ],
  allowLocation: ['Allow location', 'Payagan ang lokasyon'],
  notNow: ['Not now', 'Hindi muna'],
  locationDeniedNotice: [
    'Location is off. The map is centred on Manila; you can still browse and report by placing a pin manually.',
    'Naka-off ang lokasyon. Nakasentro ang mapa sa Maynila; maaari ka pa ring mag-browse at mag-report sa pamamagitan ng manual na pin.',
  ],

  tabMap: ['Map', 'Mapa'],
  tabReport: ['Report', 'Report'],
  tabAlerts: ['Alerts', 'Alerto'],
  tabSafeSpots: ['Safe Spots', 'Ligtas'],
  tabProfile: ['Profile', 'Profile'],

  searchHint: ['Search a place or street', 'Maghanap ng lugar o kalye'],
  amISafeHere: ['Am I Safe Here?', 'Ligtas ba Ako Dito?'],
  checkingSurroundings: ['Checking your surroundings...', 'Sinusuri ang iyong paligid...'],
  safeZoneTitle: ["You're in a safe zone", 'Nasa ligtas kang lugar'],
  safeZoneBody: [
    'No verified hazards reported within your alert radius.',
    'Walang beripikadong panganib sa loob ng iyong alert radius.',
  ],
  hazardNearbyTitle: ['Hazard reported nearby', 'May panganib sa malapit'],
  jumpToHazard: ['View hazard', 'Tingnan'],
  filters: ['Filters', 'Mga Filter'],
  showVerifiedOnly: ['Show verified only', 'Beripikado lang'],
  showSafeSpots: ['Show safe spots', 'Ipakita ang ligtas na lugar'],
  showPendingReports: ['Show pending reports', 'Ipakita ang naghihintay'],
  offlineBanner: [
    'You are offline. Showing last saved map.',
    'Offline ka. Ipinapakita ang huling na-save na mapa.',
  ],
  offlineSmsExplainer: [
    'While offline, Bantay still sends critical alerts by SMS to your registered number. Reports you file are queued and uploaded once you are back online.',
    'Habang offline, nagpapadala pa rin ang Bantay ng mahahalagang alerto sa SMS sa iyong numero. Ang mga report mo ay naka-queue at ia-upload kapag may internet na.',
  ],
  recenter: ['Recentre', 'Ibalik sa gitna'],
  stillThereQuestion: ['Is this still here?', 'Nandiyan pa ba ito?'],
  confirmations: ['confirmations', 'kumpirmasyon'],
  thanksForConfirming: ['Thanks for confirming.', 'Salamat sa pagkumpirma.'],
  reportInaccurate: ['Report inaccurate', 'I-report na mali'],
  flaggedForReview: ['Flagged for review. Thank you.', 'Naiulat para sa pagsusuri. Salamat.'],
  getDirections: ['Get Directions', 'Kumuha ng Direksyon'],
  verifiedBadge: ['Verified', 'Beripikado'],
  pendingBadge: ['Pending verification', 'Naghihintay ng beripikasyon'],
  reportedBy: ['Reported by', 'Iniulat ni'],
  verifiedByLabel: ['Verified by', 'Bineripika ni'],

  hazardFlooded: ['Flooded Road', 'Binahang Kalsada'],
  hazardLandslide: ['Landslide', 'Landslide'],
  hazardFallenTree: ['Fallen Tree / Debris', 'Bumagsak na Puno / Kalat'],
  hazardPowerLine: ['Power Line Down', 'Bumagsak na Linya ng Kuryente'],
  hazardBridge: ['Impassable Bridge', 'Hindi Madaanang Tulay'],
  hazardOther: ['Other', 'Iba pa'],

  severityCaution: ['Passable with caution', 'Madadaanan nang may ingat'],
  severityNotPassable: ['Not passable', 'Hindi madaanan'],
  severityLifeThreatening: ['Life-threatening', 'Delikado sa buhay'],

  reportHazard: ['Report a Hazard', 'Mag-report ng Panganib'],
  step: ['Step', 'Hakbang'],
  stepLocationTitle: ['Where is the hazard?', 'Nasaan ang panganib?'],
  stepLocationBody: [
    'Drag the map to move the pin. It starts at your current location.',
    'I-drag ang mapa para igalaw ang pin. Nagsisimula ito sa lokasyon mo.',
  ],
  stepTypeTitle: ['What kind of hazard?', 'Anong klaseng panganib?'],
  stepSeverityTitle: ['How bad is it?', 'Gaano ito kalala?'],
  stepPhotoTitle: ['Add a photo', 'Magdagdag ng litrato'],
  stepPhotoBody: [
    'A photo is required so officials can verify your report quickly.',
    'Kailangan ang litrato para mabilis itong ma-verify ng mga opisyal.',
  ],
  takePhoto: ['Take photo', 'Kumuha ng litrato'],
  chooseFromGallery: ['Choose from gallery', 'Pumili sa gallery'],
  retakePhoto: ['Replace photo', 'Palitan ang litrato'],
  descriptionOptional: ['Description (optional)', 'Deskripsyon (opsyonal)'],
  descriptionHint: [
    'e.g. Knee-deep near the underpass',
    'hal. Hanggang tuhod malapit sa underpass',
  ],
  submitReport: ['Submit report', 'Isumite ang report'],
  photoRequiredNotice: ['Attach a photo to submit.', 'Maglakip ng litrato para makapagsumite.'],
  reportSubmittedTitle: ['Thanks! Report submitted.', 'Salamat! Naisumite na.'],
  reportSubmittedBody: [
    'Your report is pending verification by a barangay official. It is already visible on the map as an orange pin.',
    'Naghihintay ng beripikasyon ang report mo mula sa opisyal ng barangay. Nakikita na ito sa mapa bilang orange na pin.',
  ],
  backToMap: ['Back to map', 'Bumalik sa mapa'],

  verificationPanel: ['Verification Panel', 'Verification Panel'],
  pendingInYourArea: ['Pending in your area', 'Naghihintay sa inyong lugar'],
  verify: ['Verify', 'Beripikahin'],
  reject: ['Reject', 'Tanggihan'],
  listView: ['List', 'Listahan'],
  mapView: ['Map', 'Mapa'],
  rejectConfirmTitle: ['Reject this report?', 'Tanggihan ang report?'],
  rejectConfirmBody: [
    'It will be removed from the map and the reporter will be notified. This cannot be undone.',
    'Aalisin ito sa mapa at aabisuhan ang nag-report. Hindi na ito mababawi.',
  ],
  reportVerifiedToast: [
    'Report verified. It is now live for everyone.',
    'Beripikado na. Live na ito sa lahat.',
  ],
  reportRejectedToast: ['Report rejected and removed.', 'Tinanggihan at inalis ang report.'],
  nothingToVerify: [
    'No pending reports in your area right now.',
    'Walang naghihintay na report sa inyong lugar ngayon.',
  ],

  alerts: ['Alerts', 'Mga Alerto'],
  mySavedRoutes: ['My Saved Routes', 'Mga Nakasave na Ruta'],
  everywhereNearby: ['Everywhere Nearby', 'Kahit Saan sa Malapit'],
  markAllRead: ['Mark all as read', 'Markahan lahat'],
  noAlerts: ['No alerts yet.', 'Wala pang alerto.'],
  noRouteAlerts: [
    'No alerts on your saved routes. That is good news.',
    'Walang alerto sa mga nakasave mong ruta. Magandang balita iyan.',
  ],
  allCaughtUp: ['All caught up.', 'Wala nang bago.'],

  safeSpots: ['Safe Spots', 'Ligtas na Lugar'],
  allCategories: ['All', 'Lahat'],
  categoryMalls: ['Malls', 'Mall'],
  categorySchools: ['Schools', 'Paaralan'],
  categoryEvacuation: ['Evacuation Centers', 'Evacuation Center'],
  categoryTerminals: ['Terminals', 'Terminal'],
  openNow: ['Open now', 'Bukas ngayon'],
  closedNow: ['Closed', 'Sarado'],
  subscribe: ['Subscribe', 'Mag-subscribe'],
  subscribed: ['Subscribed', 'Naka-subscribe'],
  subscribedToast: [
    'Subscribed. We will alert you when this changes.',
    'Naka-subscribe. Aabisuhan ka namin kapag nagbago ito.',
  ],
  unsubscribedToast: ['Unsubscribed.', 'Hindi na naka-subscribe.'],
  hours: ['Hours', 'Oras'],
  capacity: ['Capacity', 'Kapasidad'],
  contact: ['Contact', 'Kontak'],
  walk: ['walk', 'lakad'],

  savedRoutes: ['Saved Routes', 'Nakasave na Ruta'],
  addRoute: ['Add route', 'Magdagdag ng ruta'],
  newRoute: ['New route', 'Bagong ruta'],
  routeName: ['Route name', 'Pangalan ng ruta'],
  routeNameHint: ['e.g. Home to School', 'hal. Bahay papuntang Eskwela'],
  setStart: ['Set start point', 'Itakda ang simula'],
  setEnd: ['Set end point', 'Itakda ang dulo'],
  startPoint: ['Start', 'Simula'],
  endPoint: ['End', 'Dulo'],
  tapMapToSet: ['Tap the map to place this point.', 'I-tap ang mapa para ilagay ang punto.'],
  statusClear: ['Clear', 'Malinis'],
  routeDeleted: ['Route deleted', 'Nabura ang ruta'],
  noSavedRoutes: [
    'No saved routes yet. Add your daily commute to get alerts about it.',
    'Wala pang nakasave na ruta. Idagdag ang araw-araw mong biyahe para makatanggap ng alerto.',
  ],
  saveRoute: ['Save route', 'I-save ang ruta'],
  routeSavedToast: ['Route saved.', 'Na-save ang ruta.'],

  routePreview: ['Route preview', 'Preview ng ruta'],
  startNavigation: ['Start Navigation', 'Simulan ang Nabigasyon'],
  endNavigation: ['End', 'Tapusin'],
  eta: ['ETA', 'ETA'],
  arriveIn: ['Arrive in', 'Darating sa'],
  distance: ['Distance', 'Layo'],
  avoidingHazards: [
    'Route avoids reported hazards.',
    'Iniiwasan ng ruta ang mga naiulat na panganib.',
  ],
  navigatingTo: ['Navigating to', 'Papunta sa'],
  youHaveArrived: ['You have arrived.', 'Nakarating ka na.'],

  profile: ['Profile', 'Profile'],
  reportsSubmitted: ['Submitted', 'Naisumite'],
  reportsVerifiedStat: ['Verified', 'Beripikado'],
  trustScore: ['Trust score', 'Trust score'],
  verificationsDone: ['Verifications', 'Beripikasyon'],
  notificationPreferences: ['Notification preferences', 'Setting ng abiso'],
  pushAlerts: ['Push alerts', 'Push alert'],
  pushAlertsDesc: [
    'Get notified when a hazard is verified near you.',
    'Maabisuhan kapag may beripikadong panganib sa malapit.',
  ],
  smsFallback: ['SMS fallback', 'SMS fallback'],
  smsFallbackDesc: [
    'Receive critical alerts by text when you have no internet.',
    'Tumanggap ng mahalagang alerto sa text kapag walang internet.',
  ],
  alertRadius: ['Alert radius', 'Alert radius'],
  alertRadiusDesc: [
    'How far from you a hazard must be before Bantay alerts you.',
    'Gaano kalayo ang panganib bago ka abisuhan ng Bantay.',
  ],
  language: ['Language', 'Wika'],
  english: ['English', 'English'],
  filipino: ['Filipino', 'Filipino'],
  helpAndSupport: ['Help & Support', 'Tulong at Suporta'],
  myReports: ['My reports', 'Aking mga report'],
  noReportsYet: ['You have not filed any reports yet.', 'Wala ka pang naisumiteng report.'],
  logOutConfirmTitle: ['Log out?', 'Mag-log out?'],
  logOutConfirmBody: [
    'You will need to log in again to report hazards.',
    'Kailangan mong mag-log in ulit para makapag-report.',
  ],
  changeRole: ['Change role', 'Palitan ang role'],
  resetDoneToast: ['Sample data restored.', 'Naibalik ang sample data.'],
  justNow: ['just now', 'ngayon lang'],
  minAgo: ['min ago', 'min ang nakalipas'],
  hoursAgo: ['hours ago', 'oras ang nakalipas'],
  daysAgo: ['days ago', 'araw ang nakalipas'],
} as const satisfies Record<string, Pair>;

export type StringKey = keyof typeof COPY;

/** Resolves one string in the active language. */
export function t(key: StringKey, language: Language): string {
  return COPY[key][language === 'fil' ? 1 : 0];
}

/** Builds a bound translator so components can call `s('tabMap')`. */
export function translator(language: Language): (key: StringKey) => string {
  return (key) => t(key, language);
}

export type Translate = ReturnType<typeof translator>;
