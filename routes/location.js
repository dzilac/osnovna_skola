const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET - Dobij lokaciju deteta (za roditelja)
router.get('/child/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Pronađi dete
    const child = await User.findById(childId);
    
    if (!child) {
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }

    // Proveri da li je dete
    if (child.role !== 'Dete') {
      return res.status(400).json({ message: 'Korisnik nije dete' });
    }

    // Proveri da li je ulogovani korisnik roditelj ovog deteta
    if (req.user.role === 'Roditelj' && child.parentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nemate dozvolu da pristupite ovoj lokaciji' });
    }

    // Proveri da li dete ima lokaciju
    if (!child.location || !child.location.latitude || !child.location.longitude) {
      return res.status(404).json({ message: 'Lokacija nije dostupna' });
    }

    // Vrati lokaciju
    res.json({
      latitude: child.location.latitude,
      longitude: child.location.longitude,
      address: child.location.address || '',
      lastUpdated: child.location.lastUpdated
    });

  } catch (error) {
    console.error('Greška pri dobijanju lokacije:', error);
    res.status(500).json({ message: 'Greška pri dobijanju lokacije' });
  }
});

// POST - Ažuriraj lokaciju deteta (za dete ili admin)
router.post('/update', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    // Proveri da li je korisnik dete ili admin
    if (req.user.role !== 'Dete' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Samo deca mogu da ažuriraju svoju lokaciju' });
    }

    // Validacija
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude i longitude su obavezni' });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: 'Nevalidna geografska širina' });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Nevalidna geografska dužina' });
    }

    // Ažuriraj lokaciju
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          latitude,
          longitude,
          address: address || '',
          lastUpdated: new Date()
        }
      },
      { new: true }
    );

    res.json({
      message: 'Lokacija uspešno ažurirana',
      location: user.location
    });

  } catch (error) {
    console.error('Greška pri ažuriranju lokacije:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju lokacije' });
  }
});

// POST - Ručno postavi lokaciju za dete (samo za Admin)
router.post('/set/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    const { latitude, longitude, address } = req.body;

    // Proveri da li je korisnik admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Samo admin može ručno da postavlja lokaciju' });
    }

    // Pronađi dete
    const child = await User.findById(childId);
    
    if (!child) {
      return res.status(404).json({ message: 'Dete nije pronađeno' });
    }

    if (child.role !== 'Dete') {
      return res.status(400).json({ message: 'Korisnik nije dete' });
    }

    // Validacija
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude i longitude su obavezni' });
    }

    // Ažuriraj lokaciju
    child.location = {
      latitude,
      longitude,
      address: address || '',
      lastUpdated: new Date()
    };

    await child.save();

    res.json({
      message: 'Lokacija uspešno postavljena',
      location: child.location
    });

  } catch (error) {
    console.error('Greška pri postavljanju lokacije:', error);
    res.status(500).json({ message: 'Greška pri postavljanju lokacije' });
  }
});

// DELETE - Obriši lokaciju (za dete ili admin)
router.delete('/delete', auth, async (req, res) => {
  try {
    // Proveri da li je korisnik dete ili admin
    if (req.user.role !== 'Dete' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Nemate dozvolu' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          latitude: null,
          longitude: null,
          address: '',
          lastUpdated: null
        }
      },
      { new: true }
    );

    res.json({ message: 'Lokacija uspešno obrisana' });

  } catch (error) {
    console.error('Greška pri brisanju lokacije:', error);
    res.status(500).json({ message: 'Greška pri brisanju lokacije' });
  }
});

// GET - Dobij sve dece sa lokacijama (za roditelja)
router.get('/my-children-locations', auth, async (req, res) => {
  try {
    // Proveri da li je korisnik roditelj
    if (req.user.role !== 'Roditelj') {
      return res.status(403).json({ message: 'Samo roditelji mogu pristupiti ovoj ruti' });
    }

    // Pronađi svu decu ovog roditelja koja imaju lokaciju
    const children = await User.find({
      parentId: req.user.id,
      role: 'Dete',
      'location.latitude': { $ne: null },
      'location.longitude': { $ne: null }
    }).select('firstName lastName grade profileImage location');

    res.json(children);

  } catch (error) {
    console.error('Greška pri dobijanju dece sa lokacijama:', error);
    res.status(500).json({ message: 'Greška pri dobijanju lokacija' });
  }
});

module.exports = router;