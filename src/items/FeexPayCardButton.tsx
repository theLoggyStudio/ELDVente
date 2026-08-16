import { Suspense, lazy, useMemo } from 'react';
import { COULEUR_NOIR, COULEUR_TEXTE_CLAIR } from '../constants/ts/Couleur.constant';
import { FEEXPAY_API_TOKEN, FEEXPAY_MODE, FEEXPAY_SHOP_ID } from '../constants/ts/Feexpay.constant';

// Chargé à la demande : le SDK (axios + styled-components) ne pèse pas sur le bundle initial.
const FeexPay = lazy(() => import('react-sdk-feexpay'));

/** Résultat remonté à App : succès (avec e-mail saisi dans la modale FeexPay) ou échec. */
export type FeexPayCardResult = {
  ok: boolean;
  email?: string;
  message?: string;
};

type FeexPayCardButtonProps = {
  /** Montant en FCFA (XOF), unité entière. */
  amount: number;
  /** Description de la transaction (sans caractères spéciaux, exigence FeexPay). */
  description: string;
  buttonText: string;
  onResult: (result: FeexPayCardResult) => void;
};

const BUTTON_CLASS = 'btn fw-semibold el-item w-100 py-2';
const BUTTON_STYLES = {
  backgroundColor: COULEUR_NOIR,
  borderColor: COULEUR_NOIR,
  color: COULEUR_TEXTE_CLAIR,
} as const;

/**
 * Bouton « Payer » FeexPay pour l’option « Autre… » : ouvre la modale FeexPay
 * (carte bancaire Visa / Mastercard) qui collecte elle-même nom, e-mail et téléphone.
 */
export const FeexPayCardButton = ({ amount, description, buttonText, onResult }: FeexPayCardButtonProps) => {
  // Référence idempotente stable pendant toute la vie du bouton (un article ouvert).
  const reference = useMemo(() => crypto.randomUUID(), []);

  return (
    <Suspense
      fallback={
        <button type="button" className={BUTTON_CLASS} style={BUTTON_STYLES} disabled>
          {buttonText}
        </button>
      }
    >
      <FeexPay
        amount={amount}
        token={FEEXPAY_API_TOKEN}
        id={FEEXPAY_SHOP_ID}
        mode={FEEXPAY_MODE}
        currency="XOF"
        case="CARD"
        description={description}
        reference={reference}
        buttonText={buttonText}
        buttonClass={BUTTON_CLASS}
        buttonStyles={BUTTON_STYLES}
        callback={(response) => {
          const ok = response.status === 'SUCCESSFUL' || response.status === 'SUCCESS';
          onResult({
            ok,
            ...(response.email?.trim() ? { email: response.email.trim() } : {}),
            ...(response.message ? { message: response.message } : {}),
          });
        }}
      />
    </Suspense>
  );
};
