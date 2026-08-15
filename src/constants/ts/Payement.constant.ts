/**
 * Devise et libellés catalogue / facture.
 * Les paiements PayDunya sont gérés uniquement côté ELDBack.
 */

export const DEVISE_SYMBOLE = 'FCFA';
export const FORMAT_DECIMALS = 0;
export const SEPARATEUR_DECIMAL = ',';

/** Supplément FCFA appliqué lorsque la formule « avec assistance » est choisie. */
export const SUPPLEMENT_ASSISTANCE_FCFA = 2000;

/** Nom boutique (reçus PDF / libellés). */
export const PAYDUNIA_STORE_NOM = 'EllaDarie';

/** Préfixe de la description de commande envoyée au backend. */
export const PAYDUNIA_PRODUIT_NOM = 'Commande EllaDarie';
