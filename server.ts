import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.DEFAULT_APP_PORT || process.env.PORT) || 3000;

  // Readiness / health probes for container deployment
  app.get('/_health', (_req, res) => res.status(200).send('OK'));
  app.get('/health', (_req, res) => res.status(200).send('OK'));

  app.use(
    express.json({
      limit: '25mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // ---------------------------------------------------------------------------
  // Ephemeral In-Memory Redirect Handoff Bridge (for Cross-Site Iframe Preview)
  // Allows top-level signInWithRedirect() + getRedirectResult() to securely
  // hand off the resulting Google OAuth credential back to the preview iframe.
  // ---------------------------------------------------------------------------
  const redirectHandoffStore = new Map<
    string,
    { idToken: string | null; accessToken: string | null; expiresAt: number }
  >();

  app.post('/api/auth/redirect-handoff', (req, res) => {
    const { handoffId, idToken, accessToken } = req.body || {};
    if (
      typeof handoffId !== 'string' ||
      !/^[a-zA-Z0-9_-]{12,128}$/.test(handoffId) ||
      (!idToken && !accessToken)
    ) {
      res.status(400).json({ error: 'Invalid handoff payload.' });
      return;
    }

    const now = Date.now();
    for (const [key, entry] of redirectHandoffStore.entries()) {
      if (entry.expiresAt <= now) {
        redirectHandoffStore.delete(key);
      }
    }

    redirectHandoffStore.set(handoffId, {
      idToken: typeof idToken === 'string' ? idToken : null,
      accessToken: typeof accessToken === 'string' ? accessToken : null,
      expiresAt: now + 2 * 60 * 1000,
    });

    res.json({ ok: true });
  });

  app.get('/api/auth/redirect-handoff/:handoffId', (req, res) => {
    const { handoffId } = req.params;
    if (!handoffId || !/^[a-zA-Z0-9_-]{12,128}$/.test(handoffId)) {
      res.status(400).json({ ready: false });
      return;
    }

    const entry = redirectHandoffStore.get(handoffId);
    if (!entry || entry.expiresAt <= Date.now()) {
      redirectHandoffStore.delete(handoffId);
      res.json({ ready: false });
      return;
    }

    res.json({
      ready: true,
      idToken: entry.idToken,
      accessToken: entry.accessToken,
    });
  });

  // ---------------------------------------------------------------------------
  // Server-Side Payment Architecture (Paystack Live Ready)
  // Never exposes secret credentials to the frontend.
  // Never invents transaction records, surcharges, or fees.
  // ---------------------------------------------------------------------------
  const processedWebhookReferences = new Set<string>();

  const getPaystackSecretKey = (): string => {
    const raw = process.env.PAYSTACK_SECRET_KEY || '';
    if (!raw || raw.trim().length === 0 || raw.includes('MY_')) {
      return '';
    }
    return raw.trim();
  };

  const handlePaymentStatus = (_req: express.Request, res: express.Response) => {
    const secretKey = getPaystackSecretKey();
    const isPaystackConfigured = Boolean(secretKey.length > 0);
    res.json({
      gateway: 'paystack',
      configured: isPaystackConfigured,
      currency: 'NGN',
    });
  };

  app.get('/api/payments/status', handlePaymentStatus);
  app.get('/api/paystack/status', handlePaymentStatus);

  const handlePaymentInitialize = async (req: express.Request, res: express.Response) => {
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      res.status(503).json({
        error: 'Paystack Live secret key is not yet configured on the server.',
        configured: false,
      });
      return;
    }

    const { email, amountNaira, reference, metadata, callbackUrl, items, orderId } =
      req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid customer email is required.' });
      return;
    }

    const cleanOrderId = typeof orderId === 'string' ? orderId.trim() : metadata?.orderId || null;
    let validatedAmountNaira = typeof amountNaira === 'number' ? amountNaira : Number(amountNaira);

    if (!Number.isFinite(validatedAmountNaira) || validatedAmountNaira <= 0) {
      res.status(400).json({ error: 'A valid positive NGN amount is required.' });
      return;
    }

    // -------------------------------------------------------------------------
    // Server-Side Trusted Order & Shipping Fee Validation (Zero Trust in Browser)
    // -------------------------------------------------------------------------
    if (cleanOrderId) {
      const authHeader = req.headers.authorization;
      const idToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : null;

      if (idToken) {
        try {
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/luna-royale/databases/(default)/documents/orders/${encodeURIComponent(
            cleanOrderId
          )}`;

          const orderResponse = await fetch(firestoreUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!orderResponse.ok) {
            if (orderResponse.status === 404) {
              res.status(404).json({ error: 'Order not found in the atelier registry.' });
              return;
            }
            if (orderResponse.status === 403 || orderResponse.status === 401) {
              res.status(403).json({ error: 'Unauthorized to initiate payment for this order.' });
              return;
            }
          } else {
            const rawOrderDoc = (await orderResponse.json()) as { fields?: Record<string, any> };
            const fields = rawOrderDoc.fields || {};

            const parseVal = (val: any): any => {
              if (!val || typeof val !== 'object') return val;
              if ('stringValue' in val) return val.stringValue;
              if ('integerValue' in val) return Number(val.integerValue);
              if ('doubleValue' in val) return Number(val.doubleValue);
              if ('booleanValue' in val) return val.booleanValue;
              if ('nullValue' in val) return null;
              if ('arrayValue' in val) return (val.arrayValue.values || []).map(parseVal);
              if ('mapValue' in val) {
                const mapObj: Record<string, any> = {};
                for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
                  mapObj[k] = parseVal(v);
                }
                return mapObj;
              }
              return val;
            };

            const orderData: Record<string, any> = {};
            for (const [k, v] of Object.entries(fields)) {
              orderData[k] = parseVal(v);
            }

            // 1. Enforce that shipping fee MUST be confirmed before payment
            if (orderData.shippingStatus !== 'confirmed') {
              res.status(400).json({
                error:
                  'Shipping fee has not yet been confirmed by the atelier. Payment cannot proceed until shipping is confirmed by an administrator.',
                shippingStatus: orderData.shippingStatus || 'pending_confirmation',
              });
              return;
            }

            // 2. Prevent duplicate payment if already confirmed/paid
            if (
              orderData.status === 'confirmed' ||
              orderData.status === 'processing' ||
              orderData.status === 'shipped' ||
              orderData.status === 'delivered'
            ) {
              res.status(400).json({
                error: 'This order has already been paid and confirmed.',
                status: orderData.status,
              });
              return;
            }

            // 3. Compute trusted payable amount: Items Subtotal + Confirmed Shipping Fee
            const trustedItemsSubtotal =
              typeof orderData.subtotal === 'number'
                ? orderData.subtotal
                : Number(orderData.subtotal || 0);

            const trustedShippingFee =
              typeof orderData.shippingFee === 'number'
                ? orderData.shippingFee
                : Number(orderData.shippingFee || 0);

            if (!Number.isFinite(trustedShippingFee) || trustedShippingFee < 0) {
              res.status(400).json({
                error: 'Confirmed shipping fee is invalid on the server.',
              });
              return;
            }

            const expectedTotal = trustedItemsSubtotal + trustedShippingFee;

            if (Math.abs(validatedAmountNaira - expectedTotal) > 0.05) {
              res.status(400).json({
                error: `Order total mismatch. The expected amount is ₦${expectedTotal.toLocaleString()} (Items: ₦${trustedItemsSubtotal.toLocaleString()} + Shipping: ₦${trustedShippingFee.toLocaleString()}).`,
              });
              return;
            }

            // Always enforce trusted server total exactly
            validatedAmountNaira = expectedTotal;
          }
        } catch (fetchErr) {
          console.warn('Firestore order validation fallback:', fetchErr);
        }
      }
    } else if (Array.isArray(items) && items.length > 0) {
      // Direct cart items check if orderId was not yet created
      let calculatedSum = 0;
      for (const item of items) {
        const itemPrice = typeof item.price === 'number' ? item.price : Number(item.price);
        const itemQuantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
        if (Number.isFinite(itemPrice) && Number.isFinite(itemQuantity) && itemPrice >= 0 && itemQuantity > 0) {
          calculatedSum += itemPrice * itemQuantity;
        }
      }
      if (calculatedSum > 0 && Math.abs(calculatedSum - validatedAmountNaira) > 0.05) {
        res.status(400).json({
          error: 'Order total mismatch. The amount provided does not match item total calculations.',
        });
        return;
      }
    }

    // Exact amount in kobo (LUNA ROYALE absorbs gateway fee, no surcharge added)
    const amountKobo = Math.round(validatedAmountNaira * 100);
    const cleanReference =
      typeof reference === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(reference.trim())
        ? reference.trim()
        : `lr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const effectiveCallbackUrl =
      typeof callbackUrl === 'string' && callbackUrl.trim().length > 0
        ? callbackUrl.trim()
        : typeof req.headers.origin === 'string'
          ? `${req.headers.origin}/cart`
          : undefined;

    const paystackPayload: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      amount: amountKobo,
      currency: 'NGN',
      reference: cleanReference,
      metadata: {
        orderId: cleanOrderId || undefined,
        custom_fields: [
          {
            display_name: 'Store',
            variable_name: 'store',
            value: 'LUNA ROYALE',
          },
          ...(cleanOrderId
            ? [
                {
                  display_name: 'Order ID',
                  variable_name: 'order_id',
                  value: cleanOrderId,
                },
              ]
            : []),
        ],
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
      },
    };

    if (effectiveCallbackUrl) {
      paystackPayload.callback_url = effectiveCallbackUrl;
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paystackPayload),
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        res.status(400).json({
          error: data?.message || 'Unable to initialize payment with Paystack.',
        });
        return;
      }

      res.json({
        status: true,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
      });
    } catch {
      res.status(500).json({ error: 'Payment gateway communication failed.' });
    }
  };

  app.post('/api/payments/initialize', handlePaymentInitialize);
  app.post('/api/paystack/initialize', handlePaymentInitialize);

  const handlePaymentVerify = async (req: express.Request, res: express.Response) => {
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      res.status(503).json({
        error: 'Paystack Live secret key is not yet configured on the server.',
        configured: false,
        verified: false,
      });
      return;
    }

    const { reference } = req.params;
    if (!reference || !/^[a-zA-Z0-9_-]{6,128}$/.test(reference)) {
      res.status(400).json({ error: 'Invalid payment reference.', verified: false });
      return;
    }

    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.status) {
        res.status(400).json({
          error: data?.message || 'Unable to verify transaction.',
          verified: false,
        });
        return;
      }

      const tx = data.data;
      const isSuccess = tx.status === 'success';

      res.json({
        status: true,
        verified: isSuccess,
        transaction: {
          reference: tx.reference,
          status: tx.status,
          amount: tx.amount / 100,
          currency: tx.currency,
          paidAt: tx.paid_at,
          channel: tx.channel,
          orderId: tx.metadata?.orderId || null,
          gatewayResponse: tx.gateway_response,
        },
      });
    } catch {
      res.status(500).json({ error: 'Transaction verification failed.', verified: false });
    }
  };

  app.get('/api/payments/verify/:reference', handlePaymentVerify);
  app.get('/api/paystack/verify/:reference', handlePaymentVerify);

  // Paystack Webhook Handler (HMAC SHA-512 Verification)
  const handlePaystackWebhook = (req: express.Request, res: express.Response) => {
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      res.status(503).json({ error: 'Paystack secret key is not configured.' });
      return;
    }

    const signature = req.headers['x-paystack-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(401).json({ error: 'Missing x-paystack-signature header.' });
      return;
    }

    const payloadBuffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const computedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(payloadBuffer)
      .digest('hex');

    if (signature !== computedSignature) {
      res.status(401).json({ error: 'Invalid webhook signature.' });
      return;
    }

    const event = req.body;
    if (event && event.event === 'charge.success') {
      const data = event.data;
      const reference = data?.reference;

      if (reference) {
        // Idempotent processing: prevent repeated handling of identical references
        if (processedWebhookReferences.has(reference)) {
          res.status(200).json({ received: true, alreadyProcessed: true });
          return;
        }

        // Limit size of processed set to prevent memory growth
        if (processedWebhookReferences.size > 5000) {
          processedWebhookReferences.clear();
        }
        processedWebhookReferences.add(reference);
      }
    }

    // Paystack requires immediate 200 response to acknowledge receipt
    res.status(200).json({ received: true });
  };

  app.post('/api/paystack/webhook', handlePaystackWebhook);
  app.post('/api/payments/webhook', handlePaystackWebhook);

  // ---------------------------------------------------------------------------
  // Server-Side & Unsigned Preset Media Architecture (Cloudinary)
  // Never exposes CLOUDINARY_API_SECRET in frontend code.
  // Supports:
  // 1. Browser unsigned preset uploads (cloudName + uploadPreset)
  // 2. Server-side signed uploads (/api/media/upload or /api/media/signature)
  // ---------------------------------------------------------------------------
  let runtimeCloudinaryConfig: {
    cloudName: string;
    uploadPreset: string;
  } = {
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ||
      '',
    uploadPreset:
      process.env.CLOUDINARY_UPLOAD_PRESET?.trim() ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ||
      '',
  };

  function getResolvedCloudinaryConfig() {
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ||
      runtimeCloudinaryConfig.cloudName ||
      '';
    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET?.trim() ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ||
      runtimeCloudinaryConfig.uploadPreset ||
      '';
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || '';

    const hasSignedCredentials = Boolean(cloudName && apiKey && apiSecret);
    const hasUnsignedPreset = Boolean(cloudName && uploadPreset);

    return {
      cloudName,
      uploadPreset,
      apiKey,
      apiSecret,
      hasSignedCredentials,
      hasUnsignedPreset,
      configured: hasSignedCredentials || hasUnsignedPreset,
      mode: hasSignedCredentials
        ? ('signed' as const)
        : hasUnsignedPreset
          ? ('unsigned' as const)
          : ('unconfigured' as const),
    };
  }

  app.get('/api/media/status', (_req, res) => {
    const cfg = getResolvedCloudinaryConfig();

    res.json({
      provider: 'cloudinary',
      configured: cfg.configured,
      mode: cfg.mode,
      cloudName: cfg.cloudName || null,
      uploadPreset: cfg.uploadPreset || null,
    });
  });

  app.post('/api/media/config', (req, res) => {
    const cloudName =
      typeof req.body?.cloudName === 'string' ? req.body.cloudName.trim() : '';
    const uploadPreset =
      typeof req.body?.uploadPreset === 'string'
        ? req.body.uploadPreset.trim()
        : '';

    if (!cloudName || !uploadPreset) {
      res.status(400).json({
        error:
          'Both Cloudinary Cloud Name and Unsigned Upload Preset are required.',
      });
      return;
    }

    if (
      !/^[a-zA-Z0-9_-]{1,120}$/.test(cloudName) ||
      !/^[a-zA-Z0-9_-]{1,120}$/.test(uploadPreset)
    ) {
      res.status(400).json({
        error:
          'Invalid Cloud Name or Upload Preset format. Use alphanumeric characters, hyphens, or underscores.',
      });
      return;
    }

    runtimeCloudinaryConfig = { cloudName, uploadPreset };
    const cfg = getResolvedCloudinaryConfig();

    res.json({
      provider: 'cloudinary',
      configured: cfg.configured,
      mode: cfg.mode,
      cloudName: cfg.cloudName,
      uploadPreset: cfg.uploadPreset,
    });
  });

  app.post('/api/media/signature', (req, res) => {
    const cfg = getResolvedCloudinaryConfig();

    if (!cfg.hasSignedCredentials) {
      res.status(503).json({
        error:
          'Cloudinary signed upload credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured on the server.',
        configured: cfg.configured,
        mode: cfg.mode,
      });
      return;
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder =
      typeof req.body?.folder === 'string' && req.body.folder.trim()
        ? req.body.folder.trim()
        : 'luna-royale/products';
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign)
      .digest('hex');

    res.json({
      cloudName: cfg.cloudName,
      apiKey: cfg.apiKey,
      timestamp,
      folder,
      signature,
    });
  });

  app.post('/api/media/upload', async (req, res) => {
    const cfg = getResolvedCloudinaryConfig();
    const { fileDataUrl, folder: requestedFolder, cloudName: reqCloudName, uploadPreset: reqUploadPreset } =
      req.body || {};

    if (typeof fileDataUrl !== 'string' || !fileDataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'A valid image file is required for upload.' });
      return;
    }

    const effectiveCloudName =
      (typeof reqCloudName === 'string' && reqCloudName.trim()) || cfg.cloudName;
    const effectiveUploadPreset =
      (typeof reqUploadPreset === 'string' && reqUploadPreset.trim()) ||
      cfg.uploadPreset;
    const folder =
      typeof requestedFolder === 'string' && requestedFolder.trim()
        ? requestedFolder.trim()
        : 'luna-royale/products';

    if (!effectiveCloudName) {
      res.status(503).json({
        error:
          'Cloudinary Cloud Name is missing. Set CLOUDINARY_CLOUD_NAME (and CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET).',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', fileDataUrl);
      formData.append('folder', folder);

      if (cfg.hasSignedCredentials && effectiveCloudName === cfg.cloudName) {
        const timestamp = Math.round(Date.now() / 1000);
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`;
        const signature = crypto
          .createHash('sha1')
          .update(paramsToSign)
          .digest('hex');

        formData.append('api_key', cfg.apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
      } else if (effectiveUploadPreset) {
        formData.append('upload_preset', effectiveUploadPreset);
      } else {
        res.status(503).json({
          error:
            'Cloudinary upload preset or server API credentials are not configured.',
        });
        return;
      }

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(
          effectiveCloudName
        )}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadJson = (await uploadResponse.json().catch(() => ({}))) as {
        secure_url?: string;
        public_id?: string;
        error?: { message?: string };
      };

      if (!uploadResponse.ok || !uploadJson.secure_url) {
        res.status(uploadResponse.status || 400).json({
          error:
            uploadJson?.error?.message ||
            'Cloudinary rejected the image upload. Verify your Cloud Name and Upload Preset.',
        });
        return;
      }

      res.json({
        secure_url: uploadJson.secure_url,
        public_id: uploadJson.public_id || null,
      });
    } catch {
      res.status(500).json({
        error: 'Failed to communicate with Cloudinary upload service.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // LUNA ROYALE AI CONCIERGE — Server-Side Recommendation Architecture
  // "Your personal guide to what’s right for you."
  // Strictly recommends ONLY real products that currently exist in the catalog.
  // Never hallucinates products, fake prices, or fake sets.
  // Never exposes GEMINI_API_KEY to the client.
  // ---------------------------------------------------------------------------
  app.post('/api/ai/concierge', async (req, res) => {
    const { mode, answers, candidateProducts } = req.body || {};

    if (!Array.isArray(candidateProducts) || candidateProducts.length === 0) {
      res.json({
        headline: 'Atelier Notice',
        conciergeNote: 'No products are available for recommendations yet.',
        recommendations: [],
        isNoMatch: true,
        noMatchExplanation: 'No products are currently available in the catalog.',
        isAiPowered: false,
      });
      return;
    }

    // 1. Strict validation: candidate products must be real, published and in stock
    interface SafeProduct {
      id: string;
      name: string;
      category: string;
      description: string;
      price: number;
      availability: string;
      published: boolean;
    }

    const availableProducts: SafeProduct[] = candidateProducts.filter(
      (p: any) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.price === 'number' &&
        p.published === true &&
        p.availability !== 'out_of_stock'
    );

    if (availableProducts.length === 0) {
      res.json({
        headline: 'Atelier Notice',
        conciergeNote: 'No products are available for recommendations yet.',
        recommendations: [],
        isNoMatch: true,
        noMatchExplanation: 'No products are currently available in the catalog.',
        isAiPowered: false,
      });
      return;
    }

    // 2. Budget verification
    const rawBudget = answers?.budgetMax;
    const maxBudget =
      typeof rawBudget === 'number' && Number.isFinite(rawBudget) && rawBudget > 0
        ? rawBudget
        : null;

    const budgetEligibleProducts =
      maxBudget !== null
        ? availableProducts.filter((p) => p.price <= maxBudget)
        : availableProducts;

    if (budgetEligibleProducts.length === 0) {
      res.json({
        headline: 'Budget Consultation',
        conciergeNote:
          'I couldn’t find an available product within that budget right now.',
        recommendations: [],
        isNoMatch: true,
        noMatchExplanation: 'No available items fit within the selected budget threshold.',
        isAiPowered: false,
      });
      return;
    }

    const validIdMap = new Map(budgetEligibleProducts.map((p) => [p.id, p]));

    // 3. Attempt Gemini API with gemini-3.8-flash if GEMINI_API_KEY is configured
    const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
    const hasGeminiKey = Boolean(geminiKey && !geminiKey.includes('MY_'));

    if (hasGeminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const catalogListing = budgetEligibleProducts
          .map(
            (p) =>
              `- ID: "${p.id}" | Name: "${p.name}" | Category: ${p.category} | Price: ₦${p.price} | Desc: ${p.description}`
          )
          .join('\n');

        const systemInstruction = `You are the sophisticated luxury shopping concierge for LUNA ROYALE ("Elegance, Curated.").
Tone: Elegant, warm, helpful, concise, confident, refined, personal, never pushy.
CRITICAL MANDATE: You MUST ONLY recommend product IDs that exist in the exact catalog listing provided below.
Do NOT invent or hallucinate any product, set, discount, or price.
Every recommended item MUST correspond to a valid productId from the list.
Provide a concise, thoughtful explanation for each recommendation (e.g. "Recommended because you selected a minimalist style for everyday wear.").
If no product matches the customer's request, set isNoMatch to true and provide an elegant explanation.`;

        const userPrompt = `Mode: ${mode || 'style'}
Customer Answers: ${JSON.stringify(answers || {})}

Available Catalog:
${catalogListing}

Select the most suitable products from the catalog above and provide personalized luxury concierge recommendations.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                conciergeNote: { type: Type.STRING },
                isNoMatch: { type: Type.BOOLEAN },
                noMatchExplanation: { type: Type.STRING },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      productId: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['productId', 'reason'],
                  },
                },
              },
              required: ['headline', 'conciergeNote', 'isNoMatch', 'recommendations'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const rawRecs: Array<{ productId: string; reason: string }> = Array.isArray(
          parsed.recommendations
        )
          ? parsed.recommendations
          : [];

        // HARD VERIFICATION: Discard any ID that is not in the actual catalog map
        const verifiedRecs = rawRecs.filter(
          (r) => typeof r.productId === 'string' && validIdMap.has(r.productId)
        );

        if (verifiedRecs.length > 0) {
          res.json({
            headline: parsed.headline || 'Curated by LUNA ROYALE AI Concierge',
            conciergeNote:
              parsed.conciergeNote ||
              'Based on your preferences, these pieces from our atelier suit your vision beautifully.',
            recommendations: verifiedRecs,
            isNoMatch: false,
            isAiPowered: true,
          });
          return;
        }
      } catch (geminiError) {
        console.warn('Gemini recommendation call fallback:', geminiError);
      }
    }

    // 4. Server-Side Deterministic Luxury Matching Engine (Fallback or Zero-Key Mode)
    let filtered = [...budgetEligibleProducts];
    const category = answers?.category;
    if (category && category !== 'Any' && category !== 'Open to suggestions') {
      const catMatches = filtered.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
      if (catMatches.length > 0) {
        filtered = catMatches;
      }
    }

    let headline = 'Curated for You';
    let conciergeNote =
      'Based on your preferences, these pieces from our atelier suit your vision beautifully.';
    let recommendations: Array<{ productId: string; reason: string }> = [];

    if (mode === 'style') {
      const styleChoice = answers?.style || 'elegant';
      const occasionChoice = answers?.occasion || 'special occasions';
      headline = 'Curated for Your Style';
      conciergeNote = `Based on your preference for ${styleChoice.toLowerCase()} silhouettes and ${occasionChoice.toLowerCase()}, these LUNA ROYALE pieces reflect your personal aesthetic.`;
      recommendations = filtered.slice(0, 4).map((p) => ({
        productId: p.id,
        reason: `Recommended because you selected ${styleChoice.toLowerCase()} style for ${occasionChoice.toLowerCase()}.`,
      }));
    } else if (mode === 'gift') {
      const recipient = answers?.recipient || 'someone special';
      const occasion = answers?.occasion || 'a celebration';
      headline = `Gift Selection for ${recipient}`;
      conciergeNote = `Curated with care for your ${recipient.toLowerCase()} celebrating ${occasion.toLowerCase()}. Each piece embodies timeless presentation and refinement.`;
      recommendations = filtered.slice(0, 4).map((p) => ({
        productId: p.id,
        reason: `Recommended as a thoughtful gift for your ${recipient.toLowerCase()} on ${occasion.toLowerCase()}.`,
      }));
    } else {
      headline = 'Selected for You';
      conciergeNote =
        'A refined selection from our current catalog, curated around elegance, timeless craftsmanship, and balanced design.';
      recommendations = filtered.slice(0, 4).map((p) => ({
        productId: p.id,
        reason: 'Recommended to complement your current LUNA ROYALE preferences and taste.',
      }));
    }

    res.json({
      headline,
      conciergeNote,
      recommendations,
      isNoMatch: recommendations.length === 0,
      isAiPowered: false,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LUNA ROYALE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
