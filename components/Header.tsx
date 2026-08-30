"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnnouncementBar from "./AnnouncementBar";
import { useCart, useReveal } from "./CartProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/products/pentagram-magnetite-hematite-stretch-bracelet", label: "Shop" },
  { href: "/#story", label: "Story" },
  { href: "/contact", label: "Contact" },
];

function BagIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 8h12l-1 12H7L6 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 8V6.5a2.5 2.5 0 0 1 5 0V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({
  announcement,
  saleEndsAt,
}: {
  announcement: string | null;
  saleEndsAt: string | null;
}) {
  const { cart, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useReveal();

  // Close the mobile menu on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("locked");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("locked");
    };
  }, [menuOpen]);

  const count = cart?.totalQuantity ?? 0;

  return (
    <>
      {announcement && (
        <AnnouncementBar text={announcement} endsAt={saleEndsAt} />
      )}

      <header className="header">
        <div className="wrap header__bar">
          <Link href="/" className="logo">
            GetFit
          </Link>

          <nav className="header__nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header__actions">
            <button
              type="button"
              className="iconbtn iconbtn--menu"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>

            <button
              type="button"
              className="iconbtn"
              onClick={openCart}
              aria-label={
                count > 0 ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart"
              }
            >
              <BagIcon />
              {count > 0 && (
                <span className="cartcount" aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* inert keeps the closed panel out of the tab order and the a11y tree. */}
      <div className="menu" data-open={menuOpen} inert={!menuOpen}>
        <div className="menu__scrim" onClick={() => setMenuOpen(false)} />
        <div className="menu__panel" role="dialog" aria-label="Menu" aria-modal="true">
          <div className="menu__head">
            <button
              type="button"
              className="iconbtn"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="menu__links" aria-label="Mobile">
            {NAV.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
