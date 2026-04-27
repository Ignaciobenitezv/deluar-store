import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Cómo Comprar",
  description: "Guía paso a paso para realizar tu compra en DELUAR Deco Home.",
  path: "/como-comprar",
});

const steps = [
  'Elegí el/los productos que querés comprar.',
  'Hacé clic en el botón "Agregar al carrito".',
  'Podés seguir agregando otros productos o hacer clic en "Iniciar compra".',
  'Completá tus datos de contacto y hacé clic en "Continuar".',
  'Ingresá la dirección donde querés recibir el pedido. Luego, hacé clic en "Continuar".',
  'Seleccioná el medio de envío y hacé clic en "Continuar".',
  'Elegí el medio de pago.',
  'Una vez elegido, hacé clic en "Continuar".',
  'En la página de confirmación, revisá todos los datos y confirmá la compra.',
  'Después de confirmar, recibirás un e-mail con los detalles.',
  'Una vez recibido el pago, te enviaremos el comprobante y prepararemos tu pedido.',
];

export default function ComoComprarPage() {
  return (
    <SiteContainer className="py-10 sm:py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Información Importante para Comprar</span>
      </nav>

      <div className="max-w-2xl">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Información Importante para Comprar
        </h1>

        <section className="mb-10">
          <h2 className="mb-5 text-base font-semibold text-foreground">Pasos para comprar:</h2>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-4 text-sm leading-relaxed text-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-5 text-base font-semibold text-foreground">Información adicional:</h2>
          <div className="space-y-5">
            <div className="flex items-start gap-2 text-sm leading-relaxed text-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <div>
                <strong className="text-foreground">Envío gratis</strong> a todo el país en compras superiores a $50.000.{" "}
                <span className="text-muted">
                  El envío gratuito aplica a la sucursal más cercana. Al ingresar tu código postal, podrás ver los puntos disponibles para retirar en la opción <strong className="text-foreground">Punto de retiro</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm leading-relaxed text-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <div>
                <strong className="text-foreground">Compras con tarjeta de crédito:</strong>{" "}
                Podés abonar en 3 o 6 cuotas sin interés (según la fecha) con tarjetas Visa, MasterCard, American Express o Cabal de cualquier banco.{" "}
                Para acceder a esta opción, seleccioná <strong className="text-foreground">CUOTA SIMPLE 3/6</strong> (últimas opciones de pago).
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteContainer>
  );
}
