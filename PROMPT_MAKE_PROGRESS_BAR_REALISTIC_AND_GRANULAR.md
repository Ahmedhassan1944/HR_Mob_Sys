# PROMPT: جعل شريط التقدم واقعيًا وتدريجيًا — Documents Center

## الملاحظة الحالية

التنفيذ السابق يعمل بشكل صحيح، لكن هناك مشكلة في تجربة المستخدم:

- الشريط يتحرك بشكل طبيعي حتى **80%**.
- عند **80%** يتوقف لفترة طويلة بدون حركة.
- فجأة يقفز إلى **100%** ويبدأ التحميل.

هذا يعطي إحساسًا بأن التطبيق "علق" أو "بطيء"، رغم أن العملية تسير بشكل طبيعي.

## المطلوب

إعادة تصميم حساب نسبة التقدم لتكون **تدريجية وواقعية**:
- تتحرك بزيادات صغيرة (0, 3, 5, 9, 16, 19, 22, 28, 33, 39, 47, 56, ...).
- لا تقفز فجأة من 80% إلى 100%.
- تكون النسبة متناسبة مع حجم العمل الفعلي المنجز.
- لا يظهر المستخدم نسبة ثابتة لفترة طويلة.

---

## ملفات التعديل

- `DocumentsCenter.js` — الخلفية (backend)
- `Script.html` — الواجهة الأمامية (frontend)
- `Styles.html` — إذا كانت الأنماط منفصلة

---

## 1. المشكلة التقنية الجذرية

في التنفيذ الحالي، غالبًا يتم تقسيم النسبة إلى مراحل ثابتة:
- 10% عند البحث عن الملفات
- 10% → 70% عند تحميل الملفات
- 80% عند بناء ZIP
- 95% عند إعداد الرابط
- 100% عند الانتهاء

المشكلة: مرحلة **بناء ZIP** و**إعداد الرابط** قد تكون في الواقع **أكثر من 30% من الوقت الإجمالي**، لكنها تظهر بنسبة ضيقة (80% → 95%). وهذا يُنتج ظاهرة "التوقف عند 80%".

---

## 2. الحل — تقسيم النسبة حسب الوزن الحقيقي للعمل

يجب ألا تكون المراحل متساوية. بدلًا من ذلك، وزّع النسبة (0% → 100%) حسب المدة التقديرية لكل عملية:

| المرحلة | الوزن التقديري | النسبة المخصصة | التفاصيل |
|--------|---------------|---------------|----------|
| البحث والتعداد | 5% | 0% → 5% | قراءة بيانات Sheets + Count |
| تحميل الملفات من Drive | 60% | 5% → 65% | أهم مرحلة زمنية |
| بناء ZIP | 20% | 65% → 85% | Utilities.zip يأخذ وقتًا |
| حفظ ZIP في Drive | 8% | 85% → 93% | DriveApp.createFile |
| إعداد الرابط والتنظيف | 5% | 93% → 98% | setSharing + trigger |
| إنهاء وتحديث الواجهة | 2% | 98% → 100% | رسالة النجاح |

---

## 3. تعديلات الخلفية — `DocumentsCenter.js`

### 3.1 دالة مساعدة لتحديث التقدم

أضف دالة داخل `api_batchDownloadZip` (أو كدالة مساعدة) لتخزين التقدم في CacheService:

```js
function updateProgress_(batchId, progress) {
  try {
    CacheService.getScriptCache().put(
      'batch_progress_' + batchId,
      JSON.stringify(progress),
      300 // 5 minutes
    );
  } catch (e) {
    Logger.log('Progress update failed: ' + e.message);
  }
}
```

### 3.2 حساب التقدم داخل `api_batchDownloadZip`

استبدل التحديثات الثابتة بـ حساب ديناميكي:

```js
function api_batchDownloadZip(candidateIdsJson, docTypesJson, batchId) {
  try {
    // 1. البحث والتعداد → 0% إلى 5%
    updateProgress_(batchId, {
      stage: 'scanning',
      message: 'Finding matching documents…',
      percent: 2,
      filesFound: 0,
      filesDownloaded: 0
    });

    // ... قراءة Sheets وبناء matchedDocs ...

    updateProgress_(batchId, {
      stage: 'scanning',
      message: 'Found ' + matchCount + ' documents for ' + candidateIds.length + ' candidates',
      percent: 5,
      filesFound: matchCount,
      filesDownloaded: 0
    });

    // 2. تحميل الملفات من Drive → 5% إلى 65% (60% إجمالي)
    var totalFiles = matchedDocs.length;
    var blobs = [];
    var uniqueCandidatesFound = {};

    for (var k = 0; k < totalFiles; k++) {
      var doc = matchedDocs[k];
      // ... جلب الملف ...

      // حساب النسبة داخل هذه المرحلة: 5% + (k / totalFiles) * 60%
      var downloadPercent = Math.round(5 + ((k + 1) / totalFiles) * 60);

      updateProgress_(batchId, {
        stage: 'downloading',
        message: 'Downloading file ' + (k + 1) + ' of ' + totalFiles + '…',
        percent: downloadPercent,
        filesFound: totalFiles,
        filesDownloaded: k + 1
      });
    }

    // 3. بناء ZIP → 65% إلى 85% (20% إجمالي)
    updateProgress_(batchId, {
      stage: 'zipping',
      message: 'Building ZIP archive…',
      percent: 70,
      filesFound: totalFiles,
      filesDownloaded: totalFiles
    });

    var zip = Utilities.zip(blobs, zipName);

    updateProgress_(batchId, {
      stage: 'zipping',
      message: 'ZIP archive ready',
      percent: 85,
      filesFound: totalFiles,
      filesDownloaded: totalFiles
    });

    // 4. حفظ ZIP في Drive → 85% إلى 93% (8% إجمالي)
    updateProgress_(batchId, {
      stage: 'saving',
      message: 'Saving ZIP to Drive…',
      percent: 88,
      filesFound: totalFiles,
      filesDownloaded: totalFiles
    });

    var savedFile = DriveApp.createFile(zip);

    updateProgress_(batchId, {
      stage: 'saving',
      message: 'ZIP saved to Drive',
      percent: 93,
      filesFound: totalFiles,
      filesDownloaded: totalFiles
    });

    // 5. إعداد الرابط والتنظيف → 93% إلى 98%
    savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    updateProgress_(batchId, {
      stage: 'finalizing',
      message: 'Preparing download link…',
      percent: 98,
      filesFound: totalFiles,
      filesDownloaded: totalFiles
    });

    // 6. إنهاء → 100%
    updateProgress_(batchId, {
      stage: 'complete',
      message: 'Download ready!',
      percent: 100,
      filesFound: totalFiles,
      filesDownloaded: totalFiles
    });

    return {
      success: true,
      downloadUrl: savedFile.getDownloadUrl(),
      filename: zipName,
      fileCount: blobs.length,
      candidateCount: Object.keys(uniqueCandidatesFound).length
    };

  } catch (e) {
    updateProgress_(batchId, {
      stage: 'error',
      message: 'Download failed: ' + e.message,
      percent: 0,
      filesFound: 0,
      filesDownloaded: 0
    });
    return { success: false, error: e.message };
  }
}
```

---

## 4. تعديلات الواجهة الأمامية — `Script.html`

### 4.1 تنعيم الحركة (Smooth Animation)

بدلًا من تحديث `width` فورًا، استخدم انتقال CSS لجعل الحركة سلسة:

```css
.dc-progress-fill {
  transition: width 0.4s ease-out;
}
```

### 4.2 عدم السماح بالقفز الكبير

في الـ frontend، عند استلام نسبة جديدة من الـ backend، لا تُظهر القفزة فورًا. بدلًا من ذلك، تحرك الشريط بشكل تدريجي:

```js
function animateProgress(targetPercent) {
  const current = parseFloat(progressBar.style.width) || 0;
  const step = (targetPercent - current) * 0.2; // 20% من الفرق في كل frame
  if (Math.abs(step) < 0.5) {
    progressBar.style.width = targetPercent + '%';
  } else {
    progressBar.style.width = (current + step) + '%';
    requestAnimationFrame(() => animateProgress(targetPercent));
  }
}
```

### 4.3 تحديث النص والإحصائيات

تأكد من تحديث:
- نص المرحلة (`message`).
- عدد الملفات المحملة (`filesDownloaded of filesFound`).
- حجم ZIP تقريبيًا (اختياري).

### 4.4 معالجة القفزات

إذا كانت النسبة الجديدة أقل من النسبة الحالية (نادرًا ما يحدث)، لا تتراجع. احتفظ بالحد الأقصى:

```js
const newPercent = Math.max(currentPercent, progress.percent);
```

---

## 5. معالجة المراحل الثقيلة (ZIP + Save)

### المشكلة
مرحلة `Utilities.zip(blobs)` و `DriveApp.createFile(zip)` هي عمليات monolithic — لا يمكن تقسيمها داخل Google Apps Script.

### الحلول المقترحة

#### أ. استخدام وزن زمني أكبر
لا تُعطِ هذه المراحل 5% فقط. امنحها **20% إلى 30%** من النسبة الإجمالية كما في الجدول أعلاه.

#### ب. استخدام "fake progress" محسوب زمنيًا (اختياري لكن فعّال)
إذا كانت مرحلة ZIP تستغرق وقتًا غير معروف، يمكن استخدام تقدم تدريجي على مدار 2-3 ثوانٍ:

```js
// قبل Utilities.zip
var zipStartPercent = 65;
var zipTargetPercent = 85;
var zipStartTime = Date.now();
var fakeDuration = 2000; // 2 seconds

while (Date.now() - zipStartTime < fakeDuration) {
  var elapsed = Date.now() - zipStartTime;
  var fakePercent = zipStartPercent + (elapsed / fakeDuration) * (zipTargetPercent - zipStartPercent);
  updateProgress_(batchId, {
    stage: 'zipping',
    message: 'Building ZIP archive…',
    percent: Math.round(fakePercent),
    filesFound: totalFiles,
    filesDownloaded: totalFiles
  });
  Utilities.sleep(100);
}

var zip = Utilities.zip(blobs, zipName);
```

> ⚠️ **تحذير:** هذا يُضيف وقتًا إضافيًا. استخدمه فقط إذا كانت المرحلة الحقيقية أسرع من توقع المستخدم. إذا كانت المرحلة بطيئة بالفعل، فالتقدم الحقيقي سيكون أفضل.

#### ج. حساب تقدم ZIP من حجم الملفات
إذا كان حجم الملفات معروفًا، يمكن تقدير وقت ZIP:
- اجمع حجم كل blob.
- امنح النسبة للمرحلة بناءً على حجم المجموع.
- مثال: إذا كان المجموع 50 MB، امنح مرحلة ZIP 30% بدل 20%.

---

## 6. أمثلة على النسب المتوقعة

### حالة صغيرة: 10 مرشحين × 4 ملفات = 40 ملف

| زمن تقريبي | المرحلة | النسبة |
|------------|--------|--------|
| 0.5s | Scanning | 0% → 5% |
| 4s | Downloading | 5% → 65% (تقريبًا 1.5% لكل ملف) |
| 1.5s | Zipping | 65% → 85% |
| 0.5s | Saving | 85% → 93% |
| 0.3s | Finalizing | 93% → 100% |

### حالة كبيرة: 31 مرشح × 4 ملفات = 124 ملف

| زمن تقريبي | المرحلة | النسبة |
|------------|--------|--------|
| 0.5s | Scanning | 0% → 5% |
| 12s | Downloading | 5% → 65% (تقريبًا 0.48% لكل ملف) |
| 4s | Zipping | 65% → 85% |
| 1s | Saving | 85% → 93% |
| 0.5s | Finalizing | 93% → 100% |

في الحالتين، لا يوجد توقف طويل عند نسبة واحدة.

---

## 7. قيود

- لا تغيّر منطق الفلاتر أو اختيار المرشحين.
- لا تغيّر منطق مطابقة الوثائق.
- لا تغيّر الحد الأقصى 200 ملف.
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- لا تُضيف "fake progress" يطيل الوقت الحقيقي.
- الهدف: **تقسيم النسبة بشكل واقعي** وليس إضافة تأخيرات.

---

## 8. معايير النجاح

بعد التعديل، يجب أن يكون الشريط كالتالي:

- 0% → 5%: خلال البحث عن الملفات.
- 5% → 65%: يتحرك بثبات أثناء تحميل الملفات من Drive.
- 65% → 85%: يتحرك أثناء بناء ZIP.
- 85% → 93%: يتحرك أثناء الحفظ في Drive.
- 93% → 100%: يتحرك بسرعة أثناء الإنهاء.

لا يجب أن يتوقف الشريط عند نسبة واحدة لأكثر من 2 ثوانٍ.
