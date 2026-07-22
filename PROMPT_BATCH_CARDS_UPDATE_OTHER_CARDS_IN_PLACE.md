# PROMPT: جعل كروت Batch Numbers في Pipeline Overview تُحدّث باقي الكروت

## المتطلب النهائي

**لا يتم إضافة قسم جديد.**  
كروت **Batch 1, Batch 2, Batch 3, Batch 4** تبقى في قسم **Pipeline Overview** كما هي.

المطلوب فقط: عند الضغط على أي كرت من كروت الـ Batch، يتم تغيير أرقام باقي الكروت في الأقسام الثلاثة لتصبح واقعية ومتناسبة مع المرشحين في ذلك الـ Batch:

1. **📊 Pipeline Overview** (ما عدا كروت Batch نفسها)
2. **✅ Candidates WITH Document**
3. **❌ Candidates MISSING Document**

### مثال

- **Batch 3** = 23 مرشحًا.
- عند الضغط على كرت **Batch 3**:
  - **Booked Medical Examination** يتغير إلى **4** (عدد مرشحي Batch 3 الذين حالتهم Booked Medical Examination).
  - **Visa Pending** يتغير إلى **15**.
  - **Pending Medical** يتغير إلى **4**.
  - **Internal Candidates** يتغير إلى **11**.
  - **External Candidates** يتغير إلى **12**.
  - **Has Passport / Has Photo / ...** يتغير لتصبح فقط للمرشحين في Batch 3.
  - **Missing Passport / Missing Photo / ...** يتغير لتصبح فقط للمرشحين في Batch 3.
- عند الضغط على **Batch 3** مرة أخرى، تُلغى التصفية ويعود كل شيء للأرقام الافتراضية (جميع المرشحين).

---

## ملفات التعديل

- `Script.html` — الواجهة الأمامية (Frontend)
- لا تُعدّل `Code.js` أو أي ملفات أخرى.

---

## 1. موقع الكود الحالي

### 1.1 رسم كروت Pipeline Overview

في `Script.html` داخل `_refreshDashboard`:

```js
const batch1Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 1')).length;
const batch2Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 2')).length;
const batch3Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 3')).length;
// Batch 4 قد يكون غير موجود حاليًا — إذا لم يكن موجودًا، أضفه كما في المتطلبات السابقة.

document.getElementById('kpi-grid-status').innerHTML = [
  Views._kpiCard('Active Cases', k.activeCount ?? '--', '🏗️', 'blue', 'All non-closed cases', null),
  Views._kpiCard('Missing Documents', k.missingDocs ?? '--', '❗', 'orange', 'Incomplete document sets', null),
  Views._kpiCard('Pending Medical', k.pendingMedical ?? '--', '🩺', 'orange', 'Awaiting medical docs', { type: 'status', value: 'Pending Medical' }),
  Views._kpiCard('Booked Medical Exam', k.bookedMedical ?? '--', '📅', 'blue', 'Medical exam appointment set', { type: 'status', value: 'Booked a medical examination' }),
  Views._kpiCard('Docs Under Preparing', k.docsUnderPreparing ?? '--', '📝', 'orange', 'Documents being prepared', { type: 'status', value: 'Documents Under Preparing' }),
  Views._kpiCard('Visa Pending', k.visaPending ?? '--', '🛂', 'red', 'Awaiting visa issuance', { type: 'status', value: 'Visa Pending' }),
  Views._kpiCard('Visa Completed', k.visaCompleted ?? '--', '✅', 'green', 'Visa issued', { type: 'status', value: 'Visa Completed' }),
  Views._kpiCard('Mobilized', k.mobilized ?? '--', '✈️', 'purple', 'Successfully mobilized', { type: 'status', value: 'Mobilized' }),
  Views._kpiCard('Internal Candidates', internalCount, '🏢', 'blue', 'Internally recruited', { type: 'recruitmentType', value: 'Internal' }),
  Views._kpiCard('External Candidates', externalCount, '🌐', 'orange', 'Externally recruited', { type: 'recruitmentType', value: 'External' }),
  Views._kpiCard('Batch 1', batch1Count, '1️⃣', 'blue', 'Candidates in Batch 1', { type: 'batchNumber', value: 'Batch 1' }),
  Views._kpiCard('Batch 2', batch2Count, '2️⃣', 'purple', 'Candidates in Batch 2', { type: 'batchNumber', value: 'Batch 2' }),
  Views._kpiCard('Batch 3', batch3Count, '3️⃣', 'green', 'Candidates in Batch 3', { type: 'batchNumber', value: 'Batch 3' }),
  // Batch 4 يُضاف هنا إذا لم يكن موجودًا
].join('');
```

---

## 2. التعديلات المطلوبة

### 2.1 إضافة متغير حالة للـ Batch المختار

أضف في `Views`:

```js
Views._selectedBatchFilter = null;
```

### 2.2 إضافة كرت Batch 4 إذا لم يكن موجودًا

إذا لم يكن كرت Batch 4 موجودًا في `Pipeline Overview`، أضفه باستخدام `batch4Count`:

```js
const batch4Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 4')).length;
```

وأضف السطر:

```js
Views._kpiCard('Batch 4', batch4Count, '4️⃣', 'teal', 'Candidates in Batch 4', { type: 'batchNumber', value: 'Batch 4' }),
```

### 2.3 تعديل `_onKpiCardClick` للتعامل مع كروت Batch بشكل خاص

حاليًا، النقر على أي كرت يُضيفه إلى `Views._dashboardSelectedCards` ويُطبّق فلتر على الجدول.  
لكروت Batch، المطلوب هو أمران إضافيان:

1. تخزين الـ Batch المختار في `Views._selectedBatchFilter`.
2. إعادة حساب وإعادة رسم أقسام Pipeline Overview / Candidates WITH Document / Candidates MISSING Document بناءً على الـ Batch المختار.

#### أ. عند النقر على كرت Batch:

```js
// داخل _onKpiCardClick أو معالج خاص للـ Batch cards
const type = cardEl.dataset.filterType;
const value = cardEl.dataset.filterValue;

if (type === 'batchNumber') {
  if (Views._selectedBatchFilter === value) {
    // إلغاء التحديد
    Views._selectedBatchFilter = null;
  } else {
    Views._selectedBatchFilter = value;
  }

  // إعادة رسم الأقسام الثلاثة
  Views._renderKpiSectionsWithBatchFilter();
}
```

> ملاحظة: يمكن دمج هذا المنطق داخل `_onKpiCardClick` الحالية أو إضافة معالج منفصل لكروت Batch. يُفضّل دمجه مع `_onKpiCardClick` لضمان تناسق التحديد والتظليل.

### 2.4 دالة إعادة رسم الأقسام بناءً على الـ Batch

أنشئ دالة:

```js
_renderKpiSectionsWithBatchFilter() {
  const allCands = App.state.candidates || [];
  const baseCands = Views._selectedBatchFilter
    ? allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch(Views._selectedBatchFilter))
    : allCands;

  const k = Views._computeDashboardKpis(baseCands, App.state.docCompleteness);

  // ── رسم Pipeline Overview (مع الحفاظ على كروت Batch) ──
  const batch1Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 1')).length;
  const batch2Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 2')).length;
  const batch3Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 3')).length;
  const batch4Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 4')).length;

  const internalCount = baseCands.filter(c => String(c.Recruitment_Type || '').trim() === 'Internal').length;
  const externalCount = baseCands.filter(c => String(c.Recruitment_Type || '').trim() === 'External').length;

  document.getElementById('kpi-grid-status').innerHTML = [
    Views._kpiCard('Active Cases', k.activeCount ?? '--', '🏗️', 'blue', 'All non-closed cases', null),
    Views._kpiCard('Missing Documents', k.missingDocs ?? '--', '❗', 'orange', 'Incomplete document sets', null),
    Views._kpiCard('Pending Medical', k.pendingMedical ?? '--', '🩺', 'orange', 'Awaiting medical docs', { type: 'status', value: 'Pending Medical' }),
    Views._kpiCard('Booked Medical Exam', k.bookedMedical ?? '--', '📅', 'blue', 'Medical exam appointment set', { type: 'status', value: 'Booked a medical examination' }),
    Views._kpiCard('Docs Under Preparing', k.docsUnderPreparing ?? '--', '📝', 'orange', 'Documents being prepared', { type: 'status', value: 'Documents Under Preparing' }),
    Views._kpiCard('Visa Pending', k.visaPending ?? '--', '🛂', 'red', 'Awaiting visa issuance', { type: 'status', value: 'Visa Pending' }),
    Views._kpiCard('Visa Completed', k.visaCompleted ?? '--', '✅', 'green', 'Visa issued', { type: 'status', value: 'Visa Completed' }),
    Views._kpiCard('Mobilized', k.mobilized ?? '--', '✈️', 'purple', 'Successfully mobilized', { type: 'status', value: 'Mobilized' }),
    Views._kpiCard('Internal Candidates', internalCount, '🏢', 'blue', 'Internally recruited', { type: 'recruitmentType', value: 'Internal' }),
    Views._kpiCard('External Candidates', externalCount, '🌐', 'orange', 'Externally recruited', { type: 'recruitmentType', value: 'External' }),
    Views._kpiCard('Batch 1', batch1Count, '1️⃣', 'blue', 'Candidates in Batch 1', { type: 'batchNumber', value: 'Batch 1' }),
    Views._kpiCard('Batch 2', batch2Count, '2️⃣', 'purple', 'Candidates in Batch 2', { type: 'batchNumber', value: 'Batch 2' }),
    Views._kpiCard('Batch 3', batch3Count, '3️⃣', 'green', 'Candidates in Batch 3', { type: 'batchNumber', value: 'Batch 3' }),
    Views._kpiCard('Batch 4', batch4Count, '4️⃣', 'teal', 'Candidates in Batch 4', { type: 'batchNumber', value: 'Batch 4' }),
  ].join('');

  // ── رسم Candidates WITH Document ──
  document.getElementById('kpi-grid-has').innerHTML = [
    Views._kpiCard('Has Passport', k.hasPassport ?? '--', '🛂', 'green', 'Passport uploaded & valid', { type: 'hasDoc', value: 'Passport' }),
    Views._kpiCard('Has Photo', k.hasPhoto ?? '--', '📷', 'green', 'Photo uploaded & valid', { type: 'hasDoc', value: 'Photo' }),
    Views._kpiCard('Has Academic Cert.', k.hasAcademicCert ?? '--', '🎓', 'green', 'Academic certificate uploaded', { type: 'hasDoc', value: 'Academic Certificate' }),
    Views._kpiCard('Has Medical Exam', k.hasMedicalExam ?? '--', '🩺', 'green', 'Medical examination uploaded', { type: 'hasDoc', value: 'Medical Examination' }),
    Views._kpiCard('Has Medical Analysis', k.hasMedicalAnalysis ?? '--', '🧪', 'green', 'Medical analysis uploaded', { type: 'hasDoc', value: 'Medical Analysis' }),
    Views._kpiCard('Has Visa', k.hasVisa ?? '--', '🌍', 'green', 'Visa document uploaded', { type: 'hasDoc', value: 'Visa' }),
    Views._kpiCard('Has CV', k.hasCV ?? '--', '📄', 'green', 'CV uploaded', { type: 'hasDoc', value: 'CV' }),
  ].join('');

  // ── رسم Candidates MISSING Document ──
  document.getElementById('kpi-grid-missing').innerHTML = [
    Views._kpiCard('Missing Passport', k.missingPassport ?? '--', '🛂', 'red', 'No valid passport', { type: 'missingDoc', value: 'Passport' }),
    Views._kpiCard('Missing Photo', k.missingPhoto ?? '--', '📷', 'red', 'No valid photo', { type: 'missingDoc', value: 'Photo' }),
    Views._kpiCard('Missing Academic Cert.', k.missingAcademicCert ?? '--', '🎓', 'red', 'No academic certificate', { type: 'missingDoc', value: 'Academic Certificate' }),
    Views._kpiCard('Missing Medical Exam', k.missingMedicalExam ?? '--', '🩺', 'red', 'No medical examination', { type: 'missingDoc', value: 'Medical Examination' }),
    Views._kpiCard('Missing Medical Analysis', k.missingMedicalAnalysis ?? '--', '🧪', 'red', 'No medical analysis', { type: 'missingDoc', value: 'Medical Analysis' }),
    Views._kpiCard('Missing Visa', k.missingVisa ?? '--', '🌍', 'red', 'No visa document', { type: 'missingDoc', value: 'Visa' }),
    Views._kpiCard('Missing CV', k.missingCV ?? '--', '📄', 'red', 'No CV', { type: 'missingDoc', value: 'CV' }),
  ].join('');

  // إعادة تطبيق التحديد البصري على كرت Batch المختار
  if (Views._selectedBatchFilter) {
    const safeValue = Views._selectedBatchFilter.replace(/\s+/g, '_');
    const el = document.getElementById(`kpi-card-batchNumber-${safeValue}`);
    if (el) el.classList.add('kpi-card--selected');
  }
}
```

### 2.5 دالة حساب KPIs على مجموعة مرشحين

استخرج الحسابات من `api_getDashboardData` (Code.js) إلى دالة Frontend عامة:

```js
_computeDashboardKpis(candidates, docCompleteness) {
  const MISSING_DOC_STATUSES = new Set([
    'New Candidate', 'Documents Requested', 'Documents Under Preparing',
    'Pending Passport', 'Pending Photo', 'Pending Academic Certificate',
    'Pending Medical', 'Booked a medical examination'
  ]);

  let activeCount = 0, missingDocs = 0, visaPending = 0, visaCompleted = 0;
  let mobilized = 0, pendingMedical = 0, bookedMedical = 0, docsUnderPreparing = 0;

  candidates.forEach(c => {
    const status = (c.CurrentStatus || '').trim();
    if (status !== 'Closed') activeCount++;
    if (MISSING_DOC_STATUSES.has(status)) missingDocs++;
    if (status === 'Visa Pending') visaPending++;
    if (status === 'Visa Completed') visaCompleted++;
    if (status === 'Mobilized') mobilized++;
    if (status === 'Pending Medical') pendingMedical++;
    if (status === 'Booked a medical examination') bookedMedical++;
    if (status === 'Documents Under Preparing') docsUnderPreparing++;
  });

  const REQUIRED_DOCS = ['Passport', 'Photo', 'Academic Certificate', 'Medical Examination', 'Medical Analysis', 'Visa', 'CV'];
  const hasCount = {}, missingCount = {};
  REQUIRED_DOCS.forEach(dt => { hasCount[dt] = 0; missingCount[dt] = 0; });

  candidates.forEach(c => {
    const comp = docCompleteness && docCompleteness[c.CandidateID];
    if (comp) {
      REQUIRED_DOCS.forEach(dt => {
        if (comp.presentDocs.includes(dt)) hasCount[dt]++;
        else missingCount[dt]++;
      });
    } else {
      REQUIRED_DOCS.forEach(dt => missingCount[dt]++);
    }
  });

  return {
    activeCount, missingDocs, visaPending, visaCompleted, mobilized,
    pendingMedical, bookedMedical, docsUnderPreparing,
    hasPassport: hasCount['Passport'], hasPhoto: hasCount['Photo'],
    hasAcademicCert: hasCount['Academic Certificate'], hasMedicalExam: hasCount['Medical Examination'],
    hasMedicalAnalysis: hasCount['Medical Analysis'], hasVisa: hasCount['Visa'], hasCV: hasCount['CV'],
    missingPassport: missingCount['Passport'], missingPhoto: missingCount['Photo'],
    missingAcademicCert: missingCount['Academic Certificate'], missingMedicalExam: missingCount['Medical Examination'],
    missingMedicalAnalysis: missingCount['Medical Analysis'], missingVisa: missingCount['Visa'], missingCV: missingCount['CV']
  };
}
```

### 2.6 عدم تغيير أرقام كروت Batch نفسها

كروت Batch 1/2/3/4 يجب أن تظل دائمًا تُظهر عدد **جميع** المرشحين في ذلك الـ Batch (وليس فقط المفلترين).  
هذا مهم لأن المستخدم يحتاج إلى رؤية حجم كل Batch بغض النظر عن الفلتر المختار.

### 2.7 تحديث الجدول أيضًا

عند اختيار Batch، يجب أن يتصفّح جدول المرشحين ليعرض فقط مرشحي ذلك الـ Batch. يمكن استخدام نفس منطق الفلترة الحالية:

```js
App.setState({ filteredCandidates: baseCands });
Views._applyDashboardAllFilters();
```

أو إضافة فلتر Batch داخل `_applyDashboardAllFilters` بحيث يأخذ `Views._selectedBatchFilter` في الحسبان.

---

## 3. التعامل مع Clear Filters

عند الضغط على **Clear** أو **Clear All Filters**، يجب:
- إلغاء `Views._selectedBatchFilter = null`.
- إعادة رسم الأقسام باستخدام جميع المرشحين.
- إزالة التحديد البصري من كروت Batch.

تحديث `_clearDashboardAllFilters` و `_clearDashboardFilter` ليشملا `Views._selectedBatchFilter = null`.

---

## 4. قيود

- لا يتم إضافة قسم جديد للـ Batch.
- كروت Batch تبقى في **Pipeline Overview**.
- لا تغيّر `api_getDashboardData` في `Code.js`.
- لا تغيّر بنية البيانات أو الـ Sheets.
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- لا تغيّر سلوك Clear Filters بشكل غير متوقع.
- لا تغيّر كروت Follow-up Calendar.

---

## 5. معايير النجاح

بعد التعديل:
- كروت Batch 1/2/3/4 تبقى في **Pipeline Overview**.
- عند الضغط على كرت Batch، تتغير أرقام باقي الكروت في Pipeline Overview لتُظهر فقط مرشحي ذلك الـ Batch.
- تتغير أرقام كروت **Candidates WITH Document**.
- تتغير أرقام كروت **Candidates MISSING Document**.
- كروت Batch نفسها لا تتغير (تظل تُظهر العدد الإجمالي لكل Batch).
- عند الضغط على نفس الكرت مرة أخرى، يُلغى الفلتر ويعود كل شيء للأرقام الافتراضية.
- جدول المرشحين يتصفّح بناءً على الـ Batch المختار.
- Clear Filters يُلغي اختيار الـ Batch أيضًا.
- لا يحدث خطأ أو تغيير غير متوقع في باقي التطبيق.
