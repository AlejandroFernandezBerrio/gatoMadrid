const express = require('express');
const jwt = require('jsonwebtoken');
const Favorite = require('../models/favorite');
const router = express.Router();

// Middleware de autenticación
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autorizado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.userId = decoded.id;
    next();
  });
}

// Obtener favoritos del usuario
router.get('/', authenticate, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.userId });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener favoritos' });
  }
});

// Añadir favorito
router.post('/', authenticate, async (req, res) => {
  try {
    const { placeId, name, type, lat, lng } = req.body;
    
    const favorite = new Favorite({
      userId: req.userId,
      placeId,
      name,
      type,
      lat,
      lng
    });

    await favorite.save();
    res.status(201).json(favorite);
  } catch (err) {
    res.status(500).json({ message: 'Error al guardar favorito' });
  }
});

// Eliminar favorito
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    res.json({ message: 'Favorito eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar favorito' });
  }
});

module.exports = router;