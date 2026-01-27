-- מחירי ספקים - 10 ספקים, כל אחד ב-3 תחומים
-- קטגוריות: 1=דפוס דיגיטלי (IDs 24-41), 2=פורמט רחב (42-57), 3=טקסטיל (58-73), 4=מוצרי פרסום (74-89), 5=אריזות (90-104)

-- ספק 1779 (דפוס אופסט) - תחומים 1, 2, 3
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1779, sq.id, sq.price * 0.65, 3, 4.5, true, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (1, 2, 3);

-- ספק 1780 (פורמט רחב) - תחומים 1, 2, 4
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1780, sq.id, sq.price * 0.68, 4, 4.0, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (1, 2, 4);

-- ספק 1781 (טקסטיל פרינט) - תחומים 2, 3, 4
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1781, sq.id, sq.price * 0.62, 5, 4.2, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (2, 3, 4);

-- ספק 1782 (מתנות ופרסום) - תחומים 3, 4, 5
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1782, sq.id, sq.price * 0.70, 3, 3.8, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (3, 4, 5);

-- ספק 1783 (אריזות המרכז) - תחומים 1, 4, 5
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1783, sq.id, sq.price * 0.66, 4, 4.3, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (1, 4, 5);

-- ספק 1792 (דפוס אבי) - תחומים 1, 2, 5
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1792, sq.id, sq.price * 0.72, 2, 4.7, true, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (1, 2, 5);

-- ספק 1793 (שילוט מיכל) - תחומים 2, 3, 5
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1793, sq.id, sq.price * 0.60, 6, 3.5, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (2, 3, 5);

-- ספק 1794 (טקסטיל יוסי) - תחומים 1, 3, 4
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1794, sq.id, sq.price * 0.67, 4, 4.1, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (1, 3, 4);

-- ספק 1795 (מתנות רונית) - תחומים 1, 2, 4
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1795, sq.id, sq.price * 0.69, 3, 4.4, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (1, 2, 4);

-- ספק 1796 (אריזות דני) - תחומים 3, 4, 5
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred", "createdAt", "updatedAt")
SELECT 1796, sq.id, sq.price * 0.64, 5, 3.9, false, NOW(), NOW()
FROM size_quantities sq
JOIN product_sizes ps ON sq.size_id = ps.id
JOIN base_products bp ON ps.product_id = bp.id
WHERE bp."categoryId" IN (3, 4, 5);
