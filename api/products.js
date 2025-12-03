// api/products.js - À déployer sur Vercel
// Ce fichier gère toutes les requêtes produits de manière sécurisée

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Token stocké en variable d'environnement
const GITHUB_OWNER = 'gamer3001';
const GITHUB_REPO = 'Site-E-Commerce-stage-2025-';
const GITHUB_FILE_PATH = 'products.json';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

// Configuration CORS pour autoriser ton site
const allowedOrigins = [
  'https://gamer3001.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

function setCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const headers = setCorsHeaders(origin);

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', origin || '*').json({});
  }

  // Vérifier le mot de passe admin pour les modifications
  const adminPassword = req.headers['x-admin-password'];
  const isAdmin = adminPassword === 'admin123'; // Changez ce mot de passe !

  try {
    // GET - Charger les produits (accessible à tous)
    if (req.method === 'GET') {
      const response = await fetch(GITHUB_API_URL, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const products = JSON.parse(content);

        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(200).json({ 
          products, 
          sha: data.sha 
        });
      } else {
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(200).json({ products: [] });
      }
    }

    // POST/PUT - Ajouter ou mettre à jour des produits (admin seulement)
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!isAdmin) {
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(401).json({ error: 'Mot de passe admin incorrect' });
      }

      const { products, sha } = req.body;

      const content = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');

      const response = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Mise à jour des produits via API',
          content: content,
          sha: sha
        })
      });

      if (response.ok) {
        const data = await response.json();
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(200).json({ 
          success: true, 
          sha: data.content.sha 
        });
      } else {
        const error = await response.json();
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(500).json({ error: error.message });
      }
    }

    // DELETE - Supprimer un produit (admin seulement)
    if (req.method === 'DELETE') {
      if (!isAdmin) {
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.status(401).json({ error: 'Mot de passe admin incorrect' });
      }

      const { productId, sha } = req.body;

      // Charger les produits actuels
      const getResponse = await fetch(GITHUB_API_URL, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getResponse.ok) {
        const data = await getResponse.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        let products = JSON.parse(content);

        // Supprimer le produit
        products = products.filter(p => p.id !== productId);

        // Mettre à jour sur GitHub
        const newContent = Buffer.from(JSON.stringify(products, null, 2)).toString('base64');

        const putResponse = await fetch(GITHUB_API_URL, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Suppression de produit via API',
            content: newContent,
            sha: data.sha
          })
        });

        if (putResponse.ok) {
          const putData = await putResponse.json();
          Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
          return res.status(200).json({ 
            success: true, 
            sha: putData.content.sha 
          });
        }
      }

      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }

    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error) {
    console.error('Erreur API:', error);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(500).json({ error: error.message });
  }
}