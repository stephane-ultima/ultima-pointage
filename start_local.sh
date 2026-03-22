#!/bin/bash
# ============================================================
# Ultima Pointage — Lancement local sur Mac
# ============================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "  ⏱  Ultima Pointage — Ultima Interior SA"
echo "  ─────────────────────────────────────────"

# Vérifier Python
if ! command -v python3 &>/dev/null; then
  echo "  ❌  Python 3 non trouvé. Installez-le via https://www.python.org"
  exit 1
fi
echo "  ✓  Python $(python3 --version | cut -d' ' -f2)"

# Vérifier / installer les dépendances
if ! python3 -c "import tornado, jwt, bcrypt" 2>/dev/null; then
  echo "  📦  Installation des dépendances..."
  pip3 install -q tornado==6.1 PyJWT==2.3.0 bcrypt==3.2.0
fi
echo "  ✓  Dépendances OK"

# Créer le dossier de données
mkdir -p data

PORT="${PORT:-8000}"
echo ""
echo "  🚀  Démarrage sur http://localhost:$PORT"
echo ""
echo "  Comptes démo :"
echo "  • Manager : marc@ultima.ch / Manager123!"
echo "  • Admin   : sophie@ultima.ch / Admin123!"
echo "  • Monteur : onglet 'Lien magique' → lucas@ultima.ch"
echo ""
echo "  Ctrl+C pour arrêter"
echo ""

# Lancer avec seed si première fois
if [ ! -f "ultima.db" ]; then
  python3 server.py --seed
else
  python3 server.py
fi
