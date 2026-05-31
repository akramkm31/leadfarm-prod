import AppLayout from "@/components/layout/AppLayout";
import { PageScreen, PageHero } from "./PageScreen";

/**
 * Enveloppe standard — design soutenance / Adaline pour toutes les pages app.
 */
export default function AppPage({
  eyebrow,
  title,
  lede,
  faded,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  faded?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppLayout>
      <PageScreen className={className}>
        <PageHero eyebrow={eyebrow} title={title} lede={lede} faded={faded} actions={actions} />
        {children}
      </PageScreen>
    </AppLayout>
  );
}
