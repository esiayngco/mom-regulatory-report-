/**
 * main.js
 * Application entry point.
 * Loads data, initialises controls, and renders all charts.
 */

(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {

    // Load CSV → then wire controls → then draw everything
    window.loadData().then(() => {

      // Wire up all UI controls
      window.AppInteractions.initControls();

      // Initial full render
      window.AppInteractions.refresh();

    }).catch(err => {
      console.error('Failed to load data:', err);
      document.body.insertAdjacentHTML('afterbegin',
        `<div style="padding:32px;text-align:center;color:#b5533c;font-family:sans-serif">
          <strong>Data failed to load.</strong><br>
          Make sure you are running this project from a local server
          (e.g. <code>python3 -m http.server</code>) and that
          <code>data/regulatorySurvey.csv</code> exists.
        </div>`
      );
    });

  });
})();
