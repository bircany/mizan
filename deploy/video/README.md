# Coolify deployment handoff

`compose.yaml` is a single Coolify Docker Compose stack. It publishes only:

- `video.softartdevstudios.cloud` through Traefik to `video-api`
- `upload.video.softartdevstudios.cloud` through Traefik to tusd

There are no host `ports` mappings. Evolution is not declared or published; the
message worker joins its existing Docker network by the exact
`EVOLUTION_DOCKER_NETWORK` name. `video_internal` is an internal-only network,
while a separate egress bridge permits PostgreSQL connections.

Before any deploy:

1. Apply and verify the additive Supabase migration.
2. Copy `.env.example` to a non-committed `.env` or enter values in Coolify.
3. Confirm `docker network ls` contains both the Coolify proxy and Evolution
   network names.
4. Confirm DNS A/AAAA records point both video domains to the VDS.
5. Verify `docker compose ... config`; then build without starting first.
6. Back up database and volumes before the first production migration.
7. Keep Evolution without a public router/host port.

Persistent volumes are explicit: `video_uploads`, `video_raw`,
`video_processing`, `video_ready`, `video_replaced`, and `video_quarantine`.
Deleting or recreating the Compose project with volume removal would destroy
video files. Never run `docker compose down -v` in production.

The stack is not production-ready until encrypted daily off-site backups and a
restore drill are in place. Browser bulk download is not a backup.
