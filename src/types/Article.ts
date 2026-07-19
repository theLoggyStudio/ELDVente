export type ArticleItem = {
  urlImage: string;
  nom: string;
  /** Version ou année du logiciel (ex. 2024, 6.1). */
  version: string;
  /** Sous-titre court (ex. domaine métier), affiché sous le titre en noir. */
  categorie: string;
  URL: string;
  /**
   * Lien Google Drive (ou équivalent) pour télécharger le logiciel après paiement.
   * N'est renvoyé par l'API qu'aux requêtes admin authentifiées : jamais exposé au catalogue public.
   */
  urlDrive?: string;
  prix: number;
  description: string;
  descriptionAvecAssistace: string;
  prixAvecAssistace: number;
  tel: string;
  /** Éléments inclus (liste) en mode « sans assistance ». */
  elementsSansAssistance: string[];
  /** Éléments inclus (liste) en mode « avec assistance ». */
  elementsAvecAssistance: string[];
};
