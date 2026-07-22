# PROMPT: الاحتفاظ بحالة فلتر Batch بعد Refresh الصفحة

## المشكلة

في صفحة **Dashboard**، كروت **Batch 1 / Batch 2 / Batch 3 / Batch 4** (الموجودة داخل قسم **Pipeline Overview**) تفاعلية وتُطبّق فلتر على كل شيء:
- أرقام كروت Pipeline Overview
- أرقام كروت Candidates WITH Document
- أرقام كروت Candidates MISSING Document
- جدول المرشحين

كل هذا يعمل بشكل صحيح عند الاختيار.

**لكن** بعد الضغط على **Refresh** (أو إعادة تحميل الصفحة بأي طريقة)، تُفقد حالة فلتر الـ Batch:
- الكرت قد يظل مختارًا بصريًا (highlighted) أو قد لا يظل.
- في كل الأحوال، جدول المرشحين يعرض **جميع المرشحين** بدلاً من مرشحي الـ Batch المختار.
- أرقام الكروت قد تعود للوضع الافتراضي (جميع المرشحين) بدلاً من الاحتفاظ بحالة التصفية.
- شريط الفلتر (hint bar) قد يختفي أو لا يعكس الـ Batch المختار.

## المطلوب

يجب أن تظل حالة فلتر الـ Batch محفوظة بعد **Refresh** وأن يُعاد تطبيقها تلقائيًا على:
1. جدول المرشحين.
2. أرقام كروت Pipeline Overview.
3. أرقام كروت Candidates WITH Document.
4. أرقام كروت Candidates MISSING Document.
5. شريط الفلتر (hint bar) يظل ظاهرًا ويظهر `Batch: Batch X`.

---

## ملفات التعديل

- `Script.html` — الواجهة الأمامية (Frontend)
- لا تُعدّل `Code.js` أو أي ملفات Backend.
- لا تُعدّل بنية البيانات في Sheets.

---

## 1. موقع الكود الحالي

### 1.1 بناء كروت Batch في Pipeline Overview

في `Script.html`، كروت Batch يتم إنشاؤها كجزء من `_renderDashboard` داخل قسم Pipeline Overview، باستخدام:

```js
Views._kpiCard('Batch 1', batch1Count, '1️⃣', 'blue', 'Candidates in Batch 1', { type: 'batchNumber', value: 'Batch 1' }),
Views._kpiCard('Batch 2', batch2Count, '2️⃣', 'purple', 'Candidates in Batch 2', { type: 'batchNumber', value: 'Batch 2' }),
Views._kpiCard('Batch 3', batch3Count, '3️⃣', 'green', 'Candidates in Batch 3', { type: 'batchNumber', value: 'Batch 3' }),
Views._kpiCard('Batch 4', batch4Count, '4️⃣', 'teal', 'Candidates in Batch 4', { type: 'batchNumber', value: 'Batch 4' })
```

### 1.2 حفظ الحالة

حالة الفلترات تُحفظ في `localStorage` تحت المفتاح:
```js
hr_dashboard_filters
```

وتحتوي على:
```js
{
  statusFilters: [...],
  excludeStatusFilters: [...],
  docFilters: [...],
  selectedCards: ['batchNumber::Batch 3', ...]
}
```

### 1.3 استعادة الحالة

في `_refreshDashboard` يتم استدعاء:
```js
Views._restoreDashboardFilterState();
```

وهي تُعيد فقط التظليل البصري (highlighted) للكروت ولكنها **لا تُعيد تطبيق الفلتر** على الجدول أو على أرقام الكروت.

### 1.4 تطبيق الفلتر

فلتر الكروت يُطبّق عبر:
```js
Views._applyDashboardCardFilter()
```

وهي تُحدّث `App.state.filteredCandidates` ثم تستدعي:
```js
Views._applyDashboardAllFilters()
```

---

## 2. التعديلات المطلوبة

### 2.1 إعادة تطبيق الفلتر بعد Refresh

في دالة `_refreshDashboard`، بعد استدعاء `Views._restoreDashboardFilterState()`، يجب:

1. التحقق مما إذا كان هناك كرت Batch مختار في `Views._dashboardSelectedCards`.
2. إذا كان موجودًا:
   - استدعاء `Views._applyDashboardCardFilter()` لإعادة تطبيق الفلتر على الجدول.
3. إذا لم يكن موجودًا:
   - استدعاء `Views._applyDashboardAllFilters()` فقط لتطبيق الفلاتر الأخرى إن وجدت.

```js
if (candsRes.success) {
  App.setState({ candidates: candsRes.data, filteredCandidates: candsRes.data });
  Views._renderDashboardTable(candsRes.data);
  Views._restoreDashboardFilterState();

  // ✅ أضف هذا: إعادة تطبيق فلتر الكروت إذا كانت محفوظة
  if (Views._dashboardSelectedCards && Views._dashboardSelectedCards.size > 0) {
    Views._applyDashboardCardFilter();
  } else {
    Views._applyDashboardAllFilters();
  }
}
```

### 2.2 إعادة رسم الأقسام بأرقام صحيحة بعد Refresh

حاليًا، عند `_refreshDashboard`، يتم إعادة رسم الأقسام باستخدام جميع المرشحين (`allCands`).
يجب بعد استعادة الفلتر أن تُعاد رسم الأقسام باستخدام `App.state.filteredCandidates` (التي تم تطبيق فلتر الـ Batch عليها).

تأكد من أن `_applyDashboardCardFilter` بعد تنفيذها تُحدّث `App.state.filteredCandidates`، ثم استخدمها لإعادة حساب أرقام الكروت.

إذا كانت هناك دالة منفصلة لإعادة رسم الأقسام (مثل `_renderDashboardKpiSections`)، يجب استدعاؤها بعد `_applyDashboardCardFilter` مع استخدام `App.state.filteredCandidates` كمصدر للبيانات.

### 2.3 تحديث hint bar ليدعم Batch Number

في `_restoreDashboardFilterState` وفي `_applyDashboardCardFilter`، تأكد من أن توليد labels يدعم `batchNumber`:

```js
const labels = filters.map(f => {
  const [type, val] = f.split('::');
  if (type === 'status')          return `Status: ${val}`;
  if (type === 'hasDoc')          return `Has: ${val}`;
  if (type === 'missingDoc')      return `Missing: ${val}`;
  if (type === 'recruitmentType') return `Type: ${val}`;
  if (type === 'batchNumber')     return `Batch: ${val}`;
  if (type === 'calendar')        return `Calendar: ${val}`;
  return val;
}).join(' + ');
```

### 2.4 التأكد من حفظ حالة Batch Card

في `_onKpiCardClick` (أو أي دالة مسؤولة عن النقر على كروت KPI)، عند النقر على كرت Batch:

1. يجب إضافة/إزالة الكرت من `Views._dashboardSelectedCards`.
2. يجب استدعاء:
   ```js
   Views._saveDashboardFilterState();
   Views._applyDashboardCardFilter();
   ```
3. يجب التأكد من أن `_saveDashboardFilterState` تُحفظ `selectedCards` بشكل صحيح.

### 2.5 التأكد من أن Clear Filters يلغي Batch Filter أيضًا

عند الضغط على **Clear Filters**:
- يجب إزالة `batchNumber::Batch X` من `Views._dashboardSelectedCards`.
- يجب إزالة التظليل البصري من كروت Batch.
- يجب إعادة رسم الأقسام باستخدام جميع المرشحين.
- يجب إخفاء hint bar.

---

## 3. سلوك متوقع بعد التعديل

### السيناريو 1: اختيار Batch 3

1. المستخدم ينقر على **Batch 3**.
2. كرت Batch 3 يظل مختارًا (highlighted).
3. أرقام جميع الكروت في Pipeline Overview / WITH Document / MISSING Document تتغير لتعكس Batch 3 فقط.
4. جدول المرشحين يعرض فقط مرشحي Batch 3.
5. شريط الفلتر يظهر: `Batch: Batch 3`.
6. المستخدم يضغط **Refresh**.
7. بعد إعادة تحميل البيانات:
   - كرت Batch 3 يظل مختارًا.
   - أرقام الكروت تعود لتعكس Batch 3.
   - جدول المرشحين يعرض Batch 3 فقط.
   - شريط الفلتر يظل ظاهرًا.

### السيناريو 2: اختيار Batch 3 + فلتر إضافي

1. المستخدم ينقر على **Batch 3**.
2. المستخدم يختار **Exclude Status: Closed**.
3. الجدول يعرض Batch 3 غير المغلقين.
4. المستخدم يضغط **Refresh**.
5. يتم استعادة Batch 3 + Exclude Status: Closed.
6. الجدول يُصفّى بنفس الطريقة.

### السيناريو 3: لا يوجد فلتر

1. المستخدم لا يختار أي كرت.
2. المستخدم يضغط **Refresh**.
3. الجدول يعرض جميع المرشحين.
4. لا يظهر شريط الفلتر.

---

## 4. قيود

- لا تغيّر منطق `api_getAllCandidates` أو `api_getDashboardData` في `Code.js`.
- لا تغيّر آلية `localStorage` المستخدمة لحفظ الحالة (مفتاح `hr_dashboard_filters`).
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- لا تغيّر سلوك Clear Filters بشكل غير متوقع.
- لا تغيّر شكل الكروت أو الـ UI.
- لا تغيّر سلوك كروت Follow-up Calendar.
- لا تغيّر بنية البيانات في Sheets.

---

## 5. معايير النجاح

بعد التعديل:
- عند اختيار كرت Batch ثم الضغط على **Refresh**، يظل الكرت مختارًا بصريًا.
- أرقام كروت Pipeline Overview تُعاد حسابها لتعكس الـ Batch المختار بعد Refresh.
- أرقام كروت Candidates WITH Document تُعاد حسابها لتعكس الـ Batch المختار بعد Refresh.
- أرقام كروت Candidates MISSING Document تُعاد حسابها لتعكس الـ Batch المختار بعد Refresh.
- جدول المرشحين يُعاد تصفيته ليظهر فقط مرشحي الـ Batch المختار بعد Refresh.
- شريط الفلتر (hint bar) يظل ظاهرًا بعد Refresh ويعرض `Batch: Batch X`.
- إذا لم يكن هناك فلتر محفوظ، يتم عرض جميع المرشحين بعد Refresh.
- **Clear Filters** يلغي فلتر الـ Batch أيضًا ويعيد كل شيء للوضع الافتراضي.
- لا يحدث خطأ أو تغيير غير متوقع في باقي سلوك الـ Dashboard.
