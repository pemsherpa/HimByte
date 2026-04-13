import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, ToggleLeft, ToggleRight, Plus, Trash2, Camera, Upload, X, Pencil, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { uploadMenuImage, isHeicLike, normalizeImageFileForMenu } from '../../lib/uploadImage';
import { DEMO_MODE } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const fileInputRef = useRef(null);
  const editFileRef = useRef(null);
  const { restaurantId, isRole } = useAuthStore();
  const isOwner = isRole('restaurant_admin');

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getAllMenuItems(restaurantId),
      api.getCategories(restaurantId),
    ])
      .then(([menuRows, cats]) => {
        setItems(menuRows || []);
        const list = cats || [];
        const foodCats = list.filter((c) => !c.is_service_category);
        const forSelect = foodCats.length ? foodCats : list;
        setCategories(forSelect);
        setNewCategoryId((prev) => (prev && forSelect.some((c) => c.id === prev) ? prev : forSelect[0]?.id || ''));
      })
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  async function handleCreateCategory(e) {
    e.preventDefault();
    if (!restaurantId || !newCategoryName.trim()) {
      toast.error('Enter a category name');
      return;
    }
    setCreatingCat(true);
    try {
      const row = await api.createCategory({
        restaurant_id: restaurantId,
        name: newCategoryName.trim(),
        priority: 0,
        is_service_category: false,
      });
      setCategories((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryId(row.id);
      setNewCategoryName('');
      toast.success('Category created — you can add the dish now');
    } catch (err) {
      toast.error(err.message || 'Could not create category');
    } finally {
      setCreatingCat(false);
    }
  }

  async function handleToggle(id) {
    try {
      const updated = await api.toggleItemAvailability(id);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_available: updated.is_available } : i)));
      toast.success(updated.is_available ? 'Item is now available' : 'Item marked out of stock');
    } catch {
      toast.error('Failed to update item');
    }
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = file.type.startsWith('image/') || isHeicLike(file);
    if (!ok) {
      toast.error('Please choose a JPG, PNG, WebP, GIF, or HEIC photo');
      return;
    }
    const wasHeic = isHeicLike(file);
    if (wasHeic) toast.loading('Converting HEIC…', { id: 'heic' });
    try {
      const normalized = await normalizeImageFileForMenu(file);
      if (wasHeic) {
        toast.dismiss('heic');
        toast.success('HEIC ready for upload');
      }
      setNewImage(normalized);
      setNewImagePreview(URL.createObjectURL(normalized));
    } catch (err) {
      toast.dismiss('heic');
      toast.error(err.message || 'Could not read this photo — try exporting as JPEG');
    }
    e.target.value = '';
  }

  async function handleDroppedFile(file, target) {
    if (!file) return;
    const ok = file.type.startsWith('image/') || isHeicLike(file);
    if (!ok) {
      toast.error('Please drop an image file');
      return;
    }
    if (target === 'add') {
      const wasHeic = isHeicLike(file);
      if (wasHeic) toast.loading('Converting HEIC…', { id: 'heic-drop' });
      try {
        const normalized = await normalizeImageFileForMenu(file);
        if (wasHeic) {
          toast.dismiss('heic-drop');
          toast.success('HEIC ready for upload');
        }
        setNewImage(normalized);
        setNewImagePreview(URL.createObjectURL(normalized));
      } catch (err) {
        toast.dismiss('heic-drop');
        toast.error(err.message || 'Could not read this image');
      }
    } else if (target && isOwner && !DEMO_MODE) {
      handleImageUploadForItem(target, file);
    }
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!restaurantId || !newCategoryId || !newName.trim() || newPrice === '') {
      toast.error('Choose a category, name, and price');
      return;
    }
    const price = Number(newPrice);
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      let image_url = null;
      if (newImage && !DEMO_MODE) {
        try {
          image_url = await uploadMenuImage(newImage, restaurantId);
        } catch (imgErr) {
          toast.error(imgErr.message || 'Image upload failed');
          setSaving(false);
          return;
        }
      }
      const payload = {
        restaurant_id: restaurantId,
        category_id: newCategoryId,
        name: newName.trim(),
        description: newDesc.trim() || null,
        price,
        is_available: true,
        image_url: image_url || undefined,
      };
      const created = await api.createMenuItem(payload);
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewPrice('');
      setNewDesc('');
      setNewImage(null);
      setNewImagePreview(null);
      toast.success('Menu item added');
    } catch (err) {
      toast.error(err.message || 'Could not add item');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUploadForItem(itemId, file) {
    if (!file?.type.startsWith('image/') && !isHeicLike(file)) {
      toast.error('Please select an image');
      return;
    }
    setUploadingFor(itemId);
    try {
      const url = await uploadMenuImage(file, restaurantId);
      const updated = await api.updateMenuItem(itemId, { image_url: url });
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, image_url: updated.image_url || url } : i)));
      toast.success('Image updated');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingFor(null);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name || '');
    setEditPrice(String(item.price ?? ''));
    setEditDesc(item.description || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSaving(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editingId || !isOwner) return;
    const price = Number(editPrice);
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await api.updateMenuItem(editingId, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        price,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, ...updated, categories: i.categories } : i)),
      );
      toast.success('Item updated');
      cancelEdit();
    } catch {
      toast.error('Could not save changes');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Remove “${name}” from the menu? This cannot be undone.`)) return;
    try {
      await api.deleteMenuItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Item removed');
    } catch {
      toast.error('Could not remove item');
    }
  }

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const available = filtered.filter((i) => i.is_available);
  const unavailable = filtered.filter((i) => !i.is_available);

  if (!restaurantId) {
    return (
      <div>
        <h1 className="text-2xl font-black text-ink">Menu & stock</h1>
        <p className="mt-3 text-sm text-muted">No restaurant linked to this login.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink">Menu & stock</h1>
        <p className="text-sm text-muted mt-0.5">
          {isOwner
            ? 'Toggle availability, add new dishes, or remove items from the menu.'
            : 'Toggle item availability — owners can add or remove dishes here.'}
        </p>
      </div>

      {isOwner && (
        <Card
          className={`p-5 mb-6 transition-colors overflow-visible ${dropTarget === 'add' ? 'ring-2 ring-primary bg-primary-soft/30' : ''}`}
          onDragEnter={(e) => { preventDefaults(e); setDropTarget('add'); }}
          onDragLeave={(e) => { preventDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null); }}
          onDragOver={preventDefaults}
          onDrop={(e) => {
            preventDefaults(e);
            setDropTarget(null);
            const file = e.dataTransfer.files?.[0];
            if (file) handleDroppedFile(file, 'add');
          }}
        >
          <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            Add menu item
          </h2>
          {!DEMO_MODE && (
            <p className="text-[11px] text-muted mb-3">Drag and drop an image here, or use the camera / file button.</p>
          )}
          <form onSubmit={handleCreateCategory} className="mb-4 p-4 rounded-2xl border border-border bg-canvas/80 space-y-2">
            <p className="text-sm font-semibold text-ink">Add category</p>
            <p className="text-xs text-muted">
              Add as many as you need (e.g. Starters, Mains, Drinks). New categories appear in the list below.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Starters"
                className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink"
              />
              <button
                type="submit"
                disabled={creatingCat}
                className="px-4 py-2 rounded-xl bg-gold text-ink text-sm font-bold disabled:opacity-50"
              >
                {creatingCat ? '…' : 'Add category'}
              </button>
            </div>
          </form>
          <form onSubmit={handleAddItem} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-3 relative z-30">
                <label className="block text-[11px] font-semibold text-muted mb-1">Category</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  disabled={categories.length === 0}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm text-ink cursor-pointer pointer-events-auto appearance-auto"
                  style={{ WebkitAppearance: 'menulist' }}
                >
                  {categories.length === 0 ? (
                    <option value="">— Add a category above —</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-semibold text-muted mb-1">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Veg Thukpa"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink placeholder:text-muted"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-muted mb-1">Price (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="450"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink placeholder:text-muted"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-muted mb-1">Description</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short line for guests"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-canvas text-sm text-ink placeholder:text-muted"
                />
              </div>
              <div className="lg:col-span-2 flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 rounded-xl border border-dashed border-border text-sm font-semibold text-muted hover:border-primary/40 hover:text-primary flex items-center justify-center gap-1.5 transition-colors">
                  <Camera size={14} /> {newImagePreview ? 'Change' : 'Image'}
                </button>
                <button
                  type="submit"
                  disabled={saving || categories.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? '…' : 'Add'}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
            {newImagePreview && (
              <div className="flex items-center gap-3">
                <img src={newImagePreview} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-border" />
                <button type="button" onClick={() => { setNewImage(null); setNewImagePreview(null); }}
                  className="text-xs text-danger hover:underline flex items-center gap-1"><X size={12} /> Remove</button>
              </div>
            )}
          </form>
        </Card>
      )}

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex gap-3 mb-5">
        <div className="bg-success-soft text-success text-xs font-bold px-3 py-1.5 rounded-full">
          {available.length} available
        </div>
        <div className="bg-danger-soft text-danger text-xs font-bold px-3 py-1.5 rounded-full">
          {unavailable.length} out of stock
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            {editingId === item.id && isOwner ? (
              <form
                onSubmit={saveEdit}
                className="bg-surface border border-primary/40 rounded-xl px-4 py-3.5 space-y-3 shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-canvas text-sm text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Price (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-canvas text-sm text-ink"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">Description</label>
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-canvas text-sm text-ink"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-muted hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50"
                  >
                    <Check size={14} />
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            ) : (
              <div
                className={`flex items-center gap-4 bg-surface border rounded-xl px-4 py-3.5 transition-opacity
              ${!item.is_available ? 'opacity-55 border-dashed' : 'border-border'}
              ${dropTarget === item.id ? 'ring-2 ring-primary bg-primary-soft/20' : ''}`}
                onDragEnter={(e) => { if (!isOwner || DEMO_MODE) return; preventDefaults(e); setDropTarget(item.id); }}
                onDragLeave={(e) => { preventDefaults(e); if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null); }}
                onDragOver={isOwner && !DEMO_MODE ? preventDefaults : undefined}
                onDrop={isOwner && !DEMO_MODE ? (e) => {
                  preventDefaults(e);
                  setDropTarget(null);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleDroppedFile(file, item.id);
                } : undefined}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (DEMO_MODE || !isOwner) return;
                    setUploadingFor(item.id);
                    editFileRef.current?.click();
                  }}
                  className={`w-10 h-10 bg-canvas rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden
                  ${isOwner && !DEMO_MODE ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group relative' : ''}`}
                  title={isOwner ? 'Click or drop image' : ''}
                >
                  {uploadingFor === item.id && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl">
                      <Upload size={14} className="animate-pulse text-primary" />
                    </div>
                  )}
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package size={18} className="text-muted" />
                  )}
                  {isOwner && !DEMO_MODE && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <Camera size={14} className="text-white" />
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-ink truncate">{item.name}</h3>
                  <p className="text-xs text-muted truncate">{item.categories?.name}</p>
                  <p className="text-sm font-bold text-primary">Rs. {item.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${item.is_available ? 'text-success' : 'text-danger'}`}>
                    {item.is_available ? 'In stock' : 'Out of stock'}
                  </span>
                  <button type="button" onClick={() => handleToggle(item.id)} className="flex-shrink-0" aria-label="Toggle availability">
                    {item.is_available ? (
                      <ToggleRight size={32} className="text-success" />
                    ) : (
                      <ToggleLeft size={32} className="text-muted" />
                    )}
                  </button>
                  {isOwner && !DEMO_MODE && (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="p-2 rounded-xl text-primary hover:bg-primary-soft transition-colors"
                      aria-label="Edit item"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 rounded-xl text-danger hover:bg-danger-soft transition-colors"
                      aria-label="Remove from menu"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          <Package size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No items found</p>
        </div>
      )}

      <input ref={editFileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingFor) handleImageUploadForItem(uploadingFor, file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
