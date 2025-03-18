#!/bin/bash
# chmod +x deploy.sh (pour donne les droit d'execution du script)

echo "🚀 Déploiement Node.js + PM2 en cours..."

# Variables
PROJECT_DIR="/var/www/google-map"
USER="www-data" # ou ton user système si nécessaire

cd $PROJECT_DIR || exit

echo "🔄 Pull Git..."
git pull

echo "🛑 Stop PM2"
pm2 stop all

echo "📦 Install des dépendances..."
npm install

echo "⚙️ Build de l'application..."
npm run build

echo "🚀 Redémarrage PM2"
pm2 start all

echo "📊 Status PM2 :"
pm2 status

echo "📝 Logs en cours (ctrl + c pour sortir) :"
pm2 logs
