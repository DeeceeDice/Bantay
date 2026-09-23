import { Geo, latLng } from '../src/core/geo/latLng';
import { UserProfile, initials, trustScore } from '../src/data/models/types';
import {
  applyFlag,
  applyVote,
  checkSafety,
  hazardsNear,
  isOnAnySavedRoute,
  pendingForOfficial,
  pendingReports,
  reportsByUser,
  safeSpotsNear,
  sortedAlerts,
  statusForRoute,
  unreadCount,
  verifiedHazards,
} from '../src/data/repositories/logic';
import { seedAlerts, seedReports, seedRoutes, seedSafeSpots } from '../src/data/seed/seedData';

const NOW = new Date('2026-09-23T12:00:00Z');
const reports = seedReports(NOW);
const spots = seedSafeSpots(NOW);
const routes = seedRoutes(NOW);
const alerts = seedAlerts(NOW);

const official: UserProfile = {
  id: 'official-1',
  name: 'Official Cruz',
  email: 'official@example.com',
  role: 'barangay_official',
  barangay: 'Sampaloc, Manila',
  reportsSubmitted: 0,
  reportsVerified: 0,
  reportsRejected: 0,
  verificationsPerformed: 0,
  authProvider: 'email',
  joinedAt: null,
  areaCenter: latLng(14.6096, 120.9925),
  areaRadiusMeters: 3000,
};

describe('seed content', () => {
  it('gives a fresh install something on every screen', () => {
    expect(reports.length).toBeGreaterThan(0);
    expect(spots.length).toBeGreaterThan(0);
    expect(routes.length).toBeGreaterThan(0);
    expect(alerts.length).toBeGreaterThan(0);
    expect(verifiedHazards(reports).length).toBeGreaterThan(0);
    expect(pendingReports(reports).length).toBeGreaterThan(0);
  });
});

describe('public visibility', () => {
  it('separates verified from pending, with no overlap', () => {
    const verified = verifiedHazards(reports).map((r) => r.id);
    const pending = pendingReports(reports).map((r) => r.id);
    expect(verified.some((id) => pending.includes(id))).toBe(false);
  });

  it('rejected reports appear in neither list', () => {
    const rejected = { ...reports[0], id: 'rejected-1', status: 'rejected' as const };
    const withRejected = [...reports, rejected];
    expect(verifiedHazards(withRejected).map((r) => r.id)).not.toContain('rejected-1');
    expect(pendingReports(withRejected).map((r) => r.id)).not.toContain('rejected-1');
  });
});

describe('community confirmation voting', () => {
  const target = verifiedHazards(reports)[0];

  it('a yes vote increments the confirm counter', () => {
    const next = applyVote(target, 'user-1', true);
    expect(next?.confirmCount).toBe(target.confirmCount + 1);
    expect(next?.denyCount).toBe(target.denyCount);
  });

  it('a no vote increments the deny counter instead', () => {
    const next = applyVote(target, 'user-1', false);
    expect(next?.denyCount).toBe(target.denyCount + 1);
    expect(next?.confirmCount).toBe(target.confirmCount);
  });

  it('the same user cannot vote twice', () => {
    const first = applyVote(target, 'user-1', true);
    expect(first).not.toBeNull();
    expect(applyVote(first!, 'user-1', true)).toBeNull();
    expect(applyVote(first!, 'user-1', false)).toBeNull();
  });

  it('a different user can still vote', () => {
    const first = applyVote(target, 'user-1', true);
    const second = applyVote(first!, 'user-2', true);
    expect(second?.confirmCount).toBe(target.confirmCount + 2);
  });

  it('flagging is also one per user', () => {
    const first = applyFlag(target, 'user-1');
    expect(first?.flagCount).toBe(target.flagCount + 1);
    expect(applyFlag(first!, 'user-1')).toBeNull();
    expect(applyFlag(first!, 'user-2')?.flagCount).toBe(target.flagCount + 2);
  });
});

describe('"Am I Safe Here?"', () => {
  it('reports safe when no verified hazard is within the radius', () => {
    // Baguio: nowhere near the seeded Manila hazards.
    const result = checkSafety(reports, latLng(16.4023, 120.596), 2000);
    expect(result.isSafe).toBe(true);
    expect(result.hazards).toHaveLength(0);
    expect(result.nearest).toBeNull();
  });

  it('reports unsafe and names the nearest hazard', () => {
    const known = verifiedHazards(reports)[0];
    const result = checkSafety(reports, known.location, 500);
    expect(result.isSafe).toBe(false);
    expect(result.nearest).not.toBeNull();
    expect(result.nearestDistanceMeters).toBeLessThan(500);
    expect(result.worstSeverity).not.toBeNull();
  });

  it('ignores pending reports, which are not yet trustworthy', () => {
    const pending = pendingReports(reports)[0];
    const onlyPending = reports.filter((r) => r.status === 'pending');
    expect(checkSafety(onlyPending, pending.location, 1000).isSafe).toBe(true);
  });

  it('returns hazards nearest first', () => {
    const origin = latLng(14.6096, 120.9925);
    const near = hazardsNear(reports, origin, 50_000);
    const distances = near.map((h) => Geo.distanceMeters(origin, h.location));
    for (let i = 0; i < distances.length - 1; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
    }
  });
});

describe('saved route status', () => {
  it('a route with no hazards near it reads as clear', () => {
    const remote = {
      ...routes[0],
      id: 'remote',
      start: latLng(16.4023, 120.596),
      end: latLng(16.41, 120.6),
      waypoints: [],
    };
    expect(statusForRoute(reports, remote).hazardCount).toBe(0);
    expect(statusForRoute(reports, remote).worstSeverity).toBeNull();
  });

  it('a hazard on the path is counted against the route', () => {
    const hazard = verifiedHazards(reports)[0];
    const through = {
      ...routes[0],
      id: 'through',
      start: Geo.offsetMeters(hazard.location, 0, -400),
      end: Geo.offsetMeters(hazard.location, 0, 400),
      waypoints: [],
    };
    const status = statusForRoute(reports, through);
    expect(status.hazardCount).toBeGreaterThanOrEqual(1);
    expect(status.worstSeverity).not.toBeNull();
  });

  it('detects a point sitting on any saved route', () => {
    expect(isOnAnySavedRoute(routes, routes[0].start)).toBe(true);
    expect(isOnAnySavedRoute(routes, latLng(16.4023, 120.596))).toBe(false);
  });
});

describe('area-scoped moderation', () => {
  it('an official only sees pending reports inside their area', () => {
    const faraway = {
      ...pendingReports(reports)[0],
      id: 'far',
      location: latLng(16.4023, 120.596),
      addressLabel: 'Far away',
    };
    const queue = pendingForOfficial([...reports, faraway], official);

    expect(queue.length).toBeGreaterThan(0);
    expect(queue.map((r) => r.id)).not.toContain('far');
    for (const report of queue) {
      expect(
        Geo.distanceMeters(official.areaCenter, report.location),
      ).toBeLessThanOrEqual(official.areaRadiusMeters);
    }
  });

  it('the queue is sorted most dangerous first', () => {
    const rank = { passable_with_caution: 1, not_passable: 2, life_threatening: 3 };
    const queue = pendingForOfficial(reports, official);
    for (let i = 0; i < queue.length - 1; i++) {
      expect(rank[queue[i].severity]).toBeGreaterThanOrEqual(rank[queue[i + 1].severity]);
    }
  });

  it('never surfaces an already-verified report', () => {
    expect(
      pendingForOfficial(reports, official).every((r) => r.status === 'pending'),
    ).toBe(true);
  });
});

describe('alerts', () => {
  it('are ordered newest first without mutating the input', () => {
    const before = alerts.map((a) => a.id);
    const sorted = sortedAlerts(alerts);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(Date.parse(sorted[i].createdAt)).toBeGreaterThanOrEqual(
        Date.parse(sorted[i + 1].createdAt),
      );
    }
    expect(alerts.map((a) => a.id)).toEqual(before);
  });

  it('counts only unread', () => {
    expect(unreadCount(alerts)).toBe(alerts.filter((a) => !a.isRead).length);
    expect(unreadCount(alerts.map((a) => ({ ...a, isRead: true })))).toBe(0);
  });
});

describe('safe spots', () => {
  it('are returned nearest first', () => {
    const origin = latLng(14.6096, 120.9925);
    const distances = safeSpotsNear(spots, origin).map((s) =>
      Geo.distanceMeters(origin, s.location),
    );
    for (let i = 0; i < distances.length - 1; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
    }
  });

  it('filter by category when asked', () => {
    const malls = safeSpotsNear(spots, latLng(14.6, 121), 'mall');
    expect(malls.length).toBeGreaterThan(0);
    expect(malls.every((s) => s.category === 'mall')).toBe(true);
  });
});

describe('my reports', () => {
  it('returns only that user, newest first', () => {
    const mine = reportsByUser(reports, 'seed-user-maria');
    expect(mine.every((r) => r.reporterId === 'seed-user-maria')).toBe(true);
    for (let i = 0; i < mine.length - 1; i++) {
      expect(Date.parse(mine[i].reportedAt)).toBeGreaterThanOrEqual(
        Date.parse(mine[i + 1].reportedAt),
      );
    }
  });
});

describe('trust score', () => {
  const profile = (submitted: number, verified: number, rejected: number): UserProfile => ({
    ...official,
    reportsSubmitted: submitted,
    reportsVerified: verified,
    reportsRejected: rejected,
  });

  it('a brand new account starts neutral', () => {
    expect(trustScore(profile(0, 0, 0))).toBe(50);
  });

  it('accurate reporting raises the score above neutral', () => {
    expect(trustScore(profile(4, 4, 0))).toBeGreaterThan(50);
  });

  it('rejected reports pull the score down', () => {
    expect(trustScore(profile(4, 1, 3))).toBeLessThan(trustScore(profile(4, 4, 0)));
  });

  it('stays within 0 and 100 even at extremes', () => {
    expect(trustScore(profile(500, 500, 0))).toBeLessThanOrEqual(100);
    expect(trustScore(profile(500, 0, 500))).toBeGreaterThanOrEqual(0);
  });

  it('volume alone cannot outrank accuracy', () => {
    expect(trustScore(profile(100, 20, 80))).toBeLessThan(trustScore(profile(10, 10, 0)));
  });
});

describe('initials', () => {
  it('handle one-word, multi-word and empty names', () => {
    expect(initials('Ramon Torres')).toBe('RT');
    expect(initials('Ramon')).toBe('R');
    expect(initials('   ')).toBe('?');
    expect(initials('Maria Clara de Santos')).toBe('MS');
  });
});
