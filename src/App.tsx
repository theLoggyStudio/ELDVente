import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Offcanvas as BsOffcanvas } from 'bootstrap';
import pages from './constants/json/Pages.constant.json';
import selecteurOptions from './constants/json/Selecteur.constant.json';
import staticArticles from './constants/json/article.json';
import { PAGE_VENTE } from './constants/ts/PagesVente.index';
import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from './constants/ts/Couleur.constant';
import { PAYDUNIA_PRODUIT_NOM, SUPPLEMENT_ASSISTANCE_FCFA } from './constants/ts/Payement.constant';
import { Alert } from './items/Alert';
import { Button } from './items/Button';
import { Card } from './items/Card';
import { Footer } from './items/Footer';
import { Header } from './items/Header';
import { Input } from './items/Input';
import { FormuleComparaison } from './items/FormuleComparaison';
import { Offcanvas } from './items/Offcanvas';
import { Selecteur } from './items/Selecteur';
import { Modal } from './items/Modal';
import {
  clearPendingDeliveryEmail,
  POST_PAY_DELIVERY_STORAGE_KEY,
  savePendingDeliveryEmail,
  sendOrderNotificationEmail,
  type OrderNotificationPayload,
} from './services/orderNotification';
import { paymentApi } from './services/paymentApi';
import { articleApi } from './services/articleApi';
import { authApi } from './services/authApi';
import { userApi } from './services/userApi';
import {
  ELEMENTS_AVEC_ASSISTANCE_DEFAUT,
  ELEMENTS_SANS_ASSISTANCE_DEFAUT,
} from './constants/ts/ArticleFormulesDefault.constant';
import type { ArticleItem } from './types/Article';
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

const OFFCANVAS_ID = 'elladarie-article-offcanvas';

const vente = pages.vente;

const selecteurTuple = selecteurOptions as [
  { nom: string; estAssiste: boolean },
  { nom: string; estAssiste: boolean },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CATALOG_ARTICLES_PER_PAGE = 6;

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

const compareArticleNomFr = (a: Pick<ArticleItem, 'nom'>, b: Pick<ArticleItem, 'nom'>): number =>
  a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });

function App() {
  const [query, setQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [list, setList] = useState<Array<ArticleItem & { id?: number }>>([]);
  const [selected, setSelected] = useState<ArticleItem | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
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
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [users, setUsers] = useState<Array<UserItem & { id: number }>>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [openAdminSection, setOpenAdminSection] = useState<'articles' | 'users' | 'password' | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [articleForm, setArticleForm] = useState<ArticleItem>({
    urlImage: '',
    nom: '',
    categorie: '',
    URL: '',
    urlDrive: '',
    prix: 0,
    description: '',
    descriptionAvecAssistace: '',
    prixAvecAssistace: 0,
    tel: '',
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
  const dismissToast = useCallback(() => setToast(null), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q ? list : list.filter((a) => a.nom.toLowerCase().includes(q));
    return [...base].sort(compareArticleNomFr);
  }, [query, list]);

  const articlesSortedByNom = useMemo(() => [...list].sort(compareArticleNomFr), [list]);

  const catalogTotalPages = Math.max(1, Math.ceil(filtered.length / CATALOG_ARTICLES_PER_PAGE));
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * CATALOG_ARTICLES_PER_PAGE;
    return filtered.slice(start, start + CATALOG_ARTICLES_PER_PAGE);
  }, [filtered, catalogPage]);

  useEffect(() => {
    setArticleImagePreviewError(false);
  }, [articleForm.urlImage]);

  useEffect(() => {
    setCatalogPage(1);
  }, [query]);

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

  const loadArticles = useCallback(async () => {
    try {
      const rows = await articleApi.list();
      setList(rows);
      setApiError('');
    } catch (error) {
      setList(staticArticles as ArticleItem[]);
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  }, []);

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

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

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
      setBuyerEmail('');
      setBuyerPhone('');
    };
    el.addEventListener('hidden.bs.offcanvas', onHidden);
    return () => el.removeEventListener('hidden.bs.offcanvas', onHidden);
  }, []);

  useEffect(() => {
    setBuyerEmail('');
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

  /** Retour `?paiement=ok` apres paiement (PayDunya ou CinetPay) puis envoi e-mail livraison. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('paiement');
    const clearQuery = () => {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
    };

    const finishWithMail = (payload: OrderNotificationPayload) => {
      void (async () => {
        const mailRes = await sendOrderNotificationEmail(payload);
        clearQuery();
        if (mailRes.ok) {
          const mailAcheteur = payload.buyerEmail.trim();
          setToast({
            variant: 'success',
            message: `${vente[PAGE_VENTE.toastPaymentSuccess]}${mailAcheteur}`,
            autoCloseMs: 6000,
          });
        } else if (mailRes.reason === 'popup_blocked') {
          setToast({ variant: 'error', message: vente[PAGE_VENTE.toastMailBlocked] });
        } else if (mailRes.reason === 'network') {
          setToast({ variant: 'error', message: vente[PAGE_VENTE.mailDeliveryError] });
        } else {
          setToast({ variant: 'error', message: vente[PAGE_VENTE.mailMissingRecipient] });
        }
      })();
    };

    if (status === 'annule') {
      clearPendingDeliveryEmail();
      clearQuery();
      return;
    }

    if (status !== 'ok') return;

    const raw = sessionStorage.getItem(POST_PAY_DELIVERY_STORAGE_KEY);
    if (!raw) {
      clearQuery();
      return;
    }
    sessionStorage.removeItem(POST_PAY_DELIVERY_STORAGE_KEY);

    let payload: OrderNotificationPayload;
    try {
      payload = JSON.parse(raw) as OrderNotificationPayload;
    } catch {
      clearQuery();
      return;
    }

    finishWithMail(payload);
  }, []);

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
    ? `${vente[PAGE_VENTE.offcanvasTitlePrefix]} — ${selected.nom}`
    : vente[PAGE_VENTE.offcanvasTitlePrefix];

  const handlePay = async () => {
    if (!selected) return;
    const drive = selected.urlDrive?.trim() ?? '';
    if (!drive || drive.includes('REMPLACER_PAR_VOTRE_LIEN_DRIVE')) {
      setToast({ variant: 'error', message: vente[PAGE_VENTE.deliveryDriveMissing] });
      return;
    }
    const mail = buyerEmail.trim();
    if (!mail) {
      setToast({ variant: 'error', message: vente[PAGE_VENTE.deliveryEmailRequired] });
      return;
    }
    if (!emailPattern.test(mail)) {
      setToast({ variant: 'error', message: vente[PAGE_VENTE.deliveryEmailInvalid] });
      return;
    }
    if (isDohoneCountry(checkoutCountryCode) && !buyerPhone.trim()) {
      setToast({ variant: 'error', message: vente[PAGE_VENTE.deliveryPhoneRequired] });
      return;
    }
    setToast(null);
    setPayBusy(true);
    const desc = `${PAYDUNIA_PRODUIT_NOM} — ${selected.nom} (${vente[PAGE_VENTE.formuleLabel]} : ${
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
      savePendingDeliveryEmail({
        article: selected,
        assisted,
        totalAmount: currentPrice,
        optionsSummary,
        buyerEmail: mail,
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
      categorie: '',
      URL: '',
      urlDrive: '',
      prix: 0,
      description: '',
      descriptionAvecAssistace: '',
      prixAvecAssistace: 0,
      tel: '',
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
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const deleteArticle = async (id?: number) => {
    if (!token || !id) return;
    try {
      await articleApi.remove(id, token);
      await loadArticles();
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
        {filtered.length === 0 ? (
          <p className="mb-0" style={{ color: COULEUR_NOIR }}>
            {vente[PAGE_VENTE.noResults]}
          </p>
        ) : (
          <>
            <div className="row g-4">
              {paginatedCatalog.map((article) => (
                <div className="col-12 col-sm-6 col-lg-4" key={`${article.nom}-${article.URL}`}>
                  <Card
                    title={article.nom}
                    category={article.categorie}
                    subtitle={article.description}
                    imageUrl={article.urlImage}
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
                  disabled={catalogPage <= 1}
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
                  disabled={catalogPage >= catalogTotalPages}
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
            <p className="small mb-3">
              <a
                href={selected.URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: COULEUR_NOIR }}
              >
                {vente[PAGE_VENTE.resourcesLink]}
              </a>
            </p>
            <div className="mb-2 small fw-semibold" style={{ color: COULEUR_NOIR }}>
              {vente[PAGE_VENTE.formuleLabel]}
            </div>
            <div className="mb-3">
              <Selecteur options={selecteurTuple} assisted={assisted} onChange={setAssisted} />
            </div>
            <FormuleComparaison
              sectionTitle={vente[PAGE_VENTE.modesComparatifTitre]}
              titreColonneSans={selecteurTuple[0].nom}
              titreColonneAvec={selecteurTuple[1].nom}
              lignesSans={selected.elementsSansAssistance}
              lignesAvec={selected.elementsAvecAssistance}
              assisted={assisted}
            />
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
                      {vente[PAGE_VENTE.offcanvasCurrencyLabel]} — équivalents indicatifs du montant
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
                                color: selected ? COULEUR_BLANC : COULEUR_NOIR,
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
                              aria-label={`${c.label}, ${c.amount}${selected ? ' — sélectionné' : ''}`}
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
            <div className="mb-2 small fw-semibold" style={{ color: COULEUR_NOIR }}>
              {vente[PAGE_VENTE.deliveryEmailLabel]}
            </div>
            <Input
              type="email"
              autoComplete="email"
              value={buyerEmail}
              onChange={setBuyerEmail}
              placeholder={vente[PAGE_VENTE.deliveryEmailPlaceholder]}
              ariaLabel={vente[PAGE_VENTE.deliveryEmailLabel]}
            />
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
              type="email"
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
                            <th>Categorie</th>
                            <th className="text-end">Prix</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {articlesSortedByNom.map((a) => (
                            <tr key={`${a.nom}-${a.URL}`}>
                              <td>{a.nom}</td>
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
        <div className="row g-2">
          <div className="col-md-6">
            <Input value={articleForm.nom} onChange={(v) => setArticleForm((p) => ({ ...p, nom: v }))} placeholder={vente[PAGE_VENTE.adminNameLabel]} ariaLabel={vente[PAGE_VENTE.adminNameLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={articleForm.categorie} onChange={(v) => setArticleForm((p) => ({ ...p, categorie: v }))} placeholder={vente[PAGE_VENTE.adminCategoryLabel]} ariaLabel={vente[PAGE_VENTE.adminCategoryLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={String(articleForm.prix)} onChange={(v) => setArticleForm((p) => ({ ...p, prix: Number(v) || 0 }))} placeholder={vente[PAGE_VENTE.adminPriceLabel]} ariaLabel={vente[PAGE_VENTE.adminPriceLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={String(articleForm.prixAvecAssistace)} onChange={(v) => setArticleForm((p) => ({ ...p, prixAvecAssistace: Number(v) || 0 }))} placeholder={vente[PAGE_VENTE.adminPriceAssistLabel]} ariaLabel={vente[PAGE_VENTE.adminPriceAssistLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={articleForm.urlImage} onChange={(v) => setArticleForm((p) => ({ ...p, urlImage: v }))} placeholder={vente[PAGE_VENTE.adminImageUrlLabel]} ariaLabel={vente[PAGE_VENTE.adminImageUrlLabel]} type="text" />
          </div>
          <div className="col-md-6 d-flex flex-column">
            <span className="small fw-semibold mb-1" style={{ color: COULEUR_NOIR }}>
              Aperçu
            </span>
            <div
              className="border border-2 rounded-3 p-2 flex-grow-1 d-flex align-items-center justify-content-center"
              style={{
                borderColor: COULEUR_NOIR,
                minHeight: 120,
                backgroundColor: COULEUR_BLANC,
              }}
            >
              {articleForm.urlImage.trim() ? (
                articleImagePreviewError ? (
                  <span className="small text-center px-1" style={{ color: COULEUR_NOIR }}>
                    Impossible de charger l’image. Vérifiez l’URL.
                  </span>
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
                <span className="small text-center text-muted">Saisissez une URL d’image à gauche.</span>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <Input value={articleForm.urlDrive} onChange={(v) => setArticleForm((p) => ({ ...p, urlDrive: v }))} placeholder={vente[PAGE_VENTE.adminDriveUrlLabel]} ariaLabel={vente[PAGE_VENTE.adminDriveUrlLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={articleForm.tel} onChange={(v) => setArticleForm((p) => ({ ...p, tel: v }))} placeholder={vente[PAGE_VENTE.adminPhoneLabel]} ariaLabel={vente[PAGE_VENTE.adminPhoneLabel]} type="text" />
          </div>
          <div className="col-md-12">
            <Input value={articleForm.elementsSansAssistance.join('|')} onChange={(v) => setArticleForm((p) => ({ ...p, elementsSansAssistance: v.split('|').map((x) => x.trim()).filter(Boolean) }))} placeholder={vente[PAGE_VENTE.adminElementsSansLabel]} ariaLabel={vente[PAGE_VENTE.adminElementsSansLabel]} type="text" />
          </div>
          <div className="col-md-12">
            <Input value={articleForm.elementsAvecAssistance.join('|')} onChange={(v) => setArticleForm((p) => ({ ...p, elementsAvecAssistance: v.split('|').map((x) => x.trim()).filter(Boolean) }))} placeholder={vente[PAGE_VENTE.adminElementsAvecLabel]} ariaLabel={vente[PAGE_VENTE.adminElementsAvecLabel]} type="text" />
          </div>
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
