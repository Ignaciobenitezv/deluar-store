import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";
import { ContactForm } from "@/app/(store)/contacto/contact-form";
import { getStorefrontCopy } from "@/features/storefront-copy/server/get-storefront-copy";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getStorefrontCopy();

  return buildMetadata({
    title: copy.pageContact.title,
    description: copy.pageContact.seoDescription,
    path: "/contacto",
  });
}

export default async function ContactoPage() {
  // Texts and contact details from Configuración → Textos.
  const { copy } = await getStorefrontCopy();
  const page = copy.pageContact;

  return (
    <SiteContainer className="py-10 sm:py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground transition-colors">{copy.navigation.home}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{page.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {page.title}
          </h1>
          <p className="mb-8 whitespace-pre-line text-sm leading-relaxed text-muted">
            {page.intro}
          </p>
          <ul className="space-y-4 text-sm text-muted">
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              <span>{copy.contact.phone}</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <a href={`mailto:${copy.contact.email}`} className="hover:text-foreground transition-colors">
                {copy.contact.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{copy.contact.address}</span>
            </li>
          </ul>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </SiteContainer>
  );
}
