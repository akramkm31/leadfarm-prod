"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import ModalPortal from "@/components/ui/ModalPortal";

type Props = {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function DashboardPanelModal({
  open,
  onClose,
  eyebrow,
  title,
  action,
  children,
}: Props) {
  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="dash-panel-modal-backdrop"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="dash-panel-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dash-panel-modal-title"
        >
          <div className="dash-panel-modal-head">
            <div>
              {eyebrow && <div className="dash-card-eyebrow mono">{eyebrow}</div>}
              <h2 id="dash-panel-modal-title" className="dash-panel-modal-title">
                {title}
              </h2>
            </div>
            <div className="dash-panel-modal-actions">
              {action}
              <button
                type="button"
                onClick={onClose}
                className="dash-panel-modal-close"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="dash-panel-modal-body">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
