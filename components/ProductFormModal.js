'use client';
import { useState } from 'react';

export default function ProductFormModal({ product, categories, onClose, onSaved }) {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [notes, setNotes] = useState(product?.notes || '');
  const [variants, setVariants] = useState(
    product?.variants && product.variants.length > 0
      ? product.variants
      : []
  );
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function addVariant() {
    setVariants((v) => [...v, { label: '', price: '' }]);
  }
  function updateVariant(i, field, value) {
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function removeVariant(i) {
    setVariants((v) => v.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const cleanVariants = variants
      .filter((v) => v.label.trim())
      .map((v) => ({ label: v.label.trim(), price: parseFloat(v.price) || 0 }));

    const form = new FormData();
    form.set('name', name);
    form.set('price', price || 0);
    form.set('category_id', categoryId);
    form.set('notes', notes);
    form.set('variants', JSON.stringify(cleanVariants));
    if (file) form.set('image', file);

    const url = product ? `/api/products/${product.id}` : '/api/products';
    const method = product ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, body: form });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error || 'حدث خطأ');
      return;
    }
    onSaved(data.product);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg text-brand-900 mb-4">{product ? 'تعديل المنتج' : 'إضافة منتج'}</h2>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اسم المنتج</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus-ring focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              السعر الأساسي {variants.length > 0 && '(يُستخدم إن لم تُحدَّد مقاسات أدناه)'}
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus-ring focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">القسم</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus-ring focus:border-brand-500"
            >
              <option value="">بدون قسم</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">المقاسات / الفروع (اختياري)</label>
              <button type="button" onClick={addVariant} className="text-xs text-brand-600 font-medium hover:underline">
                + إضافة مقاس
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد مقاسات مضافة. اضغط "إضافة مقاس" إن كان للمنتج أسعار مختلفة حسب الحجم.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={v.label}
                      onChange={(e) => updateVariant(i, 'label', e.target.value)}
                      placeholder="مثال: 35/35"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus-ring focus:border-brand-500"
                    />
                    <input
                      value={v.price}
                      onChange={(e) => updateVariant(i, 'price', e.target.value)}
                      type="number"
                      step="0.01"
                      placeholder="السعر"
                      className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus-ring focus:border-brand-500"
                    />
                    <button type="button" onClick={() => removeVariant(i)} className="text-accent-500 text-sm px-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظة (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي تفاصيل إضافية عن المنتج"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus-ring focus:border-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              صورة المنتج {product && '(اتركها فارغة للإبقاء على الصورة الحالية)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>

          {error && <p className="text-sm text-accent-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button disabled={busy} className="flex-1 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-bold rounded-lg py-2.5">
              {busy ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="px-5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
