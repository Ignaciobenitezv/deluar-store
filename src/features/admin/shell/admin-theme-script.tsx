/**
 * Blocking, synchronous script — must run before the rest of the app paints
 * so admin theme and sidebar-collapse state are correct on first frame.
 * Writes only to `<html>`'s dataset (never React state), which is why
 * toggling later never risks a hydration mismatch. See admin-theme.css.
 *
 * Rendered as a plain `<script>` tag from a Server Component (this file has
 * no "use client", and neither does RootLayout) — deliberately NOT
 * `next/script`. `next/script`'s `beforeInteractive` strategy is itself a
 * Client Component whose CLIENT bundle, for an inline script, literally
 * returns a `<script>` element as its own render output so Next's runtime
 * can queue and execute it (see
 * node_modules/next/dist/client/script.js — the `appDir` + `beforeInteractive`
 * branch). That means React sees a *component* producing a `<script>` tag
 * during the client hydration pass, which is exactly what
 * "Encountered a script tag while rendering React component" warns about in
 * this Next/React version — using `next/script` here is unfixable without
 * dropping it. A plain `<script>` authored directly in a Server Component
 * has no such client render at all: it's static SSR output that the
 * browser's own HTML parser executes synchronously while streaming the
 * document, before hydration and before any JS bundle loads — which is also
 * what actually prevents the theme flash, same as it did before.
 */
const script = `
(function () {
  try {
    var theme = localStorage.getItem("deluar-admin-theme");
    if (theme !== "light" && theme !== "dark") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.adminTheme = theme;

    if (localStorage.getItem("deluar-admin-sidebar") === "collapsed") {
      document.documentElement.dataset.adminSidebar = "collapsed";
    }
  } catch (e) {}
})();
`;

export function AdminThemeScript() {
  return <script id="admin-theme-init" dangerouslySetInnerHTML={{ __html: script }} />;
}
