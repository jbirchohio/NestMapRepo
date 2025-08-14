/**
 * Pre-populated place data for popular cities as fallback
 * This data is used when OSM API is unavailable
 */

export const POPULAR_CITIES = {
  'sigmaringen_germany': {
    restaurants: [
      { name: "King's Garden", lat: 48.0892132, lon: 9.2120122, cuisine: "chinese" },
      { name: "Restaurant Gutshof Käppeler", lat: 48.091753, lon: 9.1065245, cuisine: "regional" },
      { name: "Gasthof Adler", lat: 48.1092477, lon: 9.1430652 },
      { name: "Gasthaus Krone", lat: 48.142212, lon: 9.0918462, cuisine: "regional" },
      { name: "Gasthaus Mühle", lat: 48.0786161, lon: 9.1402577, cuisine: "german" }
    ],
    attractions: [
      { name: "Sigmaringen Castle", lat: 48.087323, lon: 9.21694, type: "castle" },
      { name: "Schloßblick", lat: 48.0893773, lon: 9.2164295, type: "viewpoint" },
      { name: "Borrenfelsen", lat: 48.079851, lon: 9.1911381, type: "viewpoint" },
      { name: "Karl Anton Denkmal", lat: 48.087323, lon: 9.21694, type: "memorial" }
    ],
    cafes: [
      { name: "Eisdiele Dolomiti", lat: 48.0860905, lon: 9.2183369 },
      { name: "TheaterCaFé", lat: 48.0868997, lon: 9.2149371 },
      { name: "Café Schön", lat: 48.0867078, lon: 9.2149756 }
    ]
  },
  'paris_france': {
    restaurants: [
      { name: "Le Comptoir du Relais", lat: 48.853312, lon: 2.336447, cuisine: "french" },
      { name: "L'Ambroisie", lat: 48.854668, lon: 2.365563, cuisine: "french" },
      { name: "Le Chateaubriand", lat: 48.863901, lon: 2.384447, cuisine: "modern french" }
    ],
    attractions: [
      { name: "Eiffel Tower", lat: 48.858370, lon: 2.294481, type: "monument" },
      { name: "Louvre Museum", lat: 48.860611, lon: 2.337644, type: "museum" },
      { name: "Arc de Triomphe", lat: 48.873792, lon: 2.295028, type: "monument" }
    ],
    cafes: [
      { name: "Café de Flore", lat: 48.854134, lon: 2.332592 },
      { name: "Les Deux Magots", lat: 48.854039, lon: 2.333511 }
    ]
  },
  'berlin_germany': {
    restaurants: [
      { name: "Restaurant Tim Raue", lat: 52.506882, lon: 13.393235, cuisine: "asian fusion" },
      { name: "Lorenz Adlon Esszimmer", lat: 52.515831, lon: 13.380897, cuisine: "fine dining" }
    ],
    attractions: [
      { name: "Brandenburg Gate", lat: 52.516275, lon: 13.377704, type: "monument" },
      { name: "Berlin Wall Memorial", lat: 52.535203, lon: 13.390205, type: "memorial" }
    ],
    cafes: [
      { name: "The Barn Roastery", lat: 52.523902, lon: 13.402351 },
      { name: "Café Einstein Stammhaus", lat: 52.503662, lon: 13.329888 }
    ]
  }
};

export function getFallbackPlaces(city: string, country: string) {
  const key = `${city.toLowerCase()}_${country.toLowerCase()}`;
  return POPULAR_CITIES[key] || null;
}