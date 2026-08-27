import { redirect } from "next/navigation";
import { OFFER } from "@/lib/offer-config";

export default function Home() {
  redirect(`/products/${OFFER.featuredHandle}`);
}
