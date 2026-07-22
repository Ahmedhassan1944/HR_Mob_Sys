# PROMPT: الاحتفاظ بحالة فلتر الكروت في Dashboard بعد Refresh

## المشكلة

في صفحة **Dashboard**، عند اختيار فلتر عن طريق النقر على أحد كروت KPI (مثلاً: **Batch 2** أو **Internal Candidates** أو **Visa Pending**)، يتم تصفية جدول المرشحين بشكل صحيح.

لكن عند الضغط على زر **Refresh** (أو عند إعادة تحميل Dashboard بأي طريقة)، يتم فقدان حالة الفلتر:
- الكروت قد تظل مختارة بصريًا (highlighted).
- لكن جدول المرشحين يعرض **جميع المرشحين** بدون تصفية.
- شريط الفلتر (hint bar) قد لا يظهر بشكل صحيح أو يفتقر لأنواع الفلاتر الجديدة (مثل `recruitmentType` و `batchNumber`).

## المطلوب

بعد الضغط على **Refresh**، يجب أن تظل حالة الفلتر محفوظة وأن يُعاد تطبيقها على جدول المرشحين.

---

## ملفات التعديل

- `Script.html` — الواجهة الأمامية (Frontend)
- لا تُعدّل `Code.js` أو أي ملفات أخرى.

---

## 1. موقع الكود الحالي

### 1.1 `_refreshDashboard`

في `Script.html`:

```js
async _refreshDashboard() {
  if (!Views._dashboardSelectedCards) Views._dashboardSelectedCards = new Set();

  try {
    const [kpiRes, candsRes, eventsRes] = await Promise.all([
      GAS.call('api_getDashboardData'),
      GAS.call('api_getAllCandidates'),
      GAS.call('api_getAllUpcomingEvents')
    ]);

    // ...

    if (candsRes.success) {
      App.setState({ candidates: candsRes.data, filteredCandidates: candsRes.data });
      Views._renderDashboardTable(candsRes.data);
      Views._restoreDashboardFilterState();  // ← هذا فقط يُعيد التظليل ولا يُعيد تطبيق الفلتر
    }
  } catch (err) {
    Toast.error('Failed to load dashboard data.');
  }
}
```

### 1.2 `_restoreDashboardFilterState`

```js
_restoreDashboardFilterState() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('hr_dashboard_filters') || 'null'); } catch (_) {}
  if (!saved) return;

  // Restore View state variables
  Views._dashStatusFilters        = Array.isArray(saved.statusFilters) ? saved.statusFilters : [];
  Views._dashExcludeStatusFilters = Array.isArray(saved.excludeStatusFilters) ? saved.excludeStatusFilters : [];
  Views._dashDocFilters           = Array.isArray(saved.docFilters) ? saved.docFilters : [];

  // Restore KPI card selected set
  Views._dashboardSelectedCards = new Set(Array.isArray(saved.selectedCards) ? saved.selectedCards : []);
  (saved.selectedCards || []).forEach(key => {
    const [type, value] = key.split('::');
    const cardId = `kpi-card-${type}-${(value || '').replace(/\s+/g, '_')}`;
    const el = document.getElementById(cardId);
    if (el) el.classList.add('kpi-card--selected');
  });

  // Show hint bar if any card is selected
  if (Views._dashboardSelectedCards.size > 0) {
    const labels = Array.from(Views._dashboardSelectedCards).map(f => {
      const [type, val] = f.split('::');
      return type === 'status' ? `Status: ${val}` : type === 'hasDoc' ? `Has: ${val}` : `Missing: ${val}`;
    }).join(' + ');
    // ... update hint bar ...
  }

  // Restore checkboxes and quick-pills ...
}
```

### 1.3 `_applyDashboardCardFilter`

```js
_applyDashboardCardFilter() {
  const filters = Array.from(Views._dashboardSelectedCards);
  const allCands = App.state.candidates;

  if (filters.length === 0) {
    App.setState({ filteredCandidates: allCands });
    Views._applyDashboardAllFilters();
    document.getElementById('dashboard-filter-hint').style.display = 'none';
    return;
  }

  // ... filter logic ...

  App.setState({ filteredCandidates: filtered });
  Views._applyDashboardAllFilters();
}
```

---

## 2. التعديلات المطلوبة

### 2.1 إعادة تطبيق فلتر الكروت بعد الـ Refresh

في دالة `_refreshDashboard`، بعد استدعاء `Views._restoreDashboardFilterState()`، يجب إعادة تطبيق فلتر الكروت على الجدول:

```js
if (candsRes.success) {
  App.setState({ candidates: candsRes.data, filteredCandidates: candsRes.data });
  Views._renderDashboardTable(candsRes.data);
  Views._restoreDashboardFilterState();

  // ✅ أضف هذا: إعادة تطبيق فلتر الكروت إذا كانت محفوظة
  if (Views._dashboardSelectedCards && Views._dashboardSelectedCards.size > 0) {
    Views._applyDashboardCardFilter();
  } else {
    // لا توجد كروت مختارة → تطبيق الفلاتر الأخرى فقط إذا وجدت
    Views._applyDashboardAllFilters();
  }
}
```

### 2.2 تحديث `_restoreDashboardFilterState` لإظهار جميع أنواع الفلاتر

حاليًا، التسميات (labels) في hint bar تدعم فقط `status` و `hasDoc` و `missingDoc`. يجب إضافة:
- `recruitmentType` → `Type: ${val}`
- `batchNumber` → `Batch: ${val}`
- `calendar` → `Calendar: ${val}` (إذا كانت مستخدمة)

استبدل كتلة توليد labels بـ:

```js
if (Views._dashboardSelectedCards.size > 0) {
  const labels = Array.from(Views._dashboardSelectedCards).map(f => {
    const [type, val] = f.split('::');
    if (type === 'status')          return `Status: ${val}`;
    if (type === 'hasDoc')          return `Has: ${val}`;
    if (type === 'missingDoc')      return `Missing: ${val}`;
    if (type === 'recruitmentType') return `Type: ${val}`;
    if (type === 'batchNumber')     return `Batch: ${val}`;
    if (type === 'calendar')        return `Calendar: ${val}`;
    return val;
  }).join(' + ');
  // ... update hint bar ...
}
```

### 2.3 تحديث `_applyDashboardCardFilter` لتحديث hint bar أيضًا

حاليًا، `_applyDashboardCardFilter` لا تُحدّث hint bar بشكل صحيح (تقوم بذلك داخل `_applyDashboardAllFilters` أو يكون التحديث ناقصًا). تأكد من أن `_applyDashboardCardFilter` تُحدّث hint bar بعد الفلترة.

أضف في نهاية `_applyDashboardCardFilter` بعد الفلترة:

```js
// Update hint bar
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

document.getElementById('dashboard-filter-label').textContent = labels;
document.getElementById('dashboard-filter-hint').style.display = 'flex';
document.getElementById('dashboard-filter-hint').style.alignItems = 'center';
document.getElementById('dashboard-filter-hint').style.gap = '4px';
```

> ملاحظة: يوجد بالفعل كتلة مشابهة في `_applyDashboardCardFilter` عند التعامل مع الكروت. تأكد من أنها تتعامل مع جميع أنواع الفلاتر وليس فقط status/hasDoc/missingDoc.

### 2.4 التأكد من حفظ حالة الكروت عند النقر

في `_onKpiCardClick`، بعد كل تغيير في `Views._dashboardSelectedCards`، يتم استدعاء:

```js
Views._saveDashboardFilterState();
Views._applyDashboardCardFilter();
```

هذا موجود بالفعل. لكن تأكد من أن `_saveDashboardFilterState` تُحفظ `selectedCards` بشكل صحيح.

### 2.5 التأكد من أن `_applyDashboardAllFilters` لا تُلغي فلتر الكروت

في `_applyDashboardAllFilters`:

```js
const base = (Views._dashboardSelectedCards && Views._dashboardSelectedCards.size > 0)
  ? App.state.filteredCandidates   // already KPI-filtered
  : App.state.candidates;          // no card selected → start from all
```

هذا صحيح. لكن يجب أن تكون `App.state.filteredCandidates` محدّثة قبل استدعاء `_applyDashboardAllFilters`. إذا استدعينا `Views._applyDashboardCardFilter()` قبلها، ستكون محدّثة.

---

## 3. سلوك متوقع بعد التعديل

### السيناريو 1: اختيار كارت واحد

1. المستخدم ينقر على **Batch 2**.
2. الجدول يُصفّي ليظهر مرشحي Batch 2 فقط.
3. شريط الفلتر يظهر: `Batch: Batch 2`.
4. المستخدم يضغط **Refresh**.
5. الكروت تُعاد رسمها.
6. كارت **Batch 2** يظل مختارًا (highlighted).
7. الجدول يُصفّي مرة أخرى ليظهر مرشحي Batch 2.
8. شريط الفلتر يظل ظاهرًا.

### السيناريو 2: اختيار كارت + فلتر إضافي

1. المستخدم ينقر على **Internal Candidates**.
2. المستخدم يختار **Exclude Status: Closed**.
3. الجدول يُصفّي ليظهر Internal Candidates غير المغلقين.
4. المستخدم يضغط **Refresh**.
5. يتم استعادة كارت Internal Candidates + Exclude Status: Closed.
6. الجدول يُصفّي بنفس الطريقة.

### السيناريو 3: لا يوجد فلتر

1. المستخدم لا يختار أي كارت.
2. المستخدم يضغط **Refresh**.
3. الجدول يعرض جميع المرشحين.
4. لا يظهر شريط الفلتر.

---

## 4. قيود

- لا تغيّر منطق `api_getAllCandidates` أو `api_getDashboardData` في `Code.js`.
- لا تغيّر آلية `localStorage` المستخدمة لحفظ الحالة (مفتاح `hr_dashboard_filters`).
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- لا تغيّر سلوك Clear Filters.
- لا تغيّر شكل الكروت أو الـ UI.

---

## 5. معايير النجاح

بعد التعديل:
- عند اختيار كارت KPI ثم الضغط على **Refresh**، يظل الكارت مختارًا بصريًا.
- جدول المرشحين يُعاد تصفيته بنفس فلتر الكارت بعد الـ Refresh.
- شريط الفلتر (hint bar) يظل ظاهرًا بعد الـ Refresh.
- تسميات الفلتر في hint bar تدعم `Status`، `Has`， `Missing`، `Type` (Recruitment Type)، `Batch` (Batch Number)، و `Calendar`.
- إذا لم يكن هناك فلتر محفوظ، يتم عرض جميع المرشحين بعد الـ Refresh.
- لا يحدث خطأ أو تغيير غير متوقع في باقي سلوك الـ Dashboard.
