import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Offcanvas as BsOffcanvas } from 'bootstrap';
import pages from './constants/json/Pages.constant.json';
import selecteurOptions from './constants/json/Selecteur.constant.json';
import staticArticles from './constants/json/article.json';
import { PAGE_VENTE } from './constants/ts/PagesVente.index';
import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE, COULEUR_TEXTE_CLAIR } from './constants/ts/Couleur.constant';
import { ELLADARIE_DEFAULT_LOGO, resolveArticleImageUrl } from './constants/ts/Brand.constant';
import { PAYDUNIA_PRODUIT_NOM, PAYDUNIA_STORE_NOM, SUPPLEMENT_ASSISTANCE_FCFA } from './constants/ts/Payement.constant';
import { Alert } from './items/Alert';
import { Button } from './items/Button';
import { Card } from './items/Card';
import { Footer } from './items/Footer';
import { Header } from './items/Header';
import { Input } from './items/Input';
import { Offcanvas } from './items/Offcanvas';
import { Selecteur } from './items/Selecteur';
import { Modal } from './items/Modal';
import {
  clearPendingDelivery,
  readPendingDelivery,
  savePendingDelivery,
  type PendingDeliveryPayload,
} from './services/orderNotification';
import { paymentApi } from './services/paymentApi';
import { oneTimeDownloadUrl, purchaseApi } from './services/purchaseApi';
import { articleApi } from './services/articleApi';
import {
  catalogCacheKey,
  getCatalogCache,
  invalidateCatalogCache,
  setCatalogCache,
} from './services/articleCatalogCache';
import { authApi } from './services/authApi';
import { userApi } from './services/userApi';
import {
  ELEMENTS_AVEC_ASSISTANCE_DEFAUT,
  ELEMENTS_SANS_ASSISTANCE_DEFAUT,
  TEL_ARTICLE_DEFAUT,
} from './constants/ts/ArticleFormulesDefault.constant';
import type { ArticleItem } from './types/Article';
import type { PurchaseItem } from './types/Purchase';
import type { UserItem } from './types/User';
import {
  type BillingCurrency,
  isDohoneCountry,
  paymentCountryFromBilling,
} from './constants/ts/DohoneCountries.constant';
import { PAYS_CHECKOUT_OFFCANVAS } from './constants/ts/OffcanvasPaysCheckout.constant';
import { isPaydunyaCountry } from './constants/ts/PaydunyaCountries.constant';
import { formatCatalogPriceFromFcfa } from './utils/catalogCurrencyFromFcfa';
import { formatPrice } from './utils/formatPrice';
import { downloadReceiptPdf } from './utils/receiptPdf';

const OFFCANVAS_ID = 'elladarie-article-offcanvas';

const vente = pages.vente;

const selecteurTuple = selecteurOptions as [
  { nom: string; estAssiste: boolean },
  { nom: string; estAssiste: boolean },
];

const CATALOG_ARTICLES_PER_PAGE = 6;
const HISTORY_ROWS_PER_PAGE = 10;
const CATALOG_SEARCH_DEBOUNCE_MS = 280;
type HistorySortKey = 'receiptId' | 'buyerEmail' | 'applicationName' | 'purchasedAt';
type HistorySortDir = 'asc' | 'desc';

const formatPurchaseDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('fr-FR');
};

const historySortIndicator = (active: boolean, dir: HistorySortDir): string => {
  if (!active) return ' ↕';
  return dir === 'asc' ? ' ↑' : ' ↓';
};

const BILLING_CURRENCY_STORAGE_KEY = 'eld_billing_currency';
const LEGACY_BILLING_COUNTRY_KEY = 'eld_billing_country';
const CHECKOUT_COUNTRY_STORAGE_KEY = 'eld_checkout_country';

const readStoredCheckoutCountry = (): string | null => {
  try {
    const raw = localStorage.getItem(CHECKOUT_COUNTRY_STORAGE_KEY)?.trim().toUpperCase();
    if (raw && /^[A-Z]{2}$/u.test(raw)) return raw;
  } catch {
    /* stockage indisponible */
  }
  return null;
};

const readStoredCurrency = (): BillingCurrency => {
  try {
    const cur = localStorage.getItem(BILLING_CURRENCY_STORAGE_KEY)?.trim().toUpperCase();
    if (cur === 'EUR' || cur === 'USD' || cur === 'XOF') return cur;
    const legacy = localStorage.getItem(LEGACY_BILLING_COUNTRY_KEY)?.trim().toUpperCase();
    if (legacy === 'FR') return 'EUR';
    if (legacy === 'US') return 'USD';
  } catch {
    /* navigation privée, etc. */
  }
  return 'XOF';
};

const compareArticleNomFr = (a: Pick<ArticleItem, 'nom' | 'version'>, b: Pick<ArticleItem, 'nom' | 'version'>): number =>
  a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }) ||
  (a.version ?? '').localeCompare(b.version ?? '', 'fr', { numeric: true });

const articleDisplayTitle = (article: Pick<ArticleItem, 'nom' | 'version'>): string =>
  article.version?.trim() ? `${article.nom} (${article.version})` : article.nom;

const paginateStaticArticles = (
  source: ArticleItem[],
  page: number,
  pageSize: number,
  q: string,
): { items: ArticleItem[]; total: number } => {
  const needle = q.trim().toLowerCase();
  const base = !needle
    ? source
    : source.filter(
        (a) =>
          a.nom.toLowerCase().includes(needle) ||
          (a.version ?? '').toLowerCase().includes(needle) ||
          a.categorie.toLowerCase().includes(needle),
      );
  const sorted = [...base].sort(compareArticleNomFr);
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
  };
};

function App() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogItems, setCatalogItems] = useState<Array<ArticleItem & { id?: number }>>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [list, setList] = useState<Array<ArticleItem & { id?: number }>>([]);
  const [selected, setSelected] = useState<(ArticleItem & { id?: number }) | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [deliveryResult, setDeliveryResult] = useState<
    (PendingDeliveryPayload & { downloadToken: string | null }) | null
  >(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [billingCurrency, setBillingCurrency] = useState<BillingCurrency>(() => readStoredCurrency());
  const [checkoutCountryCode, setCheckoutCountryCode] = useState(() => {
    const stored = readStoredCheckoutCountry();
    if (stored) return stored;
    return paymentCountryFromBilling(readStoredCurrency());
  });
  const [payBusy, setPayBusy] = useState(false);
  const [toast, setToast] = useState<{
    variant: 'error' | 'success';
    message: string;
    autoCloseMs?: number;
  } | null>(null);
  const [apiError, setApiError] = useState('');
  const [token, setToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [users, setUsers] = useState<Array<UserItem & { id: number }>>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [historySort, setHistorySort] = useState<{ key: HistorySortKey; dir: HistorySortDir }>({
    key: 'purchasedAt',
    dir: 'desc',
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [openAdminSection, setOpenAdminSection] = useState<'articles' | 'users' | 'password' | 'history' | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [articleForm, setArticleForm] = useState<ArticleItem>({
    urlImage: '',
    nom: '',
    version: '',
    categorie: '',
    URL: '',
    urlDrive: '',
    prix: 4000,
    description: '',
    descriptionAvecAssistace: '',
    prixAvecAssistace: 6000,
    tel: TEL_ARTICLE_DEFAUT,
    elementsSansAssistance: [...ELEMENTS_SANS_ASSISTANCE_DEFAUT],
    elementsAvecAssistance: [...ELEMENTS_AVEC_ASSISTANCE_DEFAUT],
  });
  const [userForm, setUserForm] = useState<UserItem>({
    nom: '',
    email: '',
    tel: '',
    motDePasse: '',
  });
  const [articleImagePreviewError, setArticleImagePreviewError] = useState(false);
  const offcanvasRef = useRef<HTMLDivElement | null>(null);
  const postPayHandledRef = useRef(false);
  const dismissToast = useCallback(() => setToast(null), []);
  const catalogRequestIdRef = useRef(0);
  const catalogHasItemsRef = useRef(false);

  const articlesSortedByNom = useMemo(() => [...list].sort(compareArticleNomFr), [list]);

  const catalogTotalPages = Math.max(1, Math.ceil(catalogTotal / CATALOG_ARTICLES_PER_PAGE));

  useEffect(() => {
    catalogHasItemsRef.current = catalogItems.length > 0;
  }, [catalogItems.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, CATALOG_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setArticleImagePreviewError(false);
  }, [articleForm.urlImage]);

  useEffect(() => {
    setCatalogPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    setCatalogPage((p: number) => Math.min(Math.max(1, p), catalogTotalPages));
  }, [catalogTotalPages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [catalogPage]);

  const loadCatalogPage = useCallback(async (page: number, q: string) => {
    const requestId = ++catalogRequestIdRef.current;
    const cacheKey = catalogCacheKey(page, CATALOG_ARTICLES_PER_PAGE, q);
    const cached = getCatalogCache(cacheKey);

    // 1) Afficher d’abord le JSON local (ou le cache) pour un rendu immédiat.
    if (cached) {
      setCatalogItems(cached.items ?? []);
      setCatalogTotal(cached.total ?? 0);
      setCatalogLoading(false);
    } else {
      const local = paginateStaticArticles(
        staticArticles as ArticleItem[],
        page,
        CATALOG_ARTICLES_PER_PAGE,
        q,
      );
      setCatalogItems(local.items);
      setCatalogTotal(local.total);
      setCatalogLoading(false);
      setCatalogCache(cacheKey, {
        items: local.items,
        total: local.total,
        page,
        pageSize: CATALOG_ARTICLES_PER_PAGE,
      });
    }

    // 2) Compléter avec le backend si disponible (ids, synchro admin, etc.).
    setCatalogRefreshing(true);
    try {
      const result = await articleApi.listPage(
        { page, limit: CATALOG_ARTICLES_PER_PAGE, q },
        { bypassCache: true },
      );
      if (requestId !== catalogRequestIdRef.current) return;
      setCatalogItems(result.items ?? []);
      setCatalogTotal(result.total ?? 0);
      setApiError('');

      if (page * CATALOG_ARTICLES_PER_PAGE < (result.total ?? 0)) {
        void articleApi.listPage({
          page: page + 1,
          limit: CATALOG_ARTICLES_PER_PAGE,
          q,
        });
      }
    } catch {
      // Le catalogue JSON reste affiché ; pas d’erreur bloquante.
      if (requestId === catalogRequestIdRef.current) {
        setApiError('');
      }
    } finally {
      if (requestId === catalogRequestIdRef.current) {
        setCatalogRefreshing(false);
        setCatalogLoading(false);
      }
    }
  }, []);

  const loadArticles = useCallback(async () => {
    try {
      const rows = await articleApi.listAll(token ?? undefined);
      setList(rows ?? []);
      setApiError('');
    } catch (error) {
      setList(staticArticles as ArticleItem[]);
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  }, [token]);

  const refreshCatalog = useCallback(async () => {
    invalidateCatalogCache();
    await loadCatalogPage(catalogPage, debouncedQuery);
  }, [catalogPage, debouncedQuery, loadCatalogPage]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await userApi.list(token);
      setUsers(rows);
      setApiError('');
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  }, [token]);

  const loadPurchases = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await purchaseApi.list(token);
      setPurchases(rows);
      setApiError('');
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  }, [token]);

  useEffect(() => {
    void loadCatalogPage(catalogPage, debouncedQuery);
  }, [catalogPage, debouncedQuery, loadCatalogPage]);

  useEffect(() => {
    if (openAdminSection === 'articles' && token) {
      void loadArticles();
    }
  }, [openAdminSection, token, loadArticles]);

  useEffect(() => {
    if (openAdminSection === 'history' && token) {
      void loadPurchases();
    }
  }, [openAdminSection, token, loadPurchases]);

  const sortedPurchases = useMemo(() => {
    const rows = [...purchases];
    rows.sort((a, b) => {
      let cmp = 0;
      if (historySort.key === 'purchasedAt') {
        cmp = new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime();
      } else {
        cmp = a[historySort.key].localeCompare(b[historySort.key], 'fr', { sensitivity: 'base' });
      }
      return historySort.dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [purchases, historySort]);

  const historyTotalPages = Math.max(1, Math.ceil(sortedPurchases.length / HISTORY_ROWS_PER_PAGE));
  const paginatedPurchases = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_ROWS_PER_PAGE;
    return sortedPurchases.slice(start, start + HISTORY_ROWS_PER_PAGE);
  }, [sortedPurchases, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySort]);

  useEffect(() => {
    setHistoryPage((p) => Math.min(Math.max(1, p), historyTotalPages));
  }, [historyTotalPages]);

  const toggleHistorySort = (key: HistorySortKey) => {
    setHistorySort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  const showOffcanvas = useCallback(() => {
    const el = offcanvasRef.current;
    if (!el) return;
    const instance = BsOffcanvas.getOrCreateInstance(el);
    instance.show();
  }, []);

  useEffect(() => {
    const el = offcanvasRef.current;
    if (!el) return;
    const onHidden = () => {
      setSelected(null);
      setAssisted(false);
      setBuyerPhone('');
    };
    el.addEventListener('hidden.bs.offcanvas', onHidden);
    return () => el.removeEventListener('hidden.bs.offcanvas', onHidden);
  }, []);

  useEffect(() => {
    setBuyerPhone('');
  }, [selected]);

  /** Pays de paiement : au choix d’un article, reprendre la mémorisation ou la devise affichée. */
  useEffect(() => {
    if (!selected) return;
    const stored = readStoredCheckoutCountry();
    setCheckoutCountryCode(stored ?? paymentCountryFromBilling(billingCurrency));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uniquement à l’ouverture d’un article (ne pas écraser le pays si l’utilisateur change Euro/CFA après)
  }, [selected]);

  useEffect(() => {
    if (selected) {
      showOffcanvas();
    }
  }, [selected, showOffcanvas]);

  /** Retour `?paiement=ok` après PayDunya / Dohone : e-mail via confirm PayDunya, reçu PDF, popup Drive. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('paiement');
    const paydunyaInvoiceToken = (params.get('token') ?? '').trim();
    const clearQuery = () => {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
    };

    if (status === 'annule') {
      clearPendingDelivery();
      clearQuery();
      return;
    }

    if (status !== 'ok' || postPayHandledRef.current) return;
    postPayHandledRef.current = true;

    const payload = readPendingDelivery();
    clearPendingDelivery();
    clearQuery();

    if (!payload) return;

    void (async () => {
      let receiptId: string = crypto.randomUUID();
      let downloadToken: string | null = null;

      // E-mail saisi sur le formulaire PayDunya (plus de champ e-mail dans le détail).
      let email = payload.buyerEmail?.trim() ?? '';
      if (paydunyaInvoiceToken) {
        try {
          const confirmed = await paymentApi.confirmPaydunya(paydunyaInvoiceToken);
          const fromPaydunya = confirmed.customerEmail?.trim() ?? '';
          if (fromPaydunya) email = fromPaydunya;
        } catch {
          /* confirm non bloquant : on continue sans e-mail si PayDunya ne répond pas */
        }
      }

      try {
        const purchase = await purchaseApi.create({
          applicationName: articleDisplayTitle(payload.article),
          ...(email ? { buyerEmail: email } : {}),
          ...(payload.articleId ? { articleId: payload.articleId } : {}),
        });
        receiptId = purchase.receiptId;
        downloadToken = purchase.downloadToken ?? null;
      } catch {
        /* historique non bloquant pour la livraison */
      }

      try {
        await downloadReceiptPdf({
          receiptId,
          brandName: PAYDUNIA_STORE_NOM,
          ...(email ? { buyerEmail: email } : {}),
          applicationName: articleDisplayTitle(payload.article),
          purchasedAt: new Date(),
          totalAmount: payload.totalAmount,
          optionsSummary: payload.optionsSummary,
          article: {
            nom: payload.article.nom,
            version: payload.article.version,
            categorie: payload.article.categorie,
            description: payload.assisted
              ? payload.article.descriptionAvecAssistace
              : payload.article.description,
            siteUrl: payload.article.URL,
            // Numéro d'assistance uniquement pour la formule « avec assistance ».
            ...(payload.assisted ? { tel: payload.article.tel } : {}),
            imageUrl: payload.article.urlImage,
            elements: payload.assisted
              ? payload.article.elementsAvecAssistance
              : payload.article.elementsSansAssistance,
          },
          labels: {
            title: vente[PAGE_VENTE.receiptPdfTitle],
            thanks: vente[PAGE_VENTE.receiptPdfThanks],
            id: vente[PAGE_VENTE.receiptPdfIdLabel],
            email: vente[PAGE_VENTE.receiptPdfEmailLabel],
            application: vente[PAGE_VENTE.receiptPdfAppLabel],
            date: vente[PAGE_VENTE.receiptPdfDateLabel],
            amount: vente[PAGE_VENTE.receiptPdfAmountLabel],
            options: vente[PAGE_VENTE.receiptPdfOptionsLabel],
            paymentSection: vente[PAGE_VENTE.receiptPdfPaymentSection],
            appSection: vente[PAGE_VENTE.receiptPdfAppSection],
            category: vente[PAGE_VENTE.adminCategoryLabel],
            description: vente[PAGE_VENTE.adminDescriptionLabel],
            website: vente[PAGE_VENTE.receiptPdfWebsiteLabel],
            assistance: vente[PAGE_VENTE.receiptPdfAssistanceLabel],
            included: vente[PAGE_VENTE.receiptPdfIncludedLabel],
          },
        });
      } catch {
        /* PDF non bloquant pour la livraison */
      }

      // Téléchargement automatique via le lien à usage unique (l'URL réelle reste côté serveur).
      let started = false;
      if (downloadToken) {
        const win = window.open(oneTimeDownloadUrl(downloadToken), '_blank', 'noopener');
        started = Boolean(win);
      }
      setDownloadStarted(started);
      setDeliveryResult({ ...payload, ...(email ? { buyerEmail: email } : {}), downloadToken });
    })();
  }, []);

  const closeDeliveryModal = () => {
    setDeliveryResult(null);
    setDownloadStarted(false);
  };

  const startOneTimeDownload = () => {
    const token = deliveryResult?.downloadToken;
    if (!token || downloadStarted) return;
    const win = window.open(oneTimeDownloadUrl(token), '_blank', 'noopener');
    if (win) setDownloadStarted(true);
  };

  const currentPrice = selected
    ? assisted
      ? selected.prix + SUPPLEMENT_ASSISTANCE_FCFA
      : selected.prix
    : 0;

  /**
   * Euro / Dollar / CFA : chaque colonne garde sa devise d’affichage.
   * Le CFA utilise toujours la zone FCFA (`XOF` → SN ou VITE_XOF_PAYMENT_COUNTRY), pas la cellule sélectionnée
   * (sinon avec Euro sélectionné on formatte en EUR dans la colonne « CFA »).
   */
  const currencyTableCells = useMemo(() => {
    if (currentPrice <= 0) return [] as Array<{ currency: BillingCurrency; label: string; amount: string }>;
    const paysCfaAffichage = paymentCountryFromBilling('XOF');
    return [
      { currency: 'EUR' as const, label: 'Euro', amount: formatCatalogPriceFromFcfa(currentPrice, 'FR').main },
      { currency: 'USD' as const, label: 'Dollar', amount: formatCatalogPriceFromFcfa(currentPrice, 'US').main },
      {
        currency: 'XOF' as const,
        label: 'CFA',
        amount: formatCatalogPriceFromFcfa(currentPrice, paysCfaAffichage).main,
      },
    ];
  }, [currentPrice]);

  const paysCheckoutOptions = useMemo(() => {
    const codes = new Set(PAYS_CHECKOUT_OFFCANVAS.map((p) => p.code));
    if (checkoutCountryCode && !codes.has(checkoutCountryCode)) {
      return [
        ...PAYS_CHECKOUT_OFFCANVAS,
        { code: checkoutCountryCode, libelle: checkoutCountryCode },
      ].sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
    }
    return PAYS_CHECKOUT_OFFCANVAS;
  }, [checkoutCountryCode]);

  const setBillingCurrencyPersist = useCallback((v: BillingCurrency) => {
    setBillingCurrency(v);
    try {
      localStorage.setItem(BILLING_CURRENCY_STORAGE_KEY, v);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const offcanvasTitle = selected
    ? `${vente[PAGE_VENTE.offcanvasTitlePrefix]} : ${articleDisplayTitle(selected)}`
    : vente[PAGE_VENTE.offcanvasTitlePrefix];

  const handlePay = async () => {
    if (!selected) return;
    // Le lien de livraison reste côté serveur : l'id de l'article suffit pour générer le jeton unique.
    const articleId = selected.id;
    if (!articleId) {
      setToast({ variant: 'error', message: vente[PAGE_VENTE.deliveryDriveMissing] });
      return;
    }
    if (isDohoneCountry(checkoutCountryCode) && !buyerPhone.trim()) {
      setToast({ variant: 'error', message: vente[PAGE_VENTE.deliveryPhoneRequired] });
      return;
    }
    setToast(null);
    setPayBusy(true);
    const desc = `${PAYDUNIA_PRODUIT_NOM} : ${articleDisplayTitle(selected)} (${vente[PAGE_VENTE.formuleLabel]} : ${
      assisted ? selecteurTuple[1].nom : selecteurTuple[0].nom
    })`;
    const path = window.location.pathname || '/';
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const base = `${window.location.origin}${normalized.split('?')[0]}`;
    const returnUrl = `${base}?paiement=ok`;
    const cancelUrl = `${base}?paiement=annule`;

    try {
      const result = await paymentApi.checkout({
        amountFcfa: currentPrice,
        countryCode: checkoutCountryCode,
        description: desc,
        returnUrl,
        cancelUrl,
        phone: buyerPhone.trim() || undefined,
      });
      const optionsSummary = `${vente[PAGE_VENTE.formuleLabel]}: ${
        assisted ? selecteurTuple[1].nom : selecteurTuple[0].nom
      }`;
      savePendingDelivery({
        article: selected,
        articleId,
        assisted,
        totalAmount: currentPrice,
        optionsSummary,
      });
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setToast({
        variant: 'error',
        message: `${vente[PAGE_VENTE.paymentError]}${(error as Error).message ? ` (${(error as Error).message})` : ''}`.trim(),
      });
    } finally {
      setPayBusy(false);
    }
  };

  const openNewArticleModal = () => {
    setEditingArticleId(null);
    setArticleForm({
      urlImage: '',
      nom: '',
      version: '',
      categorie: '',
      URL: '',
      urlDrive: '',
      prix: 4000,
      description: '',
      descriptionAvecAssistace: '',
      prixAvecAssistace: 6000,
      tel: TEL_ARTICLE_DEFAUT,
      elementsSansAssistance: [...ELEMENTS_SANS_ASSISTANCE_DEFAUT],
      elementsAvecAssistance: [...ELEMENTS_AVEC_ASSISTANCE_DEFAUT],
    });
    setShowArticleModal(true);
  };

  const openEditArticleModal = (item: ArticleItem & { id?: number }) => {
    setEditingArticleId(item.id ?? null);
    setArticleForm(item);
    setShowArticleModal(true);
  };

  const saveArticle = async () => {
    if (!token) return;
    try {
      if (editingArticleId) {
        await articleApi.update(editingArticleId, articleForm, token);
      } else {
        await articleApi.create(articleForm, token);
      }
      setShowArticleModal(false);
      await loadArticles();
      await refreshCatalog();
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const deleteArticle = async (id?: number) => {
    if (!token || !id) return;
    try {
      await articleApi.remove(id, token);
      await loadArticles();
      await refreshCatalog();
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const openNewUserModal = () => {
    setEditingUserId(null);
    setUserForm({ nom: '', email: '', tel: '', motDePasse: '' });
    setShowUserModal(true);
  };

  const openEditUserModal = (item: UserItem & { id: number }) => {
    setEditingUserId(item.id);
    setUserForm({ nom: item.nom, email: item.email, tel: item.tel, motDePasse: '' });
    setShowUserModal(true);
  };

  const saveUser = async () => {
    if (!token) return;
    try {
      if (editingUserId) {
        await userApi.update(editingUserId, { nom: userForm.nom, email: userForm.email, tel: userForm.tel }, token);
      } else {
        await userApi.create(userForm, token);
      }
      setShowUserModal(false);
      await loadUsers();
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const deleteUser = async (id: number) => {
    if (!token) return;
    try {
      await userApi.remove(id, token);
      await loadUsers();
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const handleLogin = async () => {
    try {
      const payload = await authApi.login(adminEmail, adminPassword);
      authApi.setToken(payload.token);
      setToken(payload.token);
      setAdminPassword('');
      setApiError('');
      await loadUsers();
      setShowAuthModal(false);
      setShowAdminModal(true);
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const handleLogout = () => {
    authApi.clearToken();
    setToken('');
    setUsers([]);
    setPurchases([]);
    setShowAdminModal(false);
  };

  const handleChangePassword = async () => {
    if (!token) return;
    try {
      await authApi.changePassword(oldPassword, newPassword, token);
      setOldPassword('');
      setNewPassword('');
      setApiError('');
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const openAdminModal = () => {
    setApiError('');
    setOpenAdminSection(null);
    setShowAdminModal(false);
    setShowAuthModal(true);
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: COULEUR_BLANC }}>
      {toast ? (
        <Alert
          variant={toast.variant}
          message={toast.message}
          closeLabel={vente[PAGE_VENTE.alertClose]}
          autoCloseMs={toast.autoCloseMs}
          onClose={dismissToast}
        />
      ) : null}

      <Header title={vente[PAGE_VENTE.brand]}>
        <div className="d-flex align-items-center gap-2 justify-content-end ms-auto w-100">
          <div style={{ width: '100%', maxWidth: 340 }}>
            <Input
              value={query}
              onChange={setQuery}
              placeholder={vente[PAGE_VENTE.searchPlaceholder]}
              ariaLabel={vente[PAGE_VENTE.searchPlaceholder]}
            />
          </div>
          <Button
            onClick={openAdminModal}
            className="px-3"
            aria-label={vente[PAGE_VENTE.adminTitle]}
            title={vente[PAGE_VENTE.adminTitle]}
          >
            👤
          </Button>
        </div>
      </Header>

      <main className="container py-4 flex-grow-1">
        {catalogLoading && catalogItems.length === 0 ? (
          <div className="el-item-catalog-grid" aria-busy="true" aria-label={vente[PAGE_VENTE.catalogPricesLoading]}>
            {Array.from({ length: CATALOG_ARTICLES_PER_PAGE }, (_, i) => (
              <div className="el-item-catalog-col el-item-catalog-col--loading" key={`skeleton-${i}`}>
                <div className="el-item-catalog-skeleton" />
              </div>
            ))}
          </div>
        ) : catalogTotal === 0 ? (
          <p className="mb-0" style={{ color: COULEUR_NOIR }}>
            {vente[PAGE_VENTE.noResults]}
          </p>
        ) : (
          <>
            <div
              className={`el-item-catalog-grid${catalogRefreshing ? ' el-item-catalog-grid--refreshing' : ''}`}
              aria-busy={catalogRefreshing}
            >
              {catalogItems.map((article) => (
                <div className="el-item-catalog-col" key={`${article.id ?? article.nom}-${article.version ?? ''}-${article.URL}`}>
                  <Card
                    title={articleDisplayTitle(article)}
                    category={article.categorie}
                    subtitle={article.description}
                    imageUrl={resolveArticleImageUrl(article.urlImage)}
                    imageAlt={article.nom}
                    triggerLabel={vente[PAGE_VENTE.articleCardAction]}
                    onOpen={() => {
                      setSelected(article);
                      setAssisted(false);
                    }}
                  />
                </div>
              ))}
            </div>
            {catalogTotalPages > 1 ? (
              <nav
                className="d-flex align-items-center justify-content-center gap-2 flex-wrap mt-4"
                aria-label="Pagination du catalogue"
              >
                <Button
                  type="button"
                  variant="primary"
                  className="px-3"
                  disabled={catalogPage <= 1 || catalogRefreshing}
                  onClick={() => setCatalogPage((p: number) => Math.max(1, p - 1))}
                >
                  {vente[PAGE_VENTE.catalogPaginationPrev]}
                </Button>
                <span className="small px-2" style={{ color: COULEUR_NOIR }}>
                  {vente[PAGE_VENTE.catalogPaginationPage]} {catalogPage} {vente[PAGE_VENTE.catalogPaginationOn]}{' '}
                  {catalogTotalPages}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  className="px-3"
                  disabled={catalogPage >= catalogTotalPages || catalogRefreshing}
                  onClick={() => setCatalogPage((p: number) => Math.min(catalogTotalPages, p + 1))}
                >
                  {vente[PAGE_VENTE.catalogPaginationNext]}
                </Button>
              </nav>
            ) : null}
          </>
        )}

      </main>

      <Footer lineLeft={vente[PAGE_VENTE.footerLeft]} lineRight={vente[PAGE_VENTE.footerRight]} />

      <Offcanvas
        ref={offcanvasRef}
        id={OFFCANVAS_ID}
        title={offcanvasTitle}
        closeLabel={vente[PAGE_VENTE.closeAria]}
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="pay"
              className="w-100 py-2"
              type="button"
              disabled={payBusy}
              onClick={() => void handlePay()}
            >
              {payBusy ? vente[PAGE_VENTE.paymentRedirecting] : vente[PAGE_VENTE.payButton]}
            </Button>
          </div>
        }
      >
        {selected ? (
          <>
            {vente[PAGE_VENTE.formuleLabel]?.trim() ? (
              <div className="mb-2 small fw-semibold" style={{ color: COULEUR_NOIR }}>
                {vente[PAGE_VENTE.formuleLabel]}
              </div>
            ) : null}
            <div className="mb-3">
              <Selecteur options={selecteurTuple} assisted={assisted} onChange={setAssisted} />
            </div>
            <div className="mb-3">
              <label
                className="form-label small fw-semibold mb-1"
                htmlFor="eld-offcanvas-checkout-country"
                style={{ color: COULEUR_NOIR }}
              >
                {vente[PAGE_VENTE.countryBillingLabel]}
              </label>
              <select
                id="eld-offcanvas-checkout-country"
                className="form-select border-2"
                style={{ color: COULEUR_NOIR, borderColor: COULEUR_NOIR, backgroundColor: COULEUR_BLANC }}
                value={checkoutCountryCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setCheckoutCountryCode(code);
                  try {
                    localStorage.setItem(CHECKOUT_COUNTRY_STORAGE_KEY, code);
                  } catch {
                    /* stockage indisponible */
                  }
                }}
                aria-label={vente[PAGE_VENTE.countryBillingLabel]}
              >
                {paysCheckoutOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.libelle}
                  </option>
                ))}
              </select>
              <p className="small mt-2 mb-0" style={{ color: COULEUR_NOIR }}>
                {isDohoneCountry(checkoutCountryCode)
                  ? vente[PAGE_VENTE.paymentRedirectDohoneHint]
                  : isPaydunyaCountry(checkoutCountryCode)
                    ? vente[PAGE_VENTE.paymentRedirectPaydunyaHint]
                    : vente[PAGE_VENTE.paymentCountryUnavailableHint]}
              </p>
            </div>
            {currencyTableCells.length > 0 ? (
              <div className="mb-3">
                <p className="small fw-semibold mb-2 mb-md-1" style={{ color: COULEUR_NOIR }}>
                  {vente[PAGE_VENTE.offcanvasCurrencyLabel]}
                </p>
                <div className="table-responsive">
                  <table
                    className="table table-bordered table-sm mb-0 text-center align-middle"
                    style={{ color: COULEUR_NOIR, borderColor: COULEUR_NOIR, tableLayout: 'fixed' }}
                  >
                    <caption className="visually-hidden">
                      {vente[PAGE_VENTE.offcanvasCurrencyLabel]} : équivalents indicatifs du montant
                    </caption>
                    <colgroup>
                      <col style={{ width: '33.33%' }} />
                      <col style={{ width: '33.33%' }} />
                      <col style={{ width: '33.33%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: COULEUR_BLANC }}>
                        {currencyTableCells.map((c) => (
                          <th key={c.currency} scope="col" className="small py-2 px-1">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {currencyTableCells.map((c) => {
                          const selected = billingCurrency === c.currency;
                          return (
                            <td
                              key={c.currency}
                              role="button"
                              tabIndex={0}
                              className="small py-2 px-1 fw-semibold user-select-none"
                              style={{
                                cursor: 'pointer',
                                backgroundColor: selected ? COULEUR_PRINCIPALE : COULEUR_BLANC,
                                color: selected ? COULEUR_TEXTE_CLAIR : COULEUR_NOIR,
                                borderColor: COULEUR_NOIR,
                              }}
                              onClick={() => setBillingCurrencyPersist(c.currency)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setBillingCurrencyPersist(c.currency);
                                }
                              }}
                              aria-pressed={selected}
                              aria-label={`${c.label}, ${c.amount}${selected ? ' : sélectionné' : ''}`}
                            >
                              {c.amount}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {isDohoneCountry(checkoutCountryCode) ? (
              <>
                <div className="mb-2 mt-3 small fw-semibold" style={{ color: COULEUR_NOIR }}>
                  {vente[PAGE_VENTE.deliveryPhoneDohoneLabel]}
                </div>
                <Input
                  type="tel"
                  autoComplete="tel"
                  value={buyerPhone}
                  onChange={setBuyerPhone}
                  placeholder="+241 …"
                  ariaLabel={vente[PAGE_VENTE.deliveryPhoneDohoneLabel]}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Offcanvas>

      <Modal
        show={deliveryResult !== null}
        title={vente[PAGE_VENTE.deliveryModalTitle]}
        closeLabel={vente[PAGE_VENTE.adminCloseButton]}
        onClose={closeDeliveryModal}
        footer={
          <Button onClick={closeDeliveryModal}>{vente[PAGE_VENTE.adminCloseButton]}</Button>
        }
      >
        {deliveryResult ? (
          <div className="d-flex flex-column gap-3">
            <p className="mb-0" style={{ color: COULEUR_NOIR }}>
              {vente[PAGE_VENTE.mailBuyerThanks]}
            </p>
            <p className="mb-0 fw-semibold" style={{ color: COULEUR_NOIR }}>
              {articleDisplayTitle(deliveryResult.article)}
            </p>
            {deliveryResult.downloadToken ? (
              <>
                <p className="mb-0 small" style={{ color: COULEUR_NOIR }}>
                  {vente[PAGE_VENTE.deliveryModalIntro]}
                </p>
                {downloadStarted ? (
                  <p className="mb-0 fw-semibold" style={{ color: COULEUR_NOIR }}>
                    {vente[PAGE_VENTE.deliveryModalDownloadStarted]}
                  </p>
                ) : (
                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <button
                      type="button"
                      onClick={startOneTimeDownload}
                      className="btn fw-semibold"
                      style={{ backgroundColor: COULEUR_PRINCIPALE, color: COULEUR_NOIR, border: `2px solid ${COULEUR_NOIR}` }}
                    >
                      {vente[PAGE_VENTE.deliveryModalOpenDrive]}
                    </button>
                  </div>
                )}
                <p className="mb-0 small" style={{ color: COULEUR_NOIR }}>
                  {vente[PAGE_VENTE.deliveryModalOneTimeHint]}
                </p>
              </>
            ) : (
              <p className="mb-0 small" style={{ color: COULEUR_NOIR }}>
                {vente[PAGE_VENTE.deliveryModalTokenMissing]}
              </p>
            )}
            {deliveryResult.assisted ? (
              <p className="mb-0 small" style={{ color: COULEUR_NOIR }}>
                {vente[PAGE_VENTE.mailLineAssistanceTel]}
                {deliveryResult.article.tel}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        show={showAuthModal}
        title={vente[PAGE_VENTE.adminTitle]}
        closeLabel={vente[PAGE_VENTE.adminCloseButton]}
        onClose={() => setShowAuthModal(false)}
      >
        {apiError ? (
          <p className="small mb-3" style={{ color: COULEUR_NOIR }}>
            {apiError}
          </p>
        ) : null}
        <div className="row g-2">
          <div className="col-md-6">
            <Input
              type="text"
              value={adminEmail}
              onChange={setAdminEmail}
              placeholder={vente[PAGE_VENTE.adminEmailLabel]}
              ariaLabel={vente[PAGE_VENTE.adminEmailLabel]}
            />
          </div>
          <div className="col-md-6">
            <Input
              type="password"
              value={adminPassword}
              onChange={setAdminPassword}
              placeholder={vente[PAGE_VENTE.adminPasswordLabel]}
              ariaLabel={vente[PAGE_VENTE.adminPasswordLabel]}
            />
          </div>
          <div className="col-12 d-flex gap-2">
            <Button onClick={() => void handleLogin()}>{vente[PAGE_VENTE.adminLoginButton]}</Button>
            <Button onClick={() => setShowAuthModal(false)}>{vente[PAGE_VENTE.adminCloseButton]}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        show={showAdminModal}
        title={vente[PAGE_VENTE.adminTitle]}
        closeLabel={vente[PAGE_VENTE.adminCloseButton]}
        onClose={() => setShowAdminModal(false)}
      >
        {apiError ? (
          <p className="small mb-3" style={{ color: COULEUR_NOIR }}>
            {apiError}
          </p>
        ) : null}
        {!token ? (
          <p className="mb-0">{vente[PAGE_VENTE.adminLoginButton]}</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            <div className="d-flex gap-2 flex-wrap">
              <Button onClick={handleLogout}>{vente[PAGE_VENTE.adminLogoutButton]}</Button>
              <Button
                onClick={() => {
                  void loadArticles();
                  void loadUsers();
                  void loadPurchases();
                }}
              >
                {vente[PAGE_VENTE.adminRefreshButton]}
              </Button>
            </div>

            <div className="accordion" id="adminAccordion">
              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    type="button"
                    className={`accordion-button ${openAdminSection === 'articles' ? '' : 'collapsed'}`}
                    onClick={() => setOpenAdminSection((prev) => (prev === 'articles' ? null : 'articles'))}
                  >
                    {vente[PAGE_VENTE.adminArticlesSection]}
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${openAdminSection === 'articles' ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="d-flex justify-content-end mb-3">
                      <Button onClick={openNewArticleModal}>{vente[PAGE_VENTE.adminAddArticleButton]}</Button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>{vente[PAGE_VENTE.adminVersionLabel]}</th>
                            <th>Categorie</th>
                            <th className="text-end">Prix</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {articlesSortedByNom.map((a) => (
                            <tr key={`${a.nom}-${a.version ?? ''}-${a.id ?? a.URL}`}>
                              <td>{a.nom}</td>
                              <td>{a.version || '-'}</td>
                              <td>{a.categorie}</td>
                              <td className="text-end">{formatPrice(a.prix)}</td>
                              <td className="text-end">
                                <div className="d-inline-flex gap-2">
                                  <Button onClick={() => openEditArticleModal(a)}>{vente[PAGE_VENTE.adminEditButton]}</Button>
                                  <Button onClick={() => void deleteArticle(a.id)}>{vente[PAGE_VENTE.adminDeleteButton]}</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    type="button"
                    className={`accordion-button ${openAdminSection === 'users' ? '' : 'collapsed'}`}
                    onClick={() => setOpenAdminSection((prev) => (prev === 'users' ? null : 'users'))}
                  >
                    {vente[PAGE_VENTE.adminUsersSection]}
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${openAdminSection === 'users' ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="d-flex justify-content-end mb-3">
                      <Button onClick={openNewUserModal}>{vente[PAGE_VENTE.adminAddUserButton]}</Button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Administrateur</th>
                            <th>Email</th>
                            <th>Telephone</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id}>
                              <td>{u.nom}</td>
                              <td>{u.email}</td>
                              <td>{u.tel}</td>
                              <td className="text-end">
                                <div className="d-inline-flex gap-2">
                                  <Button onClick={() => openEditUserModal(u)}>{vente[PAGE_VENTE.adminEditButton]}</Button>
                                  <Button onClick={() => void deleteUser(u.id)}>{vente[PAGE_VENTE.adminDeleteButton]}</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    type="button"
                    className={`accordion-button ${openAdminSection === 'history' ? '' : 'collapsed'}`}
                    onClick={() => setOpenAdminSection((prev) => (prev === 'history' ? null : 'history'))}
                  >
                    {vente[PAGE_VENTE.adminHistorySection]}
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${openAdminSection === 'history' ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover align-middle">
                        <thead>
                          <tr>
                            <th>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fw-semibold"
                                style={{ color: COULEUR_NOIR }}
                                onClick={() => toggleHistorySort('receiptId')}
                              >
                                {vente[PAGE_VENTE.adminHistoryReceiptIdCol]}
                                {historySortIndicator(historySort.key === 'receiptId', historySort.dir)}
                              </button>
                            </th>
                            <th>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fw-semibold"
                                style={{ color: COULEUR_NOIR }}
                                onClick={() => toggleHistorySort('buyerEmail')}
                              >
                                {vente[PAGE_VENTE.adminHistoryEmailCol]}
                                {historySortIndicator(historySort.key === 'buyerEmail', historySort.dir)}
                              </button>
                            </th>
                            <th>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fw-semibold"
                                style={{ color: COULEUR_NOIR }}
                                onClick={() => toggleHistorySort('applicationName')}
                              >
                                {vente[PAGE_VENTE.adminHistoryAppCol]}
                                {historySortIndicator(historySort.key === 'applicationName', historySort.dir)}
                              </button>
                            </th>
                            <th>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none fw-semibold"
                                style={{ color: COULEUR_NOIR }}
                                onClick={() => toggleHistorySort('purchasedAt')}
                              >
                                {vente[PAGE_VENTE.adminHistoryDateCol]}
                                {historySortIndicator(historySort.key === 'purchasedAt', historySort.dir)}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPurchases.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                —
                              </td>
                            </tr>
                          ) : (
                            paginatedPurchases.map((p) => (
                              <tr key={p.id}>
                                <td className="small font-monospace">{p.receiptId || '—'}</td>
                                <td>{p.buyerEmail}</td>
                                <td>{p.applicationName}</td>
                                <td>{formatPurchaseDate(p.purchasedAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {historyTotalPages > 1 ? (
                      <nav
                        className="d-flex align-items-center justify-content-center gap-2 flex-wrap mt-3"
                        aria-label="Pagination de l’historique des achats"
                      >
                        <Button
                          type="button"
                          variant="primary"
                          className="px-3"
                          disabled={historyPage <= 1}
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        >
                          {vente[PAGE_VENTE.catalogPaginationPrev]}
                        </Button>
                        <span className="small px-2" style={{ color: COULEUR_NOIR }}>
                          {vente[PAGE_VENTE.catalogPaginationPage]} {historyPage}{' '}
                          {vente[PAGE_VENTE.catalogPaginationOn]} {historyTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="primary"
                          className="px-3"
                          disabled={historyPage >= historyTotalPages}
                          onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                        >
                          {vente[PAGE_VENTE.catalogPaginationNext]}
                        </Button>
                      </nav>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="accordion-item">
                <h2 className="accordion-header">
                  <button
                    type="button"
                    className={`accordion-button ${openAdminSection === 'password' ? '' : 'collapsed'}`}
                    onClick={() => setOpenAdminSection((prev) => (prev === 'password' ? null : 'password'))}
                  >
                    {vente[PAGE_VENTE.adminChangePasswordButton]}
                  </button>
                </h2>
                <div className={`accordion-collapse collapse ${openAdminSection === 'password' ? 'show' : ''}`}>
                  <div className="accordion-body">
                    <div className="row g-2">
                      <div className="col-md-5">
                        <Input
                          type="password"
                          value={oldPassword}
                          onChange={setOldPassword}
                          placeholder={vente[PAGE_VENTE.adminOldPasswordLabel]}
                          ariaLabel={vente[PAGE_VENTE.adminOldPasswordLabel]}
                        />
                      </div>
                      <div className="col-md-5">
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={setNewPassword}
                          placeholder={vente[PAGE_VENTE.adminNewPasswordLabel]}
                          ariaLabel={vente[PAGE_VENTE.adminNewPasswordLabel]}
                        />
                      </div>
                      <div className="col-md-2 d-grid">
                        <Button onClick={() => void handleChangePassword()}>{vente[PAGE_VENTE.adminSaveButton]}</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        show={showArticleModal}
        title={vente[PAGE_VENTE.adminArticlesSection]}
        closeLabel={vente[PAGE_VENTE.adminCloseButton]}
        onClose={() => setShowArticleModal(false)}
        footer={<Button onClick={() => void saveArticle()}>{vente[PAGE_VENTE.adminSaveButton]}</Button>}
      >
        <div className="d-flex flex-column gap-4">
          <section>
            <h6 className="text-uppercase small fw-bold text-secondary mb-3">{vente[PAGE_VENTE.adminArticleSectionGeneral]}</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <Input
                  label={vente[PAGE_VENTE.adminNameLabel]}
                  value={articleForm.nom}
                  onChange={(v) => setArticleForm((p) => ({ ...p, nom: v }))}
                  placeholder="Ex. : 3ds Max"
                  ariaLabel={vente[PAGE_VENTE.adminNameLabel]}
                  type="text"
                />
              </div>
              <div className="col-md-6">
                <Input
                  label={vente[PAGE_VENTE.adminVersionLabel]}
                  value={articleForm.version}
                  onChange={(v) => setArticleForm((p) => ({ ...p, version: v }))}
                  placeholder="Ex. : 2025"
                  ariaLabel={vente[PAGE_VENTE.adminVersionLabel]}
                  type="text"
                />
              </div>
              <div className="col-12">
                <Input
                  label={vente[PAGE_VENTE.adminCategoryLabel]}
                  value={articleForm.categorie}
                  onChange={(v) => setArticleForm((p) => ({ ...p, categorie: v }))}
                  placeholder="Ex. : Modélisation 3D"
                  ariaLabel={vente[PAGE_VENTE.adminCategoryLabel]}
                  type="text"
                />
              </div>
            </div>
          </section>

          <section>
            <h6 className="text-uppercase small fw-bold text-secondary mb-3">{vente[PAGE_VENTE.adminArticleSectionPricing]}</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <Input
                  label={vente[PAGE_VENTE.adminPriceLabel]}
                  value={String(articleForm.prix)}
                  onChange={(v) => setArticleForm((p) => ({ ...p, prix: Number(v) || 0 }))}
                  placeholder="Ex. : 5000"
                  ariaLabel={vente[PAGE_VENTE.adminPriceLabel]}
                  type="text"
                />
              </div>
              <div className="col-md-6">
                <Input
                  label={vente[PAGE_VENTE.adminPriceAssistLabel]}
                  value={String(articleForm.prixAvecAssistace)}
                  onChange={(v) => setArticleForm((p) => ({ ...p, prixAvecAssistace: Number(v) || 0 }))}
                  placeholder="Ex. : 10000"
                  ariaLabel={vente[PAGE_VENTE.adminPriceAssistLabel]}
                  type="text"
                />
              </div>
            </div>
          </section>

          <section>
            <h6 className="text-uppercase small fw-bold text-secondary mb-3">{vente[PAGE_VENTE.adminArticleSectionMedia]}</h6>
            <div className="row g-3">
              <div className="col-12">
                <Input
                  label={vente[PAGE_VENTE.adminImageUrlLabel]}
                  value={articleForm.urlImage}
                  onChange={(v) => setArticleForm((p) => ({ ...p, urlImage: v }))}
                  placeholder="https://…"
                  ariaLabel={vente[PAGE_VENTE.adminImageUrlLabel]}
                  type="text"
                />
              </div>
              <div className="col-12">
                <span className="form-label small fw-semibold mb-1 d-block" style={{ color: COULEUR_NOIR }}>
                  {vente[PAGE_VENTE.adminImagePreviewLabel]}
                </span>
                <div
                  className="border border-2 rounded-3 p-3 d-flex align-items-center justify-content-center"
                  style={{
                    borderColor: COULEUR_NOIR,
                    minHeight: 140,
                    backgroundColor: COULEUR_BLANC,
                  }}
                >
                  {articleForm.urlImage.trim() ? (
                    articleImagePreviewError ? (
                      <img
                        src={ELLADARIE_DEFAULT_LOGO}
                        alt="Logo EllaDarie par défaut"
                        className="img-fluid"
                        style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <img
                        src={articleForm.urlImage.trim()}
                        alt="Aperçu de l’illustration de l’article"
                        className="img-fluid"
                        style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }}
                        onLoad={() => setArticleImagePreviewError(false)}
                        onError={() => setArticleImagePreviewError(true)}
                      />
                    )
                  ) : (
                    <img
                      src={ELLADARIE_DEFAULT_LOGO}
                      alt="Logo EllaDarie par défaut"
                      className="img-fluid"
                      style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h6 className="text-uppercase small fw-bold text-secondary mb-3">{vente[PAGE_VENTE.adminArticleSectionLinks]}</h6>
            <div className="row g-3">
              <div className="col-12">
                <Input
                  label={vente[PAGE_VENTE.adminDriveUrlLabel]}
                  value={articleForm.urlDrive ?? ''}
                  onChange={(v) => setArticleForm((p) => ({ ...p, urlDrive: v }))}
                  placeholder="https://drive.google.com/…"
                  ariaLabel={vente[PAGE_VENTE.adminDriveUrlLabel]}
                  type="text"
                />
              </div>
              <div className="col-md-6">
                <Input
                  label={vente[PAGE_VENTE.adminPhoneLabel]}
                  value={articleForm.tel}
                  onChange={(v) => setArticleForm((p) => ({ ...p, tel: v }))}
                  placeholder="Ex. : +221708984443"
                  ariaLabel={vente[PAGE_VENTE.adminPhoneLabel]}
                  type="tel"
                />
              </div>
            </div>
          </section>

          <section>
            <h6 className="text-uppercase small fw-bold text-secondary mb-3">{vente[PAGE_VENTE.adminArticleSectionFormulas]}</h6>
            <div className="row g-3">
              <div className="col-12">
                <Input
                  label={vente[PAGE_VENTE.adminElementsSansLabel]}
                  hint={vente[PAGE_VENTE.adminElementsPipeHint]}
                  value={articleForm.elementsSansAssistance.join('|')}
                  onChange={(v) =>
                    setArticleForm((p) => ({
                      ...p,
                      elementsSansAssistance: v.split('|').map((x) => x.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="Téléchargement du logiciel|Pas d'assistance à l'installation"
                  ariaLabel={vente[PAGE_VENTE.adminElementsSansLabel]}
                  type="text"
                />
              </div>
              <div className="col-12">
                <Input
                  label={vente[PAGE_VENTE.adminElementsAvecLabel]}
                  hint={vente[PAGE_VENTE.adminElementsPipeHint]}
                  value={articleForm.elementsAvecAssistance.join('|')}
                  onChange={(v) =>
                    setArticleForm((p) => ({
                      ...p,
                      elementsAvecAssistance: v.split('|').map((x) => x.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="Téléchargement du logiciel|Assistance pour installation du logiciel"
                  ariaLabel={vente[PAGE_VENTE.adminElementsAvecLabel]}
                  type="text"
                />
              </div>
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        show={showUserModal}
        title={vente[PAGE_VENTE.adminUsersSection]}
        closeLabel={vente[PAGE_VENTE.adminCloseButton]}
        onClose={() => setShowUserModal(false)}
        footer={<Button onClick={() => void saveUser()}>{vente[PAGE_VENTE.adminSaveButton]}</Button>}
      >
        <div className="row g-2">
          <div className="col-md-6">
            <Input value={userForm.nom} onChange={(v) => setUserForm((p) => ({ ...p, nom: v }))} placeholder={vente[PAGE_VENTE.adminNameLabel]} ariaLabel={vente[PAGE_VENTE.adminNameLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={userForm.email} onChange={(v) => setUserForm((p) => ({ ...p, email: v }))} placeholder={vente[PAGE_VENTE.adminEmailLabel]} ariaLabel={vente[PAGE_VENTE.adminEmailLabel]} type="email" />
          </div>
          <div className="col-md-6">
            <Input value={userForm.tel} onChange={(v) => setUserForm((p) => ({ ...p, tel: v }))} placeholder={vente[PAGE_VENTE.adminPhoneLabel]} ariaLabel={vente[PAGE_VENTE.adminPhoneLabel]} type="text" />
          </div>
          {!editingUserId ? (
            <div className="col-md-6">
              <Input value={userForm.motDePasse ?? ''} onChange={(v) => setUserForm((p) => ({ ...p, motDePasse: v }))} placeholder={vente[PAGE_VENTE.adminPasswordLabel]} ariaLabel={vente[PAGE_VENTE.adminPasswordLabel]} type="password" />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

export default App;
