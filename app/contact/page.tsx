import type { Metadata } from "next";
import { OFFER } from "@/lib/offer-config";

export const metadata: Metadata = {
  title: "Contact & Support",
  description:
    "Get in touch about an order, shipping, returns or anything else. We answer every email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span className="eyebrow">Support</span>
          <h1 className="h2" style={{ marginTop: 10 }}>
            We answer every email.
          </h1>
          <p className="lede" style={{ marginTop: 16 }}>
            Questions about an order, a return, or whether this will fit? Write
            to us and a human will reply.
          </p>

          {/*
            A contact form needs somewhere to send the message. Rather than
            render inputs that discard what the customer types, this points at
            a real inbox until a form backend is connected.
          */}
          <p style={{ marginTop: 24 }}>
            <a
              href={`mailto:${OFFER.supportEmail}?subject=GetFit%20support`}
              className="btn btn--primary"
              style={{ maxWidth: 320 }}
            >
              Email {OFFER.supportEmail}
            </a>
          </p>

          <div className="cards cards--3" style={{ marginTop: 44 }}>
            <div className="card" id="shipping">
              <h3>Shipping</h3>
              <p>
                Orders ship in {OFFER.shipsIn} with tracking. You will get the
                tracking number by email as soon as it moves.
              </p>
            </div>

            <div className="card" id="returns">
              <h3>Returns</h3>
              <p>
                {OFFER.returnWindowDays}-day returns on unworn pieces in their
                original condition. Email us first and we will walk you through
                it.
              </p>
            </div>

            <div className="card">
              <h3>Payment</h3>
              <p>
                Checkout is encrypted and handled entirely by Shopify. We never
                see or store your card details.
              </p>
            </div>
          </div>

          <p className="disclaimer">{OFFER.disclaimer}</p>
        </div>
      </section>
    </>
  );
}
