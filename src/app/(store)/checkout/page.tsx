import { SiteContainer } from "@/components/layout/site-container";
import { CheckoutPageContent } from "@/features/checkout/components/checkout-page-content";

export const metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <SiteContainer>
      <CheckoutPageContent />
    </SiteContainer>
  );
}
