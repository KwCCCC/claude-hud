#!/bin/bash
set -e

# GenLab Custom HUD Installer
# One-command setup for custom claude-hud with skill label, cyan extraLabel, days format, session name
# Usage: curl -fsSL https://raw.githubusercontent.com/KwCCCC/claude-hud/custom/genlab-hud/extras/install.sh | bash

REPO="KwCCCC/claude-hud"
BRANCH="custom/genlab-hud"
BASE="https://raw.githubusercontent.com/${REPO}/${BRANCH}"

echo "[genlab-hud] Starting installation..."

# 1. Find plugin directory
PLUGIN_DIR=$(ls -td ~/.claude/plugins/cache/claude-hud/claude-hud/*/ 2>/dev/null | head -1)
if [ -z "$PLUGIN_DIR" ]; then
  echo "[genlab-hud] Error: claude-hud plugin not found."
  echo "  Install it first: /plugin install claude-hud"
  exit 1
fi
echo "[genlab-hud] Plugin found: ${PLUGIN_DIR}"

# 2. Patch source files
echo "[genlab-hud] Patching source files..."
curl -fsSL "${BASE}/src/index.ts" -o "${PLUGIN_DIR}src/index.ts"
curl -fsSL "${BASE}/src/render/session-line.ts" -o "${PLUGIN_DIR}src/render/session-line.ts"
curl -fsSL "${BASE}/src/render/lines/environment.ts" -o "${PLUGIN_DIR}src/render/lines/environment.ts"
curl -fsSL "${BASE}/src/render/lines/usage.ts" -o "${PLUGIN_DIR}src/render/lines/usage.ts"
curl -fsSL "${BASE}/src/render/colors.ts" -o "${PLUGIN_DIR}src/render/colors.ts"
curl -fsSL "${BASE}/src/render/lines/project.ts" -o "${PLUGIN_DIR}src/render/lines/project.ts"
curl -fsSL "${BASE}/src/types.ts" -o "${PLUGIN_DIR}src/types.ts"
curl -fsSL "${BASE}/src/transcript.ts" -o "${PLUGIN_DIR}src/transcript.ts"
curl -fsSL "${BASE}/src/git.ts" -o "${PLUGIN_DIR}src/git.ts"

# 3. Install skill-label script
echo "[genlab-hud] Installing skill-label.sh..."
mkdir -p ~/.claude/plugins/claude-hud
curl -fsSL "${BASE}/extras/skill-label.sh" -o ~/.claude/plugins/claude-hud/skill-label.sh
chmod +x ~/.claude/plugins/claude-hud/skill-label.sh

# 4. Write config.json (merge if exists)
CONFIG=~/.claude/plugins/claude-hud/config.json
if [ -f "$CONFIG" ]; then
  echo "[genlab-hud] Merging into existing config.json..."
  # Detect runtime for JSON merge
  if command -v bun >/dev/null 2>&1; then
    RUNTIME=bun
  elif command -v node >/dev/null 2>&1; then
    RUNTIME=node
  else
    RUNTIME=""
  fi

  if [ -n "$RUNTIME" ]; then
    $RUNTIME -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('$CONFIG','utf8'));
      cfg.extraCmd = cfg.extraCmd || '$HOME/.claude/plugins/claude-hud/skill-label.sh';
      cfg.display = cfg.display || {};
      cfg.display.showTools = cfg.display.showTools ?? true;
      cfg.display.showAgents = cfg.display.showAgents ?? true;
      cfg.display.showTodos = cfg.display.showTodos ?? true;
      cfg.display.showDuration = cfg.display.showDuration ?? true;
      cfg.display.showConfigCounts = cfg.display.showConfigCounts ?? true;
      cfg.display.showUsage = cfg.display.showUsage ?? true;
      cfg.display.usageBarEnabled = cfg.display.usageBarEnabled ?? true;
      fs.writeFileSync('$CONFIG', JSON.stringify(cfg, null, 2) + '\n');
    "
  else
    echo "[genlab-hud] Warning: no JS runtime found, overwriting config.json"
    cat > "$CONFIG" << CONF
{
  "extraCmd": "$HOME/.claude/plugins/claude-hud/skill-label.sh",
  "display": {
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showDuration": true,
    "showConfigCounts": true,
    "showUsage": true,
    "usageBarEnabled": true
  }
}
CONF
  fi
else
  echo "[genlab-hud] Creating config.json..."
  cat > "$CONFIG" << CONF
{
  "extraCmd": "$HOME/.claude/plugins/claude-hud/skill-label.sh",
  "display": {
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showDuration": true,
    "showConfigCounts": true,
    "showUsage": true,
    "usageBarEnabled": true
  }
}
CONF
fi

echo "[genlab-hud] Done! Run /claude-hud:setup in Claude Code to activate the statusLine."
echo ""
echo "  Custom features:"
echo "    - skill:name label (cyan) — shows active skill, hides when done"
echo "    - Days format — 151h 59m → 6d 7h"
echo "    - extraCmd via config.json — no --extra-cmd flag needed"
echo "    - Session name — shows [name] in green when /rename is used"
