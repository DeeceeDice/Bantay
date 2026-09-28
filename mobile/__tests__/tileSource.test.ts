import { CARTO_VOYAGER, tileImageSource, tileUrl } from '../src/components/map/tileSource';

describe('tile source', () => {
  it('fills the z/x/y template and spreads tiles across the CDN hosts', () => {
    expect(tileUrl(CARTO_VOYAGER, 27440, 15197, 15)).toBe(
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/15/27440/15197.png',
    );
    expect(tileUrl(CARTO_VOYAGER, 27441, 15197, 15)).toBe(
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/15/27441/15197.png',
    );
  });

  it('names the app in the User-Agent on native, where the default is blocked', () => {
    for (const os of ['android', 'ios']) {
      const request = tileImageSource(CARTO_VOYAGER, 1, 2, 3, os);
      expect(request.uri).toBe('https://d.basemaps.cartocdn.com/rastertiles/voyager/3/1/2.png');
      expect(request.headers?.['User-Agent']).toMatch(/^Bantay\/\S+ \(.*https:\/\//);
    }
  });

  it('credits OpenStreetMap and CARTO', () => {
    expect(CARTO_VOYAGER.attribution).toMatch(/OpenStreetMap/);
    expect(CARTO_VOYAGER.attribution).toMatch(/CARTO/);
  });
});
