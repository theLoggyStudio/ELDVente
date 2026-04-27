import { COULEUR_NOIR, COULEUR_PRINCIPALE } from '../constants/ts/Couleur.constant';

type FooterProps = {
  lineLeft: string;
  lineRight: string;
};

export const Footer = ({ lineLeft, lineRight }: FooterProps) => {
  return (
    <footer
      className="el-item mt-auto border-top py-4"
      style={{ backgroundColor: COULEUR_PRINCIPALE, borderColor: COULEUR_NOIR, color: COULEUR_NOIR }}
    >
      <div className="container d-flex flex-column flex-md-row justify-content-between gap-2 small">
        <span>{lineLeft}</span>
        <span className="text-md-end">{lineRight}</span>
      </div>
    </footer>
  );
};
