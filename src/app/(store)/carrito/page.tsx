import { SiteContainer } from "@/components/layout/site-container";
import { CartPageContent } from "@/features/cart/components/cart-page-content";

export const metadata = {
  title: "Carrito",
};

export default function CartPage() {
  return (
    <SiteContainer>
      <CartPageContent />
    </SiteContainer>
  );
}
