-- מחיקת עבודות קיימות
DELETE FROM supplier_jobs;

-- היסטוריית עבודות - 5 עבודות לכל ספק (50 סה"כ)
-- כל העבודות הושלמו בהצלחה עם דירוגים שונים

-- ספק 1779 (דפוס אופסט) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1779, 1784, NULL, 24, 500, 52, 'delivered', true, NOW() - INTERVAL '30 days', 5.0, NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days', 3, true, NOW() - INTERVAL '34 days'),
(1779, 1785, NULL, 28, 250, 78, 'delivered', true, NOW() - INTERVAL '25 days', 4.5, NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days', 3, true, NOW() - INTERVAL '29 days'),
(1779, 1786, NULL, 32, 100, 162, 'delivered', true, NOW() - INTERVAL '20 days', 4.0, NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', 3, true, NOW() - INTERVAL '24 days'),
(1779, 1787, NULL, 42, 2, 325, 'delivered', true, NOW() - INTERVAL '15 days', 5.0, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', 3, true, NOW() - INTERVAL '19 days'),
(1779, 1788, NULL, 58, 50, 162, 'delivered', true, NOW() - INTERVAL '10 days', 4.5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', 3, true, NOW() - INTERVAL '14 days');

-- ספק 1780 (פורמט רחב) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1780, 1784, NULL, 42, 1, 190, 'delivered', true, NOW() - INTERVAL '28 days', 4.0, NOW() - INTERVAL '33 days', NOW() - INTERVAL '28 days', 4, true, NOW() - INTERVAL '32 days'),
(1780, 1785, NULL, 45, 3, 82, 'delivered', true, NOW() - INTERVAL '22 days', 4.5, NOW() - INTERVAL '27 days', NOW() - INTERVAL '22 days', 4, true, NOW() - INTERVAL '26 days'),
(1780, 1786, NULL, 48, 5, 122, 'delivered', true, NOW() - INTERVAL '18 days', 3.5, NOW() - INTERVAL '23 days', NOW() - INTERVAL '18 days', 4, true, NOW() - INTERVAL '22 days'),
(1780, 1787, NULL, 24, 1000, 238, 'delivered', true, NOW() - INTERVAL '12 days', 4.0, NOW() - INTERVAL '17 days', NOW() - INTERVAL '12 days', 4, true, NOW() - INTERVAL '16 days'),
(1780, 1788, NULL, 74, 100, 136, 'delivered', true, NOW() - INTERVAL '8 days', 4.5, NOW() - INTERVAL '13 days', NOW() - INTERVAL '8 days', 4, true, NOW() - INTERVAL '12 days');

-- ספק 1781 (טקסטיל פרינט) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1781, 1784, NULL, 58, 100, 155, 'delivered', true, NOW() - INTERVAL '27 days', 4.5, NOW() - INTERVAL '33 days', NOW() - INTERVAL '27 days', 5, true, NOW() - INTERVAL '32 days'),
(1781, 1785, NULL, 62, 50, 130, 'delivered', true, NOW() - INTERVAL '21 days', 4.0, NOW() - INTERVAL '27 days', NOW() - INTERVAL '21 days', 5, true, NOW() - INTERVAL '26 days'),
(1781, 1786, NULL, 65, 25, 189, 'delivered', true, NOW() - INTERVAL '16 days', 4.5, NOW() - INTERVAL '22 days', NOW() - INTERVAL '16 days', 5, true, NOW() - INTERVAL '21 days'),
(1781, 1787, NULL, 42, 5, 682, 'delivered', true, NOW() - INTERVAL '11 days', 4.0, NOW() - INTERVAL '17 days', NOW() - INTERVAL '11 days', 5, true, NOW() - INTERVAL '16 days'),
(1781, 1788, NULL, 74, 250, 434, 'delivered', true, NOW() - INTERVAL '6 days', 5.0, NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 days', 5, true, NOW() - INTERVAL '11 days');

-- ספק 1782 (מתנות ופרסום) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1782, 1784, NULL, 74, 50, 140, 'delivered', true, NOW() - INTERVAL '29 days', 3.5, NOW() - INTERVAL '33 days', NOW() - INTERVAL '29 days', 3, true, NOW() - INTERVAL '32 days'),
(1782, 1785, NULL, 78, 25, 126, 'delivered', true, NOW() - INTERVAL '23 days', 4.0, NOW() - INTERVAL '27 days', NOW() - INTERVAL '23 days', 3, true, NOW() - INTERVAL '26 days'),
(1782, 1786, NULL, 81, 10, 196, 'delivered', true, NOW() - INTERVAL '17 days', 3.5, NOW() - INTERVAL '21 days', NOW() - INTERVAL '17 days', 3, true, NOW() - INTERVAL '20 days'),
(1782, 1787, NULL, 58, 100, 175, 'delivered', true, NOW() - INTERVAL '13 days', 4.0, NOW() - INTERVAL '17 days', NOW() - INTERVAL '13 days', 3, true, NOW() - INTERVAL '16 days'),
(1782, 1788, NULL, 90, 50, 245, 'delivered', true, NOW() - INTERVAL '7 days', 4.5, NOW() - INTERVAL '11 days', NOW() - INTERVAL '7 days', 3, true, NOW() - INTERVAL '10 days');

-- ספק 1783 (אריזות המרכז) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1783, 1784, NULL, 90, 100, 396, 'delivered', true, NOW() - INTERVAL '26 days', 4.5, NOW() - INTERVAL '31 days', NOW() - INTERVAL '26 days', 4, true, NOW() - INTERVAL '30 days'),
(1783, 1785, NULL, 93, 250, 363, 'delivered', true, NOW() - INTERVAL '20 days', 4.0, NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', 4, true, NOW() - INTERVAL '24 days'),
(1783, 1786, NULL, 96, 500, 132, 'delivered', true, NOW() - INTERVAL '14 days', 4.5, NOW() - INTERVAL '19 days', NOW() - INTERVAL '14 days', 4, true, NOW() - INTERVAL '18 days'),
(1783, 1787, NULL, 24, 250, 99, 'delivered', true, NOW() - INTERVAL '9 days', 5.0, NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 days', 4, true, NOW() - INTERVAL '13 days'),
(1783, 1788, NULL, 74, 100, 132, 'delivered', true, NOW() - INTERVAL '4 days', 4.0, NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', 4, true, NOW() - INTERVAL '8 days');

-- ספק 1792 (דפוס אבי) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1792, 1784, NULL, 24, 250, 108, 'delivered', true, NOW() - INTERVAL '32 days', 5.0, NOW() - INTERVAL '35 days', NOW() - INTERVAL '32 days', 2, true, NOW() - INTERVAL '34 days'),
(1792, 1785, NULL, 28, 500, 230, 'delivered', true, NOW() - INTERVAL '24 days', 4.5, NOW() - INTERVAL '27 days', NOW() - INTERVAL '24 days', 2, true, NOW() - INTERVAL '26 days'),
(1792, 1786, NULL, 42, 1, 202, 'delivered', true, NOW() - INTERVAL '19 days', 5.0, NOW() - INTERVAL '22 days', NOW() - INTERVAL '19 days', 2, true, NOW() - INTERVAL '21 days'),
(1792, 1787, NULL, 45, 5, 306, 'delivered', true, NOW() - INTERVAL '14 days', 4.5, NOW() - INTERVAL '17 days', NOW() - INTERVAL '14 days', 2, true, NOW() - INTERVAL '16 days'),
(1792, 1788, NULL, 90, 50, 252, 'delivered', true, NOW() - INTERVAL '5 days', 5.0, NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days', 2, true, NOW() - INTERVAL '7 days');

-- ספק 1793 (שילוט מיכל) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1793, 1784, NULL, 42, 2, 300, 'delivered', true, NOW() - INTERVAL '31 days', 3.5, NOW() - INTERVAL '38 days', NOW() - INTERVAL '31 days', 6, true, NOW() - INTERVAL '37 days'),
(1793, 1785, NULL, 48, 10, 180, 'delivered', true, NOW() - INTERVAL '23 days', 3.0, NOW() - INTERVAL '30 days', NOW() - INTERVAL '23 days', 6, true, NOW() - INTERVAL '29 days'),
(1793, 1786, NULL, 58, 50, 150, 'delivered', true, NOW() - INTERVAL '17 days', 4.0, NOW() - INTERVAL '24 days', NOW() - INTERVAL '17 days', 6, true, NOW() - INTERVAL '23 days'),
(1793, 1787, NULL, 65, 50, 384, 'delivered', true, NOW() - INTERVAL '10 days', 3.5, NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days', 6, true, NOW() - INTERVAL '16 days'),
(1793, 1788, NULL, 90, 100, 360, 'delivered', true, NOW() - INTERVAL '3 days', 4.0, NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', 6, true, NOW() - INTERVAL '9 days');

-- ספק 1794 (טקסטיל יוסי) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1794, 1784, NULL, 24, 1000, 235, 'delivered', true, NOW() - INTERVAL '28 days', 4.0, NOW() - INTERVAL '33 days', NOW() - INTERVAL '28 days', 4, true, NOW() - INTERVAL '32 days'),
(1794, 1785, NULL, 58, 25, 168, 'delivered', true, NOW() - INTERVAL '22 days', 4.5, NOW() - INTERVAL '27 days', NOW() - INTERVAL '22 days', 4, true, NOW() - INTERVAL '26 days'),
(1794, 1786, NULL, 62, 100, 268, 'delivered', true, NOW() - INTERVAL '15 days', 4.0, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', 4, true, NOW() - INTERVAL '19 days'),
(1794, 1787, NULL, 74, 50, 134, 'delivered', true, NOW() - INTERVAL '9 days', 4.5, NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 days', 4, true, NOW() - INTERVAL '13 days'),
(1794, 1788, NULL, 78, 100, 201, 'delivered', true, NOW() - INTERVAL '2 days', 4.0, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days', 4, true, NOW() - INTERVAL '6 days');

-- ספק 1795 (מתנות רונית) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1795, 1784, NULL, 24, 500, 152, 'delivered', true, NOW() - INTERVAL '30 days', 4.5, NOW() - INTERVAL '34 days', NOW() - INTERVAL '30 days', 3, true, NOW() - INTERVAL '33 days'),
(1795, 1785, NULL, 42, 5, 759, 'delivered', true, NOW() - INTERVAL '21 days', 4.0, NOW() - INTERVAL '25 days', NOW() - INTERVAL '21 days', 3, true, NOW() - INTERVAL '24 days'),
(1795, 1786, NULL, 48, 10, 207, 'delivered', true, NOW() - INTERVAL '16 days', 4.5, NOW() - INTERVAL '20 days', NOW() - INTERVAL '16 days', 3, true, NOW() - INTERVAL '19 days'),
(1795, 1787, NULL, 74, 250, 483, 'delivered', true, NOW() - INTERVAL '8 days', 5.0, NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days', 3, true, NOW() - INTERVAL '11 days'),
(1795, 1788, NULL, 78, 50, 207, 'delivered', true, NOW() - INTERVAL '1 days', 4.5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 days', 3, true, NOW() - INTERVAL '4 days');

-- ספק 1796 (אריזות דני) - 5 עבודות
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", "quantity", "pricePerUnit", "status", "supplierMarkedReady", "supplierReadyAt", "supplierRating", "createdAt", "updatedAt", "promisedDeliveryDays", "isAccepted", "acceptedAt")
VALUES 
(1796, 1784, NULL, 58, 100, 160, 'delivered', true, NOW() - INTERVAL '29 days', 4.0, NOW() - INTERVAL '35 days', NOW() - INTERVAL '29 days', 5, true, NOW() - INTERVAL '34 days'),
(1796, 1785, NULL, 74, 100, 128, 'delivered', true, NOW() - INTERVAL '20 days', 3.5, NOW() - INTERVAL '26 days', NOW() - INTERVAL '20 days', 5, true, NOW() - INTERVAL '25 days'),
(1796, 1786, NULL, 81, 25, 385, 'delivered', true, NOW() - INTERVAL '13 days', 4.0, NOW() - INTERVAL '19 days', NOW() - INTERVAL '13 days', 5, true, NOW() - INTERVAL '18 days'),
(1796, 1787, NULL, 90, 250, 768, 'delivered', true, NOW() - INTERVAL '7 days', 4.5, NOW() - INTERVAL '13 days', NOW() - INTERVAL '7 days', 5, true, NOW() - INTERVAL '12 days'),
(1796, 1788, NULL, 96, 1000, 224, 'delivered', true, NOW() - INTERVAL '2 days', 4.0, NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days', 5, true, NOW() - INTERVAL '7 days');

-- עדכון דירוג ממוצע לכל ספק בטבלת users
UPDATE users SET "totalRatingPoints" = (
  SELECT COALESCE(SUM("supplierRating"), 0) FROM supplier_jobs WHERE "supplierId" = users.id AND "supplierRating" IS NOT NULL
), "ratedDealsCount" = (
  SELECT COUNT(*) FROM supplier_jobs WHERE "supplierId" = users.id AND "supplierRating" IS NOT NULL
) WHERE role = 'supplier';
