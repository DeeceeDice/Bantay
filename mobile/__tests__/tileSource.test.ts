import { OPEN_STREET_MAP, tileImageSource, tileUrl } from '../src/components/map/tileSource';

describe('tile source', () => {
  it('fills the z/x/y template', () => {
    expect(tileUrl(OPEN_STREET_MAP, 27440, 15197, 15)).toBe(
      'https://tile.openstreetmap.org/15/27440/15197.png',
    );
  });

  it('names the app in the User-Agent on native, where the default is blocked', () => {
    for (const os of ['android', 'ios']) {
      const request = tileImageSource(OPEN_STREET_MAP, 1, 2, 3, os);
      expect(request.uri).toBe('https://tile.openstreetmap.org/3/1/2.png');
      expect(request.headers?.['User-Agent']).toMatch(/^Bantay\/\S+ \(.*https:\/\//);
    }
  });

  it('sends no custom headers from a browser', () => {
    expect(tileImageSource(OPEN_STREET_MAP, 1, 2, 3, 'web')).toEqual({
      uri: 'https://tile.openstreetmap.org/3/1/2.png',
    });
  });
});
