# PROMPT: تصدير CSV من Dashboard يحترم جميع الفلاتر المطبقة

## المشكلة

في صفحة **Dashboard**، عند تطبيق فلاتر من خلال الـ Advanced Filter Panel، مثل:
- **Exclude Status:** Visa Completed, Closed
- **Status:** Booked a Medical Examination

ثم الضغط على **Export → All Candidates (CSV)**، يتم تصدير **جميع المرشحين** بدون مراعاة الفلاتر المُطبقة.

> المشكلة تنطبق على الـ Status Filters، Exclude Status Filters، Missing Documents Filters، Department Filter، Completion %، وربما Search Input أيضًا.

---

## ملفات التعديل

- `Script.html` — الواجهة الأمامية (Frontend)
- لا تُعدّل `Code.js` أو أي ملفات أخرى.

---

## 1. تحليل المشكلة في الكود الحالي

في `Script.html`، الدالة `_applyDashboardAllFilters` تقوم بـ:
1. قراءة جميع الفلاتر من عناصر DOM.
2. تطبيق الفلاتر على `base` (المرشحين).
3. عرض النتيجة في الجدول من خلال `_renderDashboardTable(data)`.

**لكنها لا تُحدّث `App.state.filteredCandidates`.**  
أي أن `App.state.filteredCandidates` يبقى قديمًا أو يساوي جميع المرشحين.

في `_exportDashboardCandidates`:
```js
const _all = App.state.candidates || [];
const _filtered = App.state.filteredCandidates || [];
const data = (_filtered.length > 0 && _filtered.length < _all.length)
  ? _filtered
  : _all;
```

لأن `_filtered` يساوي `_all` أو لم يُحدّث، يتم تصدير الكل.

---

## 2. التعديلات المطلوبة في `Script.html`

### 2.1 إضافة حالة مؤقتة للفلاتر النشطة

أضف إلى كائن `App.state` أو كمتغيرات في `Views` حتى يمكن الوصول إليها أثناء التصدير:

```js
// داخل دالة dashboard أو في Views
Views._dashActiveFilters = {
  query: '',
  deptFilter: '',
  completionMin: 0,
  statusFilters: [],
  excludeStatusFilters: [],
  docFilters: [],
  cardFilters: [] // الكروت المختارة من KPI Overview
};
```

### 2.2 تحديث `_applyDashboardAllFilters` لتُخزّن الفلاتر والنتائج

عدّل الدالة بحيث تُحدّث `App.state.filteredCandidates` بعد تطبيق الفلاتر:

```js
_applyDashboardAllFilters() {
  const base = (Views._dashboardSelectedCards && Views._dashboardSelectedCards.size > 0)
    ? App.state.filteredCandidates
    : App.state.candidates;

  // ... قراءة الفلاتر ...

  let data = base.filter(c => {
    // ... منطق التصفية ...
    return matchQ && matchS && matchExcl && matchD && matchDoc && matchCompletion;
  });

  // ✅ تخزين النتيجة المُصفّاة
  App.setState({ filteredCandidates: data });

  // تخزين الفلاتر الحالية لاستخدامها عند التصدير
  Views._dashActiveFilters = {
    query,
    deptFilter,
    completionMin,
    statusFilters,
    excludeStatusFilters,
    docFilters,
    cardFilters: Array.from(Views._dashboardSelectedCards || [])
  };

  Views._saveDashboardFilterState();
  Views._renderDashboardTable(data);
  Views._dashUpdateClearButton();
}
```

> ملاحظة: عندما لا يكون هناك فلاتر، يجب أن تكون `filteredCandidates` يساوي `candidates` (جميع المرشحين)، وليس مصفوفة فارغة. هذا مهم لكي لا يُعرّض التصدير على أنه "تصدير فلتر" دائمًا.

### 2.3 تحديث `_applyDashboardCardFilter` أيضًا

تأكد من أن `_applyDashboardCardFilter` تُحدّث `App.state.filteredCandidates` أيضًا بعد التصفية. في النهاية، هذه الدالة تستدعي `_applyDashboardAllFilters()`، لكن تأكد من أن `filteredCandidates` يُحفظ بشكل صحيح بعد كل خطوة.

### 2.4 تحديث `_exportDashboardCandidates`

بعد التعديل، أصبح `App.state.filteredCandidates` يحتوي على المرشحين المُصفّفين فعليًا. لكن يجب التأكد من أن التصدير يستخدمهم:

```js
_exportDashboardCandidates() {
  const menu = document.getElementById('dash-export-menu');
  if (menu) menu.style.display = 'none';

  const _all = App.state.candidates || [];
  const _filtered = App.state.filteredCandidates || [];

  // ✅ التأكد من أن الفلاتر الحالية تم تطبيقها قبل التصدير
  if (Views._applyDashboardAllFilters) {
    Views._applyDashboardAllFilters();
  }

  const data = (_filtered.length > 0 && _filtered.length < _all.length)
    ? _filtered
    : _all;

  if (!data || !data.length) { Toast.warning('No candidates to export.'); return; }
  const isFiltered = data.length < _all.length;

  // ... باقي منطق CSV ...
}
```

### 2.5 تحديث الرسالة التوضيحية عند التصدير

تأكد من أن رسالة `Toast` تعكس حالة الفلترة بشكل صحيح:

```js
Toast.success(
  isFiltered
    ? 'Exported ' + data.length + ' filtered candidates (out of ' + _all.length + ' total).'
    : 'Exported all ' + data.length + ' candidates to CSV!'
);
```

---

## 3. المتطلبات التفصيلية للفلاتر التي يجب أن يحترمها التصدير

يجب أن يحترم التصدير الفلاتر التالية:

| الفلتر | العنصر في DOM | المتغير في Views |
|--------|--------------|-----------------|
| Status Include | `.dash-status-check` | `Views._dashStatusFilters` |
| Status Exclude | `.dash-excl-status-check` | `Views._dashExcludeStatusFilters` |
| Missing Documents | `.dash-doc-check` | `Views._dashDocFilters` |
| Department | `#dash-dept-filter` | القيمة من DOM |
| Min Completion % | `#dash-completion-min` | القيمة من DOM |
| Search Text | `#dash-search-input` | القيمة من DOM |
| KPI Card Filter | `.kpi-card--selected` | `Views._dashboardSelectedCards` |

يجب أن تُطبّق كلها بنفس المنطق المستخدم في عرض الجدول.

---

## 4. حالة خاصة — عند عدم وجود فلاتر

إذا لم يُطبّق أي فلتر، يجب أن:
- يكون `App.state.filteredCandidates` يساوي `App.state.candidates`.
- يُصدّر التصدير جميع المرشحين.
- تظهر رسالة "Exported all ... candidates".

لا تترك `filteredCandidates` مصفوفة فارغة عند عدم وجود فلاتر — لأن ذلك قد يسبب تصدير مصفوفة فارغة.

---

## 5. التحقق من الخطوات بعد التعديل

بعد التعديل، عندما يقوم المستخدم بالتالي:
1. ينتقل إلى Dashboard.
2. يختار **Exclude Status:** Visa Completed, Closed.
3. يختار **Status:** Booked a Medical Examination.
4. يضغط **Export → All Candidates (CSV)**.

يجب أن:
- يتم تصدير المرشحين الذين حالتهم "Booked a Medical Examination" فقط.
- لا يتم تصدير أي مرشح بـ Status "Visa Completed" أو "Closed".
- يظهر Toast يوضح عدد المرشحين المُصدّرين وإجمالي عدد المرشحين.

---

## 6. قيود

- لا تغيّر منطق `api_getAllCandidates` أو `api_getDashboardData` في `Code.js`.
- لا تغيّر بنية البيانات.
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.
- لا تغيّر شكل الـ UI أو مسميات الأزرار.
- فقط عدّل سلوك التصدير بحيث يحترم الفلاتر.

---

## 7. معايير النجاح

بعد التعديل:
- تصدير CSV يحترم **Status Include** Filters.
- تصدير CSV يحترم **Status Exclude** Filters.
- تصدير CSV يحترم **Missing Documents** Filters.
- تصدير CSV يحترم **Department** Filter.
- تصدير CSV يحترم **Completion %** Filter.
- تصدير CSV يحترم **Search Text**.
- تصدير CSV يحترم **KPI Card Filters** (إذا كانت مُطبّقة).
- عند عدم وجود فلاتر، يتم تصدير جميع المرشحين.
- لا يحدث خطأ أو تغيير غير متوقع في تجربة المستخدم.
