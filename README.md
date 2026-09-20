# Sushi Club Antalya

Production deployment repository for Sushi Club guest menu and reservation system.

## Existing production project

- Vercel project: `sushi-club-lara-api-v1352`.
- Deployment branch: `main`.
- Build command: `node scripts/build.mjs`.
- Output directory: `dist`.

Do not create a replacement Vercel project or switch to a different guest URL.

## Verify a deployment

The build writes `build-info.json` and a `sushi-build` meta tag containing `VERCEL_GIT_COMMIT_SHA`. Compare that revision with the deployed Git commit before considering a source change published. A successful build is not confirmation of email delivery or of the complete reservation workflow.

Run `node scripts/build.mjs` to validate the source files and extract the 51 approved menu photos. See `RELEASE_STATUS_RU.md` for the recorded acceptance checks and outstanding launch requirements.
