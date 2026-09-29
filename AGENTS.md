# Heliostack skills — index for AI agents

If your agent doesn't load Agent Skills natively, read the matching `SKILL.md` before working on a Heliostack project (one with `design-system.json` / `heliostack.json` at its root).

- Always first: `skills/heliostack/SKILL.md`
- Building a feature: `skills/feature-slice/SKILL.md` (it points to the others)
- UI: `skills/ds-init/SKILL.md` (setup), `skills/ds-component/SKILL.md` (every UI change), `skills/native-ui-primitives/SKILL.md`
- Data: `skills/data-layer/SKILL.md`, `skills/auth/SKILL.md`, `skills/server-actions/SKILL.md`, `skills/caching/SKILL.md`, `skills/realtime/SKILL.md`, `skills/feeds-and-lists/SKILL.md`
- Quality and shipping: `skills/testing/SKILL.md`, `skills/deploy-vercel/SKILL.md`, `skills/app-architecture/SKILL.md`

Scripts are dependency-free Node (≥ 24): `skills/ds-init/scripts/theme.mjs`, `skills/ds-component/scripts/check-tokens.mjs`.
