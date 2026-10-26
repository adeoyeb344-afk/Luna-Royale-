import React, { useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  Package,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Box,
  Collection,
  OFFICIAL_CATEGORIES,
  OfficialCategory,
  Order,
  OrderStatus,
  Product,
  ProductAvailability,
  User,
} from '../types';
import {
  createProductAdmin,
  deleteProductAdmin,
  isUserAdmin,
  ProductUpsertInput,
  saveBoxSetAdmin,
  saveCollectionAdmin,
  toggleProductPublishAdmin,
  updateProductAdmin,
  updateProductImagesAdmin,
} from '../services/adminService';
import { ensureAdminVerifiedInFirestore } from '../services/authService';
import {
  confirmOrderShippingFeeAdmin,
  getAllOrdersAdmin,
  subscribeToAllOrdersAdmin,
  updateOrderStatusAdmin,
} from '../services/orderService';
import {
  getCloudinaryStatus,
  isValidMediaUrl,
  saveCloudinaryPublicConfig,
  uploadImageToCloudinary,
} from '../services/mediaService';
import {
  formatDisplayDate,
  formatNaira,
  getCustomerCategoryLabel,
} from '../services/firestoreService';
import { getUserFriendlyErrorMessage } from '../services/firebase';
import { ProductMedia } from '../components/ProductMedia';

interface AdminDashboardPageProps {
  user: User | null;
  products: Product[];
  collections: Collection[];
  boxes: Box[];
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  products,
  collections,
  boxes,
}) => {
  const [activeTab, setActiveTab] = useState<
    'products' | 'collections' | 'boxes' | 'orders'
  >('products');

  // Product Form State (restores any unsaved draft / uploaded Cloudinary image URLs)
  const DRAFT_STORAGE_KEY = 'lr_admin_product_draft_v1';
  const initialDraft = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState<string>(initialDraft?.prodName || '');
  const [prodCategory, setProdCategory] = useState<OfficialCategory>(
    initialDraft?.prodCategory || 'Jewelry'
  );
  const [prodPrice, setProdPrice] = useState<string>(
    initialDraft?.prodPrice || ''
  );
  const [prodAvailability, setProdAvailability] =
    useState<ProductAvailability>(
      initialDraft?.prodAvailability || 'in_stock'
    );
  const [prodDescription, setProdDescription] = useState<string>(
    initialDraft?.prodDescription || ''
  );
  const [prodPublished, setProdPublished] = useState<boolean>(
    typeof initialDraft?.prodPublished === 'boolean'
      ? initialDraft.prodPublished
      : true
  );
  const [prodImages, setProdImages] = useState<string[]>(
    Array.isArray(initialDraft?.prodImages) ? initialDraft.prodImages : []
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [prodCollectionIds, setProdCollectionIds] = useState<string[]>(
    Array.isArray(initialDraft?.prodCollectionIds)
      ? initialDraft.prodCollectionIds
      : []
  );
  const [prodBoxIds, setProdBoxIds] = useState<string[]>(
    Array.isArray(initialDraft?.prodBoxIds) ? initialDraft.prodBoxIds : []
  );
  const [savingProduct, setSavingProduct] = useState(false);

  // Media / Cloudinary State
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const [cloudinaryMode, setCloudinaryMode] = useState<
    'signed' | 'unsigned' | 'unconfigured'
  >('unconfigured');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState('');
  const [showCloudinarySetup, setShowCloudinarySetup] = useState(false);
  const [savingCloudinarySetup, setSavingCloudinarySetup] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingRowProductId, setUploadingRowProductId] = useState<
    string | null
  >(null);

  // Admin Orders State
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [orderShippingFilter, setOrderShippingFilter] = useState<
    'all' | 'pending' | 'confirmed'
  >('all');
  const [shippingFeeInput, setShippingFeeInput] = useState<
    Record<string, string>
  >({});
  const [shippingNotesInput, setShippingNotesInput] = useState<
    Record<string, string>
  >({});
  const [confirmingShippingId, setConfirmingShippingId] = useState<string | null>(
    null
  );
  const [editingShippingOrderId, setEditingShippingOrderId] = useState<
    string | null
  >(null);

  // Feedback banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = isUserAdmin(user);

  const handleRefreshOrders = async () => {
    if (!isAdmin) return;
    try {
      setRefreshingOrders(true);
      const orders = await getAllOrdersAdmin();
      setAllOrders(orders);
    } catch (err) {
      console.warn('Orders refresh issue:', err);
    } finally {
      setRefreshingOrders(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    ensureAdminVerifiedInFirestore().catch(() => {});
    getCloudinaryStatus().then((status) => {
      setCloudinaryReady(status.configured);
      setCloudinaryMode(status.mode);
      if (status.cloudName) setCloudinaryCloudName(status.cloudName);
      if (status.uploadPreset) setCloudinaryUploadPreset(status.uploadPreset);
    });
    setOrdersLoading(true);
    const unsubscribeOrders = subscribeToAllOrdersAdmin(
      (orders) => {
        setAllOrders(orders);
        setOrdersLoading(false);
      },
      async (err) => {
        console.warn('Real-time admin orders subscription error, fetching directly:', err);
        try {
          const directOrders = await getAllOrdersAdmin();
          setAllOrders(directOrders);
        } catch {
          // Keep existing state
        } finally {
          setOrdersLoading(false);
        }
      }
    );
    return () => unsubscribeOrders();
  }, [isAdmin]);

  useEffect(() => {
    if (editingProductId || typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          prodName,
          prodCategory,
          prodPrice,
          prodAvailability,
          prodDescription,
          prodPublished,
          prodImages,
          prodCollectionIds,
          prodBoxIds,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [
    editingProductId,
    prodName,
    prodCategory,
    prodPrice,
    prodAvailability,
    prodDescription,
    prodPublished,
    prodImages,
    prodCollectionIds,
    prodBoxIds,
  ]);

  // Dynamic Admin Authorization Gate (/users/{uid}.admin === true)
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="border border-[#701F36]/30 bg-[#F4F1E8]/70 p-8 sm:p-12">
          <ShieldAlert className="mx-auto h-8 w-8 text-[#701F36]" />
          <h1 className="mt-4 font-display text-2xl text-[#0B0B0B]">
            Administrator Authorization Required
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-[#0B0B0B]/70">
            Access to the LUNA ROYALE Admin Dashboard is determined dynamically from your Firestore user record (<code className="font-mono">/users/&#123;uid&#125;.admin == true</code>).
          </p>
          {user && (
            <div className="mt-6">
              <button
                type="button"
                onClick={async () => {
                  setErrorMessage(null);
                  try {
                    await ensureAdminVerifiedInFirestore();
                  } catch (err) {
                    setErrorMessage(getUserFriendlyErrorMessage(err, 'Failed to verify admin status in Firestore.'));
                  }
                }}
                className="inline-flex items-center gap-2 bg-[#701F36] px-5 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors"
              >
                <span>Authorize & Verify in Firestore</span>
              </button>
            </div>
          )}
          {errorMessage && (
            <div className="mt-4 border border-[#701F36]/40 bg-[#701F36]/5 p-3 text-xs text-[#701F36]">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory('Jewelry');
    setProdPrice('');
    setProdAvailability('in_stock');
    setProdDescription('');
    setProdPublished(true);
    setProdImages([]);
    setNewImageUrl('');
    setProdCollectionIds([]);
    setProdBoxIds([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  };

  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdPrice(String(p.price));
    setProdAvailability(p.availability);
    setProdDescription(p.description);
    setProdPublished(p.published);
    setProdImages([...p.images]);
    setProdCollectionIds([...p.collectionIds]);
    setProdBoxIds([...p.boxIds]);
    setFeedbackMessage(null);
    setErrorMessage(null);
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (!isValidMediaUrl(trimmed)) {
      setErrorMessage('Please enter a valid http:// or https:// image URL.');
      return;
    }
    setProdImages((prev) => [...prev, trimmed]);
    setNewImageUrl('');
    setErrorMessage(null);
  };

  const handleSaveCloudinaryPreset = async () => {
    setSavingCloudinarySetup(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const status = await saveCloudinaryPublicConfig(
        cloudinaryCloudName,
        cloudinaryUploadPreset
      );
      setCloudinaryReady(status.configured);
      setCloudinaryMode(status.mode);
      setShowCloudinarySetup(false);
      setFeedbackMessage(
        `Cloudinary unsigned upload preset (${status.cloudName}) configured.`
      );
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(
          err,
          'Unable to save Cloudinary unsigned preset configuration.'
        )
      );
    } finally {
      setSavingCloudinarySetup(false);
    }
  };

  const handleCloudinaryFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (!cloudinaryReady) {
      setShowCloudinarySetup(true);
      setErrorMessage(
        'Please enter your Cloudinary Cloud Name and Unsigned Upload Preset below before uploading.'
      );
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const secureUrl = await uploadImageToCloudinary(file);
        uploadedUrls.push(secureUrl);
      }

      const nextImages = [...prodImages, ...uploadedUrls];
      setProdImages(nextImages);

      // When editing an existing product, save the Cloudinary URL to Firestore
      if (editingProductId) {
        await updateProductImagesAdmin(editingProductId, nextImages);
        setFeedbackMessage(
          `Uploaded to Cloudinary and saved image to "${prodName || 'product'}" in Firestore.`
        );
      } else {
        setFeedbackMessage(
          `Uploaded to Cloudinary and attached to product form. Click "Create Product" to persist to Firestore.`
        );
      }
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Failed to upload image to Cloudinary.')
      );
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDirectProductRowImageUpload = async (
    product: Product,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (!cloudinaryReady) {
      setShowCloudinarySetup(true);
      setErrorMessage(
        'Please configure your Cloudinary Cloud Name and Unsigned Upload Preset in the Product Images panel first.'
      );
      e.target.value = '';
      return;
    }

    setUploadingRowProductId(product.id);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const secureUrl = await uploadImageToCloudinary(file);
        uploadedUrls.push(secureUrl);
      }

      const updatedImages = [...product.images, ...uploadedUrls];
      await updateProductImagesAdmin(product.id, updatedImages);

      if (editingProductId === product.id) {
        setProdImages(updatedImages);
      }

      setFeedbackMessage(
        `Uploaded to Cloudinary and automatically saved image to "${product.name}" in Firestore.`
      );
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Failed to upload image to Cloudinary.')
      );
    } finally {
      setUploadingRowProductId(null);
      e.target.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    const parsedPrice = Number(prodPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Please enter a valid non-negative price in NGN (₦).');
      setSavingProduct(false);
      return;
    }

    const input: ProductUpsertInput = {
      name: prodName,
      category: prodCategory,
      description: prodDescription,
      price: parsedPrice,
      availability: prodAvailability,
      images: prodImages,
      published: prodPublished,
      collectionIds: prodCollectionIds,
      boxIds: prodBoxIds,
    };

    try {
      if (editingProductId) {
        await updateProductAdmin(editingProductId, input);
        setFeedbackMessage(`Product "${prodName}" updated successfully in Firestore.`);
      } else {
        const newId = await createProductAdmin(input);
        setFeedbackMessage(`Product "${prodName}" created successfully in Firestore (ID: ${newId}).`);
      }
      resetProductForm();
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Unable to save product.')
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setFeedbackMessage(null);
    setErrorMessage(null);
    try {
      await deleteProductAdmin(product.id);
      if (editingProductId === product.id) {
        resetProductForm();
      }
      setFeedbackMessage(`Deleted "${product.name}".`);
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Unable to delete product.')
      );
    }
  };

  const handleTogglePublish = async (product: Product) => {
    setFeedbackMessage(null);
    setErrorMessage(null);
    try {
      await toggleProductPublishAdmin(product.id, !product.published);
      setFeedbackMessage(
        `${product.name} is now ${!product.published ? 'published' : 'unpublished'}.`
      );
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Unable to update publish status.')
      );
    }
  };

  const handleToggleProductInCollection = async (
    col: Collection,
    productId: string
  ) => {
    setFeedbackMessage(null);
    setErrorMessage(null);
    const exists = col.productIds.includes(productId);
    const updatedIds = exists
      ? col.productIds.filter((id) => id !== productId)
      : [...col.productIds, productId];

    try {
      await saveCollectionAdmin({
        ...col,
        productIds: updatedIds,
      });
      setFeedbackMessage(`Updated ${col.name}.`);
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Unable to update collection.')
      );
    }
  };

  const handleOrderStatusChange = async (
    orderId: string,
    status: OrderStatus
  ) => {
    setFeedbackMessage(null);
    setErrorMessage(null);
    try {
      await updateOrderStatusAdmin(orderId, status);
      setFeedbackMessage(`Order #${orderId.slice(0, 8)} updated to ${status}.`);
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Unable to update order status.')
      );
    }
  };

  const handleConfirmShippingFee = async (orderId: string) => {
    const rawFee = shippingFeeInput[orderId];
    const numFee = Number(rawFee);
    if (!rawFee || !Number.isFinite(numFee) || numFee < 0) {
      setErrorMessage('Please enter a valid shipping fee (0 or greater) in NGN.');
      return;
    }
    setConfirmingShippingId(orderId);
    setFeedbackMessage(null);
    setErrorMessage(null);
    try {
      await confirmOrderShippingFeeAdmin(
        orderId,
        numFee,
        shippingNotesInput[orderId] || undefined
      );
      setFeedbackMessage(
        `Shipping fee of ${formatNaira(numFee)} confirmed for Order #${orderId.slice(0, 8)}. The customer can now complete payment.`
      );
      setEditingShippingOrderId(null);
      setShippingFeeInput((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(err, 'Unable to confirm shipping fee.')
      );
    } finally {
      setConfirmingShippingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          LUNA ROYALE Management
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-xs text-[#0B0B0B]/65">
          Manage official products, collections, boxes & sets, and customer orders in Firestore.
        </p>

        {/* Admin Section Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
              activeTab === 'products'
                ? 'bg-[#701F36] text-[#F8F6EF]'
                : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
              activeTab === 'collections'
                ? 'bg-[#701F36] text-[#F8F6EF]'
                : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
            }`}
          >
            Collections ({collections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('boxes')}
            className={`px-4 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
              activeTab === 'boxes'
                ? 'bg-[#701F36] text-[#F8F6EF]'
                : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
            }`}
          >
            Boxes & Sets ({boxes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#701F36] text-[#F8F6EF]'
                : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
            }`}
          >
            Orders ({allOrders.length})
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="mt-6 border border-[#0B0B0B]/20 bg-[#F4F1E8] p-4 text-xs font-medium text-[#0B0B0B]">
          {feedbackMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mt-6 border border-[#701F36]/40 bg-[#701F36]/5 p-4 text-xs text-[#701F36]">
          {errorMessage}
        </div>
      )}

      {/* TAB 1: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Add / Edit Product Form */}
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-5 border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6 sm:p-8 self-start"
          >
            <div className="flex items-center justify-between border-b border-[#0B0B0B]/10 pb-4">
              <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
                {editingProductId ? 'Edit Product' : 'Add New Product'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-[#701F36] hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0B0B0B]/80">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Enter official product name"
                  className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-[#0B0B0B]/80">
                    Official Category
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) =>
                      setProdCategory(e.target.value as OfficialCategory)
                    }
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  >
                    {OFFICIAL_CATEGORIES.map((c) => (
                      <option key={c.internalCategory} value={c.internalCategory}>
                        {c.internalCategory} ({c.customerLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#0B0B0B]/80">
                    Price in NGN (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="0"
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs tabular-nums text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-[#0B0B0B]/80">
                    Availability
                  </label>
                  <select
                    value={prodAvailability}
                    onChange={(e) =>
                      setProdAvailability(e.target.value as ProductAvailability)
                    }
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  >
                    <option value="in_stock">Available (In Stock)</option>
                    <option value="limited">Limited Availability</option>
                    <option value="out_of_stock">Unavailable (Out of Stock)</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodPublished}
                      onChange={(e) => setProdPublished(e.target.checked)}
                      className="h-4 w-4 accent-[#701F36]"
                    />
                    <span className="font-medium text-[#0B0B0B]">
                      Published publicly
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0B0B0B]/80">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Enter product description and craftsmanship details..."
                  className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white p-3 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                />
              </div>

              {/* Product Images */}
              <div className="border-t border-[#0B0B0B]/10 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="block font-medium text-[#0B0B0B]/80">
                    Product Images (URLs / Cloudinary)
                  </label>
                  {cloudinaryMode !== 'signed' && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowCloudinarySetup((prev) => !prev)
                      }
                      className="text-[11px] text-[#701F36] hover:underline"
                    >
                      {cloudinaryReady
                        ? `Cloudinary (${cloudinaryCloudName})`
                        : 'Configure Cloudinary Preset'}
                    </button>
                  )}
                </div>

                {/* Device File Upload to Cloudinary */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 border border-[#701F36] bg-[#701F36]/5 px-3.5 py-2 text-xs font-medium text-[#701F36] hover:bg-[#701F36] hover:text-[#F8F6EF] transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>
                      {uploadingImage
                        ? 'Uploading to Cloudinary...'
                        : 'Upload Image from Device (Cloudinary)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleCloudinaryFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Unsigned Upload Preset Configuration Panel (Public Cloud Name & Preset only — never API secrets) */}
                {(showCloudinarySetup || !cloudinaryReady) &&
                  cloudinaryMode !== 'signed' && (
                    <div className="mt-3 border border-[#0B0B0B]/15 bg-white p-3 space-y-2.5">
                      <p className="text-[11px] font-medium text-[#0B0B0B]">
                        Cloudinary Unsigned Upload Configuration
                      </p>
                      <p className="text-[11px] leading-relaxed text-[#0B0B0B]/60">
                        Enter your Cloudinary Cloud Name and an Unsigned Upload Preset for direct browser uploads (never enter an API secret).
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={cloudinaryCloudName}
                          onChange={(e) =>
                            setCloudinaryCloudName(e.target.value)
                          }
                          placeholder="Cloud Name (e.g. dxyz...)"
                          className="border border-[#0B0B0B]/20 bg-[#F8F6EF]/50 px-2.5 py-1.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={cloudinaryUploadPreset}
                          onChange={(e) =>
                            setCloudinaryUploadPreset(e.target.value)
                          }
                          placeholder="Unsigned Upload Preset"
                          className="border border-[#0B0B0B]/20 bg-[#F8F6EF]/50 px-2.5 py-1.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {cloudinaryReady && (
                          <button
                            type="button"
                            onClick={() => setShowCloudinarySetup(false)}
                            className="px-2.5 py-1 text-[11px] text-[#0B0B0B]/60 hover:text-[#0B0B0B]"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={savingCloudinarySetup}
                          onClick={handleSaveCloudinaryPreset}
                          className="bg-[#0B0B0B] px-3 py-1.5 text-[11px] font-medium tracking-wider text-[#F8F6EF] hover:bg-[#701F36] transition-colors disabled:opacity-50"
                        >
                          {savingCloudinarySetup
                            ? 'Saving...'
                            : 'Save Cloudinary Preset'}
                        </button>
                      </div>
                    </div>
                  )}

                {/* Existing Manual URL Field (Kept 100% functional) */}
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="inline-flex items-center gap-1 border border-[#0B0B0B]/25 bg-white px-3 py-2 text-xs font-medium text-[#0B0B0B] hover:border-[#701F36]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {prodImages.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {prodImages.map((url, idx) => (
                      <li
                        key={`${url}-${idx}`}
                        className="flex items-center justify-between gap-2 border border-[#0B0B0B]/10 bg-white px-2.5 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={url}
                            alt=""
                            className="h-8 w-8 shrink-0 object-cover border border-[#0B0B0B]/10"
                          />
                          <span className="truncate text-[11px] text-[#0B0B0B]/70">
                            {url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const updated = prodImages.filter(
                              (_, i) => i !== idx
                            );
                            setProdImages(updated);
                            if (editingProductId) {
                              try {
                                await updateProductImagesAdmin(
                                  editingProductId,
                                  updated
                                );
                              } catch {
                                // Ignore until form save
                              }
                            }
                          }}
                          className="text-[#701F36] hover:underline shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Associate Collections */}
              <div className="border-t border-[#0B0B0B]/10 pt-4">
                <p className="font-medium text-[#0B0B0B]/80">
                  Associate Collections
                </p>
                <div className="mt-2 space-y-1.5">
                  {collections.map((col) => {
                    const checked = prodCollectionIds.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0B0B0B]/80"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProdCollectionIds((prev) => [...prev, col.id]);
                            } else {
                              setProdCollectionIds((prev) =>
                                prev.filter((id) => id !== col.id)
                              );
                            }
                          }}
                          className="h-3.5 w-3.5 accent-[#701F36]"
                        />
                        <span>{col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Associate Boxes & Sets */}
              <div className="border-t border-[#0B0B0B]/10 pt-4">
                <p className="font-medium text-[#0B0B0B]/80">
                  Associate Boxes & Sets
                </p>
                <div className="mt-2 space-y-1.5">
                  {boxes.map((box) => {
                    const checked = prodBoxIds.includes(box.id);
                    return (
                      <label
                        key={box.id}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0B0B0B]/80"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProdBoxIds((prev) => [...prev, box.id]);
                            } else {
                              setProdBoxIds((prev) =>
                                prev.filter((id) => id !== box.id)
                              );
                            }
                          }}
                          className="h-3.5 w-3.5 accent-[#701F36]"
                        />
                        <span>{box.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProduct}
                className="w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
              >
                {savingProduct
                  ? 'Saving...'
                  : editingProductId
                    ? 'Save Product Changes'
                    : 'Create Product'}
              </button>
            </div>
          </form>

          {/* Existing Products List */}
          <div className="lg:col-span-7">
            <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
              Catalog Products ({products.length})
            </h2>

            {products.length === 0 ? (
              <div className="mt-6 border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 p-12 text-center">
                <p className="font-display text-base text-[#0B0B0B]">
                  No products available yet.
                </p>
                <p className="mt-1 text-xs text-[#0B0B0B]/60">
                  Use the form on the left to add real LUNA ROYALE products to Firestore.
                </p>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-[#0B0B0B]/10 border-t border-b border-[#0B0B0B]/10">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-14 shrink-0">
                        <ProductMedia
                          src={p.images[0] || null}
                          alt={p.name}
                          aspectClassName="h-16 w-14"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#0B0B0B]/60">
                          <span>{p.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{getCustomerCategoryLabel(p.category)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              p.published ? 'text-[#0B0B0B]' : 'text-[#701F36]'
                            }
                          >
                            {p.published ? 'Published' : 'Unpublished'}
                          </span>
                        </div>
                        <h3 className="mt-0.5 font-display text-sm font-medium text-[#0B0B0B]">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium tabular-nums text-[#701F36]">
                          {formatNaira(p.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <label className="inline-flex cursor-pointer items-center gap-1 border border-[#701F36]/40 px-3 py-1.5 text-xs text-[#701F36] hover:bg-[#701F36] hover:text-[#F8F6EF] transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        <span>
                          {uploadingRowProductId === p.id
                            ? 'Uploading...'
                            : 'Upload Image'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingRowProductId === p.id}
                          onChange={(e) =>
                            handleDirectProductRowImageUpload(p, e)
                          }
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleTogglePublish(p)}
                        className="inline-flex items-center gap-1 border border-[#0B0B0B]/20 px-3 py-1.5 text-xs text-[#0B0B0B] hover:border-[#701F36]"
                      >
                        {p.published ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Unpublish</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Publish</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditProduct(p)}
                        className="inline-flex items-center gap-1 border border-[#0B0B0B]/20 px-3 py-1.5 text-xs text-[#0B0B0B] hover:border-[#701F36]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p)}
                        aria-label={`Delete ${p.name}`}
                        className="inline-flex items-center justify-center border border-[#0B0B0B]/20 p-1.5 text-[#0B0B0B]/60 hover:border-[#701F36] hover:text-[#701F36]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COLLECTIONS MANAGEMENT */}
      {activeTab === 'collections' && (
        <div className="mt-10 space-y-8">
          {collections.map((col) => (
            <div
              key={col.id}
              className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6"
            >
              <div className="flex flex-col justify-between gap-2 border-b border-[#0B0B0B]/10 pb-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-base font-medium tracking-wider text-[#0B0B0B]">
                    {col.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#0B0B0B]/65">
                    {col.description}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-[#701F36]">
                  {
                    products.filter(
                      (p) =>
                        col.productIds.includes(p.id) ||
                        p.collectionIds.includes(col.id)
                    ).length
                  }{' '}
                  associated products
                </span>
              </div>

              <div className="mt-4">
                {products.length === 0 ? (
                  <p className="text-xs text-[#0B0B0B]/55">
                    No products in catalog yet. Add products first to associate them with {col.name}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((p) => {
                      const isAssociated =
                        col.productIds.includes(p.id) ||
                        p.collectionIds.includes(col.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            handleToggleProductInCollection(col, p.id)
                          }
                          className={`flex items-center justify-between border px-3 py-2 text-left text-xs transition-colors ${
                            isAssociated
                              ? 'border-[#701F36] bg-[#701F36]/10 text-[#0B0B0B]'
                              : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B]/70'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isAssociated && (
                            <Check className="h-3.5 w-3.5 text-[#701F36] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: BOXES & SETS MANAGEMENT */}
      {activeTab === 'boxes' && (
        <div className="mt-10 space-y-8">
          {boxes.map((box) => (
            <BoxAdminEditor
              key={box.id}
              box={box}
              products={products}
              onSave={async (updated) => {
                setFeedbackMessage(null);
                setErrorMessage(null);
                try {
                  await saveBoxSetAdmin(updated);
                  setFeedbackMessage(`Saved configuration for ${box.name}.`);
                } catch (err) {
                  setErrorMessage(
                    getUserFriendlyErrorMessage(
                      err,
                      `Unable to save ${box.name}.`
                    )
                  );
                }
              }}
            />
          ))}
        </div>
      )}

      {/* TAB 4: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="mt-10">
          <div className="flex flex-col justify-between gap-4 border-b border-[#0B0B0B]/12 pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
                Customer Orders & Fulfillment
              </p>
              <h2 className="mt-1 font-display text-xl tracking-wider text-[#0B0B0B] tabular-nums">
                Customer Orders ({allOrders.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={refreshingOrders || ordersLoading}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto border border-[#0B0B0B]/20 bg-white px-3.5 py-1.5 text-xs font-medium text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors disabled:opacity-50"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${
                  refreshingOrders || ordersLoading ? 'animate-spin text-[#701F36]' : ''
                }`}
              />
              <span>
                {refreshingOrders || ordersLoading ? 'Synchronizing...' : 'Refresh Orders'}
              </span>
            </button>
          </div>

          {/* Shipping Fee Status Filter Tabs */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-[#0B0B0B]/10 pb-3 text-xs">
            <button
              type="button"
              onClick={() => setOrderShippingFilter('all')}
              className={`px-3 py-1 font-medium transition-colors ${
                orderShippingFilter === 'all'
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'border border-[#0B0B0B]/15 bg-white text-[#0B0B0B]/80 hover:border-[#701F36]'
              }`}
            >
              All Orders ({allOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setOrderShippingFilter('pending')}
              className={`px-3 py-1 font-medium transition-colors ${
                orderShippingFilter === 'pending'
                  ? 'bg-amber-800 text-white'
                  : 'border border-amber-600/30 bg-amber-500/10 text-amber-900 hover:border-amber-700'
              }`}
            >
              Awaiting Shipping Confirmation ({allOrders.filter((o) => o.shippingStatus === 'pending_confirmation').length})
            </button>
            <button
              type="button"
              onClick={() => setOrderShippingFilter('confirmed')}
              className={`px-3 py-1 font-medium transition-colors ${
                orderShippingFilter === 'confirmed'
                  ? 'bg-emerald-800 text-white'
                  : 'border border-emerald-600/30 bg-emerald-500/10 text-emerald-900 hover:border-emerald-700'
              }`}
            >
              Shipping Confirmed ({allOrders.filter((o) => o.shippingStatus === 'confirmed').length})
            </button>
          </div>

          {allOrders.length === 0 ? (
            <div className="mt-6 border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 p-16 text-center">
              <Package className="mx-auto h-6 w-6 text-[#701F36]" />
              <p className="mt-3 font-display text-base text-[#0B0B0B]">
                Orders (0)
              </p>
              <p className="mt-1 text-xs text-[#0B0B0B]/60">
                {ordersLoading
                  ? 'Loading customer orders...'
                  : 'No customer orders have been placed yet.'}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {allOrders
                .filter((order) => {
                  if (orderShippingFilter === 'pending') {
                    return order.shippingStatus === 'pending_confirmation';
                  }
                  if (orderShippingFilter === 'confirmed') {
                    return order.shippingStatus === 'confirmed';
                  }
                  return true;
                })
                .map((order) => {
                  const isShippingPending =
                    order.shippingStatus === 'pending_confirmation';
                  const isEditingShipping =
                    editingShippingOrderId === order.id;

                  return (
                    <article
                      key={order.id}
                      className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 border-b border-[#0B0B0B]/10 pb-4 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-[#0B0B0B]">
                              Order #{order.id}
                            </span>
                            {order.createdAt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#0B0B0B]/60">
                                  {formatDisplayDate(order.createdAt)}
                                </span>
                              </>
                            )}
                            <span
                              className={`px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase border ${
                                isShippingPending
                                  ? 'border-amber-600/30 bg-amber-500/10 text-amber-900'
                                  : 'border-emerald-600/30 bg-emerald-500/10 text-emerald-900'
                              }`}
                            >
                              {isShippingPending
                                ? 'Shipping: Awaiting Fee'
                                : `Shipping: Confirmed (${formatNaira(order.shippingFee || 0)})`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#0B0B0B]/75">
                            {order.customerName} · {order.customerEmail}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-[#0B0B0B]/50">
                              Order Total
                            </p>
                            <span className="font-display text-base font-semibold tabular-nums text-[#701F36]">
                              {formatNaira(order.totalAmount || (order.subtotal + (order.shippingFee || 0)))}
                            </span>
                          </div>

                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleOrderStatusChange(
                                order.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className="border border-[#0B0B0B]/25 bg-white px-3 py-1.5 text-xs font-medium text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                          >
                            <option value="pending">Pending Payment</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 text-xs">
                        <div>
                          <p className="font-medium text-[#0B0B0B]/70 uppercase tracking-wider">
                            Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {order.items.map((item) => (
                              <li
                                key={item.productId}
                                className="flex justify-between text-[#0B0B0B]"
                              >
                                <span>
                                  {item.name} × {item.quantity}
                                </span>
                                <span className="tabular-nums">
                                  {formatNaira(item.price * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 border-t border-[#0B0B0B]/10 pt-2 flex justify-between font-medium">
                            <span>Products Subtotal</span>
                            <span className="tabular-nums">{formatNaira(order.subtotal)}</span>
                          </div>
                        </div>

                        <div>
                          <p className="font-medium text-[#0B0B0B]/70 uppercase tracking-wider">
                            Delivery Destination
                          </p>
                          <p className="mt-2 text-[#0B0B0B]/80 font-medium">
                            {order.deliveryInfo.recipientName} ({order.deliveryInfo.phone})
                          </p>
                          <p className="text-[#0B0B0B]/70 mt-0.5 leading-relaxed">
                            {order.deliveryInfo.streetAddress},{' '}
                            {order.deliveryInfo.city}, {order.deliveryInfo.state}
                            {order.deliveryInfo.postalCode ? ` (${order.deliveryInfo.postalCode})` : ''},{' '}
                            <span className="font-semibold text-[#0B0B0B]">{order.deliveryInfo.country}</span>
                          </p>
                          {order.deliveryInfo.deliveryNotes && (
                            <p className="mt-1.5 text-[11px] italic text-[#0B0B0B]/60">
                              Notes: {order.deliveryInfo.deliveryNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Worldwide Shipping Review & Confirmation Area */}
                      {isShippingPending || isEditingShipping ? (
                        <div className="mt-5 border border-amber-600/30 bg-amber-500/10 p-4 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-600/20 pb-2">
                            <span className="font-semibold text-amber-900 uppercase tracking-wider">
                              Atelier Worldwide Shipping Review
                            </span>
                            <span className="text-amber-800 font-medium">
                              Destination: {order.deliveryInfo.city}, {order.deliveryInfo.country}
                            </span>
                          </div>
                          <p className="mt-2 text-amber-900/80 leading-relaxed">
                            Review destination above. Enter the verified priority courier fee in NGN. Customer payment is locked until this fee is confirmed.
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <label className="block text-[11px] font-medium text-[#0B0B0B]/80">
                                Actual Shipping Fee in NGN (₦) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="e.g. 15000"
                                value={
                                  shippingFeeInput[order.id] !== undefined
                                    ? shippingFeeInput[order.id]
                                    : order.shippingFee !== null
                                      ? String(order.shippingFee)
                                      : ''
                                }
                                onChange={(e) =>
                                  setShippingFeeInput({
                                    ...shippingFeeInput,
                                    [order.id]: e.target.value,
                                  })
                                }
                                className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-1.5 text-xs tabular-nums text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-[#0B0B0B]/80">
                                Carrier / Courier Notes (Optional)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. DHL Express Worldwide (3-5 days)"
                                value={
                                  shippingNotesInput[order.id] !== undefined
                                    ? shippingNotesInput[order.id]
                                    : order.shippingNotes || ''
                                }
                                onChange={(e) =>
                                  setShippingNotesInput({
                                    ...shippingNotesInput,
                                    [order.id]: e.target.value,
                                  })
                                }
                                className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-1.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <button
                                type="button"
                                disabled={confirmingShippingId === order.id}
                                onClick={() => handleConfirmShippingFee(order.id)}
                                className="flex-1 bg-[#701F36] px-4 py-2 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                              >
                                {confirmingShippingId === order.id
                                  ? 'Confirming...'
                                  : 'Confirm Shipping Fee'}
                              </button>
                              {isEditingShipping && (
                                <button
                                  type="button"
                                  onClick={() => setEditingShippingOrderId(null)}
                                  className="border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] hover:border-[#701F36]"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 border border-[#0B0B0B]/10 bg-white p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="font-medium text-[#0B0B0B]">Confirmed Shipping Fee: </span>
                            <span className="font-display font-semibold tabular-nums text-[#701F36]">
                              {formatNaira(order.shippingFee || 0)}
                            </span>
                            {order.shippingNotes && (
                              <span className="text-[#0B0B0B]/60 ml-2">
                                ({order.shippingNotes})
                              </span>
                            )}
                            <p className="text-[11px] text-[#0B0B0B]/55 mt-0.5">
                              Products: {formatNaira(order.subtotal)} + Shipping: {formatNaira(order.shippingFee || 0)} = <span className="font-semibold text-[#0B0B0B]">Total Payable: {formatNaira(order.totalAmount || (order.subtotal + (order.shippingFee || 0)))}</span>
                            </p>
                          </div>

                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setEditingShippingOrderId(order.id)}
                              className="text-[11px] text-[#701F36] hover:underline whitespace-nowrap self-start sm:self-auto"
                            >
                              Edit Shipping Fee
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BoxAdminEditorProps {
  box: Box;
  products: Product[];
  onSave: (box: Box) => Promise<void>;
}

const BoxAdminEditor: React.FC<BoxAdminEditorProps> = ({
  box,
  products,
  onSave,
}) => {
  const [priceStr, setPriceStr] = useState(
    box.price !== null ? String(box.price) : ''
  );
  const [description, setDescription] = useState(box.description);
  const [productIds, setProductIds] = useState<string[]>(box.productIds);
  const [published, setPublished] = useState(box.published);
  const [imageUrl, setImageUrl] = useState(box.images[0] || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const numPrice = priceStr.trim() ? Number(priceStr) : null;
    const validPrice =
      numPrice !== null && Number.isFinite(numPrice) && numPrice > 0
        ? numPrice
        : null;

    await onSave({
      ...box,
      description,
      productIds,
      price: validPrice,
      published: Boolean(published && validPrice !== null && productIds.length > 0),
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
    });
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6"
    >
      <div className="flex flex-col justify-between gap-2 border-b border-[#0B0B0B]/10 pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-base font-medium tracking-wider text-[#0B0B0B]">
            {box.name}
          </h3>
          <p className="text-xs text-[#701F36]">{box.composition}</p>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-[#0B0B0B] cursor-pointer">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 accent-[#701F36]"
          />
          <span>Publish publicly (requires real products & price)</span>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
        <div>
          <label className="block font-medium text-[#0B0B0B]/80">
            Set Price in NGN (₦)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder="Configure price in ₦"
            className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs tabular-nums text-[#0B0B0B]"
          />
        </div>

        <div>
          <label className="block font-medium text-[#0B0B0B]/80">
            Set Cover Image URL (Optional)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B]"
          />
        </div>

        <div>
          <label className="block font-medium text-[#0B0B0B]/80">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B]"
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-[#0B0B0B]/80">
          Associated Real Products ({productIds.length})
        </p>
        {products.length === 0 ? (
          <p className="mt-1 text-xs text-[#0B0B0B]/55">
            No products in catalog yet. Add real products in the Products tab to include them in {box.name}.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const selected = productIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      setProductIds((prev) => prev.filter((id) => id !== p.id));
                    } else {
                      setProductIds((prev) => [...prev, p.id]);
                    }
                  }}
                  className={`flex items-center justify-between border px-3 py-2 text-left text-xs ${
                    selected
                      ? 'border-[#701F36] bg-[#701F36]/10 text-[#0B0B0B]'
                      : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B]/70'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 text-[#701F36] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#701F36] px-5 py-2.5 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : `Save ${box.name}`}
        </button>
      </div>
    </form>
  );
};
