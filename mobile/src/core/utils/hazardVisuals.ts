import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

import {
  AlertKind,
  HazardSeverity,
  HazardType,
  ReportStatus,
  SafeSpotCategory,
  UserRole,
} from '../../data/models/enums';
import { StringKey } from '../i18n/strings';
import { Colors } from '../theme/colors';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * The single place that decides how each hazard concept looks and reads.
 *
 * Centralising this is what keeps the colour language honest: red always
 * means verified hazard, orange always means pending, green always means
 * safe. No screen is free to invent its own mapping.
 */

export const hazardIcon = (type: HazardType): IconName => {
  switch (type) {
    case 'flooded_road':
      return 'water';
    case 'landslide':
      return 'terrain';
    case 'fallen_tree':
      return 'park';
    case 'power_line_down':
      return 'bolt';
    case 'impassable_bridge':
      return 'dangerous';
    default:
      return 'warning-amber';
  }
};

export const hazardLabelKey = (type: HazardType): StringKey => {
  switch (type) {
    case 'flooded_road':
      return 'hazardFlooded';
    case 'landslide':
      return 'hazardLandslide';
    case 'fallen_tree':
      return 'hazardFallenTree';
    case 'power_line_down':
      return 'hazardPowerLine';
    case 'impassable_bridge':
      return 'hazardBridge';
    default:
      return 'hazardOther';
  }
};

export const severityLabelKey = (severity: HazardSeverity): StringKey => {
  switch (severity) {
    case 'passable_with_caution':
      return 'severityCaution';
    case 'not_passable':
      return 'severityNotPassable';
    default:
      return 'severityLifeThreatening';
  }
};

export const severityIcon = (severity: HazardSeverity): IconName => {
  switch (severity) {
    case 'passable_with_caution':
      return 'info-outline';
    case 'not_passable':
      return 'do-not-disturb-on';
    default:
      return 'emergency';
  }
};

/** Severity drives emphasis within the hazard palette, never outside it. */
export const severityColor = (severity: HazardSeverity): string => {
  switch (severity) {
    case 'passable_with_caution':
      return Colors.warning;
    case 'not_passable':
      return Colors.brandRed;
    default:
      return Colors.brandRedDark;
  }
};

/** Pin colour: the core colour contract of the whole map. */
export const statusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'verified':
      return Colors.brandRed;
    case 'pending':
      return Colors.warning;
    default:
      return Colors.inkFaint;
  }
};

export const safeSpotIcon = (category: SafeSpotCategory): IconName => {
  switch (category) {
    case 'mall':
      return 'storefront';
    case 'school':
      return 'school';
    case 'evacuation_center':
      return 'holiday-village';
    default:
      return 'directions-bus';
  }
};

export const safeSpotLabelKey = (category: SafeSpotCategory): StringKey => {
  switch (category) {
    case 'mall':
      return 'categoryMalls';
    case 'school':
      return 'categorySchools';
    case 'evacuation_center':
      return 'categoryEvacuation';
    default:
      return 'categoryTerminals';
  }
};

export const alertIcon = (kind: AlertKind): IconName => {
  switch (kind) {
    case 'verified_hazard':
      return 'warning';
    case 'typhoon_warning':
      return 'cyclone';
    case 'safe_spot_update':
      return 'home-work';
    case 'report_verified':
      return 'verified';
    case 'report_rejected':
      return 'cancel';
    default:
      return 'alt-route';
  }
};

export const alertColor = (kind: AlertKind): string => {
  switch (kind) {
    case 'verified_hazard':
      return Colors.brandRed;
    case 'typhoon_warning':
      return Colors.brandRedDark;
    case 'safe_spot_update':
      return Colors.brandBlue;
    case 'report_verified':
      return Colors.safe;
    case 'report_rejected':
      return Colors.inkMuted;
    default:
      return Colors.warning;
  }
};

export const roleLabelKey = (role: UserRole): StringKey => {
  switch (role) {
    case 'commuter':
      return 'roleCommuter';
    case 'barangay_official':
      return 'roleBarangay';
    case 'school_admin':
      return 'roleSchoolAdmin';
    default:
      return 'roleBusiness';
  }
};

export const roleDescKey = (role: UserRole): StringKey => {
  switch (role) {
    case 'commuter':
      return 'roleCommuterDesc';
    case 'barangay_official':
      return 'roleBarangayDesc';
    case 'school_admin':
      return 'roleSchoolAdminDesc';
    default:
      return 'roleBusinessDesc';
  }
};

export const roleIcon = (role: UserRole): IconName => {
  switch (role) {
    case 'commuter':
      return 'directions-walk';
    case 'barangay_official':
      return 'shield';
    case 'school_admin':
      return 'school';
    default:
      return 'storefront';
  }
};
