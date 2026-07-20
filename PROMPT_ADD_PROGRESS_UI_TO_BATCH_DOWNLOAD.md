# PROMPT: إضافة واجهة رسومية توضح تقدم التحميل — Documents Center

## المشكلة

في صفحة **Documents Center**:
1. المستخدم يختار المرشحين من الفلاتر.
2. المستخدم يختار أنواع الوثائق المطلوب تحميلها.
3. يضغط على زر **Download ZIP**.
4. يظهر نص بسيط: `"⏳ Preparing ZIP…"`.
5. يمر وقت طويل بدون أي معلومات إضافية.
6. في النهاية يظهر فجأة أن التحميل بدأ.

المستخدم لا يعرف:
- هل الزر استجاب فعلًا؟
- كم ملف تم العثور عليه؟
- كم ملف تم جلبه من Drive؟
- هل يتم بناء ZIP الآن؟
- هل حدث خطأ أم أن العملية تسير بشكل طبيعي؟

## المطلوب

إضافة **واجهة تقدم مرئية (Progress UI)** تظهر للمستخدم بالضبط ما يحدث في كل مرحلة من مراحل التحميل، مع شريط تقدم (Progress Bar) ونصوص توضيحية.

---

## ملفات التعديل

- `DocumentsCenter.js` — الخلفية (backend)
- `Script.html` — الواجهة الأمامية (frontend)
- `Styles.html` — إضافة أنماط الـ progress UI (إذا كان منفصل)
- `Index.html` — إضافة عناصر Progress UI إذا لم تكن موجودة

---

## الخطوات المطلوبة

### 1. الواجهة الأمامية — إضافة Progress UI

في `Script.html` داخل قسم Documents Center، أضف عنصر Progress Modal أو Panel يحتوي على:

- **عنوان المرحلة الحالية** (مثال: `"Finding documents…"`, `"Downloading files from Drive…"`, `"Building ZIP…"`, `"Preparing download link…"`).
- **شريط تقدم (Progress Bar)** يتحرك من 0% إلى 100%.
- **إحصائيات صغيرة** تحت الشريط:
  - `X files found`
  - `Y of X downloaded`
  - `Z MB processed`
- **زر إلغاء (Cancel)** — اختياري لكن مفيد لإيقاف العملية.
- **رسالة النجاح** عند اكتمال التحميل.
- **رسالة الخطأ** مع تفاصيل واضحة عند الفشل.

إذا كان `Styles.html` منفصلًا، أضف الأنماط التالية (CSS):
- `.dc-progress-overlay` — تغطية الشاشة بخلفية شبه شفافة.
- `.dc-progress-panel` — لوحة مركزية بيضاء.
- `.dc-progress-bar` — الشريط الرئيسي.
- `.dc-progress-fill` — الجزء الممتلئ من الشريط.
- `.dc-progress-text` — نص المرحلة.
- `.dc-progress-stats` — إحصائيات صغيرة.
- `.dc-progress-error` — نمط رسالة الخطأ.
- `.dc-progress-success` — نمط رسالة النجاح.

### 2. الخلفية — إرجاع تقدم التنفيذ

الدالة `api_batchDownloadZip` في `DocumentsCenter.js` حاليًا تعمل باستدعاء واحد من `google.script.run`. لإظهار التقدم، يجب تقسيم العملية إلى مراحل وتخزين حالة التقدم في **CacheService**.

أضف دالة جديدة:
```js
function api_getBatchDownloadProgress(batchId) {
  var cache = CacheService.getScriptCache();
  var json = cache.get('batch_progress_' + batchId);
  return json ? JSON.parse(json) : { stage: 'unknown', percent: 0 };
}
```

عدّل `api_batchDownloadZip` لتقبل معرف الدفعة (batchId) وتقوم بتحديث CacheService في كل مرحلة:

1. **Stage 1: Finding documents**
   - `percent: 10`
   - `message: "Finding matching documents…"`
   - `filesFound: matchCount`

2. **Stage 2: Downloading from Drive**
   - `percent: 10 + (k / matchedDocs.length) * 60`
   - `message: "Downloading file X of Y…"`
   - `filesDownloaded: k`

3. **Stage 3: Building ZIP**
   - `percent: 80`
   - `message: "Building ZIP archive…"`

4. **Stage 4: Saving to Drive / Preparing download**
   - `percent: 95`
   - `message: "Preparing download link…"`

5. **Stage 5: Complete**
   - `percent: 100`
   - `message: "Done!"`
   - `downloadUrl: …` أو `base64: …` (حسب الحل الحالي)

استخدم:
```js
CacheService.getScriptCache().put('batch_progress_' + batchId, JSON.stringify(progressObj), 300); // 5 minutes
```

### 3. الواجهة الأمامية — التحقق من التقدم

في `Views._dcDownload` في `Script.html`:

1. عند الضغط على زر Download:
   - أظهر Progress UI.
   - ولّد `batchId` فريد (مثال: `Date.now() + '_' + Math.random()`).
   - ابدأ الاستدعاء `api_batchDownloadZip` مع `batchId`.
   - ابدأ **interval** كل 500ms لاستدعاء `api_getBatchDownloadProgress(batchId)` وتحديث Progress UI.

2. عند كل تحديث:
   - حدّث `percent` في شريط التقدم.
   - حدّث نص المرحلة (`stageMessage`).
   - حدّث الإحصائيات (`filesFound`, `filesDownloaded`).

3. عند اكتمال `api_batchDownloadZip`:
   - أوقف الـ interval.
   - أظهر رسالة النجاح.
   - ابدأ التحميل كالمعتاد.

4. عند الخطأ:
   - أوقف الـ interval.
   - أظهر رسالة الخطأ في Progress UI مع تفاصيل واضحة.
   - لا تُخفي Progress UI فورًا؛ اتركها حتى يقرأ المستخدم الخطأ.

### 4. التعامل مع الأخطاء

- إذا فشل `api_batchDownloadZip` بعد بدء التقدم، يجب أن تظهر رسالة الخطأ في Progress UI.
- إذا كان المستخدم يضغط Cancel، يجب:
  - إيقاف الـ interval.
  - إخفاء Progress UI.
  - إعادة تعيين الزر إلى حالته الأصلية.
  - (اختياري) إضافة دالة `api_cancelBatchDownload` لحذف الملف المؤقت إذا تم حفظه في Drive.

### 5. تجربة المستخدم (UX) المطلوبة

| المرحلة | النص المعروض | شريط التقدم |
|---------|-------------|------------|
| البداية | `"Preparing your download…"` | 5% |
| البحث عن الملفات | `"Found X documents for Y candidates"` | 10% |
| جلب الملفات | `"Downloading file 5 of 124…"` | 10% → 70% |
| ضغط الملفات | `"Building ZIP archive…"` | 80% |
| إعداد الرابط | `"Preparing download link…"` | 95% |
| اكتمال | `"Download started!"` | 100% |
| خطأ | `"Download failed: [رسالة الخطأ]"` | — |

---

## قيود

- لا تغيّر منطق الفلاتر أو اختيار المرشحين.
- لا تغيّر منطق مطابقة الوثائق (الـ Approved documents فقط).
- لا تغيّر الحد الأقصى 200 ملف.
- احرص على أن يكون الكود متوافقًا مع Apps Script V8 (لا ES modules).
- لا تضف مكتبات خارجية.
- إذا كان الحل الحالي يستخدم base64، استمر في استخدامه؛ إذا تم تطبيق Save to Drive، استخدم `downloadUrl`.

---

## ملاحظة تقنية مهمة

`google.script.run` نفسه لا يدعم streaming أو progress callbacks. لذلك الحل هو:
- **Polling** باستخدام `CacheService` لتخزين التقدم.
- **interval** في المتصفح يستدعي `api_getBatchDownloadProgress` كل 500ms.
- هذا يعطي المستخدم إحساسًا بالتقدم الحقيقي بدل الانتظار بدون معلومات.
