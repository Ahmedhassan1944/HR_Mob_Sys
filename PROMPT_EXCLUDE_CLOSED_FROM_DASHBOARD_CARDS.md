# PROMPT: استبعاد المرشحين ذوي الحالة "Closed" من كروت الـ Dashboard

## المشكلة

حاليًا، كروت الـ Dashboard في الأقسام التالية تحسب **جميع المرشحين** بما في ذلك أصحاب الحالة **"Closed"**:

1. **📊 Pipeline Overview**
2. **✅ Candidates WITH Document**
3. **❌ Candidates MISSING Document**

المدير يرغب في أن تُحسب فقط المرشحين **الموجودين حاليًا** معه (غير Closed). المرشحين الذين سافروا أو انتهت إجراءاتهم وصاروا Closed يجب استبعادهم من هذه الكروت.

> ملاحظة: المستخدم يمكنه فعليًا استبعاد Closed يدويًا من فلاتر الـ Dashboard، لكن الكروت الرئيسية لا تزال تُحسبهم بشكل افتراضي. الهدف هو أن تكون الأرقام الافتراضية صحيحة من الخلفية.

---

## ملفات التعديل

- `Code.js` — الخلفية (`api_getDashboardData`)
- `Script.html` — الواجهة الأمامية (اختياري: إذا لزم تحديث عناوين الكروت أو رسائل توضيحية)
- لا تُعدّل أي شيء في قسم **📅 Follow-up Calendar** (إذا كانت الأحداث مرتبطة بمرشحين Closed، لا يزال من المنطقي إظهارها أو يمكن تركها كما هي حسب تقديرك).

---

## 1. التعديل المطلوب في الخلفية — `Code.js`

في دالة `api_getDashboardData`، حاليًا:
- يتم قراءة جميع المرشحين من `tbl_Candidates`.
- يتم قراءة جميع الوثائق من `tbl_Documents`.
- يتم حساب الأرقام على أساس **جميع المرشحين**.

المطلوب: **قبل أي حساب**، استبعد المرشحين ذوي الحالة **"Closed"**.

### الخطوات التفصيلية:

1. بعد قراءة بيانات المرشحين، أنشئ قائمة بمعرفات المرشحين النشطين فقط (غير Closed):
   ```js
   const activeCandidates = candidates.filter(c => {
     const status = (c.CurrentStatus || '').trim();
     return status !== 'Closed';
   });
   ```

2. استخدم `activeCandidates` بدل `candidates` في جميع حسابات الكروت الثلاثة:
   - **Pipeline Overview**: جميع العدادات (activeCount, missingDocs, visaPending, visaCompleted, mobilized, pendingMedical, bookedMedical, docsUnderPreparing).
   - **Candidates WITH Document**: جميع `hasCount` (hasPassport, hasPhoto, hasAcademicCert, hasMedicalExam, hasMedicalAnalysis, hasVisa, hasCV).
   - **Candidates MISSING Document**: جميع `missingCount` (missingPassport, missingPhoto, missingAcademicCert, missingMedicalExam, missingMedicalAnalysis, missingVisa, missingCV).

3. **Pending Validation**: قرّر ما إذا كنت ستستبعد Closed هنا أيضًا. المرشح المغلق لا يحتاج إلى مراجعة وثائق، لذا استبعده أيضًا.
   ```js
   const activeCandidateIds = new Set(activeCandidates.map(c => c.CandidateID));
   // استخدم هذا الـ Set للتأكد من أن المرشح المغلق لا يُحسب في pendingValidation
   ```

4. **Calendar-based counters**: لا تُعدّل هذه الأقسام إلا إذا رغبت في استبعاد أحداث المرشحين المغلقين. المستخدم لم يطلب ذلك، لذا اتركها كما هي.

### مثال على التعديل

#### الحالي (Document-based):
```js
candidates.forEach(c => { candDocMap[c.CandidateID] = new Set(); });
// ...
candidates.forEach(cand => {
  const myDocs = candDocMap[cand.CandidateID] || new Set();
  REQUIRED_DOCS.forEach(dt => {
    if (myDocs.has(dt)) hasCount[dt]++;
    else                missingCount[dt]++;
  });
});
```

#### المطلوب:
```js
const activeCandidates = candidates.filter(c => {
  const status = (c.CurrentStatus || '').trim();
  return status !== 'Closed';
});

activeCandidates.forEach(c => { candDocMap[c.CandidateID] = new Set(); });
// ...
activeCandidates.forEach(cand => {
  const myDocs = candDocMap[cand.CandidateID] || new Set();
  REQUIRED_DOCS.forEach(dt => {
    if (myDocs.has(dt)) hasCount[dt]++;
    else                missingCount[dt]++;
  });
});
```

ويجب استخدام `activeCandidates` بدل `candidates` في حسابات الـ Pipeline Overview أيضًا.

---

## 2. التعديلات المطلوبة في الواجهة الأمامية — `Script.html` (اختياري لكن مُفضّل)

إذا لم يكن هناك توضيح حالي، يُفضّل إضافة مؤشر صغير في الـ Dashboard يوضح أن الأرقام لا تشمل Closed:

- **خيار 1**: تغيير عنوان صفحة الـ Dashboard أو إضافة نص توضيحي تحت العنوان:
  ```
  Live overview of active mobilization cases — excludes Closed candidates
  ```

- **خيار 2**: إضافة Tooltip أو subtitle تحت كل قسم:
  ```
  📊 Pipeline Overview (excludes Closed)
  ```

- **خيار 3**: ترك الواجهة كما هي بدون تغيير — إذا كان المستخدم لا يريد أي تعديل واجهة.

يجب أن تكون التعديلات بسيطة ولا تُغيّر الشكل العام.

---

## 3. التأثيرات المتوقعة على الأرقام

بعد التعديل:
- **activeCount** سيقل بمقدار عدد المرشحين المغلقين.
- **missingDocs** سيقل لأن المرشحين المغلقين لا يُحسبون في الوثائق المفقودة.
- **visaPending / visaCompleted / mobilized** قد يتغير حسب توزيع الحالات.
- **hasPassport / hasPhoto / ...** ستحسب فقط للمرشحين النشطين.
- **missingPassport / missingPhoto / ...** ستحسب فقط للمرشحين النشطين.
- **pendingValidation** سيقل لأن المرشح المغلق لا يُحسب في الوثائق بانتظار المراجعة.

---

## 4. قيود

- لا تغيّر منطق الفلاتر الموجود في الـ Dashboard.
- لا تغيّر قسم **Follow-up Calendar** (ما لم يُطلب صراحة).
- لا تغيّر قسم Candidates Table الموجود أسفل الـ Dashboard (إذا كان يعرض Closed، يظل كما هو).
- لا تُضيف مكتبات خارجية.
- لا تغيّر بنية البيانات أو الـ Sheets.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- استخدم `(c.CurrentStatus || '').trim() !== 'Closed'` للمقارنة لتجنب المسافات الفارغة.

---

## 5. معايير النجاح

بعد التعديل:
- كل كروت **Pipeline Overview** لا تحسب مرشحي Closed.
- كل كروت **Candidates WITH Document** لا تحسب مرشحي Closed.
- كل كروت **Candidates MISSING Document** لا تحسب مرشحي Closed.
- الأرقام تتغير بشكل فوري بعد إعادة تحميل الـ Dashboard.
- لا يحدث خطأ أو تغيير غير متوقع في باقي كروت الـ Dashboard.
