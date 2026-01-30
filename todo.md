# QuoteFlow - Project TODO

## Database Schema
- [x] Users table with roles (Admin, Employee, Customer, Supplier, Courier)
- [x] Base products table
- [x] Product variants table with SKU and attributes
- [x] Validation profiles table
- [x] Pricelists and pricelist items tables
- [x] Customer pricelists table
- [x] Quotes table with versioning support
- [x] Quote items table
- [x] Quote attachments table
- [x] Quote file warnings table
- [x] Supplier prices table
- [x] Internal notes table
- [x] Activity log table

## Backend API
- [x] Auth procedures (me, logout)
- [x] Dashboard KPIs endpoint
- [x] Recent activity endpoint
- [x] Recent quotes endpoint
- [x] Pending customers endpoint
- [x] Quote list endpoint
- [x] Quote getById endpoint
- [x] Quote history endpoint
- [x] Quote request endpoint
- [x] Quote update endpoint
- [x] Quote revise endpoint
- [x] Quote updateStatus endpoint
- [x] Quote reject endpoint
- [x] Quote rate endpoint
- [x] Admin approve customer endpoint

## Frontend - Navigation & Layout
- [x] DashboardLayout with sidebar
- [x] Navigation tabs: Dashboard, Quotes, Customers, Suppliers, Products, Analytics, Settings
- [x] Mobile-responsive sidebar with hamburger menu
- [x] User profile section in sidebar
- [x] RTL support

## Frontend - Dashboard Page
- [x] KPI cards with visual hierarchy
- [x] Revenue metrics display
- [x] Conversion rate visualization
- [x] Recent quotes list
- [x] Pending approvals section
- [x] Activity feed component
- [x] Open jobs at suppliers section

## Frontend - Placeholder Pages
- [x] Quotes page
- [x] Customers page
- [x] Suppliers page
- [x] Products page
- [x] Analytics page
- [x] Settings page

## Styling & UX
- [x] Professional color palette
- [x] Typography hierarchy
- [x] Hebrew language support
- [x] RTL layout configuration
- [x] Mobile-first responsive design


## Bugs & Fixes
- [x] Sidebar should be on the right side (RTL) and fixed position
- [x] Sidebar overlaps content - should be fixed and content should start after it

## Phase 1: Products API
- [x] products.list - List all products with variants (DB function)
- [x] products.getById - Get single product with variants (DB function)
- [x] products.create - Create base product
- [x] products.createVariant - Create product variant
- [x] products.update - Update product
- [x] products.updateVariant - Update variant
- [x] products.delete - Soft delete product
- [x] Products page with table view
- [x] Add product modal/dialog
- [x] Add variant modal/dialog
- [x] Edit product functionality

## Phase 2: Customers Portal
- [x] customers.list - List all customers with filters (DB function)
- [x] customers.getById - Get single customer details (DB function)
- [x] customers.approve - Approve pending customer (DB function)
- [x] customers.reject - Reject pending customer (DB function)
- [x] customers.update - Update customer details (DB function)
- [x] customers.getPricelists - Get customer pricelists (DB function)
- [x] customers.assignPricelist - Assign pricelist to customer (DB function)
- [x] Customers page with table view
- [x] Customer details modal/drawer
- [x] Approve/Reject buttons for pending customers
- [x] Customer quote request interface
- [x] Quotes page with full functionality
- [x] Create quote dialog with items
- [x] Quote status management
- [x] Quote history view
- [x] Quote versioning support

## Phase 3: Supplier Portal API
- [x] suppliers.list - List all suppliers with filters (DB function)
- [x] suppliers.getById - Get single supplier details (DB function)
- [x] suppliers.create - Create new supplier (DB function)
- [x] suppliers.update - Update supplier details (DB function)
- [x] suppliers.prices - Get supplier prices for variants (DB function)
- [x] suppliers.updatePrice - Update supplier price for variant (DB function)
- [x] suppliers.openJobs - Get open jobs assigned to supplier (DB function)
- [x] suppliers.recommendations - Weighted supplier recommendation engine (DB function)
- [x] Suppliers page with table view
- [x] Supplier details drawer with prices
- [x] Assign supplier to quote item API
- [x] Supplier recommendation engine

## Phase 4: Courier API, Notes & Analytics
- [x] courier.readyJobs - Get jobs ready for pickup from suppliers (DB function)
- [x] courier.markPickedUp - Mark job as picked up (DB function)
- [x] courier.markDelivered - Mark job as delivered to customer (DB function)
- [x] notes.create - Create internal note on customer/quote (DB function)
- [x] notes.list - Get notes for customer/quote (DB function)
- [x] notes.delete - Delete internal note (DB function)
- [x] analytics.productPerformance - Product sales performance (DB function)
- [x] analytics.supplierPerformance - Supplier performance metrics (DB function)
- [x] analytics.customerAnalytics - Customer behavior analytics (DB function)
- [x] analytics.revenueReport - Revenue and profit reports (DB function)
- [x] Analytics page with charts and reports
- [x] Courier API endpoints
- [x] Notes API endpoints
- [x] Analytics API endpoints

## Phase 5: File Validation (Pre-Press)
- [x] validationProfiles.list - List validation profiles (DB function)
- [x] validationProfiles.getById - Get single profile (DB function)
- [x] validationProfiles.create - Create validation profile (DB function)
- [x] validationProfiles.update - Update validation profile (DB function)
- [x] files.validate - Validate uploaded file against profile (DB function)
- [x] files.getWarnings - Get file warnings for quote (DB function)
- [x] files.acknowledgeWarnings - Acknowledge file warnings (DB function)
- [x] File Validation API endpoints
- [ ] File upload component with drag & drop
- [ ] File validation feedback UI with warnings
- [x] Validation profile management page (Settings)

## Bug Fixes - Debugging Session
- [x] Fix SQL errors in Analytics - quote_status should be status, finalValue doesn't exist
- [x] Fix nested button error in Suppliers page (SQL error was the cause, fixed)
- [x] Fix nested button error in Products page - moved DropdownMenu outside AccordionTrigger

## Bug Fixes - Analytics SQL Errors (Jan 21)
- [x] Fix revenueReport: quote_status should be status, order by alias issue
- [x] Fix customerAnalytics: quote_status should be status, finalValue doesn't exist (now calculates from quote_items)
- [x] Fix supplierPerformance: order by alias issue (sort in JS)
- [x] Fix productPerformance: order by alias issue (sort in JS)

## Demo Data Seed (Jan 21)
- [x] Create seed script with 5 customers, 5 suppliers, 5 products (15 variants), 5 quotes

## UX Improvements (Jan 21)
- [x] Fix layout jump/shift on page load - DashboardLayoutSkeleton now matches exact layout structure
- [x] Quotes page: click on row instead of 3-dots menu - full row is now clickable
- [x] Quotes page: expand details below row (accordion) instead of side panel - using Collapsible component

## Activity Log System (Jan 21)
- [x] Translate all action types to Hebrew (30+ action types translated)
- [x] Create full Activity page with filters (customer, employee, date range)
- [x] Add API endpoint for filtered activity log (getFilteredActivity, getActivityActionTypes)
- [x] Link dashboard "פעילות אחרונה" to activity page ("צפה בהכל" link)
- [x] Full tracking: who did what, when, and to whom - with pagination

## Supplier Recommendation Weights Settings (Jan 21)
- [x] Create system_settings table for storing configuration
- [x] Add API endpoints for reading/saving supplier weights (settings.supplierWeights.get/update)
- [x] Update getSupplierRecommendations to use weights from settings
- [x] Build UI in Settings page for admin to configure weights (price, rating, delivery time, reliability)
- [x] Validate weights sum to 100% (with visual indicator)


## Phase 6: Dashboard Upgrade (Jan 30)

### שורת התראות דחופות
בראש לוח הבקרה תופיע שורה בולטת (בצבע אדום/כתום) שמציגה דברים שדורשים טיפול מיידי. למשל: עבודות שעברו את מועד האספקה המובטח, הצעות מחיר שמחכות לאישור יותר מ-48 שעות, ספקים שלא אישרו עבודות שנשלחו אליהם.
- [ ] API endpoint לשליפת התראות דחופות
- [ ] רכיב UI להצגת התראות בראש לוח הבקרה

### כרטיס "עבודות בייצור" עם פס התקדמות
כרטיס חדש בלוח הבקרה שמציג את כל העבודות שנמצאות כרגע בתהליך (עדיין לא נמסרו ללקוח). כל עבודה תציג פס צבעוני שמראה באיזה שלב היא נמצאת: ממתין לאישור ספק, בייצור אצל הספק, מוכן לאיסוף, נאסף על ידי השליח. כאשר עבודה מגיעה לסטטוס "נמסר" היא נעלמת מהרשימה הזו. לחיצה על "הצג הכל" תפתח חלון גדול יותר עם כל העבודות הפעילות ופס ההתקדמות של כל אחת.
- [ ] API endpoint לשליפת עבודות בייצור
- [ ] רכיב פס התקדמות (Progress Bar) לפי שלבים
- [ ] כרטיס "עבודות בייצור" בלוח הבקרה
- [ ] מודאל "הצג הכל" עם רשימה מלאה

### כפתורי פעולות מהירות
כפתורים בולטים בלוח הבקרה לפעולות שעושים הרבה. למשל: כפתור "צור הצעת מחיר חדשה", כפתור "הוסף לקוח חדש", כפתור "שלח תזכורת". זה חוסך זמן במקום לחפש בתפריטים.
- [ ] רכיב Quick Actions בלוח הבקרה
- [ ] קיצורי דרך לפעולות נפוצות

### שיפורים ויזואליים
לשפר את המראה הכללי של לוח הבקרה: להוסיף צללים עדינים לכרטיסים כדי שיבלטו, להשתמש בצבעים עקביים לכל סטטוס (ירוק תמיד אומר הושלם, כתום תמיד אומר בהמתנה, אדום תמיד אומר דחוף), להוסיף אנימציות קלות כשדברים נטענים.
- [ ] צללים עדינים לכרטיסים
- [ ] צבעים עקביים לסטטוסים
- [ ] אנימציות טעינה

### לוח זמנים - מועדי אספקה קרובים
אזור שמציג רשימה של מועדי אספקה שמתקרבים בימים הקרובים. למשל: "היום בשעה 14:00 - אספקה ללקוח דוד כהן (באנר רול-אפ)", "מחר - אספקה ללקוח שרה לוי (פליירים)". זה עוזר לראות במבט אחד מה צפוי ולא לפספס מועדים.
- [ ] API endpoint לשליפת מועדי אספקה קרובים
- [ ] רכיב Timeline בלוח הבקרה

## Phase 7: Courier Tasks & Notes System (Jan 30)

### משימות כלליות לשליח
אפשרות למנהל להוסיף משימה לשליח שלא קשורה לעבודה ספציפית. למשל: "לאסוף חומרי גלם מהמחסן", "להעביר מסמכים למשרד רואה החשבון", "לקנות ציוד משרדי". המשימה תכלול: כותרת, תיאור מפורט, תאריך יעד לביצוע, ציון עדיפות (רגיל או דחוף). השליח יראה את כל המשימות שלו ברשימה מסודרת ויוכל לסמן כל משימה כ"בוצעה".
- [ ] טבלת courier_tasks בדאטהבייס
- [ ] API endpoints: create, list, update, markComplete
- [ ] ממשק מנהל להוספת משימות לשליח
- [ ] ממשק שליח לצפייה במשימות

### הערות לשליח על עבודה ספציפית
אפשרות למנהל להוסיף הערה לעבודה מסוימת לפי מספר העבודה. ההערה תהיה גלויה רק לשליח ולמנהל, הלקוח והספק לא יראו אותה. למשל: "הלקוח ביקש להתקשר 10 דקות לפני ההגעה", "יש מדרגות בכניסה לבניין, אין מעלית", "לבקש מהלקוח חתימה על טופס קבלה", "הלקוח משלם במזומן, לגבות 500 שקל". ההערות יופיעו לשליח כשהוא צופה בפרטי העבודה.
- [ ] טבלת courier_notes בדאטהבייס (עם קשר ל-supplier_jobs)
- [ ] API endpoints: create, list, delete
- [ ] ממשק מנהל להוספת הערות לעבודה
- [ ] הצגת הערות בממשק השליח

### ממשק שליח משופר
לשפר את המסך של השליח כך שיראה: רשימה של כל המשימות שלו (גם משימות כלליות וגם עבודות לאיסוף/מסירה), אפשרות לסמן משימה או עבודה כ"בוצעה", צפייה בהערות שהמנהל כתב לו על כל עבודה.
- [ ] עיצוב מחדש של ממשק השליח
- [ ] תצוגה משולבת של משימות ועבודות
- [ ] הצגת הערות מנהל על עבודות
