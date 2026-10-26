# تركيب السيرفر (Google Apps Script) — v5

الملفات:
- `server/Code.gs` — كود السيرفر كامل
- `data/categories.tsv` — الفئات (50 فئة، شاملة السؤال الختامي)
- `data/questions-all.tsv` — **كل الأسئلة (255)** جاهزة تلصقها من A1
- `data/questions-new.tsv` — الـ 130 سؤال الجديدة بس (Q126 → Q255)

## 1) حدّث الكود
1. افتح مشروع Apps Script ← امسح محتوى `Code.gs` والصق محتوى `server/Code.gs`.
2. **رمز المسؤول:** ⚙️ Project Settings ← Script properties ← Add property
   - Property: `ADMIN_CODE` · Value: رمزك
   (لو ما حطيته، يبقى الرمز الموجود حالياً في شيت Accounts كما هو.)

## 2) جهّز الشيتات (من المحرر شغّل الدوال بالترتيب)
1. `ensureSheetsExist` — ينشئ شيت `Categories` إذا مو موجود
2. `prepareQuestionsSheet` — يضيف عمود `specialty` (العمود O)، ويحط `ALL` للأسئلة القديمة، ويخلي كل الأعمدة نص
3. `prepareCategoriesSheet` — يجهّز هيدر شيت الفئات

## 3) الصق البيانات
- **الفئات:** افتح `data/categories.tsv` ← انسخ كل شي **بدون أول سطر** ← في شيت `Categories` اضغط على الخلية `A2` والصق.
- **الأسئلة (الأسهل):** امسح شيت `Questions` كامل ← شغّل `prepareQuestionsSheet` (يخلي الأعمدة نص قبل اللصق عشان `15:2` ما يتحول لوقت) ← افتح `data/questions-all.tsv` (كل الـ 255 سؤال مع الهيدر و 15 عمود) ← انسخ كل شي ← اضغط على `A1` والصق.
  - أو إذا تبي تخلي أسئلتك القديمة: الصق `data/questions-new.tsv` (بدون أول سطر) تحت Q125.
- ⚠️ **لا تلصق الفئات في شيت Questions** — لها شيت مستقل اسمه `Categories`.

> الصق كـ نص عادي (Ctrl+Shift+V) إذا طلع تنسيق غريب.

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
