import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Política de Devolución",
  description: "Conocé nuestra política de devolución y cambios. DELUAR Deco Home.",
  path: "/politica-de-devolucion",
});

export default function PoliticaDevolucionPage() {
  return (
    <SiteContainer className="py-10 sm:py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Política de Devolución</span>
      </nav>

      <div className="max-w-2xl">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Política de Devolución
        </h1>
        <p className="mb-10 text-sm leading-relaxed text-muted">
          En <strong className="text-foreground">DELUAR</strong>, queremos que tu experiencia de compra sea excelente. Si no estás conforme con tu producto, podés solicitar la devolución siguiendo estos lineamientos:
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Plazo de Arrepentimiento</h2>
            <p className="text-sm leading-relaxed text-muted">
              Tenés un plazo de <strong className="text-foreground">15 días corridos</strong> desde que recibís el producto para solicitar la devolución. (Conforme a la Ley 24.240, los primeros 10 días corresponden al derecho de arrepentimiento legal. Luego del plazo, el envío queda a cargo del cliente.)
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Condiciones del Producto</h2>
            <p className="mb-3 text-sm leading-relaxed text-muted">
              Para que la devolución sea aceptada, el artículo debe cumplir con los siguientes requisitos:
            </p>
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                Estar en <strong className="text-foreground">iguales condiciones</strong> en las que fue entregado.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                No debe presentar <strong className="text-foreground">signos de uso</strong>, lavado o daños por manipulación.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                Debe conservar su <strong className="text-foreground">empaque original</strong> y todas sus etiquetas intactas.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. Productos con Daños o Defectos</h2>
            <p className="mb-3 text-sm leading-relaxed text-muted">
              Si tu pedido llegó roto o con algún daño de transporte, ¡no te preocupes! En este caso, podés elegir entre:
            </p>
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                El <strong className="text-foreground">reenvío</strong> de un producto nuevo (sujeto a stock).
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                El <strong className="text-foreground">reintegro total</strong> del dinero abonado por el producto.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. ¿Cómo inicio el proceso?</h2>
            <p className="mb-3 text-sm leading-relaxed text-muted">
              Es muy simple. Ponete en contacto con nosotros a través de:
            </p>
            <ul className="mb-4 space-y-2 text-sm leading-relaxed text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                <span><strong className="text-foreground">WhatsApp:</strong> +549 3624750741</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                <span>
                  <strong className="text-foreground">Email:</strong>{" "}
                  <a href="mailto:deluar2024@hotmail.com" className="underline hover:text-foreground transition-colors">
                    deluar2024@hotmail.com
                  </a>
                </span>
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted">
              Detallanos el inconveniente o modificación que querés realizar. Nosotros te indicaremos los pasos a seguir. Una vez recibido e inspeccionado el producto, procederemos con el cambio o la devolución del dinero según corresponda.
            </p>
          </section>
        </div>
      </div>
    </SiteContainer>
  );
}
