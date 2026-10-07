-- ============================================================================
-- Focus CaseX — Supabase / PostgreSQL schema
-- Mirrors prisma/schema.prisma 1:1 (tables, columns, defaults, FKs).
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- SECURITY: Row Level Security is ENABLED on every table with NO policies.
--   → the publishable (anon) key can read/write NOTHING via the Data API.
--   → the app connects through Prisma with the direct Postgres connection
--     (owner role bypasses RLS), so the Next.js API layer stays in charge.
--   → if you later want direct client-side supabase-js access, add explicit
--     policies (e.g. authenticated read-only) — do not disable RLS.
-- ============================================================================

-- ---------------------------------------------------------------- login gate
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DOCTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -------------------------------------------------------------- lens catalog
CREATE TABLE "LensStock" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MONOFOCAL',
    "manufacturer" TEXT,
    "model" TEXT,
    "aConstant" DOUBLE PRECISION,
    "powerSph" DOUBLE PRECISION NOT NULL,
    "powerCyl" DOUBLE PRECISION,
    "batchNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LensStock_pkey" PRIMARY KEY ("id")
);

-- ------------------------------------------------------------------ patients
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'MALE',
    "phone" TEXT,
    "address" TEXT,
    "cataractEye" TEXT NOT NULL DEFAULT 'NONE',
    "pterygiumEye" TEXT NOT NULL DEFAULT 'NONE',
    "pterygiumGrade" TEXT NOT NULL DEFAULT 'G1',
    "diabetes" BOOLEAN NOT NULL DEFAULT false,
    "hypertension" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "referredBy" TEXT NOT NULL DEFAULT '',
    -- lens details — biometry & IOL plan (per eye)
    "k1OD" DOUBLE PRECISION,
    "k2OD" DOUBLE PRECISION,
    "k1OS" DOUBLE PRECISION,
    "k2OS" DOUBLE PRECISION,
    "aConstant" DOUBLE PRECISION,
    "plannedLensId" TEXT,
    "chosenLensId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_plannedLensId_fkey"
  FOREIGN KEY ("plannedLensId") REFERENCES "LensStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_chosenLensId_fkey"
  FOREIGN KEY ("chosenLensId") REFERENCES "LensStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------ vision records
CREATE TABLE "VisionRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vaOD" TEXT,
    "vaOS" TEXT,
    "iopOD" DOUBLE PRECISION,
    "iopOS" DOUBLE PRECISION,
    "sphOD" DOUBLE PRECISION,
    "cylOD" DOUBLE PRECISION,
    "axisOD" INTEGER,
    "sphOS" DOUBLE PRECISION,
    "cylOS" DOUBLE PRECISION,
    "axisOS" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisionRecord_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "VisionRecord" ADD CONSTRAINT "VisionRecord_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------ packages
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'LENS',
    "description" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -------------------------------------------------------- counseling sessions
CREATE TABLE "CounselingSession" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counselor" TEXT NOT NULL,
    "procedureType" TEXT NOT NULL,
    "eye" TEXT NOT NULL DEFAULT 'OU',
    "recommendedPackageId" TEXT,
    "quotedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "willingness" TEXT NOT NULL DEFAULT 'THINKING',
    "surgeryDate" TIMESTAMP(3),
    "workupDone" BOOLEAN NOT NULL DEFAULT false,
    "plannedLensId" TEXT,
    "placedLensId" TEXT,
    "bp" TEXT,
    "bs" DOUBLE PRECISION,
    "axialLength" DOUBLE PRECISION,
    "k1" DOUBLE PRECISION,
    "k2" DOUBLE PRECISION,
    "iolPower" DOUBLE PRECISION,
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CounselingSession_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_recommendedPackageId_fkey"
  FOREIGN KEY ("recommendedPackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_plannedLensId_fkey"
  FOREIGN KEY ("plannedLensId") REFERENCES "LensStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_placedLensId_fkey"
  FOREIGN KEY ("placedLensId") REFERENCES "LensStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -------------------------------------------------------------- appointments
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL DEFAULT '09:00',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "procedureType" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "eye" TEXT NOT NULL DEFAULT 'NA',
    "packageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ROW LEVEL SECURITY — lock every table against the anon/publishable key
-- ============================================================================
ALTER TABLE "User"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LensStock"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisionRecord"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Package"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PackageItem"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CounselingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment"       ENABLE ROW LEVEL SECURITY;
