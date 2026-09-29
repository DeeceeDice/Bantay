jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { carto: { apiKey: 'cb1_test_key' } } } },
}));

// eslint-disable-next-line import/first
import {
  CARTO_VOYAGER,
  cartoVoyager,
  tileImageSource,
  tileUrl,
} from '../src/components/map/tileSource';

const PUBLIC = cartoVoyager('');

describe('tile source', () => {
  it('fills the z/x/y template and spreads tiles across the CDN hosts', () => {
    expect(tileUrl(PUBLIC, 27440, 15197, 15)).toBe(
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/15/27440/15197.png',
    );
    expect(tileUrl(PUBLIC, 27441, 15197, 15)).toBe(
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/15/27441/15197.png',
    );
  });

  it('names the app in the User-Agent on native, where the default is blocked', () => {
    for (const os of ['android', 'ios']) {
      const request = tileImageSource(PUBLIC, 1, 2, 3, os);
      expect(request.uri).toBe('https://d.basemaps.cartocdn.com/rastertiles/voyager/3/1/2.png');
      expect(request.headers?.['User-Agent']).toMatch(/^Bantay\/\S+ \(.*https:\/\//);
    }
  });

  it('sends the project CARTO key from app.json on every tile', () => {
    expect(tileUrl(CARTO_VOYAGER, 27440, 15197, 15)).toBe(
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/15/27440/15197.png?key=cb1_test_key',
    );
    expect(tileImageSource(CARTO_VOYAGER, 1, 2, 3, 'android').uri).toMatch(/\?key=cb1_test_key$/);
  });

  it('never asks CARTO for zoom 20, which it serves blank', () => {
    expect(CARTO_VOYAGER.maxZoom).toBe(19);
  });

  it('still loads the public basemap with no key', () => {
    expect(PUBLIC.urlTemplate).not.toContain('key=');
  });

  it('credits OpenStreetMap and CARTO', () => {
    expect(CARTO_VOYAGER.attribution).toMatch(/OpenStreetMap/);
    expect(CARTO_VOYAGER.attribution).toMatch(/CARTO/);
  });
});
