import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE, COULEUR_TEXTE_CLAIR } from '../constants/ts/Couleur.constant';

type FormuleComparaisonProps = {
  sectionTitle: string;
  titreColonneSans: string;
  titreColonneAvec: string;
  lignesSans: string[];
  lignesAvec: string[];
  /** Une seule colonne : celle qui correspond à la formule choisie dans le sélecteur. */
  assisted: boolean;
};

const ListePuces = ({ items, assisted }: { items: string[]; assisted: boolean }) => {
  return (
    <ul className="list-group list-group-flush small">
      {items.map((line, i) => (
        <li
          key={`${i}-${line.slice(0, 20)}`}
          className="list-group-item px-0 py-2 border-0 border-bottom"
          style={{ backgroundColor: 'transparent', color: assisted ? COULEUR_TEXTE_CLAIR : COULEUR_NOIR }}
        >
          {line}
        </li>
      ))}
    </ul>
  );
};

export const FormuleComparaison = ({
  sectionTitle,
  titreColonneSans,
  titreColonneAvec,
  lignesSans,
  lignesAvec,
  assisted,
}: FormuleComparaisonProps) => {
  const titre = assisted ? titreColonneAvec : titreColonneSans;
  const lignes = assisted ? lignesAvec : lignesSans;
  const panelBg = assisted ? COULEUR_PRINCIPALE : COULEUR_BLANC;
  const textColor = assisted ? COULEUR_TEXTE_CLAIR : COULEUR_NOIR;

  return (
    <div className="mb-3 el-item card shadow-sm border-2" style={{ borderColor: COULEUR_NOIR }}>
      <div className="card-header" style={{ backgroundColor: COULEUR_BLANC }}>
        <h3 className="h6 fw-bold mb-0" style={{ color: COULEUR_NOIR }}>{sectionTitle}</h3>
      </div>
      <div className="card-body p-3" style={{ backgroundColor: panelBg }}>
        <h4 className="small text-uppercase fw-bold mb-2" style={{ color: textColor }}>
          {titre}
        </h4>
        <ListePuces items={lignes} assisted={assisted} />
      </div>
    </div>
  );
};
