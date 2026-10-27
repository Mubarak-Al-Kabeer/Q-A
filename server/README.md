# تركيب السيرفر (Google Apps Script) — v5

الملفات:
- `server/Code.gs` — كود السيرفر كامل
- `data/categories.tsv` — الفئات (50 فئة، شاملة السؤال الختامي)
- `data/questions-all.csv` — **كل الأسئلة (750 سؤال، 3 لكل خانة)** — هذا اللي تسوي له Import
- `data/questions-all.tsv` — نفس الأسئلة بصيغة TSV (للنسخ واللصق)
- `data/questions-new.tsv` — دفعة Q126 → Q255 بس (قديم)

## 1) حدّث الكود
1. افتح مشروع Apps Script ← امسح محتوى `Code.gs` والصق محتوى `server/Code.gs`.
2. **رمز المسؤول:** ⚙️ Project Settings ← Script properties ← Add property
   - Property: `ADMIN_CODE` · Value: رمزك
   (لو ما حطيته، يبقى الرمز الموجود حالياً في شيت Accounts كما هو.)

## 2) جهّز الشيتات (من المحرر شغّل الدوال بالترتيب)
1. `ensureSheetsExist` — ينشئ شيت `Categories` إذا مو موجود
2. `prepareQuestionsSheet` — يضيف عمود `specialty` (العمود O)، ويحط `ALL` للأسئلة القديمة، ويخلي كل الأعمدة نص
3. `prepareCategoriesSheet` — يجهّز هيدر شيت الفئات

## 3) استورد البيانات
### الأسئلة (Import — تنضاف كلها مرة وحدة)
1. افتح شيت **Questions**.
2. File ← **Import** ← Upload ← اختر `data/questions-all.csv`.
3. Import location: **Replace current sheet**.
4. Separator type: **Detect automatically** (أو Comma).
5. **شيل الصح** من: *Convert text to numbers, dates, and formulas* — عشان `15:2` و `5–6` يبقون نص.
6. Import data ✅ — بعدها شغّل `prepareQuestionsSheet` مرة وحدة.

### الفئات
- نفس الطريقة على شيت **Categories** مع `data/categories.tsv` (Replace current sheet، Separator: Tab)،
  أو انسخ الملف بدون أول سطر والصقه في `A2`.
- ⚠️ لا تحط الفئات في شيت Questions.

## 4) انشر نسخة جديدة
Deploy ← Manage deployments ← ✏️ ← Version: **New version** ← Deploy
(لا تسوي New deployment — الرابط يتغير وتحتاج تعدّل `API_URL` في `app.js`.)

## 5) افحص
- `testAll` — عدد الفئات والأسئلة لكل تخصص
- `checkQuestions` — الخانات الناقصة لكل تخصص وأي خطأ في الأسئلة

## القواعد
| العمود | القيم |
|---|---|
| `Questions.specialty` | `ALL` أو `EMS` / `NURSING` / `PHARMACY` / `LAB` / `RADIOLOGY` / `MEDICINE` أو أكثر من واحد بفاصلة `EMS,NURSING` |
| `Categories.specialties` | نفس الرموز — الفئة تظهر فقط للتخصصات المكتوبة |
| `Categories.category` | لازم يطابق عمود `category` في الأسئلة حرفياً |
| `Categories.label` | الاسم اللي يشوفه اللاعبين (تقدر تغيّره بحرية) |
| `Categories.active` | `FALSE` يخفي الفئة بدون حذفها |

- **نفس الفئة بأسئلة مختلفة لكل تخصص:** خل الفئة `ALL`، واكتب في عمود `specialty` لكل سؤال تخصصه.
- **فئة جديدة:** أضف صف في `Categories` وأسئلتها في `Questions` — بدون أي تعديل بالكود.
- **Final Boss:** صار سؤال ختامي واحد بالرهان بعد ما تخلص اللوحة (يتفعّل من زر في صفحة الفئات). أسئلته بفئة `Final Boss` وما يهم عمود النقاط.
- فئة `Wild Card` القديمة مو موجودة في `Categories` لأن المفاجآت المخفية في اللوحة صارت تسوي نفس الشي.
