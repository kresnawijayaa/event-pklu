# Implementation Status

## Current Phase
Phase 9 - QA, hardening, accessibility

## Completed
- [x] Phase 0 bootstrap verification passed.
- [x] Phase 1 six-table schema, constraints, indexes, migrations, and idempotent event seed.
- [x] Separate development and test database branches documented and configured.
- [x] PIN authentication, bcrypt+pepper, session hashing, database rate limit, secure cookies, and role guards.
- [x] Login/session/logout API with origin checks and audit events; Staff/Admin roles provisioned.
- [x] Responsive login page and protected dashboard with event summary metrics.
- [x] Desktop and mobile navigation for dashboard, participant list, registration, and check-in.
- [x] Participant normalization, duplicate warnings, transactional sequence allocation, cursor search, and CRUD APIs.
- [x] Registration/list/edit UI; Admin-only delete and restore flows.
- [x] Atomic/idempotent check-in endpoint and arrival screen.
- [x] WhatsApp template rendering, encoded `wa.me` links, separate opened/confirmed markers, immutable first timestamps, and audit events.
- [x] Admin-only event settings for name/date/target/prefix and WhatsApp template, with preview and recent audit viewer.
- [x] Prefix changes blocked after participant records exist.
- [x] New migration replaces the seed template's fixed event date with `{{tanggal}}`; applied to development and test databases.
- [x] Workbook metadata columns MODE, KATEGORI, ASAL MUPEL, TIPE, and DAFTAR persist through import, manual registration, edit, search/list, check-in display, and CSV export.
- [x] Header/footer GPIB references identify and link to GPIB Harapan Indah.
- [x] Valid sessions redirect from login to dashboard; successful login and logout navigate to their destination pages. Protected pages redirect unauthenticated requests to login.

## In Progress
- [ ] Browser import/export flow, external WhatsApp link behavior, and responsive viewport verification.
- [ ] Phase 9 accessibility, hardening, load, and dependency checks.

## Phase 7 Implementation
- [x] Admin-only browser-side XLSX/XLS/CSV parsing, header aliases, preview, validation, duplicate candidate warnings, and row selection (1,000 rows / 15 MB limits).
- [x] Admin-only validation and transactional import batches (100 rows) with stable request IDs, idempotent retries, contiguous registration sequences, and audit records.
- [x] Admin-only CSV download for active participants, Jakarta timestamps, UTF-8 BOM, quoted cells, formula-injection protection, and export audit record.
- [x] Admin navigation to import and participant-list CSV download link.
- [x] Integration gate: 663 synthetic participants validate and import in sequential batches; each batch gets a contiguous range, all registration codes are unique, and retries skip all 663.
- [x] CSV formula protection and Jakarta timestamp unit checks; generic Staff/Admin role guard unit check.
- [ ] Browser import/export flow remains to be exercised.

## Verification
- `npm run db:generate` - PASS
- `npm run db:migrate` - PASS (development database)
- `npm run db:migrate:test` - PASS (dedicated test database)
- `npm run db:seed` and `npm run db:seed:test` - PASS and idempotent
- `npm run db:check` - PASS (six tables, one event)
- `npm run lint` - PASS
- `npm run typecheck` - PASS
- `npm test` - PASS (19 unit tests, including page session routing)
- `npm run test:integration` - PASS (9 tests, including 663-row import and manual metadata edit)
- `npm run build` - PASS
- Phase 7 `npm run typecheck`, `npm run lint`, and `npm run build` - PASS after implementation.
- Phase 7 663-row import integration test - PASS (test database; synthetic participants cleaned up).
- CSV export unit tests - PASS (formula protection, BOM, Jakarta timestamps).
- SheetJS 0.20.3 parses the supplied 663-row workbook; no participant records imported.
- `npm audit --omit=dev` - PASS (0 production advisories after SheetJS update).
- `npm run typecheck`, `npm run lint`, and `npm run build` - PASS after SheetJS and robots.txt updates.
- `0002_fast_joshua_kane.sql` applied to development and test databases; current typecheck, lint, unit tests, integration tests, and build pass.
- Unauthenticated HTTP checks - PASS (`/` and protected pages return 307 to `/login`; `/login` returns 200).
- Phase 1 database gate - PASS
- Auth and participant database gates - PASS
- Staff/Admin PIN roles - present; PIN values and hashes not read or displayed
- Browser flow and responsive inspection - pending user review

## Decisions / Deviations
- `@types/node` uses version 24 to match local Node.js 24 and current Vitest peer requirements.
- Official SheetJS 0.20.3 tarball replaces vulnerable npm registry version 0.18.5. Production audit is clear; npm install still reports four moderate development advisories.
- The supplied workbook has 663 rows and no WhatsApp column. WhatsApp stays mandatory; user will complete the column before actual import. Sending remains semi-manual through `wa.me`.
- The supplied workbook's MODE, KATEGORI, ASAL MUPEL, TIPE, and DAFTAR columns map to participant records. Workbook NO remains a source row number; the app allocates its own registration code.
- `robots.ts` disallows crawling; layout metadata supplies `noindex, nofollow`.
- Integration testing exposed an ambiguous PostgreSQL timestamp expression; explicit `timestamptz` casts fixed it.
- Integration test files run sequentially so the 663-row fixture does not contend with other tests for the event lock. Registration sequences remain contiguous within each import batch.

## Next Step
User completes WhatsApp numbers and browser QA. Import the actual workbook only after WhatsApp numbers are complete.
