# Publish TweetClaw

Validate the package before publishing. Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.

## Verify release metadata

Keep `package.json`, `openclaw.plugin.json`, and `CHANGELOG.md` aligned. Publish
through verified ClawHub, with npm as the fallback.

Document 33 prepaid public read routes and exactly 7 direct MPP routes: tweet
lookup, user lookup, follower check, article lookup, trends, X trends, and
community info.

## Run release checks

Run every source, package, dependency, and license check on a clean checkout
of the release commit:

```bash
npm ci
npm run check:all
uv tool run --from reuse==6.2.0 reuse lint
```

`check:all` ends with `npm audit --audit-level=low`. All checks must pass
before packing or publishing.

## Inspect the package artifact

Create and inspect the exact artifact that users will install:

```bash
npm pack
openclaw plugins install npm-pack:./xquik-tweetclaw-your_version_here.tgz
openclaw plugins inspect tweetclaw --runtime --json
openclaw skills info tweetclaw
```

Confirm the artifact contains `dist/`, `openclaw.plugin.json`, and
`skills/tweetclaw/`. Verify `explore`, optional `tweetclaw`, approvals, and
`xtrends` from the installed archive.

## Publish

Releases run from a maintainer machine. GitHub Actions and trusted publishing
are not used. Sign in first with `npm login`, `npx clawhub@0.23.3 login`, and
`gh auth login`.

1. Merge the version bump to master. Tag that commit `v<version>` and push the
   tag.
2. Check out the tag in a clean checkout.
3. Run `node scripts/release.mjs --dry-run`. It builds and validates the npm package,
   the ClawHub package, and the ClawHub Skill without publishing.
4. Run `npm run release`. It publishes to npm, then the ClawHub package and
   Skill, then creates the GitHub release with the legal notice.

The script stops when the checkout has changes or the tag is not the current
master commit. A rerun skips each target that already has the version.

## Verify public readbacks

After publishing, verify the registry version, package metadata, integrity, repository link, and install command. Create a GitHub release only after the package readback matches the source version and tagged commit.

Do not commit credentials, local authentication output, temporary package files, audit logs, or publishing transcripts.
