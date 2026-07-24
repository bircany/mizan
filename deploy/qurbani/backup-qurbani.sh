#!/usr/bin/env bash
set -euo pipefail

# Run on the VPS with RESTIC_REPOSITORY and RESTIC_PASSWORD_FILE configured.
# The repository must be outside the VPS (S3/SFTP/rest server).
volume_name="mizan_qurbani_data"
mountpoint="$(docker volume inspect --format '{{ .Mountpoint }}' "$volume_name")"

if [[ -z "$mountpoint" || "$mountpoint" != /* ]]; then
  echo "Kurban volume yolu dogrulanamadi." >&2
  exit 1
fi

restic backup "$mountpoint" --tag mizan-qurbani --exclude "$mountpoint/temp" --exclude "$mountpoint/uploads"
restic forget --tag mizan-qurbani --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
restic check --read-data-subset=5%
