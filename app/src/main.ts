import { setLocale, getLocale } from "./i18n/index.js";
import { navigate, startRouter } from "./router.js";

setLocale(getLocale());
const el = document.getElementById("app");
if (el) {
  startRouter(el);
  if (!window.location.hash || window.location.hash === "#") {
    navigate("#/splash");
  }
}
