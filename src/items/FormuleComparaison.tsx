import { COULEUR_BLANC, COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type FormuleComparaisonProps = {
  sectionTitle: string;
  titreColonneSans: string;
  titreColonneAvec: string;
  lignesSans: string[];
  lignesAvec: string[];
  /** Une seule colonne : celle qui correspond à la formule choisie dans le sélecteur. */
  assisted: boolean;
};

const ListePuces = ({ items, accent }: { items: string[]; accent: 'jaune' | 'blanc' }) => {
  return (
    <ul
      className="small mb-0"
      style={{ color: COULEUR_NOIR, listStyle: 'none', paddingLeft: 0 }}
    >
      {items.map((line, i) => (
        <li
          key={`${i}-${line.slice(0, 20)}`}
          className="mb-1"
          style={{
            borderLeft:
              accent === 'jaune' ? `2px solid ${COULEUR_BLANC}` : `2px solid ${COULEUR_NOIR}`,
            paddingLeft: '0.5rem',
            listStyle: 'none',
            marginLeft: 0,
          }}
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
  const fondColonne = assisted ? COULEUR_PRINCIPALE : COULEUR_BLANC;
  const couleurTitre = assisted ? COULEUR_BLANC : COULEUR_NOIR;

  return (
    <div className="mb-3 el-item">
      <h3 className="h6 fw-bold mb-2" style={{ color: COULEUR_NOIR }}>
        {sectionTitle}
      </h3>
      <div
        className="border border-2 rounded-3 overflow-hidden p-2 p-md-3"
        style={{ borderColor: COULEUR_NOIR, backgroundColor: fondColonne }}
      >
        <h4
          className="small text-uppercase fw-bold mb-2 pb-1 border-bottom"
          style={{ color: couleurTitre, borderColor: COULEUR_NOIR, backgroundColor: 'transparent' }}
        >
          {titre}
        </h4>
        <ListePuces items={lignes} accent={assisted ? 'jaune' : 'blanc'} />
      </div>
    </div>
  );
};
