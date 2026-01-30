-- Update demo data in supplier_jobs to have higher values
-- This will make the analytics chart more balanced

-- Update January 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 15000, quantity = 50
WHERE status = 'delivered' 
AND "createdAt" >= '2025-01-01' AND "createdAt" < '2025-02-01'
AND "pricePerUnit" < 1000;

-- Update February 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 18000, quantity = 45
WHERE status = 'delivered' 
AND "createdAt" >= '2025-02-01' AND "createdAt" < '2025-03-01'
AND "pricePerUnit" < 1000;

-- Update March 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 22000, quantity = 40
WHERE status = 'delivered' 
AND "createdAt" >= '2025-03-01' AND "createdAt" < '2025-04-01'
AND "pricePerUnit" < 1000;

-- Update April 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 25000, quantity = 35
WHERE status = 'delivered' 
AND "createdAt" >= '2025-04-01' AND "createdAt" < '2025-05-01'
AND "pricePerUnit" < 1000;

-- Update May 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 28000, quantity = 38
WHERE status = 'delivered' 
AND "createdAt" >= '2025-05-01' AND "createdAt" < '2025-06-01'
AND "pricePerUnit" < 1000;

-- Update June 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 30000, quantity = 42
WHERE status = 'delivered' 
AND "createdAt" >= '2025-06-01' AND "createdAt" < '2025-07-01'
AND "pricePerUnit" < 1000;

-- Update July 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 32000, quantity = 40
WHERE status = 'delivered' 
AND "createdAt" >= '2025-07-01' AND "createdAt" < '2025-08-01'
AND "pricePerUnit" < 1000;

-- Update August 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 35000, quantity = 38
WHERE status = 'delivered' 
AND "createdAt" >= '2025-08-01' AND "createdAt" < '2025-09-01'
AND "pricePerUnit" < 1000;

-- Update September 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 38000, quantity = 42
WHERE status = 'delivered' 
AND "createdAt" >= '2025-09-01' AND "createdAt" < '2025-10-01'
AND "pricePerUnit" < 1000;

-- Update October 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 40000, quantity = 45
WHERE status = 'delivered' 
AND "createdAt" >= '2025-10-01' AND "createdAt" < '2025-11-01'
AND "pricePerUnit" < 1000;

-- Update November 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 42000, quantity = 48
WHERE status = 'delivered' 
AND "createdAt" >= '2025-11-01' AND "createdAt" < '2025-12-01'
AND "pricePerUnit" < 1000;

-- Update December 2025 demo data
UPDATE supplier_jobs 
SET "pricePerUnit" = 45000, quantity = 50
WHERE status = 'delivered' 
AND "createdAt" >= '2025-12-01' AND "createdAt" < '2026-01-01'
AND "pricePerUnit" < 1000;
