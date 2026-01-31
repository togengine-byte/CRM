/**
 * Database Module - Central Export
 * 
 * This file re-exports all database functions from their respective modules.
 * Import from this file to access any database functionality.
 * 
 * Architecture:
 * - connection.ts: Database connection and common utilities
 * - types.ts: Shared TypeScript types and interfaces
 * - activity.ts: Activity logging
 * - users.ts: User management and authentication
 * - customers.ts: Customer management
 * - suppliers.ts: Supplier management and recommendations
 * - products.ts: Product catalog management
 * - quotes.ts: Quote management
 * - jobs.ts: Supplier and courier job management
 * - pricelists.ts: Pricelist management and pricing calculations
 * - analytics.ts: Analytics and reporting
 * - settings.ts: System settings
 * - notes.ts: Notes management
 * - validation.ts: File validation
 * - couriers.ts: Courier management
 */

// ==================== CONNECTION ====================
export { getDb } from "./connection";

// ==================== TYPES ====================
export * from "./types";

// ==================== ACTIVITY ====================
export { 
  logActivity,
  getActivityLog,
  getUserActivityLog,
  getEntityActivityLog,
  getFilteredActivity,
  getActivityActionTypes,
} from "./activity";

// ==================== USERS ====================
export {
  getUserByOpenId,
  getUserByEmail,
  getUserById,
  upsertUser,
  getDashboardStats,
  getRecentActivity,
  getPendingUsers,
  getAllStaff,
  createStaffUser,
  updateUserPermissions,
  updateUserRole,
  updateStaffUser,
  deleteStaffUser,
  approveUser,
  rejectUser,
  deactivateUser,
  reactivateUser,
} from "./users";

// ==================== CUSTOMERS ====================
export {
  getCustomers,
  getCustomerById,
  approveCustomer,
  rejectCustomer,
  updateCustomer,
  getCustomerPricelists,
  assignPricelistToCustomer,
  removePricelistFromCustomer,
  setCustomerDefaultPricelist,
  getCustomerStats,
  createCustomerSignupRequest,
  getCustomerSignupRequests,
  getCustomerSignupRequestById,
  approveCustomerSignupRequest,
  rejectCustomerSignupRequest,
} from "./customers";

// ==================== SUPPLIERS ====================
export {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  getSuppliersList,
  getSupplierPrices,
  upsertSupplierPrice,
  deleteSupplierPrice,
  getSupplierOpenJobs,
  getSupplierWeights,
  updateSupplierWeights,
  // getSupplierRecommendations - REMOVED: Use enhanced algorithm from supplierRecommendations.ts
  getSupplierStats,
  assignSupplierToQuoteItem,
} from "./suppliers";

// ==================== PRODUCTS ====================
export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  createSize,
  updateSize,
  deleteSize,
  createSizeQuantity,
  updateSizeQuantity,
  deleteSizeQuantity,
  getSizeQuantityById,
  createProductAddon,
  updateProductAddon,
  deleteProductAddon,
  getProductWithDetails,
  getProductsWithDetails,
  calculateProductPrice,
  // Legacy functions
  createProductSize,
  updateProductSize,
  deleteProductSize,
  createProductQuantity,
  updateProductQuantity,
  deleteProductQuantity,
} from "./products";

// ==================== QUOTES ====================
export {
  getQuotes,
  getQuoteById,
  getQuoteHistory,
  createQuoteRequest,
  updateQuote,
  reviseQuote,
  updateQuoteStatus,
  rejectQuote,
  rateDeal,
  sendQuoteToCustomer,
} from "./quotes";

// ==================== JOBS ====================
export {
  getSupplierJobs,
  getSupplierJobById,
  updateSupplierJobStatus,
  markSupplierJobReady,
  confirmSupplierJobReady,
  rateSupplierJob,
  updateSupplierJobData,
  getSupplierCompletedJobs,
  getSupplierScoreDetails,
  getCourierJobs,
  markJobPickedUp,
  markJobDelivered,
  getSupplierJobsHistory,
  updateJobStatus,
} from "./jobs";

// ==================== PRICELISTS ====================
export {
  getPricelists,
  getPricelistById,
  createPricelist,
  updatePricelist,
  deletePricelist,
  getCustomerDefaultPricelist,
  setCustomerPricelist,
  calculateCustomerPrice,
  recalculateQuoteTotals,
  changeQuotePricelist,
  updateQuoteItemPricing,
  autoPopulateQuotePricing,
} from "./pricelists";

// ==================== ANALYTICS ====================
export {
  getRevenueAnalytics,
  getCustomerAnalytics,
  getAllCustomersAnalytics,
  getSupplierAnalytics,
  getDashboardAnalytics,
  getProductAnalytics,
  getConversionFunnel,
  getAnalyticsSummary,
  getProductPerformance,
  getSupplierPerformance,
  getRevenueReport,
} from "./analytics";

// ==================== SETTINGS ====================
export {
  getSystemSetting,
  setSystemSetting,
  getAllSystemSettings,
  getEmailOnStatusChange,
  setEmailOnStatusChange,
  getFileValidationSettings,
  setFileValidationSettings,
  getBusinessInfo,
  setBusinessInfo,
  getQuoteSettings,
  setQuoteSettings,
  getNotificationSettings,
  setNotificationSettings,
  getEmailOnStatusChangeSetting,
  setEmailOnStatusChangeSetting,
  // Gmail settings
  getGmailSettings,
  getGmailSettingsInternal,
  setGmailSettings,
  clearGmailSettings,
} from "./settings";

// ==================== EMAIL ====================
export {
  sendEmail,
  testEmailConnection,
  testEmailConnection as testGmailConnection, // backward compatibility
  sendQuoteEmail,
  sendJobStatusEmail,
  getEmailSettings,
  saveEmailSettings,
} from "./email";

// ==================== NOTES ====================
export {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getQuoteNotes,
  addQuoteNote,
  getCustomerNotes,
  addCustomerNote,
  getSupplierNotes,
  addSupplierNote,
  getJobNotes,
  addJobNote,
} from "./notes";

// ==================== VALIDATION ====================
export {
  validatePrintFile,
  getValidationRequirements,
  validateMultipleFiles,
  getValidationProfiles,
  getValidationProfileById,
  createValidationProfile,
  updateValidationProfile,
  deleteValidationProfile,
  getDefaultValidationProfile,
  validateFile,
  saveFileWarnings,
  getFileWarnings,
  getFileWarningsByAttachment,
  acknowledgeWarning,
  acknowledgeAllWarnings,
} from "./validation";

// ==================== DASHBOARD ====================
export {
  getDashboardKPIs,
  getRecentQuotes,
  getPendingSignups,
  getPendingApprovals,
  getPendingCustomers,
  getActiveJobs,
  getJobsReadyForPickup,
  getUrgentAlerts,
  getDeliveredJobs,
} from "./dashboard";

// ==================== COURIERS ====================
export {
  getCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  deleteCourier,
  getAvailablePickups,
  getCourierActiveDeliveries,
  getCourierDeliveryHistory,
  confirmPickup,
  completeDelivery,
  getCourierStats,
  getCourierReadyJobs,
  getCouriersList,
} from "./couriers";

// ==================== BACKUP ====================
export {
  createBackup,
  getBackupList,
  getBackupContent,
  deleteBackup,
  restoreFromBackup,
  getBackupSettings,
  saveBackupSettings,
  sendDailyBackupEmail,
  startBackupScheduler,
  stopBackupScheduler,
} from "./backup";
