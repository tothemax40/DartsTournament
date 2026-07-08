const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Autorise toutes les origines
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de la session (en mémoire, sans base de données)
app.use(session({
  secret: 'ta_cle_secrete_temporaire', // À changer en production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Pour HTTP (mettre à true si HTTPS)
    maxAge: 1000 * 60 * 60 * 24 // 1 jour
  }
}));

// Stockage temporaire des utilisateurs (remplace MongoDB)
const users = [];
const tournaments = [];

// Routes d'authentification
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ email, password: hashedPassword });
    res.status(201).json({ message: 'Utilisateur créé !' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Mot de passe incorrect' });

    req.session.userId = email; // On utilise l'email comme ID temporaire
    res.json({ message: 'Connecté avec succès !', user: { id: email, email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Déconnecté' });
});

// Middleware pour vérifier la session
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
};

// Routes pour les tournois (stockage en mémoire)
app.get('/api/tournaments', requireAuth, (req, res) => {
  const userTournaments = tournaments.filter(t => t.createdBy === req.session.userId);
  res.json(userTournaments);
});

app.post('/api/tournaments', requireAuth, (req, res) => {
  const tournament = {
    ...req.body,
    createdBy: req.session.userId,
    createdAt: new Date()
  };
  tournaments.push(tournament);
  res.status(201).json(tournament);
});

// Servir le frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT} (mode test sans MongoDB)`);
});