const STORAGE_KEY = "modelo-dijkstra-theme";
var listenersBound = false;

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function syncToggle(theme) {
  var button = document.getElementById("theme-toggle");
  if (!button) {
    return;
  }
  var isDark = theme === "dark";
  button.setAttribute("aria-pressed", isDark ? "true" : "false");
  button.setAttribute("aria-label", isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
  var label = button.querySelector(".theme-label");
  if (label) {
    label.textContent = isDark ? "Oscuro" : "Claro";
  }
}

export function setTheme(theme, persist) {
  var next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  if (persist) {
    localStorage.setItem(STORAGE_KEY, next);
  }
  syncToggle(next);
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark", true);
}

export function initTheme() {
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    setTheme(saved, false);
  } else {
    setTheme(document.documentElement.getAttribute("data-theme") || systemTheme(), false);
  }

  var button = document.getElementById("theme-toggle");
  if (button && !listenersBound) {
    button.addEventListener("click", toggleTheme);
  }

  if (!listenersBound) {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", function (event) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(event.matches ? "light" : "dark", false);
      }
    });
    listenersBound = true;
  }
}
