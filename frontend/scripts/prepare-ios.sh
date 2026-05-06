#!/usr/bin/env bash
# =============================================================================
# prepare-ios.sh — Onboarding iOS para MyFinance
#
# Valida que Xcode y CocoaPods estén instalados antes de correr
# el primer "cap add ios && cap sync ios".
#
# Uso:
#   chmod +x scripts/prepare-ios.sh
#   ./scripts/prepare-ios.sh
# =============================================================================

set -euo pipefail

# ── Colores para output legible ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}[OK]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[--]${RESET}  $*"; }
fail() { echo -e "${RED}[ERROR]${RESET} $*"; }
info() { echo -e "${BLUE}[INFO]${RESET} $*"; }

echo ""
echo "=========================================="
echo "  MyFinance — Preparación plataforma iOS"
echo "=========================================="
echo ""

# ── 1. Validar Xcode ──────────────────────────────────────────────────────────
XCODE_OK=false
if command -v xcodebuild &>/dev/null; then
  XCODE_VERSION=$(xcodebuild -version 2>/dev/null | head -n 1)
  ok "Xcode encontrado: ${XCODE_VERSION}"
  XCODE_OK=true
else
  fail "Xcode no está instalado o xcodebuild no está en el PATH."
  warn "Instalá Xcode desde la Mac App Store:"
  echo ""
  echo "  https://apps.apple.com/app/xcode/id497799835"
  echo ""
  warn "Luego aceptá la licencia con:"
  echo ""
  echo "  sudo xcodebuild -license accept"
  echo "  sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer"
  echo ""
fi

# ── 2. Validar CocoaPods ──────────────────────────────────────────────────────
PODS_OK=false
if command -v pod &>/dev/null; then
  PODS_VERSION=$(pod --version 2>/dev/null)
  ok "CocoaPods encontrado: ${PODS_VERSION}"
  PODS_OK=true
else
  fail "CocoaPods no está instalado."
  warn "Instalalo con Homebrew (recomendado):"
  echo ""
  echo "  brew install cocoapods"
  echo ""
  warn "O con RubyGems (alternativa):"
  echo ""
  echo "  sudo gem install cocoapods"
  echo ""
fi

# ── 3. Resultado y próximo paso ───────────────────────────────────────────────
echo ""
if $XCODE_OK && $PODS_OK; then
  ok "Todas las dependencias nativas están presentes."
  echo ""
  info "Corriendo: npm run ios:setup"
  echo ""

  # Cambiar al directorio raíz del frontend (el script puede llamarse desde cualquier CWD)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "${SCRIPT_DIR}/.."

  npm run ios:setup

  echo ""
  ok "Plataforma iOS añadida y sincronizada."
  info "Para abrir Xcode corré: npm run ios:open"
  echo ""
else
  echo ""
  fail "Faltan dependencias. Instalá todo lo indicado arriba y volvé a correr:"
  echo ""
  echo "  ./scripts/prepare-ios.sh"
  echo ""
  exit 1
fi
