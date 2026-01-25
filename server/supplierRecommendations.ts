/**
 * Supplier Recommendation Engine - New Model
 * 
 * מודל דירוג חדש המבוסס על ציון בסיס דינמי + בונוסים/קנסות קטנים
 * 
 * ציון בסיס: 70-100 (לפי מספר עבודות שהושלמו)
 * 
 * קריטריונים:
 * 1. מחיר (±10 נקודות) - הקריטריון המרכזי
 * 2. עמידה בהבטחות (±8 נקודות) - האם סיים בזמן שהבטיח
 * 3. אישור שליח (±6 נקודות) - האם העבודה הייתה מוכנה כשאמר מוכן
 * 4. סיום מוקדם (0 עד +3 נקודות) - בונוס קטן לסיום לפני הזמן
 * 5. התמחות בקטגוריה (0 עד +2 נקודות) - בונוס למומחיות
 * 6. עומס נוכחי (0 עד -3 נקודות) - קנס לספק עמוס
 * 7. יציבות (0 עד +2 נקודות) - בונוס לעקביות
 * 8. ביטולים (0 עד -2 נקודות) - קנס לביטולים
 */

import { eq, and, sql, desc } from "drizzle-orm";
import { users, supplierPrices, supplierJobs, baseProducts } from "../drizzle/schema";
import { getDb } from "./db";

// ============================================
// CONFIGURATION - Scoring Parameters
// ============================================

const SCORING_CONFIG = {
  // ציון בסיס לפי מספר עבודות
  baseScore: {
    noJobs: 70,        // 0 עבודות
    fewJobs: 80,       // 1-4 עבודות
    someJobs: 90,      // 5-9 עבודות
    manyJobs: 100,     // 10+ עבודות
  },
  // טווחי בונוס/קנס לכל קריטריון
  criteria: {
    price: { max: 10, min: -10 },           // ±10 נקודות
    promiseKeeping: { max: 8, min: -8 },    // ±8 נקודות
    courierConfirm: { max: 6, min: -6 },    // ±6 נקודות
    earlyFinish: { max: 3, min: 0 },        // 0 עד +3 נקודות
    categoryExpert: { max: 2, min: 0 },     // 0 עד +2 נקודות
    currentLoad: { max: 0, min: -3 },       // 0 עד -3 נקודות
    consistency: { max: 2, min: 0 },        // 0 עד +2 נקודות
    cancellations: { max: 0, min: -2 },     // 0 עד -2 נקודות
  },
  // סף לחישוב עומס נוכחי
  loadThreshold: 10, // מעל 10 עבודות פתוחות = קנס מקסימלי
};

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

/**
 * קבלת מספר עבודות שהושלמו לספק
 */
export async function getSupplierCompletedJobsCount(supplierId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND status IN ('delivered', 'ready', 'picked_up')
    `);

    if (result.rows && result.rows.length > 0) {
      return parseInt((result.rows[0] as any).count) || 0;
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting completed jobs count:', error);
  }

  return 0;
}

/**
 * קבלת נתוני מחיר ממוצע בשוק למוצר
 */
export async function getMarketAveragePrice(sizeQuantityId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    let query;
    if (sizeQuantityId) {
      query = sql`
        SELECT AVG("pricePerUnit") as avg_price
        FROM supplier_prices
        WHERE "sizeQuantityId" = ${sizeQuantityId}
      `;
    } else {
      query = sql`
        SELECT AVG("pricePerUnit") as avg_price
        FROM supplier_prices
      `;
    }

    const result = await db.execute(query);
    if (result.rows && result.rows.length > 0) {
      return parseFloat((result.rows[0] as any).avg_price) || 0;
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting market average price:', error);
  }

  return 0;
}

/**
 * קבלת מחיר ספק למוצר
 */
export async function getSupplierPrice(supplierId: number, sizeQuantityId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    let query;
    if (sizeQuantityId) {
      query = sql`
        SELECT "pricePerUnit"
        FROM supplier_prices
        WHERE "supplierId" = ${supplierId}
          AND "sizeQuantityId" = ${sizeQuantityId}
        LIMIT 1
      `;
    } else {
      query = sql`
        SELECT AVG("pricePerUnit") as "pricePerUnit"
        FROM supplier_prices
        WHERE "supplierId" = ${supplierId}
      `;
    }

    const result = await db.execute(query);
    if (result.rows && result.rows.length > 0) {
      return parseFloat((result.rows[0] as any).pricePerUnit) || 0;
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting supplier price:', error);
  }

  return 0;
}

/**
 * קבלת נתוני עמידה בהבטחות
 * בודק כמה עבודות הסתיימו בזמן או לפני הזמן שהובטח
 */
export async function getPromiseKeepingData(supplierId: number): Promise<{
  totalJobs: number;
  onTimeJobs: number;
  percentage: number;
}> {
  const db = await getDb();
  if (!db) return { totalJobs: 0, onTimeJobs: 0, percentage: 80 };

  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE 
          WHEN "supplierReadyAt" IS NOT NULL 
            AND "promisedDeliveryDays" IS NOT NULL
            AND EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400 <= "promisedDeliveryDays"
          THEN 1 
          ELSE 0 
        END) as on_time_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierReadyAt" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const totalJobs = parseInt(row.total_jobs) || 0;
      const onTimeJobs = parseInt(row.on_time_jobs) || 0;
      const percentage = totalJobs > 0 ? (onTimeJobs / totalJobs) * 100 : 80;
      
      return { totalJobs, onTimeJobs, percentage };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting promise keeping data:', error);
  }

  return { totalJobs: 0, onTimeJobs: 0, percentage: 80 };
}

/**
 * קבלת נתוני אישור שליח
 */
export async function getCourierConfirmData(supplierId: number): Promise<{
  totalReadyJobs: number;
  confirmedJobs: number;
  percentage: number;
}> {
  const db = await getDb();
  if (!db) return { totalReadyJobs: 0, confirmedJobs: 0, percentage: 80 };

  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_ready_jobs,
        SUM(CASE WHEN "courierConfirmedReady" = TRUE THEN 1 ELSE 0 END) as confirmed_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierMarkedReady" = TRUE
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const totalReadyJobs = parseInt(row.total_ready_jobs) || 0;
      const confirmedJobs = parseInt(row.confirmed_jobs) || 0;
      const percentage = totalReadyJobs > 0 ? (confirmedJobs / totalReadyJobs) * 100 : 80;
      
      return { totalReadyJobs, confirmedJobs, percentage };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting courier confirm data:', error);
  }

  return { totalReadyJobs: 0, confirmedJobs: 0, percentage: 80 };
}

/**
 * קבלת נתוני סיום מוקדם
 * ממוצע ימים שסיים לפני הזמן
 */
export async function getEarlyFinishData(supplierId: number): Promise<{
  avgDaysEarly: number;
  totalJobs: number;
}> {
  const db = await getDb();
  if (!db) return { avgDaysEarly: 0, totalJobs: 0 };

  try {
    const result = await db.execute(sql`
      SELECT 
        AVG(
          CASE 
            WHEN "promisedDeliveryDays" - EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400 > 0
            THEN "promisedDeliveryDays" - EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400
            ELSE 0
          END
        ) as avg_days_early,
        COUNT(*) as total_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierReadyAt" IS NOT NULL
        AND "promisedDeliveryDays" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        avgDaysEarly: parseFloat(row.avg_days_early) || 0,
        totalJobs: parseInt(row.total_jobs) || 0,
      };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting early finish data:', error);
  }

  return { avgDaysEarly: 0, totalJobs: 0 };
}

/**
 * קבלת נתוני התמחות בקטגוריה
 */
export async function getCategoryExpertiseData(supplierId: number, categoryId?: number): Promise<{
  jobsInCategory: number;
  totalJobs: number;
  percentage: number;
}> {
  const db = await getDb();
  if (!db) return { jobsInCategory: 0, totalJobs: 0, percentage: 0 };

  try {
    // קודם נקבל את סה"כ העבודות
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as total_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
    `);
    
    const totalJobs = parseInt((totalResult.rows[0] as any).total_jobs) || 0;

    if (!categoryId || totalJobs === 0) {
      return { jobsInCategory: 0, totalJobs, percentage: 0 };
    }

    // עכשיו נבדוק כמה עבודות בקטגוריה הספציפית
    const categoryResult = await db.execute(sql`
      SELECT COUNT(*) as jobs_in_category
      FROM supplier_jobs sj
      JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
      JOIN product_sizes ps ON sq.size_id = ps.id
      JOIN base_products bp ON ps.product_id = bp.id
      WHERE sj."supplierId" = ${supplierId}
        AND bp."categoryId" = ${categoryId}
    `);

    const jobsInCategory = parseInt((categoryResult.rows[0] as any).jobs_in_category) || 0;
    const percentage = totalJobs > 0 ? (jobsInCategory / totalJobs) * 100 : 0;

    return { jobsInCategory, totalJobs, percentage };
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting category expertise:', error);
  }

  return { jobsInCategory: 0, totalJobs: 0, percentage: 0 };
}

/**
 * קבלת עומס נוכחי - מספר עבודות פתוחות
 */
export async function getCurrentLoadData(supplierId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as open_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND status IN ('pending', 'in_progress')
    `);

    if (result.rows && result.rows.length > 0) {
      return parseInt((result.rows[0] as any).open_jobs) || 0;
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting current load:', error);
  }

  return 0;
}

/**
 * קבלת נתוני יציבות - סטיית תקן של זמני אספקה
 */
export async function getConsistencyData(supplierId: number): Promise<{
  stdDev: number;
  avgDays: number;
  isConsistent: boolean;
}> {
  const db = await getDb();
  if (!db) return { stdDev: 0, avgDays: 0, isConsistent: true };

  try {
    const result = await db.execute(sql`
      SELECT 
        STDDEV(EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400) as std_dev,
        AVG(EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400) as avg_days
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierReadyAt" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const stdDev = parseFloat(row.std_dev) || 0;
      const avgDays = parseFloat(row.avg_days) || 0;
      // ספק עקבי אם סטיית התקן קטנה מ-30% מהממוצע
      const isConsistent = avgDays > 0 ? (stdDev / avgDays) < 0.3 : true;
      
      return { stdDev, avgDays, isConsistent };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting consistency data:', error);
  }

  return { stdDev: 0, avgDays: 0, isConsistent: true };
}

/**
 * קבלת נתוני ביטולים
 */
export async function getCancellationData(supplierId: number): Promise<{
  totalJobs: number;
  cancelledJobs: number;
  percentage: number;
}> {
  const db = await getDb();
  if (!db) return { totalJobs: 0, cancelledJobs: 0, percentage: 0 };

  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const totalJobs = parseInt(row.total_jobs) || 0;
      const cancelledJobs = parseInt(row.cancelled_jobs) || 0;
      const percentage = totalJobs > 0 ? (cancelledJobs / totalJobs) * 100 : 0;
      
      return { totalJobs, cancelledJobs, percentage };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting cancellation data:', error);
  }

  return { totalJobs: 0, cancelledJobs: 0, percentage: 0 };
}

// ============================================
// SCORING CALCULATION FUNCTIONS
// ============================================

/**
 * חישוב ציון בסיס לפי מספר עבודות
 */
function calculateBaseScore(completedJobs: number): number {
  if (completedJobs >= 10) return SCORING_CONFIG.baseScore.manyJobs;
  if (completedJobs >= 5) return SCORING_CONFIG.baseScore.someJobs;
  if (completedJobs >= 1) return SCORING_CONFIG.baseScore.fewJobs;
  return SCORING_CONFIG.baseScore.noJobs;
}

/**
 * חישוב בונוס/קנס מחיר
 * מחיר זול יותר מהממוצע = בונוס, יקר יותר = קנס
 */
function calculatePriceScore(supplierPrice: number, marketAverage: number): number {
  if (marketAverage === 0 || supplierPrice === 0) return 0;
  
  const priceDiffPercent = ((marketAverage - supplierPrice) / marketAverage) * 100;
  // המרה לטווח ±10
  let score = priceDiffPercent * 0.5; // 20% זול = +10 נקודות
  
  // הגבלה לטווח
  return Math.max(SCORING_CONFIG.criteria.price.min, 
                  Math.min(SCORING_CONFIG.criteria.price.max, score));
}

/**
 * חישוב בונוס/קנס עמידה בהבטחות
 */
function calculatePromiseKeepingScore(percentage: number): number {
  // 80% = 0, 100% = +8, 60% = -8
  const score = (percentage - 80) * 0.4;
  return Math.max(SCORING_CONFIG.criteria.promiseKeeping.min,
                  Math.min(SCORING_CONFIG.criteria.promiseKeeping.max, score));
}

/**
 * חישוב בונוס/קנס אישור שליח
 */
function calculateCourierConfirmScore(percentage: number): number {
  // 80% = 0, 100% = +6, 60% = -6
  const score = (percentage - 80) * 0.3;
  return Math.max(SCORING_CONFIG.criteria.courierConfirm.min,
                  Math.min(SCORING_CONFIG.criteria.courierConfirm.max, score));
}

/**
 * חישוב בונוס סיום מוקדם
 */
function calculateEarlyFinishScore(avgDaysEarly: number): number {
  // כל יום מוקדם = +1 נקודה, מקסימום +3
  const score = Math.min(avgDaysEarly, SCORING_CONFIG.criteria.earlyFinish.max);
  return Math.max(0, score);
}

/**
 * חישוב בונוס התמחות בקטגוריה
 */
function calculateCategoryExpertScore(jobsInCategory: number): number {
  // 10+ עבודות בקטגוריה = +2, 5+ = +1
  if (jobsInCategory >= 10) return SCORING_CONFIG.criteria.categoryExpert.max;
  if (jobsInCategory >= 5) return 1;
  return 0;
}

/**
 * חישוב קנס עומס נוכחי
 */
function calculateCurrentLoadScore(openJobs: number): number {
  // כל 3 עבודות פתוחות = -1 נקודה, מקסימום -3
  const score = -Math.floor(openJobs / 3);
  return Math.max(SCORING_CONFIG.criteria.currentLoad.min, score);
}

/**
 * חישוב בונוס יציבות
 */
function calculateConsistencyScore(isConsistent: boolean, stdDev: number, avgDays: number): number {
  if (avgDays === 0) return 0;
  
  // יחס סטיית תקן לממוצע
  const ratio = stdDev / avgDays;
  
  if (ratio < 0.2) return SCORING_CONFIG.criteria.consistency.max; // מאוד עקבי
  if (ratio < 0.3) return 1; // עקבי
  return 0; // לא עקבי
}

/**
 * חישוב קנס ביטולים
 */
function calculateCancellationScore(percentage: number): number {
  // כל 5% ביטולים = -1 נקודה, מקסימום -2
  const score = -Math.floor(percentage / 5);
  return Math.max(SCORING_CONFIG.criteria.cancellations.min, score);
}

// ============================================
// MAIN RECOMMENDATION INTERFACE
// ============================================

export interface SupplierScoreBreakdown {
  baseScore: number;
  priceScore: number;
  promiseKeepingScore: number;
  courierConfirmScore: number;
  earlyFinishScore: number;
  categoryExpertScore: number;
  currentLoadScore: number;
  consistencyScore: number;
  cancellationScore: number;
  totalScore: number;
}

export interface SupplierMetrics {
  completedJobs: number;
  supplierPrice: number;
  marketAveragePrice: number;
  promiseKeeping: { totalJobs: number; onTimeJobs: number; percentage: number };
  courierConfirm: { totalReadyJobs: number; confirmedJobs: number; percentage: number };
  earlyFinish: { avgDaysEarly: number; totalJobs: number };
  categoryExpertise: { jobsInCategory: number; totalJobs: number; percentage: number };
  currentLoad: number;
  consistency: { stdDev: number; avgDays: number; isConsistent: boolean };
  cancellations: { totalJobs: number; cancelledJobs: number; percentage: number };
}

export interface SupplierRecommendation {
  supplierId: number;
  supplierNumber: number;
  supplierName: string;
  supplierCompany: string | null;
  metrics: SupplierMetrics;
  scores: SupplierScoreBreakdown;
  rank: number;
  isNewSupplier: boolean; // ספק חדש = פחות מ-5 עבודות
}

/**
 * קבלת המלצות ספקים מדורגות
 */
export async function getEnhancedSupplierRecommendations(
  sizeQuantityId?: number,
  categoryId?: number
): Promise<SupplierRecommendation[]> {
  const db = await getDb();
  if (!db) return [];

  // קבלת כל הספקים הפעילים
  const suppliers = await db.select({
    id: users.id,
    name: users.name,
    companyName: users.companyName,
    supplierNumber: users.supplierNumber,
  })
    .from(users)
    .where(and(
      eq(users.role, 'supplier'),
      eq(users.status, 'active')
    ));

  if (suppliers.length === 0) return [];

  // קבלת מחיר ממוצע בשוק
  const marketAveragePrice = await getMarketAveragePrice(sizeQuantityId);

  // חישוב ציונים לכל ספק
  const recommendations: SupplierRecommendation[] = await Promise.all(
    suppliers.map(async (supplier) => {
      // איסוף כל הנתונים
      const [
        completedJobs,
        supplierPrice,
        promiseKeeping,
        courierConfirm,
        earlyFinish,
        categoryExpertise,
        currentLoad,
        consistency,
        cancellations,
      ] = await Promise.all([
        getSupplierCompletedJobsCount(supplier.id),
        getSupplierPrice(supplier.id, sizeQuantityId),
        getPromiseKeepingData(supplier.id),
        getCourierConfirmData(supplier.id),
        getEarlyFinishData(supplier.id),
        getCategoryExpertiseData(supplier.id, categoryId),
        getCurrentLoadData(supplier.id),
        getConsistencyData(supplier.id),
        getCancellationData(supplier.id),
      ]);

      // חישוב ציונים
      const baseScore = calculateBaseScore(completedJobs);
      const priceScore = calculatePriceScore(supplierPrice, marketAveragePrice);
      const promiseKeepingScore = calculatePromiseKeepingScore(promiseKeeping.percentage);
      const courierConfirmScore = calculateCourierConfirmScore(courierConfirm.percentage);
      const earlyFinishScore = calculateEarlyFinishScore(earlyFinish.avgDaysEarly);
      const categoryExpertScore = calculateCategoryExpertScore(categoryExpertise.jobsInCategory);
      const currentLoadScore = calculateCurrentLoadScore(currentLoad);
      const consistencyScore = calculateConsistencyScore(consistency.isConsistent, consistency.stdDev, consistency.avgDays);
      const cancellationScore = calculateCancellationScore(cancellations.percentage);

      const totalScore = baseScore + priceScore + promiseKeepingScore + courierConfirmScore +
                         earlyFinishScore + categoryExpertScore + currentLoadScore +
                         consistencyScore + cancellationScore;

      return {
        supplierId: supplier.id,
        supplierNumber: supplier.supplierNumber || 1001,
        supplierName: supplier.name || 'ספק',
        supplierCompany: supplier.companyName,
        metrics: {
          completedJobs,
          supplierPrice: Math.round(supplierPrice * 100) / 100,
          marketAveragePrice: Math.round(marketAveragePrice * 100) / 100,
          promiseKeeping,
          courierConfirm,
          earlyFinish,
          categoryExpertise,
          currentLoad,
          consistency,
          cancellations,
        },
        scores: {
          baseScore: Math.round(baseScore * 10) / 10,
          priceScore: Math.round(priceScore * 10) / 10,
          promiseKeepingScore: Math.round(promiseKeepingScore * 10) / 10,
          courierConfirmScore: Math.round(courierConfirmScore * 10) / 10,
          earlyFinishScore: Math.round(earlyFinishScore * 10) / 10,
          categoryExpertScore: Math.round(categoryExpertScore * 10) / 10,
          currentLoadScore: Math.round(currentLoadScore * 10) / 10,
          consistencyScore: Math.round(consistencyScore * 10) / 10,
          cancellationScore: Math.round(cancellationScore * 10) / 10,
          totalScore: Math.round(totalScore * 10) / 10,
        },
        rank: 0, // יוגדר אחרי מיון
        isNewSupplier: completedJobs < 5,
      };
    })
  );

  // מיון לפי ציון כולל (יורד) והגדרת דירוג
  recommendations.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
  recommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  return recommendations;
}

/**
 * קבלת N ספקים מומלצים
 */
export async function getTopSupplierRecommendations(
  sizeQuantityId?: number,
  categoryId?: number,
  limit: number = 3
): Promise<SupplierRecommendation[]> {
  const recommendations = await getEnhancedSupplierRecommendations(sizeQuantityId, categoryId);
  return recommendations.slice(0, limit);
}

/**
 * קבלת ציון ספק בודד
 */
export async function getSupplierScore(
  supplierId: number,
  sizeQuantityId?: number,
  categoryId?: number
): Promise<SupplierRecommendation | null> {
  const recommendations = await getEnhancedSupplierRecommendations(sizeQuantityId, categoryId);
  return recommendations.find(r => r.supplierId === supplierId) || null;
}

// ============================================
// LEGACY SUPPORT - Keep old function signature
// ============================================

export async function getSupplierWeights() {
  // פונקציה ישנה לתאימות אחורה
  return { price: 30, rating: 25, deliveryTime: 25, reliability: 20 };
}

export async function getSupplierReliabilityData(supplierId: number) {
  const data = await getCourierConfirmData(supplierId);
  return {
    reliabilityPct: data.percentage,
    totalJobs: data.totalReadyJobs,
    reliableJobs: data.confirmedJobs,
  };
}

export async function getSupplierRatingData(supplierId: number) {
  // דירוג ממוצע מעבודות
  const db = await getDb();
  if (!db) return { avgRating: 3, totalRatings: 0 };

  try {
    const result = await db.execute(sql`
      SELECT 
        AVG("supplierRating") as avg_rating,
        COUNT("supplierRating") as total_ratings
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierRating" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        avgRating: parseFloat(row.avg_rating) || 3,
        totalRatings: parseInt(row.total_ratings) || 0,
      };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting rating:', error);
  }

  return { avgRating: 3, totalRatings: 0 };
}

export async function getSupplierSpeedData(supplierId: number) {
  const consistency = await getConsistencyData(supplierId);
  return {
    avgDeliveryDays: consistency.avgDays,
    totalDeliveries: 0,
  };
}
