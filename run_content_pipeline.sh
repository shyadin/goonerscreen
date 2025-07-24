#!/bin/bash

set -e

# Usage info
usage() {
  echo "Usage: $0 [--dry-run]"
  exit 1
}

# Parse arguments
dry_run=""
for arg in "$@"; do
  case $arg in
    --dry-run)
      dry_run="--dry-run"
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown argument: $arg"
      usage
      ;;
  esac
done

# Check for python
if ! command -v python3 &> /dev/null; then
  echo "Error: python3 is not installed. Please install Python 3."
  exit 1
fi

# Install requirements
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# Run content_compression.py
echo "Running content_compression.py..."
python3 src/scripts/content_compression.py

# Run content_uploader.py
if [ -n "$dry_run" ]; then
  echo "[DRY RUN] Would run content_uploader.py"
else
  echo "Running content_uploader.py..."
  python3 src/scripts/content_uploader.py
fi 