-- Add validation settings to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS "validationEnabled" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "minDpi" integer DEFAULT 300,
ADD COLUMN IF NOT EXISTS "maxDpi" integer,
ADD COLUMN IF NOT EXISTS "allowedColorspaces" jsonb DEFAULT '["CMYK"]',
ADD COLUMN IF NOT EXISTS "requiredBleedMm" decimal(5,2) DEFAULT 3,
ADD COLUMN IF NOT EXISTS "requireBleed" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "requireCropMarks" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "requireRegistrationMarks" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "requireColorBars" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "requireEmbeddedFonts" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "allowOutlinedFonts" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "maxFileSizeMb" integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS "allowedFormats" jsonb DEFAULT '["pdf", "ai", "eps", "tiff", "jpg", "png"]',
ADD COLUMN IF NOT EXISTS "aspectRatioTolerance" decimal(5,2) DEFAULT 5;

-- Add validation settings to base_products table (override category settings)
ALTER TABLE base_products 
ADD COLUMN IF NOT EXISTS "validationOverride" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "minDpi" integer,
ADD COLUMN IF NOT EXISTS "maxDpi" integer,
ADD COLUMN IF NOT EXISTS "allowedColorspaces" jsonb,
ADD COLUMN IF NOT EXISTS "requiredBleedMm" decimal(5,2),
ADD COLUMN IF NOT EXISTS "requireBleed" boolean,
ADD COLUMN IF NOT EXISTS "requireCropMarks" boolean,
ADD COLUMN IF NOT EXISTS "requireRegistrationMarks" boolean,
ADD COLUMN IF NOT EXISTS "requireColorBars" boolean,
ADD COLUMN IF NOT EXISTS "requireEmbeddedFonts" boolean,
ADD COLUMN IF NOT EXISTS "allowOutlinedFonts" boolean,
ADD COLUMN IF NOT EXISTS "maxFileSizeMb" integer,
ADD COLUMN IF NOT EXISTS "allowedFormats" jsonb,
ADD COLUMN IF NOT EXISTS "aspectRatioTolerance" decimal(5,2);
