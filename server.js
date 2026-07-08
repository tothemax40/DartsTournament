require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const app = express();

// ======================
// CONFIGURATION MIDDLEWARE
// ======================
app.use(cors({
  origin: '*', // Autorise toutes les origines (à restreindre en production)
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de la session avec MongoDB
app.use(session({
  secret: process.env.SESSION_SECRET || 'ta_cle_secrete_par_defaut',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/dartstournament_db',
    ttl: 14 * 24 * 60 * 60 // 14 jours
  }),
  cookie: {
    secure: false, // Mettre à true si HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 1 jour
  }
}));

// ======================
// CONNEXION À MONGODB
// ======================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dartstournament_db')
  .then(() => console.log('✅ Connecté à MongoDB (dartstournament_db)'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// ======================
// MODÈLES MONGOOSE
// ======================
// Modèle Utilisateur
const User = mongoose.model('User', {
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Modèle Tournoi
const Tournament = mongoose.model('Tournament', {
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  config: { type: Object, required: true },
  pools: { type: Array, required: true },
  finalBracket: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

// ======================
// ROUTES D'AUTHENTIFICATION
// ======================
// Inscription
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: '✅ Utilisateur créé !' });
  } catch (error) {
    console.error('Erreur inscription :', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: '❌ Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: '❌ Mot de passe incorrect' });

    req.session.userId = user._id;
    res.json({
      message: '✅ Connecté avec succès !',
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error('Erreur connexion :', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Déconnexion
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erreur déconnexion :', err);
      return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
    res.json({ message: '✅ Déconnecté' });
  });
});

// ======================
// MIDDLEWARE D'AUTHENTIFICATION
// ======================
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '❌ Non autorisé' });
  }
  next();
};

// ======================
// ROUTES POUR LES TOURNOIS
// ======================
// Créer un tournoi
app.post('/api/tournaments', requireAuth, async (req, res) => {
  try {
    const tournament = new Tournament({
      ...req.body,
      createdBy: req.session.userId
    });
    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Erreur création tournoi :', error);
    res.status(500).json({ error: 'Erreur lors de la création du tournoi' });
  }
});

// Lister les tournois de l'utilisateur
app.get('/api/tournaments', requireAuth, async (req, res) => {
  try {
    const tournaments = await Tournament.find({ createdBy: req.session.userId });
    res.json(tournaments);
  } catch (error) {
    console.error('Erreur liste tournois :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tournois' });
  }
});

// Récupérer un tournoi spécifique
app.get('/api/tournaments/:id', requireAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findOne({
      _id: req.params.id,
      createdBy: req.session.userId
    });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Erreur récupération tournoi :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du tournoi' });
  }
});

// Mettre à jour un tournoi
app.put('/api/tournaments/:id', requireAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.session.userId },
      req.body,
      { new: true }
    );
    if (!tournament) {
      return res.status(404).json({ error: 'Tournoi non trouvé' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Erreur mise à jour tournoi :', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du tournoi' });
  }
});

// ======================
// ROUTE POUR LE FRONTEND
// ======================
// Servir index.html pour toutes les routes (sauf API)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ======================
// DÉMARRAGE DU SERVEUR
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📁 Dossier public : ${path.join(__dirname, 'public')}`);
});