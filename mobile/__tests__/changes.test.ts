import { latLng } from '../src/core/geo/latLng';
import { HazardReport } from '../src/data/models/types';
import { MAX_ROW_READS, mergeReports, planChanges } from '../src/data/repositories/changes';

const report = (id: string, overrides: Partial<HazardReport> = {}): HazardReport => ({
  id,
  type: 'flooded_road',
  severity: 'not_passable',
  status: 'pending',
  location: latLng(14.6, 120.99),
  addressLabel: 'España Blvd',
  reportedAt: '2026-10-26T10:00:00Z',
  reporterId: 'u',
  reporterName: 'Maria',
  description: '',
  photoUri: null,
  hasPhoto: true,
  confirmCount: 0,
  denyCount: 0,
  flagCount: 0,
  verifiedBy: null,
  verifiedAt: null,
  rejectReason: null,
  rejectNote: null,
  votedUserIds: [],
  flaggedUserIds: [],
  ...overrides,
});

describe('planChanges', () => {
  it('reads each changed report once, however many events name it', () => {
    const plan = planChanges([
      { table: 'reports', reportId: 'a', deleted: false },
      { table: 'report_votes', reportId: 'a' },
      { table: 'report_votes', reportId: 'b' },
      { table: 'report_votes', reportId: 'a' },
    ]);
    expect(plan.reportIds.sort()).toEqual(['a', 'b']);
    expect(plan).toMatchObject({ safeSpots: false, personal: false, reloadAll: false });
  });

  it('does not read back a report that was deleted', () => {
    const plan = planChanges([
      { table: 'report_votes', reportId: 'a' },
      { table: 'reports', reportId: 'a', deleted: true },
    ]);
    expect(plan.reportIds).toEqual([]);
    expect(plan.deletedReportIds).toEqual(['a']);
  });

  it('reads safe spots and personal data only when they changed', () => {
    expect(planChanges([{ table: 'safe_spots' }])).toMatchObject({ safeSpots: true, personal: false });
    expect(planChanges([{ table: 'alerts' }])).toMatchObject({ safeSpots: false, personal: true });
  });

  it('falls back to one full reload when a burst names too many reports', () => {
    const burst = Array.from({ length: MAX_ROW_READS + 1 }, (_, i) => ({
      table: 'report_votes' as const,
      reportId: `r${i}`,
    }));
    expect(planChanges(burst).reloadAll).toBe(true);
    expect(planChanges(burst.slice(1)).reloadAll).toBe(false);
  });
});

describe('mergeReports', () => {
  it('replaces in place, appends new reports and drops deleted ones', () => {
    const current = [report('a'), report('b'), report('c')];
    const fresh = new Map<string, HazardReport | null>([
      ['b', report('b', { status: 'verified' })],
      ['d', report('d')],
    ]);
    const merged = mergeReports(current, fresh, ['c']);
    expect(merged.map((r) => [r.id, r.status])).toEqual([
      ['a', 'pending'],
      ['b', 'verified'],
      ['d', 'pending'],
    ]);
  });

  it('drops a report that can no longer be read', () => {
    const merged = mergeReports([report('a'), report('b')], new Map([['a', null]]), []);
    expect(merged.map((r) => r.id)).toEqual(['b']);
  });

  it('keeps a photo this device already holds instead of fetching it back', () => {
    const current = [report('a', { photoUri: 'data:image/jpeg;base64,xyz' })];
    const merged = mergeReports(current, new Map([['a', report('a', { confirmCount: 3 })]]), []);
    expect(merged[0]).toMatchObject({ photoUri: 'data:image/jpeg;base64,xyz', confirmCount: 3 });
  });
});
