"use client";

import Link from "next/link";
import AnnouncementBar from "./AnnouncementBar";
import { useCart, useReveal } from "./CartProvider";

/**
 * Desktop navigation only.
 *
 * There is no hamburger below 900px by design — on a single-product page
 * fed by paid social, the header's job is to stay out of the way of the buy
 * button, and every nav control is an exit. Mobile navigation lives in the
 * footer instead, which still carries Shop, Contact, Shipping and FAQ.
 */
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

export default function Header({
  announcement,
  saleEndsAt,
}: {
  announcement: string | null;
  saleEndsAt: string | null;
}) {
  const { cart, openCart } = useCart();

  useReveal();

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
    </>
  );
}
