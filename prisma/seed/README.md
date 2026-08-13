# Seed Data — Sample Credentials

All sample users share the same password: **`Password123!`**

## Platform Admin

| Email               | Display Name   | Role             | Tenant       |
| ------------------- | -------------- | ---------------- | ------------ |
| `admin@cityops.dev` | Platform Admin | `platform_admin` | — (platform) |

## London Borough of Hackney

| Email                                 | Display Name    | Role             |
| ------------------------------------- | --------------- | ---------------- |
| `oliver.hughes@hackney.cityops.dev`   | Oliver Hughes   | `tenant_admin`   |
| `yasmin.osei@hackney.cityops.dev`     | Yasmin Osei     | `authority_user` |
| `connor.walsh@hackney.cityops.dev`    | Connor Walsh    | `authority_user` |
| `fatima.rashid@hackney.cityops.dev`   | Fatima Rashid   | `citizen`        |
| `ravi.sharma@hackney.cityops.dev`     | Ravi Sharma     | `citizen`        |
| `emily.blackwood@hackney.cityops.dev` | Emily Blackwood | `citizen`        |
| `jakub.novak@hackney.cityops.dev`     | Jakub Novak     | `citizen`        |
| `adaeze.okonkwo@hackney.cityops.dev`  | Adaeze Okonkwo  | `citizen`        |

## Manchester City Council

| Email                                   | Display Name   | Role             |
| --------------------------------------- | -------------- | ---------------- |
| `alice.thornton@manchester.cityops.dev` | Alice Thornton | `tenant_admin`   |
| `ben.harris@manchester.cityops.dev`     | Ben Harris     | `authority_user` |
| `carol.webb@manchester.cityops.dev`     | Carol Webb     | `authority_user` |
| `david.okafor@manchester.cityops.dev`   | David Okafor   | `citizen`        |
| `priya.nair@manchester.cityops.dev`     | Priya Nair     | `citizen`        |
| `sophie.clarke@manchester.cityops.dev`  | Sophie Clarke  | `citizen`        |
| `tom.byrne@manchester.cityops.dev`      | Tom Byrne      | `citizen`        |
| `mei.zhang@manchester.cityops.dev`      | Mei Zhang      | `citizen`        |

## Glasgow City Council

| Email                                 | Display Name    | Role             |
| ------------------------------------- | --------------- | ---------------- |
| `callum.macleod@glasgow.cityops.dev`  | Callum MacLeod  | `tenant_admin`   |
| `siobhan.murray@glasgow.cityops.dev`  | Siobhan Murray  | `authority_user` |
| `fraser.anderson@glasgow.cityops.dev` | Fraser Anderson | `authority_user` |
| `isla.campbell@glasgow.cityops.dev`   | Isla Campbell   | `citizen`        |
| `hamish.reid@glasgow.cityops.dev`     | Hamish Reid     | `citizen`        |
| `ailsa.morrison@glasgow.cityops.dev`  | Ailsa Morrison  | `citizen`        |
| `declan.burns@glasgow.cityops.dev`    | Declan Burns    | `citizen`        |
| `niamh.stewart@glasgow.cityops.dev`   | Niamh Stewart   | `citizen`        |

## BCP Council (Bournemouth)

| Email                                     | Display Name     | Role             |
| ----------------------------------------- | ---------------- | ---------------- |
| `fiona.grant@bournemouth.cityops.dev`     | Fiona Grant      | `tenant_admin`   |
| `james.patel@bournemouth.cityops.dev`     | James Patel      | `authority_user` |
| `laura.santos@bournemouth.cityops.dev`    | Laura Santos     | `authority_user` |
| `noah.evans@bournemouth.cityops.dev`      | Noah Evans       | `citizen`        |
| `amara.diallo@bournemouth.cityops.dev`    | Amara Diallo     | `citizen`        |
| `ryan.mcdonald@bournemouth.cityops.dev`   | Ryan McDonald    | `citizen`        |
| `ingrid.holm@bournemouth.cityops.dev`     | Ingrid Holm      | `citizen`        |
| `kwame.asante@bournemouth.cityops.dev`    | Kwame Asante     | `citizen`        |
| `debs.shakespear@bournemouth.cityops.dev` | Debs Shakespeare | `authority_user` |
| `santosh.takoor@bournemouth.cityops.dev`  | Santosh Takoor   | `citizen`        |
| `prasad.honrao@bournemouth.cityops.dev`   | Prasad Honrao    | `citizen`        |

## Running the Seed

```bash
npx prisma db seed
```

The seed is idempotent — running it multiple times produces the same state with no duplicate rows.

## Sample Data Summary

- **4 tenants** — Hackney, Manchester, Glasgow, Bournemouth (+ 1 platform pseudo-tenant)
- **36 users** — 1 platform admin + 8 per tenant (1 admin, 2 authority, 5 citizens) + 3 additional Bournemouth users (1 authority, 2 citizens)
- **6 report categories** per tenant — Road & Pavement, Street Lighting, Drainage & Flooding, Waste & Recycling, Parks & Green Spaces, Graffiti & Vandalism
- **8 reports per tenant** (32 total) — covering all statuses and priorities
- **Report assignments** — reports 5–8 per tenant assigned to authority users
- **Report activities** — full lifecycle transitions for all reports past `created`
- **Duplicate links** — reports 1 and 5 linked as duplicates per tenant
- **AI validation results** — reports 2, 3, 4 per tenant (review_required, valid, invalid)
- **Comments** — reports 5, 6, 7 each have 2 comments (1 citizen, 1 authority; 1 internal)
- **Reward points** — citizens 1 and 2 per tenant with earned and redeemed transactions
- **3 platform badges** — First Report, 10 Reports, Verified Citizen
- **User badges** — citizen 1 per tenant gets all 3; citizen 2 gets First Report
