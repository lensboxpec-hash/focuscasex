-- ============================================================================
-- Focus CaseX — Supabase seed: REAL DATA ONLY
--   · the clinic's given 29-lens IOL catalog (catalog rows, qty 0)
-- No mock patients / sessions / appointments / packages — entered live from the UI.
-- Login accounts are intentionally NOT seeded here (no password hashes in the
-- public repo): once DATABASE_URL points at Supabase, run `bun scripts/seed.ts`
-- to create the two accounts + upsert this same catalog idempotently.
-- Safe to run once AFTER supabase/schema.sql (idempotent via ON CONFLICT).
-- ============================================================================

BEGIN;

-- ---- lens catalog (given by the clinic) ----
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_naspro', 'NASPRO', 'MONOFOCAL', 'APPASAMY', NULL, 118, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.846Z', '2026-10-07T06:50:11.082Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_supraphob', 'SUPRAPHOB', 'MONOFOCAL', 'APPASAMY', NULL, 119.1, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.847Z', '2026-10-07T06:50:11.084Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_supraphob_toric', 'SUPRAPHOB TORIC', 'TORIC', 'APPASAMY', NULL, 119.1, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.848Z', '2026-10-07T06:50:11.086Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_acrysof_sp', 'ACRYSOF SP', 'MONOFOCAL', 'ALCON', NULL, 118.3, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.849Z', '2026-10-07T06:50:11.087Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_alcon_iq', 'ALCON IQ', 'MONOFOCAL', 'ALCON', NULL, 118.7, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.850Z', '2026-10-07T06:50:11.088Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_clareon', 'CLAREON', 'MONOFOCAL', 'ALCON', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.851Z', '2026-10-07T06:50:11.090Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_panoptix', 'PANOPTIX', 'TRIFOCAL', 'ALCON', NULL, 118.7, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.851Z', '2026-10-07T06:50:11.091Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_vivity_edof_', 'VIVITY (EDOF)', 'EDOF', 'ALCON', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.852Z', '2026-10-07T06:50:11.093Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_panoptix_toric', 'PANOPTIX TORIC', 'TORIC', 'ALCON', NULL, 118.7, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.853Z', '2026-10-07T06:50:11.095Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_vivity_toric_edof_', 'VIVITY TORIC (EDOF)', 'TORIC', 'ALCON', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.853Z', '2026-10-07T06:50:11.096Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_clareon_toric', 'CLAREON TORIC', 'TORIC', 'ALCON', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.855Z', '2026-10-07T06:50:11.098Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_iq_toric', 'IQ TORIC', 'TORIC', 'ALCON', NULL, 118.7, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.855Z', '2026-10-07T06:50:11.099Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_eyecryl_nat_hd', 'EYECRYL NAT HD', 'MONOFOCAL', 'BIOTECH', NULL, 118.3, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.856Z', '2026-10-07T06:50:11.101Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_optiflex_trio', 'OPTIFLEX TRIO', 'TRIFOCAL', 'BIOTECH', NULL, 118.6, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.857Z', '2026-10-07T06:50:11.102Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_eyecryl_activ', 'EYECRYL ACTIV', 'MONOFOCAL', 'BIOTECH', NULL, 118, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.857Z', '2026-10-07T06:50:11.103Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_optiflex_trio_toric', 'OPTIFLEX TRIO TORIC', 'TORIC', 'BIOTECH', NULL, 118.6, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.858Z', '2026-10-07T06:50:11.104Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_eyecryl_activ_bifocal_', 'EYECRYL ACTIV (BIFOCAL)', 'BIFOCAL', 'BIOTECH', NULL, 118, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.858Z', '2026-10-07T06:50:11.106Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_eyecryl_toric_monofocal_', 'EYECRYL TORIC (MONOFOCAL)', 'TORIC', 'BIOTECH', NULL, 118.5, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.860Z', '2026-10-07T06:50:11.107Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_magnus', 'MAGNUS', 'MONOFOCAL', 'CARE GROUP', NULL, 118.4, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.861Z', '2026-10-07T06:50:11.108Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_magnus_toric_bifocal', 'MAGNUS TORIC BIFOCAL', 'TORIC', 'CARE GROUP', NULL, NULL, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.862Z', '2026-10-07T06:50:11.109Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_acrivision_foreign_', 'ACRIVISION (FOREIGN)', 'MONOFOCAL', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.862Z', '2026-10-07T06:50:11.110Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_triphobic_hd_indian_yellow_trifocal_', 'TRIPHOBIC HD (INDIAN YELLOW TRIFOCAL)', 'TRIFOCAL', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.863Z', '2026-10-07T06:50:11.111Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_magnificent_indian_edof_', 'MAGNIFICENT (INDIAN EDOF)', 'EDOF', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.864Z', '2026-10-07T06:50:11.112Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_acrivision_trifocal_foreign_', 'ACRIVISION TRIFOCAL (FOREIGN)', 'TRIFOCAL', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.864Z', '2026-10-07T06:50:11.114Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_acriol_ec', 'ACRIOL EC', 'MONOFOCAL', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.865Z', '2026-10-07T06:50:11.116Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_acriol_clear', 'ACRIOL CLEAR', 'MONOFOCAL', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.865Z', '2026-10-07T06:50:11.117Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_acriol_ec_toric_monofocal_', 'ACRIOL EC TORIC (MONOFOCAL)', 'TORIC', 'CARE GROUP', NULL, 118.8, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.866Z', '2026-10-07T06:50:11.118Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_autofocus_pro', 'AUTOFOCUS PRO', 'MONOFOCAL', 'OMNI GLOW', NULL, 117.7, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.867Z', '2026-10-07T06:50:11.119Z')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "LensStock" ("id","name","type","manufacturer","model","aConstant","powerSph","powerCyl","batchNo","expiryDate","quantity","minStock","notes","createdAt","updatedAt")
VALUES ('lens_vivinex_impress_b_l', 'VIVINEX IMPRESS B&L', 'MONOFOCAL', 'HOYA', NULL, 118.9, 0, NULL, '', NULL, 0, 0, NULL, '2026-10-07T06:50:10.867Z', '2026-10-07T06:50:11.120Z')
ON CONFLICT ("id") DO NOTHING;

COMMIT;
