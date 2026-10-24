# Rights verification checklist

Do **not** commit, tag, or release any third-party game files until every applicable item below is confirmed and recorded.

## Ownership and permission

- [ ] The uploader is the copyright holder, or has written authorization from the rights holder (e.g. Rovio Entertainment Ltd. or its successor).
- [ ] The authorization explicitly allows public redistribution of the game binaries, artwork, audio, level data, and trademarks on GitHub and GitHub Releases.
- [ ] The authorization covers the territories and duration needed for the release.
- [ ] The authorization allows derivative works and format porting, not merely private use.
- [ ] The supplied PC base archive is either original/open-source code under a compatible license, or is also covered by the same authorization.

## Source package integrity

- [ ] The IPA was lawfully obtained.
- [ ] The IPA payload is usable for extraction under the supplied authorization.
- [ ] No signing identities, provisioning profiles, private keys, personal data, or App Store DRM metadata will be redistributed unless explicitly permitted.
- [ ] The PC base archive is scanned before execution; it is not run until its provenance is trusted.

## Publication requirements

- [ ] Required notices, attributions, and the full license text are placed in `THIRD_PARTY_NOTICES.md` and included with the release.
- [ ] The release description states exactly what is included and what rights apply.
- [ ] A `SHA256SUMS` file and build manifest are generated for the release artifacts.
- [ ] If the authorization is personal-use or private-only, no public release is created; the build stays private or is delivered only to the rights holder.

## Stop conditions

If any item above cannot be confirmed, stop the publication workflow and request clarification. Do not work around missing permission by extracting assets from public archives.
