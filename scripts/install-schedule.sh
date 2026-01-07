#!/bin/bash
#
# Install Daily Tool Updates scheduled task
#
# This script:
# 1. Creates the LaunchAgent directory if needed
# 2. Copies the plist to ~/Library/LaunchAgents
# 3. Loads the scheduled task
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.dailytoolsupdates.plist"
PLIST_SOURCE="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "=========================================="
echo "Daily Tool Updates - Schedule Installer"
echo "=========================================="

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Make scripts executable
chmod +x "$SCRIPT_DIR/daily-run.sh"

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Unload existing if present
if launchctl list | grep -q "com.dailytoolsupdates"; then
    echo "Unloading existing schedule..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Copy plist
echo "Installing schedule..."
cp "$PLIST_SOURCE" "$PLIST_DEST"

# Load the schedule
echo "Loading schedule..."
launchctl load "$PLIST_DEST"

echo ""
echo "✅ Schedule installed!"
echo ""
echo "The pipeline will run daily at 7:00 PM (19:00)"
echo ""
echo "Commands:"
echo "  Check status:    launchctl list | grep dailytoolsupdates"
echo "  Run manually:    $SCRIPT_DIR/daily-run.sh"
echo "  View logs:       cat $PROJECT_DIR/logs/\$(date +%Y-%m-%d).log"
echo "  Uninstall:       launchctl unload $PLIST_DEST && rm $PLIST_DEST"
echo ""

# Check if Grok authentication is set up
if [ ! -f "$PROJECT_DIR/data/.grok-cookies.json" ]; then
    echo "⚠️  WARNING: Grok authentication not set up!"
    echo ""
    echo "For fully automated capture, you need to authenticate first:"
    echo "  1. Run: cd $PROJECT_DIR && bun run capture --login"
    echo "  2. Login to your X account in the browser window"
    echo "  3. Cookies will be saved for future automated runs"
    echo ""
    echo "Alternatively, manually paste content using:"
    echo "  bun run capture --clipboard"
    echo ""
fi
