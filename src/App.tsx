import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Offcanvas as BsOffcanvas } from 'bootstrap';
import pages from './constants/json/Pages.constant.json';
import selecteurOptions from './constants/json/Selecteur.constant.json';
import staticArticles from './constants/json/article.json';
import { PAGE_VENTE } from './constants/ts/PagesVente.index';
import { COULEUR_BLANC, COULEUR_NOIR } from './constants/ts/Couleur.constant';
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
import { createPaydunyaCheckoutInvoice } from './services/paydunyaCheckout';
import {
  clearPendingDeliveryEmail,
  POST_PAY_DELIVERY_STORAGE_KEY,
  savePendingDeliveryEmail,
  sendOrderNotificationEmail,
  type OrderNotificationPayload,
} from './services/orderNotification';
import { articleApi } from './services/articleApi';
import { authApi } from './services/authApi';
import { userApi } from './services/userApi';
import type { ArticleItem } from './types/Article';
import type { UserItem } from './types/User';
import { formatPrice } from './utils/formatPrice';

const OFFCANVAS_ID = 'eld-logiciel-article-offcanvas';

const vente = pages.vente;

const selecteurTuple = selecteurOptions as [
  { nom: string; estAssiste: boolean },
  { nom: string; estAssiste: boolean },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function App() {
  const [query, setQuery] = useState('');
  const [list, setList] = useState<Array<ArticleItem & { id?: number }>>([]);
  const [selected, setSelected] = useState<ArticleItem | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [toast, setToast] = useState<{
    variant: 'error' | 'success';
    message: string;
    autoCloseMs?: number;
  } | null>(null);
  const [apiError, setApiError] = useState('');
  const [token, setToken] = useState(authApi.getToken());
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [users, setUsers] = useState<Array<UserItem & { id: number }>>([]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
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
    elementsSansAssistance: [],
    elementsAvecAssistance: [],
  });
  const [userForm, setUserForm] = useState<UserItem>({
    nom: '',
    email: '',
    tel: '',
    motDePasse: '',
  });
  const offcanvasRef = useRef<HTMLDivElement | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => a.nom.toLowerCase().includes(q));
  }, [query, list]);

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
    };
    el.addEventListener('hidden.bs.offcanvas', onHidden);
    return () => el.removeEventListener('hidden.bs.offcanvas', onHidden);
  }, []);

  useEffect(() => {
    setBuyerEmail('');
  }, [selected]);

  useEffect(() => {
    if (selected) {
      showOffcanvas();
    }
  }, [selected, showOffcanvas]);

  /** Après paiement PayDunya : retour `?paiement=ok` → ouverture mail / POST avec lien Drive (+ téléphone si assistance). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('paiement');
    const clearQuery = () => {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
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
  }, []);

  const currentPrice = selected
    ? assisted
      ? selected.prix + SUPPLEMENT_ASSISTANCE_FCFA
      : selected.prix
    : 0;

  const description = selected
    ? assisted
      ? selected.descriptionAvecAssistace
      : selected.description
    : '';

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
    setToast(null);
    setPayBusy(true);
    const desc = `${PAYDUNIA_PRODUIT_NOM} — ${selected.nom} (${vente[PAGE_VENTE.formuleLabel]} : ${
      assisted ? selecteurTuple[1].nom : selecteurTuple[0].nom
    })`;
    const result = await createPaydunyaCheckoutInvoice({
      totalAmount: currentPrice,
      description: desc,
    });
    setPayBusy(false);

    if (!result.ok) {
      setToast({
        variant: 'error',
        message: `${vente[PAGE_VENTE.paymentError]}${result.message ? ` (${result.message})` : ''}`.trim(),
      });
      return;
    }

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
      elementsSansAssistance: [],
      elementsAvecAssistance: [],
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
    } catch (error) {
      setApiError(`${vente[PAGE_VENTE.adminApiErrorPrefix]}${(error as Error).message}`);
    }
  };

  const handleLogout = () => {
    authApi.clearToken();
    setToken('');
    setUsers([]);
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
        <Input
          value={query}
          onChange={setQuery}
          placeholder={vente[PAGE_VENTE.searchPlaceholder]}
          ariaLabel={vente[PAGE_VENTE.searchPlaceholder]}
        />
      </Header>

      <main className="container py-4 flex-grow-1">
        <h2 className="h5 fw-bold mb-4" style={{ color: COULEUR_NOIR }}>
          {vente[PAGE_VENTE.sectionTitle]}
        </h2>
        {filtered.length === 0 ? (
          <p className="mb-0" style={{ color: COULEUR_NOIR }}>
            {vente[PAGE_VENTE.noResults]}
          </p>
        ) : (
          <div className="row g-4">
            {filtered.map((article) => (
              <div className="col-12 col-md-6" key={`${article.nom}-${article.URL}`}>
                <Card
                  title={article.nom}
                  category={article.categorie}
                  subtitle={article.description}
                  priceLine={formatPrice(article.prix)}
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
        )}

        <div className="mt-5 border-top pt-4">
          <h3 className="h5 fw-bold mb-3">{vente[PAGE_VENTE.adminTitle]}</h3>
          {apiError ? (
            <p className="small mb-3" style={{ color: COULEUR_NOIR }}>
              {apiError}
            </p>
          ) : null}

          {!token ? (
            <div className="row g-2">
              <div className="col-md-4">
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={setAdminEmail}
                  placeholder={vente[PAGE_VENTE.adminEmailLabel]}
                  ariaLabel={vente[PAGE_VENTE.adminEmailLabel]}
                />
              </div>
              <div className="col-md-4">
                <Input
                  type="text"
                  value={adminPassword}
                  onChange={setAdminPassword}
                  placeholder={vente[PAGE_VENTE.adminPasswordLabel]}
                  ariaLabel={vente[PAGE_VENTE.adminPasswordLabel]}
                />
              </div>
              <div className="col-md-4 d-flex gap-2">
                <Button onClick={() => void handleLogin()}>{vente[PAGE_VENTE.adminLoginButton]}</Button>
                <Button onClick={() => void loadArticles()}>{vente[PAGE_VENTE.adminRefreshButton]}</Button>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex gap-2 flex-wrap">
                <Button onClick={handleLogout}>{vente[PAGE_VENTE.adminLogoutButton]}</Button>
                <Button onClick={openNewArticleModal}>{vente[PAGE_VENTE.adminAddArticleButton]}</Button>
                <Button onClick={openNewUserModal}>{vente[PAGE_VENTE.adminAddUserButton]}</Button>
                <Button
                  onClick={() => {
                    void loadArticles();
                    void loadUsers();
                  }}
                >
                  {vente[PAGE_VENTE.adminRefreshButton]}
                </Button>
              </div>

              <div className="row g-2">
                <div className="col-md-4">
                  <Input
                    type="text"
                    value={oldPassword}
                    onChange={setOldPassword}
                    placeholder={vente[PAGE_VENTE.adminOldPasswordLabel]}
                    ariaLabel={vente[PAGE_VENTE.adminOldPasswordLabel]}
                  />
                </div>
                <div className="col-md-4">
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder={vente[PAGE_VENTE.adminNewPasswordLabel]}
                    ariaLabel={vente[PAGE_VENTE.adminNewPasswordLabel]}
                  />
                </div>
                <div className="col-md-4">
                  <Button onClick={() => void handleChangePassword()}>{vente[PAGE_VENTE.adminChangePasswordButton]}</Button>
                </div>
              </div>

              <div>
                <p className="fw-semibold mb-2">{vente[PAGE_VENTE.adminArticlesSection]}</p>
                <div className="d-flex flex-column gap-2">
                  {list.map((a) => (
                    <div key={`${a.nom}-${a.URL}`} className="d-flex justify-content-between align-items-center border rounded p-2">
                      <span>{a.nom}</span>
                      <div className="d-flex gap-2">
                        <Button onClick={() => openEditArticleModal(a)}>{vente[PAGE_VENTE.adminEditButton]}</Button>
                        <Button onClick={() => void deleteArticle(a.id)}>{vente[PAGE_VENTE.adminDeleteButton]}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="fw-semibold mb-2">{vente[PAGE_VENTE.adminUsersSection]}</p>
                <div className="d-flex flex-column gap-2">
                  {users.map((u) => (
                    <div key={u.id} className="d-flex justify-content-between align-items-center border rounded p-2">
                      <span>{u.nom}</span>
                      <div className="d-flex gap-2">
                        <Button onClick={() => openEditUserModal(u)}>{vente[PAGE_VENTE.adminEditButton]}</Button>
                        <Button onClick={() => void deleteUser(u.id!)}>{vente[PAGE_VENTE.adminDeleteButton]}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer lineLeft={vente[PAGE_VENTE.footerLeft]} lineRight={vente[PAGE_VENTE.footerRight]} />

      <Offcanvas
        ref={offcanvasRef}
        id={OFFCANVAS_ID}
        title={offcanvasTitle}
        closeLabel={vente[PAGE_VENTE.closeAria]}
        footer={
          <Button
            variant="pay"
            className="w-100 py-2"
            type="button"
            disabled={payBusy}
            onClick={() => void handlePay()}
          >
            {payBusy ? vente[PAGE_VENTE.paymentRedirecting] : `${vente[PAGE_VENTE.payButton]} — ${formatPrice(currentPrice)}`}
          </Button>
        }
      >
        {selected ? (
          <>
            <p className="mb-3" style={{ color: COULEUR_NOIR }}>
              {description}
            </p>
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
          </>
        ) : null}
      </Offcanvas>

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
          <div className="col-md-6">
            <Input value={articleForm.URL} onChange={(v) => setArticleForm((p) => ({ ...p, URL: v }))} placeholder={vente[PAGE_VENTE.adminSiteUrlLabel]} ariaLabel={vente[PAGE_VENTE.adminSiteUrlLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={articleForm.urlDrive} onChange={(v) => setArticleForm((p) => ({ ...p, urlDrive: v }))} placeholder={vente[PAGE_VENTE.adminDriveUrlLabel]} ariaLabel={vente[PAGE_VENTE.adminDriveUrlLabel]} type="text" />
          </div>
          <div className="col-md-6">
            <Input value={articleForm.tel} onChange={(v) => setArticleForm((p) => ({ ...p, tel: v }))} placeholder={vente[PAGE_VENTE.adminPhoneLabel]} ariaLabel={vente[PAGE_VENTE.adminPhoneLabel]} type="text" />
          </div>
          <div className="col-md-12">
            <Input value={articleForm.description} onChange={(v) => setArticleForm((p) => ({ ...p, description: v }))} placeholder={vente[PAGE_VENTE.adminDescriptionLabel]} ariaLabel={vente[PAGE_VENTE.adminDescriptionLabel]} type="text" />
          </div>
          <div className="col-md-12">
            <Input value={articleForm.descriptionAvecAssistace} onChange={(v) => setArticleForm((p) => ({ ...p, descriptionAvecAssistace: v }))} placeholder={vente[PAGE_VENTE.adminDescriptionAssistLabel]} ariaLabel={vente[PAGE_VENTE.adminDescriptionAssistLabel]} type="text" />
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
              <Input value={userForm.motDePasse ?? ''} onChange={(v) => setUserForm((p) => ({ ...p, motDePasse: v }))} placeholder={vente[PAGE_VENTE.adminPasswordLabel]} ariaLabel={vente[PAGE_VENTE.adminPasswordLabel]} type="text" />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

export default App;
