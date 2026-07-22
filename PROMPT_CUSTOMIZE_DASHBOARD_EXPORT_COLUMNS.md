# PROMPT: تخصيص أعمدة تصدير CSV في Dashboard

## المتطلب

عند الضغط على زر **Export → All Candidates (CSV)** في صفحة **Dashboard**، يجب أن يتم تصدير الملف بـ **6 أعمدة فقط** بالترتيب التالي:

1. `FullName`
2. `Position`
3. `Notes`
4. `HR_Code`
5. `Recruitment_Type`
6. `Batch_Number`

لا يجب تصدير أي أعمدة إضافية مثل `CandidateID`, `Department`, `Email`, `Phone`, `Nationality`, `OfferSalary`, `CurrentStatus`, `CreatedAt`, `UpdatedAt`, `DocCompleteness%`, `PresentDocs`, `MissingDocs`.

> ملاحظة: المطلوب هنا يخص **Dashboard Export** فقط. لا يجب تعديل تصدير صفحة Candidates (إن وجد) إلا إذا طلب المستخدم ذلك صراحةً.

---

## ملفات التعديل

- `Script.html` — الواجهة الأمامية (Frontend)
- لا تُعدّل `Code.js` أو أي ملفات أخرى.

---

## 1. موقع الكود الحالي

في `Script.html`، داخل الدالة `_exportDashboardCandidates`، يوجد تعريف الأعمدة والصفوف:

```js
_exportDashboardCandidates() {
  const menu = document.getElementById('dash-export-menu');
  if (menu) menu.style.display = 'none';

  const _all = App.state.candidates || [];
  const _filtered = App.state.filteredCandidates || [];
  const data = (_filtered.length > 0 && _filtered.length < _all.length)
    ? _filtered
    : _all;
  if (!data || !data.length) { Toast.warning('No candidates loaded yet.'); return; }
  const isFiltered = data.length < _all.length;

  const { docCompleteness } = App.state;
  const headers = [
    'CandidateID', 'FullName', 'Position', 'Department',
    'Email', 'Phone', 'Nationality', 'OfferSalary',
    'CurrentStatus', 'CreatedAt', 'UpdatedAt',
    'DocCompleteness%', 'PresentDocs', 'MissingDocs'
  ];
  const esc = v => '"' + (v || '').toString().replace(/"/g, '""') + '"';
  const rows = data.map(c => {
    const comp = docCompleteness[c.CandidateID];
    const pct = comp ? comp.pct : '';
    const present = comp ? comp.presentDocs.join('; ') : '';
    const missing = comp ? comp.missingDocs.join('; ') : '';
    return [
      esc(c.CandidateID), esc(c.FullName), esc(c.Position), esc(c.Department),
      esc(c.Email), esc(c.Phone), esc(c.Nationality), esc(c.OfferSalary),
      esc(c.CurrentStatus), esc(c.CreatedAt), esc(c.UpdatedAt),
      esc(pct), esc(present), esc(missing)
    ].join(',');
  });
  const csv = '\uFEFF' + [headers.join(',')].concat(rows).join('\n');
  // ... download logic ...
}
```

---

## 2. التعديلات المطلوبة في `_exportDashboardCandidates`

### 2.1 تغيير الأعمدة إلى الـ 6 أعمدة المطلوبة

استبدل تعريف `headers` بـ:

```js
const headers = [
  'FullName',
  'Position',
  'Notes',
  'HR_Code',
  'Recruitment_Type',
  'Batch_Number'
];
```

### 2.2 تغيير بناء الصفوف

استبدل بناء `rows` بـ:

```js
const rows = data.map(c => {
  return [
    esc(c.FullName),
    esc(c.Position),
    esc(c.Notes),
    esc(c.HR_Code),
    esc(c.Recruitment_Type),
    esc(c.Batch_Number || c['Batch Number'] || '')
  ].join(',');
});
```

### 2.3 إزالة الاعتماد على `docCompleteness`

لأن الأعمدة الجديدة لا تحتاج إلى `docCompleteness%` أو `PresentDocs` أو `MissingDocs`، يمكن إزالة هذا الجزء:

```js
const { docCompleteness } = App.state; // ← يمكن إزالتها أو تركها دون استخدام
```

---

## 3. التأكد من وجود الحقول في بيانات المرشحين

الحقول المطلوبة موجودة في كائن المرشح:

| العمود | مصدر البيانات | ملاحظة |
|--------|---------------|--------|
| `FullName` | `c.FullName` | موجود |
| `Position` | `c.Position` | موجود |
| `Notes` | `c.Notes` | موجود (يستخدم في الـ Table والـ Candidate Detail) |
| `HR_Code` | `c.HR_Code` | موجود (يستخدم في Candidate Detail) |
| `Recruitment_Type` | `c.Recruitment_Type` | موجود |
| `Batch_Number` | `c.Batch_Number` أو `c['Batch Number']` | استخدم نفس منطق `Views._getBatchValue(c)` |

### 3.1 استخدام `Views._getBatchValue` للحصول على Batch_Number

للتناسق مع باقي الكود، استخدم الدالة الموجودة `Views._getBatchValue(c)` للحصول على قيمة Batch:

```js
esc(Views._getBatchValue(c) || '')
```

هذا يضمن التعامل مع كلا النمطين: `Batch_Number` و `Batch Number`.

---

## 4. ملاحظات إضافية

### 4.1 الحفاظ على منطق الفلترة

يجب أن يظل التصدير يحترم الفلاتر المُطبقة (Status, Exclude Status, Missing Documents, Department, Search, إلخ).  
لا تغيّر منطق تحديد `data`:

```js
const data = (_filtered.length > 0 && _filtered.length < _all.length)
  ? _filtered
  : _all;
```

### 4.2 الحفاظ على التعامل مع القيم الفارغة

استخدم دالة `esc` كما هي للتعامل مع القيم الفارغة والاقتباسات:

```js
const esc = v => '"' + (v || '').toString().replace(/"/g, '""') + '"';
```

### 4.3 اسم الملف

استمرار في استخدام نفس اسم الملف:

```js
a.download = 'HR_Candidates_' + new Date().toISOString().slice(0, 10) + '.csv';
```

يمكنك تغيير الاسم إلى `Dashboard_Candidates_...` إذا أردت، لكن هذا اختياري.

### 4.4 رسالة Toast

استمرار في استخدام نفس رسالة التأكيد:

```js
Toast.success(
  isFiltered
    ? 'Exported ' + data.length + ' filtered candidates (out of ' + _all.length + ' total).'
    : 'Exported all ' + data.length + ' candidates to CSV!'
);
```

---

## 5. الشكل النهائي المتوقع للدالة

```js
_exportDashboardCandidates() {
  const menu = document.getElementById('dash-export-menu');
  if (menu) menu.style.display = 'none';

  const _all = App.state.candidates || [];
  const _filtered = App.state.filteredCandidates || [];
  const data = (_filtered.length > 0 && _filtered.length < _all.length)
    ? _filtered
    : _all;
  if (!data || !data.length) { Toast.warning('No candidates to export.'); return; }
  const isFiltered = data.length < _all.length;

  const headers = [
    'FullName',
    'Position',
    'Notes',
    'HR_Code',
    'Recruitment_Type',
    'Batch_Number'
  ];
  const esc = v => '"' + (v || '').toString().replace(/"/g, '""') + '"';
  const rows = data.map(c => {
    return [
      esc(c.FullName),
      esc(c.Position),
      esc(c.Notes),
      esc(c.HR_Code),
      esc(c.Recruitment_Type),
      esc(Views._getBatchValue(c) || '')
    ].join(',');
  });
  const csv = '\uFEFF' + [headers.join(',')].concat(rows).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HR_Candidates_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  Toast.success(
    isFiltered
      ? 'Exported ' + data.length + ' filtered candidates (out of ' + _all.length + ' total).'
      : 'Exported all ' + data.length + ' candidates to CSV!'
  );
}
```

---

## 6. قيود

- لا تغيّر منطق الفلاتر.
- لا تغيّر منطق اختيار المرشحين (`data = _filtered || _all`).
- لا تغيّر تصدير صفحة Candidates (إن وجد) إلا إذا طُلب.
- لا تغيّر ملفات أخرى.
- لا تُضيف مكتبات خارجية.
- يجب أن يظل الكود متوافقًا مع Apps Script V8.

---

## 7. معايير النجاح

بعد التعديل:
- عند تصدير CSV من Dashboard، يحتوي الملف على 6 أعمدة فقط.
- الترتيب: `FullName`, `Position`, `Notes`, `HR_Code`, `Recruitment_Type`, `Batch_Number`.
- لا توجد أعمدة إضافية.
- التصدير يحترم الفلاتر المُطبقة (إن وجدت).
- القيم الفارغة تُعالج بشكل صحيح (بدون أخطاء).
- لا يحدث تغيير في باقي أجزاء التطبيق.
