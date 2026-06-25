export function buildMapLinks(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { yandex: null, osm: null };

  return {
    yandex: `https://yandex.ru/maps/?pt=${lon},${lat}&z=17&l=map`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
  };
}
