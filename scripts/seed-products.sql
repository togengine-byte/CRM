-- סקריפט להוספת 5 קטגוריות, 25 מוצרים וכמויות/מחירים
-- תאריך: 2026-01-27

-- ==========================================
-- שלב 1: עדכון הקטגוריות הקיימות לתחומים
-- ==========================================

UPDATE categories SET name = 'דפוס דיגיטלי', description = 'כרטיסי ביקור, פליירים, ברושורים, מעטפות, נייר מכתבים', icon = 'Printer' WHERE id = 1;
UPDATE categories SET name = 'פורמט רחב', description = 'באנרים, שלטים, פוסטרים, מדבקות לרכב, קנבס', icon = 'Maximize' WHERE id = 2;
UPDATE categories SET name = 'הדפסה על טקסטיל', description = 'חולצות, כובעים, תיקים, סינרים, פולו', icon = 'Shirt' WHERE id = 3;
UPDATE categories SET name = 'מוצרי פרסום', description = 'עטים, מחזיקי מפתחות, ספלים, מגנטים, פנקסים', icon = 'Gift' WHERE id = 4;
UPDATE categories SET name = 'אריזות וקרטונים', description = 'קופסאות, שקיות, תוויות, סרטים, קופסאות מתנה', icon = 'Package' WHERE id = 5;

-- ==========================================
-- שלב 2: מחיקת המוצרים הישנים (אם יש)
-- ==========================================

DELETE FROM size_quantities WHERE size_id IN (SELECT id FROM product_sizes WHERE product_id IN (SELECT id FROM base_products));
DELETE FROM product_sizes WHERE product_id IN (SELECT id FROM base_products);
DELETE FROM base_products;

-- Reset sequence
ALTER SEQUENCE base_products_id_seq RESTART WITH 1;

-- ==========================================
-- שלב 3: הוספת מוצרים - דפוס דיגיטלי (קטגוריה 1)
-- ==========================================

INSERT INTO base_products (name, description, "categoryId", "isActive") VALUES
('כרטיסי ביקור', 'כרטיסי ביקור מקצועיים על נייר 350 גרם', 1, true),
('פליירים', 'פליירים פרסומיים בגדלים שונים', 1, true),
('ברושורים', 'ברושורים מקופלים לפרסום עסקי', 1, true),
('מעטפות מודפסות', 'מעטפות עם לוגו ופרטי החברה', 1, true),
('נייר מכתבים', 'נייר מכתבים ממותג לעסקים', 1, true);

-- ==========================================
-- שלב 4: הוספת מוצרים - פורמט רחב (קטגוריה 2)
-- ==========================================

INSERT INTO base_products (name, description, "categoryId", "isActive") VALUES
('באנר רול-אפ', 'באנר נגלל עם מעמד אלומיניום', 2, true),
('שלט פוליקרבונט', 'שלט קשיח לשימוש פנימי וחיצוני', 2, true),
('פוסטר', 'פוסטרים בגדלים שונים על נייר איכותי', 2, true),
('מדבקות לרכב', 'מדבקות ויניל עמידות לרכב', 2, true),
('קנבס מתוח', 'הדפסה על קנבס עם מסגרת עץ', 2, true);

-- ==========================================
-- שלב 5: הוספת מוצרים - הדפסה על טקסטיל (קטגוריה 3)
-- ==========================================

INSERT INTO base_products (name, description, "categoryId", "isActive") VALUES
('חולצת טי', 'חולצות כותנה עם הדפסה איכותית', 3, true),
('כובע מודפס', 'כובעים עם רקמה או הדפסה', 3, true),
('תיק בד', 'תיקי בד ממותגים לקניות', 3, true),
('סינר', 'סינרים מודפסים למסעדות ואירועים', 3, true),
('פולו ממותג', 'חולצות פולו עם רקמה', 3, true);

-- ==========================================
-- שלב 6: הוספת מוצרים - מוצרי פרסום (קטגוריה 4)
-- ==========================================

INSERT INTO base_products (name, description, "categoryId", "isActive") VALUES
('עטים ממותגים', 'עטים עם לוגו החברה', 4, true),
('מחזיקי מפתחות', 'מחזיקי מפתחות ממותגים', 4, true),
('ספלים מודפסים', 'ספלי קרמיקה עם הדפסה', 4, true),
('מגנטים', 'מגנטים לפרסום על מקרר', 4, true),
('פנקסים ממותגים', 'פנקסים עם לוגו לכנסים ואירועים', 4, true);

-- ==========================================
-- שלב 7: הוספת מוצרים - אריזות וקרטונים (קטגוריה 5)
-- ==========================================

INSERT INTO base_products (name, description, "categoryId", "isActive") VALUES
('קופסאות קרטון', 'קופסאות קרטון ממותגות למשלוחים', 5, true),
('שקיות נייר ממותגות', 'שקיות נייר עם לוגו לחנויות', 5, true),
('תוויות למוצרים', 'תוויות מודפסות למוצרים', 5, true),
('סרטי אריזה ממותגים', 'סרטי הדבקה עם לוגו', 5, true),
('קופסאות מתנה', 'קופסאות מתנה יוקרתיות', 5, true);

-- ==========================================
-- שלב 8: הוספת גדלים וכמויות - דפוס דיגיטלי
-- ==========================================

-- כרטיסי ביקור (מוצר 1)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (1, '9x5 ס"מ', '9x5', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 1 AND name = '9x5 ס"מ'), 100, 80, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 1 AND name = '9x5 ס"מ'), 250, 150, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 1 AND name = '9x5 ס"מ'), 500, 220, 3, true),
((SELECT id FROM product_sizes WHERE product_id = 1 AND name = '9x5 ס"מ'), 1000, 350, 4, true);

-- פליירים (מוצר 2)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (2, 'A5', '14.8x21', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 2 AND name = 'A5'), 100, 120, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 2 AND name = 'A5'), 250, 200, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 2 AND name = 'A5'), 500, 320, 3, true),
((SELECT id FROM product_sizes WHERE product_id = 2 AND name = 'A5'), 1000, 500, 4, true);

-- ברושורים (מוצר 3)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (3, 'A4 מקופל', '21x29.7', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 3 AND name = 'A4 מקופל'), 100, 250, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 3 AND name = 'A4 מקופל'), 250, 450, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 3 AND name = 'A4 מקופל'), 500, 700, 3, true);

-- מעטפות מודפסות (מוצר 4)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (4, 'C5', '16.2x22.9', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 4 AND name = 'C5'), 100, 180, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 4 AND name = 'C5'), 250, 350, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 4 AND name = 'C5'), 500, 550, 3, true);

-- נייר מכתבים (מוצר 5)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (5, 'A4', '21x29.7', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 5 AND name = 'A4'), 100, 150, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 5 AND name = 'A4'), 250, 280, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 5 AND name = 'A4'), 500, 450, 3, true),
((SELECT id FROM product_sizes WHERE product_id = 5 AND name = 'A4'), 1000, 700, 4, true);

-- ==========================================
-- שלב 9: הוספת גדלים וכמויות - פורמט רחב
-- ==========================================

-- באנר רול-אפ (מוצר 6)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (6, '85x200 ס"מ', '85x200', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 6 AND name = '85x200 ס"מ'), 1, 280, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 6 AND name = '85x200 ס"מ'), 2, 500, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 6 AND name = '85x200 ס"מ'), 5, 1100, 3, true);

-- שלט פוליקרבונט (מוצר 7)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (7, '60x40 ס"מ', '60x40', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 7 AND name = '60x40 ס"מ'), 1, 120, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 7 AND name = '60x40 ס"מ'), 3, 300, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 7 AND name = '60x40 ס"מ'), 5, 450, 3, true);

-- פוסטר (מוצר 8)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (8, '50x70 ס"מ', '50x70', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 8 AND name = '50x70 ס"מ'), 1, 45, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 8 AND name = '50x70 ס"מ'), 5, 180, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 8 AND name = '50x70 ס"מ'), 10, 300, 3, true),
((SELECT id FROM product_sizes WHERE product_id = 8 AND name = '50x70 ס"מ'), 20, 500, 4, true);

-- מדבקות לרכב (מוצר 9)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (9, '100x50 ס"מ', '100x50', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 9 AND name = '100x50 ס"מ'), 1, 90, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 9 AND name = '100x50 ס"מ'), 3, 220, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 9 AND name = '100x50 ס"מ'), 5, 350, 3, true);

-- קנבס מתוח (מוצר 10)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (10, '40x60 ס"מ', '40x60', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 10 AND name = '40x60 ס"מ'), 1, 150, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 10 AND name = '40x60 ס"מ'), 3, 380, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 10 AND name = '40x60 ס"מ'), 5, 580, 3, true);

-- ==========================================
-- שלב 10: הוספת גדלים וכמויות - הדפסה על טקסטיל
-- ==========================================

-- חולצת טי (מוצר 11)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (11, 'S-XXL', 'מידות S עד XXL', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 11 AND name = 'S-XXL'), 10, 350, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 11 AND name = 'S-XXL'), 25, 750, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 11 AND name = 'S-XXL'), 50, 1300, 3, true),
((SELECT id FROM product_sizes WHERE product_id = 11 AND name = 'S-XXL'), 100, 2200, 4, true);

-- כובע מודפס (מוצר 12)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (12, 'One Size', 'מידה אחת', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 12 AND name = 'One Size'), 10, 280, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 12 AND name = 'One Size'), 25, 600, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 12 AND name = 'One Size'), 50, 1000, 3, true);

-- תיק בד (מוצר 13)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (13, '38x42 ס"מ', '38x42', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 13 AND name = '38x42 ס"מ'), 20, 400, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 13 AND name = '38x42 ס"מ'), 50, 850, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 13 AND name = '38x42 ס"מ'), 100, 1500, 3, true);

-- סינר (מוצר 14)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (14, 'סטנדרט', 'גודל סטנדרטי', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 14 AND name = 'סטנדרט'), 10, 320, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 14 AND name = 'סטנדרט'), 25, 700, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 14 AND name = 'סטנדרט'), 50, 1200, 3, true);

-- פולו ממותג (מוצר 15)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (15, 'S-XXL', 'מידות S עד XXL', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 15 AND name = 'S-XXL'), 10, 450, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 15 AND name = 'S-XXL'), 25, 950, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 15 AND name = 'S-XXL'), 50, 1600, 3, true);

-- ==========================================
-- שלב 11: הוספת גדלים וכמויות - מוצרי פרסום
-- ==========================================

-- עטים ממותגים (מוצר 16)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (16, 'סטנדרט', 'עט כדורי רגיל', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 16 AND name = 'סטנדרט'), 50, 200, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 16 AND name = 'סטנדרט'), 100, 350, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 16 AND name = 'סטנדרט'), 250, 700, 3, true),
((SELECT id FROM product_sizes WHERE product_id = 16 AND name = 'סטנדרט'), 500, 1200, 4, true);

-- מחזיקי מפתחות (מוצר 17)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (17, '4x4 ס"מ', '4x4', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 17 AND name = '4x4 ס"מ'), 25, 180, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 17 AND name = '4x4 ס"מ'), 50, 300, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 17 AND name = '4x4 ס"מ'), 100, 500, 3, true);

-- ספלים מודפסים (מוצר 18)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (18, '330 מ"ל', 'ספל קרמיקה', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 18 AND name = '330 מ"ל'), 10, 280, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 18 AND name = '330 מ"ל'), 25, 600, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 18 AND name = '330 מ"ל'), 50, 1000, 3, true);

-- מגנטים (מוצר 19)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (19, '7x5 ס"מ', '7x5', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 19 AND name = '7x5 ס"מ'), 50, 150, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 19 AND name = '7x5 ס"מ'), 100, 250, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 19 AND name = '7x5 ס"מ'), 250, 500, 3, true);

-- פנקסים ממותגים (מוצר 20)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (20, 'A5', '14.8x21', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 20 AND name = 'A5'), 25, 220, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 20 AND name = 'A5'), 50, 380, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 20 AND name = 'A5'), 100, 650, 3, true);

-- ==========================================
-- שלב 12: הוספת גדלים וכמויות - אריזות וקרטונים
-- ==========================================

-- קופסאות קרטון (מוצר 21)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (21, '20x15x10 ס"מ', '20x15x10', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 21 AND name = '20x15x10 ס"מ'), 50, 350, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 21 AND name = '20x15x10 ס"מ'), 100, 600, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 21 AND name = '20x15x10 ס"מ'), 250, 1200, 3, true);

-- שקיות נייר ממותגות (מוצר 22)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (22, '25x30 ס"מ', '25x30', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 22 AND name = '25x30 ס"מ'), 100, 280, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 22 AND name = '25x30 ס"מ'), 250, 550, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 22 AND name = '25x30 ס"מ'), 500, 900, 3, true);

-- תוויות למוצרים (מוצר 23)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (23, '5x3 ס"מ', '5x3', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 23 AND name = '5x3 ס"מ'), 250, 120, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 23 AND name = '5x3 ס"מ'), 500, 200, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 23 AND name = '5x3 ס"מ'), 1000, 350, 3, true);

-- סרטי אריזה ממותגים (מוצר 24)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (24, '5 ס"מ רוחב', '5cm', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 24 AND name = '5 ס"מ רוחב'), 10, 400, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 24 AND name = '5 ס"מ רוחב'), 25, 850, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 24 AND name = '5 ס"מ רוחב'), 50, 1500, 3, true);

-- קופסאות מתנה (מוצר 25)
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active) VALUES (25, '15x15x8 ס"מ', '15x15x8', 0, 1, true);
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active) VALUES 
((SELECT id FROM product_sizes WHERE product_id = 25 AND name = '15x15x8 ס"מ'), 25, 280, 1, true),
((SELECT id FROM product_sizes WHERE product_id = 25 AND name = '15x15x8 ס"מ'), 50, 480, 2, true),
((SELECT id FROM product_sizes WHERE product_id = 25 AND name = '15x15x8 ס"מ'), 100, 850, 3, true);

-- ==========================================
-- סיום
-- ==========================================
SELECT 'הוספת הנתונים הושלמה בהצלחה!' as status;
