"use client";

import { useState } from "react";
import Image from "next/image";

import type { ProductImage } from "@/lib/catalog";

/**
 * Product gallery: one large image, with every other shot as a thumbnail that
 * swaps into it.
 *
 * The large image is keyed on its URL so React swaps the element rather than
 * mutating src on the existing one — without that, the browser keeps painting
 * the previous bitmap until the new file decodes, which reads as a stall on a
 * slow connection.
 *
 * Thumbnails carry empty alt text on purpose. They are controls, not content:
 * the accessible name lives on the button, so a screen reader announces
 * "Show image 3 of 6" once instead of reading the product name six times.
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="pdp__media">
      <Image
        key={current.url}
        className="pdp__hero"
        src={current.url}
        alt={current.altText || title}
        width={current.width}
        height={current.height}
        sizes="(min-width: 900px) 460px, 92vw"
        priority
      />

      {images.length > 1 && (
        <div className="pdp__thumbs">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className={"pdp__thumbbtn" + (i === active ? " is-on" : "")}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            >
              <Image
                className="pdp__thumb"
                src={img.url}
                alt=""
                width={img.width}
                height={img.height}
                sizes="86px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
