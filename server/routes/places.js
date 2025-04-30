const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { lat, lng, type, radius = 1000 } = req.query;
    
    // Validar coordenadas
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Se requieren latitud y longitud' });
    }

    // Definir categorías según tipo
    let overpassQuery;
    switch(type) {
      case 'restaurant':
        overpassQuery = `[out:json];
          (
            node["amenity"="restaurant"](around:${radius},${lat},${lng});
            node["amenity"="cafe"](around:${radius},${lat},${lng});
            node["amenity"="fast_food"](around:${radius},${lat},${lng});
          );
          out body;`;
        break;
      case 'nightlife':
        overpassQuery = `[out:json];
          (
            node["amenity"="bar"](around:${radius},${lat},${lng});
            node["amenity"="pub"](around:${radius},${lat},${lng});
            node["amenity"="nightclub"](around:${radius},${lat},${lng});
          );
          out body;`;
        break;
      case 'transport':
        overpassQuery = `[out:json];
          (
            node["amenity"="bus_station"](around:${radius},${lat},${lng});
            node["amenity"="taxi"](around:${radius},${lat},${lng});
            node["railway"="station"](around:${radius},${lat},${lng});
            node["amenity"="subway_entrance"](around:${radius},${lat},${lng});
          );
          out body;`;
        break;
      default:
        return res.status(400).json({ message: 'Tipo no válido. Use: restaurant, nightlife o transport' });
    }

    const response = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
    
    // Procesar resultados
    const places = response.data.elements
      .filter(place => place.tags && place.tags.name) // Solo lugares con nombre
      .map(place => ({
        id: place.id,
        type,
        name: place.tags.name,
        lat: place.lat,
        lng: place.lon,
        address: place.tags['addr:street'] || '',
        additionalInfo: {
          cuisine: place.tags.cuisine || '',
          opening_hours: place.tags.opening_hours || ''
        }
      }));

    if (places.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron resultados para esta ubicación',
        suggestion: 'Intenta con un radio de búsqueda mayor'
      });
    }

    res.json(places);
  } catch (err) {
    console.error('Error en la API de lugares:', err);
    res.status(500).json({ 
      message: 'Error al obtener lugares',
      error: err.message 
    });
  }
});

module.exports = router;