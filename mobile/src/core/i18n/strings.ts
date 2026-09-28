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
    'Save your daily route and Bantay shows you any hazard reported along it.',
    'I-save ang araw-araw mong ruta at ipapakita ng Bantay ang anumang panganib na na-report dito.',
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
  hazardOne: ['hazard', 'hazard'],
  hazardMany: ['hazards', 'hazards'],
  away: ['away', 'ang layo'],
  filters: ['Filters', 'Mga Filter'],
  showVerifiedOnly: ['Show verified only', 'Beripikado lang'],
  showSafeSpots: ['Show safe spots', 'Ipakita ang ligtas na lugar'],
  showPendingReports: ['Show pending reports', 'Ipakita ang naghihintay'],
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
  discardReport: [
    'Your unfinished report will be discarded. Leave anyway?',
    'Mawawala ang report na sinisimulan mo. Ituloy?',
  ],
  severityCautionDesc: ['Still passable, but take care.', 'Nadadaanan pa pero mag-ingat.'],
  severityBlockedDesc: ['Blocked. No one can get through.', 'Hindi madaanan.'],
  severityDangerDesc: ['Immediate danger to anyone nearby.', 'Delikado sa buhay ng mga malapit.'],
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
  noSafeSpots: ['No safe spots in this category yet.', 'Walang ligtas na lugar sa kategoryang ito.'],
  allCategories: ['All', 'Lahat'],
  categoryMalls: ['Malls', 'Mall'],
  categorySchools: ['Schools', 'Paaralan'],
  categoryEvacuation: ['Evacuation Centers', 'Evacuation Center'],
  categoryTerminals: ['Terminals', 'Terminal'],
  openNow: ['Open now', 'Bukas ngayon'],
  closedNow: ['Closed', 'Sarado'],
  subscribe: ['Subscribe', 'Mag-subscribe'],
  directions: ['Directions', 'Direksyon'],
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
  alertRadius: ['Alert radius', 'Alert radius'],
  alertRadiusDesc: [
    'How far from you a hazard must be before Bantay alerts you.',
    'Gaano kalayo ang panganib bago ka abisuhan ng Bantay.',
  ],
  language: ['Language', 'Wika'],
  english: ['English', 'English'],
  filipino: ['Filipino', 'Filipino'],
  helpAndSupport: ['Help & Support', 'Tulong at Suporta'],
  faqQ1: ['How do I report a hazard?', 'Paano mag-report ng panganib?'],
  faqA1: [
    'Tap the red "+" button on the map, place the pin, choose the hazard type and severity, attach a photo and submit. Your report appears immediately as an orange pin while it waits for verification.',
    'I-tap ang pulang "+" sa mapa, ilagay ang pin, piliin ang uri at bigat ng panganib, maglakip ng litrato at isumite. Agad itong lalabas bilang orange na pin habang naghihintay ng beripikasyon.',
  ],
  faqQ2: ['Who verifies reports?', 'Sino ang nagbeberipika?'],
  faqA2: [
    'Barangay officials and school admins approved for the affected area review each report. Once verified, the pin turns red and is shown to everyone.',
    'Ang mga opisyal ng barangay at school admin na inaprubahan para sa lugar ang sumusuri sa bawat report. Kapag beripikado na, nagiging pula ang pin at nakikita ng lahat.',
  ],
  faqQ3: ['What if I have no internet?', 'Paano kung walang internet?'],
  faqA3: [
    'Bantay needs a connection to load the map, send reports and receive alerts. If a report fails to send, you will see an error; try again once you are back online.',
    'Kailangan ng Bantay ng koneksyon para i-load ang mapa, magpadala ng report at tumanggap ng alerto. Kapag hindi naipadala ang report, may lalabas na error; subukan ulit kapag may koneksyon na.',
  ],
  faqQ4: ['How is my trust score calculated?', 'Paano kinakalkula ang trust score ko?'],
  faqA4: [
    'It starts at 50 and moves with the share of your reports that get verified rather than rejected, plus a small bonus for consistent accurate reporting.',
    'Nagsisimula ito sa 50 at gumagalaw base sa bahagi ng mga report mong nabeberipika kaysa natatanggihan, kasama ang maliit na bonus sa tuloy-tuloy na tamang pag-report.',
  ],
  faqQ5: ['Is my location shared?', 'Naibabahagi ba ang lokasyon ko?'],
  faqA5: [
    'No. Your live location stays on your device. Only the coordinates of hazards you choose to report are published, and they are attributed to your display name, never your exact position.',
    'Hindi. Nananatili sa device mo ang live mong lokasyon. Ang koordinada lang ng panganib na pinili mong i-report ang inilalathala, at nakalagay ito sa display name mo, hindi sa eksaktong kinaroroonan mo.',
  ],
  myReports: ['My reports', 'Aking mga report'],
  noReportsYet: ['You have not filed any reports yet.', 'Wala ka pang naisumiteng report.'],
  logOutConfirmTitle: ['Log out?', 'Mag-log out?'],
  logOutConfirmBody: [
    'You will need to log in again to report hazards.',
    'Kailangan mong mag-log in ulit para makapag-report.',
  ],
  changeRole: ['Change role', 'Palitan ang role'],
  save: ['Save', 'I-save'],
  justNow: ['just now', 'ngayon lang'],
  minAgo: ['min ago', 'min ang nakalipas'],
  hoursAgo: ['hours ago', 'oras ang nakalipas'],
  daysAgo: ['days ago', 'araw ang nakalipas'],

  // Roles, access requests and the admin console
  roleSuperAdmin: ['Super Admin', 'Super Admin'],
  roleSuperAdminDesc: [
    'Oversees every zone from Bantay Admin.',
    'Namamahala sa lahat ng zone mula sa Bantay Admin.',
  ],
  needsApproval: ['Needs approval', 'Kailangan ng approval'],
  requestAccessTitle: ['Request official access', 'Humiling ng access bilang opisyal'],
  requestAccessSub: [
    'A Bantay super admin checks every request before an account can verify reports. Until then you use Bantay as a commuter.',
    'Sinusuri ng super admin ng Bantay ang bawat request bago makapag-verify ang isang account. Habang hinihintay, commuter ka muna.',
  ],
  chooseZone: ['Area you will cover', 'Lugar na sasakupin mo'],
  zoneRequired: ['Choose the area you will cover.', 'Piliin ang lugar na sasakupin mo.'],
  organization: ['Barangay or school office', 'Opisina ng barangay o paaralan'],
  organizationRequired: ['Enter your office.', 'Ilagay ang iyong opisina.'],
  accessReason: ['Why you need access (optional)', 'Bakit kailangan mo ng access (opsyonal)'],
  submitRequest: ['Send request', 'Ipadala ang request'],
  requestSentTitle: ['Request sent', 'Naipadala ang request'],
  requestSentBody: [
    'You will get an alert when a super admin decides. Once approved, the same email and password also sign you in to Bantay Admin.',
    'Makakatanggap ka ng alerto kapag nagdesisyon na ang super admin. Kapag naaprubahan, ang parehong email at password ay magagamit din sa Bantay Admin.',
  ],
  requestPending: ['Access request pending', 'Naghihintay ang access request'],
  requestDenied: ['Access request declined', 'Tinanggihan ang access request'],
  requestApproved: ['Access approved', 'Naaprubahan ang access'],
  continueAsCommuter: ['Continue as commuter', 'Magpatuloy bilang commuter'],
  myArea: ['My area', 'Aking lugar'],
  myAreaDesc: [
    'Get broadcasts and verified-hazard alerts for this area.',
    'Tumanggap ng broadcast at alerto sa beripikadong panganib sa lugar na ito.',
  ],
  noAreaChosen: ['Not set', 'Hindi pa napili'],
  clearArea: ['No area', 'Walang lugar'],
  accountSuspendedTitle: ['Your account is suspended', 'Suspendido ang iyong account'],
  accountSuspendedBody: [
    'You can still see the map, but you cannot report, confirm or flag hazards until a super admin reinstates it.',
    'Makikita mo pa rin ang mapa, pero hindi ka makakapag-report, makakakumpirma o makakapag-flag hanggang ibalik ito ng super admin.',
  ],
  categoryOther: ['Other', 'Iba pa'],
  flaggedBadge: ['Escalated', 'Na-escalate'],
  rejectedBadge: ['Not verified', 'Hindi na-verify'],
  rejectReasonTitle: ['Why are you rejecting this?', 'Bakit mo ito tinatanggihan?'],
  reasonDuplicate: ['Duplicate of another report', 'Kapareho ng ibang report'],
  reasonFalseReport: ['False report', 'Maling report'],
  reasonInsufficient: ['Not enough evidence', 'Kulang ang ebidensya'],
  reasonOutdated: ['No longer there', 'Wala na roon'],
  reasonOther: ['Other reason', 'Ibang dahilan'],
  rejectNote: ['Note to the reporter (optional)', 'Mensahe sa nag-report (opsyonal)'],
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
