import Link from "next/link";
import { HOME_FOOTER_LINKS } from "@/lib/home-content";

export default function HomeFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="name">
              <span className="dot" />
              LeadFarm
            </div>
            <div className="tag">DOMAINE KHELIFA · SIDI BEL ABBÈS</div>
            <p>
              Plateforme de traçabilité phytosanitaire pour vergers industriels. Référence en
              Algérie pour la conformité GLOBALG.A.P., HACCP et cahier de culture réglementaire.
            </p>
          </div>

          <div className="footer-col">
            <h4>Produit</h4>
            <ul>
              {HOME_FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Garanties</h4>
            <ul>
              {HOME_FOOTER_LINKS.guarantees.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              {HOME_FOOTER_LINKS.contact.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="l">© 2026 LEADFARM · SIDI BEL ABBÈS · DOMAINE KHELIFA</span>
          <span className="footer-mark">LeadFarm</span>
        </div>
      </div>
    </footer>
  );
}
