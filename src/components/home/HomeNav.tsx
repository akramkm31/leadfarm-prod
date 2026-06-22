import Link from "next/link";
import { HOME_NAV_LINKS } from "@/lib/home-content";
import { appPath } from "@/lib/app-url";

export default function HomeNav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="nav-brand" href="/">
          <span className="dot" />
          LeadFarm
        </Link>
        <div className="nav-links">
          {HOME_NAV_LINKS.map((link) => (
            <a key={link.href} className="nav-link" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <span className="lang active">FR</span>
          <span className="lang">AR</span>
          <Link className="btn btn-tertiary" href={appPath("/login")}>
            Se connecter
          </Link>
          <a className="btn btn-primary" href="#cta">
            Demander une démo
          </a>
        </div>
      </div>
    </nav>
  );
}
