"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  addToCart as addToCartAction,
  fetchCart as fetchCartAction,
  removeLine as removeLineAction,
  setLineQuantity as setLineQuantityAction,
} from "@/app/actions";
import type { Cart } from "@/lib/catalog";

type CartContextValue = {
  cart: Cart | null;
  /** True while any cart mutation is in flight. */
  pending: boolean;
  /** True while an add is in flight and the new line has not arrived yet. */
  isAdding: boolean;
  error: string | null;
  clearError: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (merchandiseId: string, quantity: number) => Promise<boolean>;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export default function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  /** True between opening the drawer and the added line coming back. */
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Quantity edits echo instantly while the Shopify round-trip runs; the
   * server response then replaces this wholesale. Shopify remains the source
   * of truth for totals, so we never do price arithmetic on the client.
   */
  const [optimisticCart, applyOptimistic] = useOptimistic(
    cart,
    (current: Cart | null, patch: { lineId: string; quantity: number }) => {
      if (!current) return current;
      const lines =
        patch.quantity <= 0
          ? current.lines.filter((l) => l.id !== patch.lineId)
          : current.lines.map((l) =>
              l.id === patch.lineId ? { ...l, quantity: patch.quantity } : l
            );
      return {
        ...current,
        lines,
        totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
      };
    }
  );

  const clearError = useCallback(() => setError(null), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  /**
   * The drawer opens before the round-trip rather than after it.
   *
   * Two reasons. It acknowledges the tap immediately instead of leaving the
   * shopper on an unchanged page for the length of a Shopify call, which on a
   * phone reads as a dead button. And because addToCart writes the cart cookie,
   * the Server Action triggers a router refresh whose re-render was landing
   * after the post-await setState and dropping it — opening first puts the
   * state change before that refresh instead of racing it.
   *
   * A failure closes the drawer again and surfaces the error at the CTA.
   */
  const add = useCallback(
    async (merchandiseId: string, quantity: number) => {
      setError(null);
      setIsOpen(true);
      setIsAdding(true);

      const result = await addToCartAction(merchandiseId, quantity);
      setIsAdding(false);

      if (result.ok) {
        setCart(result.cart);
        return true;
      }

      setIsOpen(false);
      setError(result.error);
      return false;
    },
    []
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ lineId, quantity });
      const result = await setLineQuantityAction(lineId, quantity);
      if (result.ok) setCart(result.cart);
      else setError(result.error);
    });
  }, [applyOptimistic]);

  const remove = useCallback((lineId: string) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ lineId, quantity: 0 });
      const result = await removeLineAction(lineId);
      if (result.ok) setCart(result.cart);
      else setError(result.error);
    });
  }, [applyOptimistic]);

  /**
   * Load the cart belonging to the httpOnly cart_id cookie once on mount.
   *
   * This is what keeps a cart alive across a refresh or a return visit. It is
   * deliberately not awaited during render — see the note in app/layout.tsx.
   */
  useEffect(() => {
    let cancelled = false;
    fetchCartAction().then((loaded) => {
      if (!cancelled && loaded) setCart(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape closes the drawer, and background scroll is locked while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("locked");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("locked");
    };
  }, [isOpen]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart: optimisticCart,
      pending,
      isAdding,
      error,
      clearError,
      isOpen,
      openCart,
      closeCart,
      add,
      setQuantity,
      remove,
    }),
    [
      optimisticCart,
      pending,
      isAdding,
      error,
      clearError,
      isOpen,
      openCart,
      closeCart,
      add,
      setQuantity,
      remove,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Adds a `js` class to <html> so CSS can opt into scroll-reveal animations
 * only when JavaScript is running, and runs the reveal observer.
 * Content is fully visible without JS.
 */
export function useReveal() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;

    document.documentElement.classList.add("js");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );

    document
      .querySelectorAll<HTMLElement>(".reveal")
      .forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);
}
