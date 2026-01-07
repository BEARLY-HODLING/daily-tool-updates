#!/bin/bash
#
# Daily Tool Updates - Automated Runner
# Runs the full pipeline: capture → parse → research → score → report
#

set -e

# Configuration
PROJECT_DIR="/Users/bhal/Downloads/claude/daily-tool-updates"
LOG_DIR="$PROJECT_DIR/logs"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/$DATE.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Daily Tool Updates - Starting pipeline"
log "=========================================="

cd "$PROJECT_DIR"

# Run the full pipeline
log "Running: bun run daily"

# Use browser automation (no --clipboard flag)
if bun run src/index.ts daily >> "$LOG_FILE" 2>&1; then
    log "✅ Pipeline completed successfully"
else
    log "❌ Pipeline failed"

    # Send notification on macOS
    osascript -e 'display notification "Daily tool update pipeline failed. Check logs." with title "Daily Tool Updates"' 2>/dev/null || true
    exit 1
fi

# Send success notification on macOS
osascript -e 'display notification "Daily tool update report ready!" with title "Daily Tool Updates"' 2>/dev/null || true

log "=========================================="
log "Pipeline complete"
log "=========================================="
