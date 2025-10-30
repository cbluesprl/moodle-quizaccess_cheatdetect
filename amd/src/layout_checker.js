/**
 * 1. Trouve le champ #id_questionsperpage (ID auto-généré par Moodle)
 * 2. Trouve le conteneur d'alerte #cheatdetect_layout_warning
 * 3. Vérifie la valeur au chargement initial (si on édite un quiz existant)
 * 4. Écoute les changements avec on('change')
 * 5. Affiche/cache avec animation (slideDown/slideUp)
 */

  define(['jquery'], function($) {

      var init = function() {
          var $layoutField = $('#id_questionsperpage');
          var $warningDiv = $('#cheatdetect_layout_warning');

          $warningDiv.insertAfter($layoutField);

          if ($layoutField.length === 0 || $warningDiv.length === 0) {
              return;
          }

          var checkLayout = function() {
              var selectedValue = parseInt($layoutField.val());

              if (selectedValue !== 1) {
                  $warningDiv.slideDown(300);
              } else {
                  $warningDiv.slideUp(300);
              }
          };

          checkLayout();
          $layoutField.on('change', checkLayout);
      };
      return {
          init: init
      };
  });