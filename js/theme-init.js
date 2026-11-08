/**
 * theme-init.js
 * Runs SYNCHRONOUSLY before any framework to apply saved theme.
 * Prevents flash of wrong theme on every page load.
 * Load this as the very first <script> in <head>.
 */
(function () {
  var t = localStorage.getItem('eunomia-theme');
  // Default to dark if nothing saved
  if (t === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
})();
