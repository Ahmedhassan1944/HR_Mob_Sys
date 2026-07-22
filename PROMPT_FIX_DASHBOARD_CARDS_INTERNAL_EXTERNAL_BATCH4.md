# PROMPT: تعديل كروت Dashboard — استبعاد Closed، إزالة Missing Documents، إضافة Batch 4

## المتطلبات الثلاثة

### 1. استبعاد المرشحين المغلقين من كروت Internal/External Candidates

كروت **Internal Candidates** و **External Candidates** في قسم **Pipeline Overview** لا تزال تحسب جميع المرشحين، بما في ذلك أصحاب الحالة **"Closed"**. يجب أن تحسب فقط المرشحين غير المغلقين.

### 2. إزالة كرت Missing Documents من Pipeline Overview

يوجد كرت باسم **"Missing Documents"** في قسم **Pipeline Overview** (بجانب Active Cases، Pending Medical، Visa Pending، إلخ). يجب إزالة هذا الكرت من هذا القسم تمامًا.

> ملاحظة: كروت **❌ Candidates MISSING Document** (القسم الثالث) تبقى كما هي. المطلوب فقط إزالة الكرت من **Pipeline Overview**.

### 3. إضافة كرت Batch 4 في Pipeline Overview

يجب إضافة كرت جديد باسم **"Batch 4"** في قسم **Pipeline Overview**، يُحسب عدد المرشحين الموجودين في **Batch 4**. الكرت يجب أن يتبع نفس نمط كروت Batch 1 / Batch 2 / Batch 3 الموجودة حاليًا.

---

## ملفات التعديل

- `Script.html` — الواجهة الأمامية (Frontend)
- لا تُعدّل `Code.js` لهذه المتطلبات (الحسابات تتم في الواجهة الأمامية حاليًا).
- لا تُعدّل أي ملفات أخرى.

---

## 1. موقع الكود الحالي

في `Script.html`، داخل دالة `dashboard` (قسم Status-based cards):

```js
const allCands = candsRes.data || [];
const internalCount = allCands.filter(c => String(c.Recruitment_Type || '').trim() === 'Internal').length;
const externalCount = allCands.filter(c => String(c.Recruitment_Type || '').trim() === 'External').length;
const batch1Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 1')).length;
const batch2Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 2')).length;
const batch3Count = allCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 3')).length;

document.getElementById('kpi-grid-status').innerHTML = [
  Views._kpiCard('Active Cases', k.activeCount ?? '--', '🏗️', 'blue', 'All non-closed cases', null),
  Views._kpiCard('Missing Documents', k.missingDocs ?? '--', '❗', 'orange', 'Incomplete document sets', null),
  Views._kpiCard('Pending Medical', k.pendingMedical ?? '--', '🩺', 'orange', 'Awaiting medical docs', { type: 'status', value: 'Pending Medical' }),
  // ...
  Views._kpiCard('Internal Candidates', internalCount, '🏢', 'blue',   'Internally recruited', { type: 'recruitmentType', value: 'Internal' }),
  Views._kpiCard('External Candidates', externalCount, '🌐', 'orange', 'Externally recruited',  { type: 'recruitmentType', value: 'External' }),
  Views._kpiCard('Batch 1', batch1Count, '1️⃣', 'blue',   'Candidates in Batch 1', { type: 'batchNumber', value: 'Batch 1' }),
  Views._kpiCard('Batch 2', batch2Count, '2️⃣', 'purple', 'Candidates in Batch 2', { type: 'batchNumber', value: 'Batch 2' }),
  Views._kpiCard('Batch 3', batch3Count, '3️⃣', 'green',  'Candidates in Batch 3', { type: 'batchNumber', value: 'Batch 3' }),
].join('');
```

---

## 2. التعديلات المطلوبة في `Script.html`

### 2.1 إنشاء قائمة المرشحين النشطين (غير المغلقين)

أضف قائمة مساعدة تُستخدم في جميع الحسابات التي يجب ألا تشمل Closed:

```js
const allCands = candsRes.data || [];
const activeCands = allCands.filter(c => String(c.CurrentStatus || '').trim() !== 'Closed');
```

### 2.2 تحديث حسابات Internal / External

استبدل `allCands` بـ `activeCands` في حسابات Internal و External:

```js
const internalCount = activeCands.filter(c => String(c.Recruitment_Type || '').trim() === 'Internal').length;
const externalCount = activeCands.filter(c => String(c.Recruitment_Type || '').trim() === 'External').length;
```

### 2.3 تحديث حسابات Batch 1 / 2 / 3 / 4

استخدم `activeCands` بدل `allCands` في حسابات الـ Batches أيضًا، بحيث لا تُحسب الـ Closed حتى في الـ Batch cards:

```js
const batch1Count = activeCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 1')).length;
const batch2Count = activeCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 2')).length;
const batch3Count = activeCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 3')).length;
const batch4Count = activeCands.filter(c => Views._normBatch(Views._getBatchValue(c)) === Views._normBatch('Batch 4')).length;
```

> ملاحظة: المستخدم لم يطلب صراحةً استبعاد Closed من كروت Batch 1/2/3، لكنه طلب استبعاد Closed من Internal/External. بالتالي، من المنطقي أن تُحسب كروت الـ Batch 4 (ويفضل كل كروت Batch) على المرشحين النشطين فقط لضمان تناسق الأرقام.

### 2.4 إزالة كرت Missing Documents من Pipeline Overview

احذف هذا السطر من مصفوفة `kpi-grid-status`:

```js
Views._kpiCard('Missing Documents', k.missingDocs ?? '--', '❗', 'orange', 'Incomplete document sets', null),
```

### 2.5 إضافة كرت Batch 4

أضف هذا السطر بعد كرت Batch 3:

```js
Views._kpiCard('Batch 4', batch4Count, '4️⃣', 'teal', 'Candidates in Batch 4', { type: 'batchNumber', value: 'Batch 4' }),
```

> يمكن استخدام لون مختلف مثل `teal` أو `red` أو `orange` — اختر لونًا مناسبًا ومتاحًا في ملف الأنماط.

---

## 3. الشكل النهائي المتوقع لـ `kpi-grid-status`

بعد التعديل، يجب أن يكون `kpi-grid-status` كالتالي (بالترتيب):

1. Active Cases
2. Pending Medical
3. Booked Medical Exam
4. Docs Under Preparing
5. Visa Pending
6. Visa Completed
7. Mobilized
8. Internal Candidates
9. External Candidates
10. Batch 1
11. Batch 2
12. Batch 3
13. Batch 4

> تمت إزالة **Missing Documents** من هذا القسم.

---

## 4. التأكد من عمل الفلاتر (Filter Click)

عند النقر على كروت Internal / External / Batch 1/2/3/4، يجب أن يتم تصفية جدول المرشحين بشكل صحيح.

تحقق من أن:
- `data-filter-type="recruitmentType"` و `data-filter-value="Internal"` موجودان على كرت Internal.
- `data-filter-type="batchNumber"` و `data-filter-value="Batch 4"` موجودان على كرت Batch 4.
- التعامل مع النقر (`_onKpiCardClick`) يدعم `batchNumber` و `recruitmentType` — وهذا موجود بالفعل.

> ملاحظة: لأن الأرقام الآن تُحسب على `activeCands`، لكن الفلتر عند النقر لا يزال قد يعرض Closed إذا لم يُعدّل. لضمان التناسق، يُفضّل أن تكون كروت Batch 4 و Internal/External تُطبّق فلتر الحالة أيضًا عند النقر، أو يمكن ترك السلوك الحالي إذا كان المستخدم يريد أن يكون النقر على الكرت يُظهر جميع المرشحين في الفئة (بما فيهم Closed). في هذا الـ prompt، الأولوية هي **تغيير الرقم المعروض** فقط.

---

## 5. قيود

- لا تغيّر منطق `api_getDashboardData` في `Code.js`.
- لا تغيّر قسم **Candidates WITH Document** أو **Candidates MISSING Document**.
- لا تغيّر قسم **Follow-up Calendar**.
- لا تغيّر منطق الفلاتر الموجود في الـ Dashboard.
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- استخدم `String(c.CurrentStatus || '').trim() !== 'Closed'` للاستبعاد.

---

## 6. معايير النجاح

بعد التعديل:
- كرت **Internal Candidates** لا يحسب المرشحين ذوي الحالة Closed.
- كرت **External Candidates** لا يحسب المرشحين ذوي الحالة Closed.
- كرت **Missing Documents** لا يظهر في قسم **Pipeline Overview**.
- كرت **Batch 4** يظهر في قسم **Pipeline Overview** ويُحسب عدد المرشحين في Batch 4 (غير المغلقين).
- كروت **Batch 1 / 2 / 3** تستمر في العمل كما كانت (ويفضل أن تكون أيضًا غير مغلقة للتناسق).
- لا يحدث خطأ أو تغيير غير متوقع في باقي أقسام الـ Dashboard.
