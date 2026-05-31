"use client";

import { useEffect } from "react";

const HOME_PAGE_CLASS = "lf-page-home";

/** Unlock landing scroll: viewport scroll lives in .lf-home-page, not body. */
export default function HomePageScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const { documentElement: html, body } = document;
    html.classList.add(HOME_PAGE_CLASS);
    body.classList.add(HOME_PAGE_CLASS);

    const prevOverflow = body.style.overflow;
    body.style.removeProperty("overflow");

    return () => {
      html.classList.remove(HOME_PAGE_CLASS);
      body.classList.remove(HOME_PAGE_CLASS);
      if (prevOverflow) body.style.overflow = prevOverflow;
      else body.style.removeProperty("overflow");
    };
  }, []);

  return <div className="lf-home-page">{children}</div>;
}
