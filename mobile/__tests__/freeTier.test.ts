/**
 * The ticket check itself: yes only when the database says yes, and no -
 * never an exception - when it cannot be asked.
 */
const mockRpc = jest.fn();
jest.mock('../src/data/repositories/supabaseClient', () => ({
  supabase: () => ({ rpc: mockRpc }),
}));

// eslint-disable-next-line import/first
import { claimGoogleCall } from '../src/data/google/freeTier';

describe('claimGoogleCall', () => {
  beforeEach(() => mockRpc.mockReset());

  it('asks the shared counter for this API', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    await expect(claimGoogleCall('routes_compute')).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('claim_api_call', { api: 'routes_compute' });
  });

  it('is a no when the month is used up', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    await expect(claimGoogleCall('places_text_search')).resolves.toBe(false);
  });

  it('fails closed on a database error or no connection', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(claimGoogleCall('map_tiles_view')).resolves.toBe(false);
    mockRpc.mockRejectedValue(new Error('offline'));
    await expect(claimGoogleCall('map_tiles_view')).resolves.toBe(false);
  });
});
