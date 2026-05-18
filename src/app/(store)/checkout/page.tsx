import { SiteContainer } from "@/components/layout/site-container";
import { CheckoutPageContent } from "@/features/checkout/components/checkout-page-content";
import { isReviewDeployment, reviewPaymentMessage } from "@/lib/deployment";

export const metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <SiteContainer>
      <CheckoutPageContent
        isReview={isReviewDeployment}
        reviewPaymentMessage={reviewPaymentMessage}
      />
    </SiteContainer>
  );
}
