/**
 * @fileoverview Gestionnaire de modales d'avertissement sécurisé
 * @module quizaccess_cheatdetect/shared/modal
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/shared/utils',
    'quizaccess_cheatdetect/extension-detector/config'
], function(Utils, Config) {
    'use strict';

    /**
     * ID de la modale actuellement affichée
     * @type {string|null}
     * @private
     */
    var currentModalId = null;

    /**
     * Extension key de la modale actuelle pour le tracking
     * @type {string|null}
     * @private
     */
    var currentExtensionKey = null;

    /**
     * Callback pour enregistrer les événements
     * @type {Function|null}
     * @private
     */
    var eventLogger = null;

    /**
     * Gère le clic sur le bouton de la modale
     * @function handleModalButtonClick
     * @private
     * @since 1.0.0
     */
    var handleModalButtonClick = function() {

        // Enregistrer l'événement de fermeture de modale
        if (eventLogger) {
            eventLogger({
                action: "extension_modal_dismissed",
                data: {
                    extensionKey: currentExtensionKey, // Utilise la variable globale du module
                    modalAction: Config.SETTINGS.reloadOnModalClose ? "reload" : "close"
                }
            });
        } else {
            console.error('❌ eventLogger non configuré pour extension_modal_dismissed !');
        }

        // Action selon la configuration
        if (Config.SETTINGS.reloadOnModalClose === true) {
            window.location.reload();
        } else {
            closeModal();
        }
    };

    /**
     * Définit la fonction de logging des événements
     * @function setEventLogger
     * @param {Function} loggerFunction - Fonction pour enregistrer les événements
     * @example
     * Modal.setEventLogger((event) => {
     *   console.log('Nouvel événement:', event);
     * });
     * @since 1.0.0
     */
    var setEventLogger = function(loggerFunction) {
        eventLogger = loggerFunction;
    };

    /**
     * Affiche une modale d'avertissement avec IDs/classes randomisés pour éviter la détection
     * @function showModal
     * @param {Object} extension - Information sur l'extension détectée
     * @param {Object} [config] - Configuration de la modale
     * @param {string} [config.icon='⚠️'] - Icône à afficher
     * @param {string} [config.title='Avertissement d\'intégrité académique.'] - Titre de la modale
     * @param {string} [config.buttonText='OK — J\'ai retiré l\'extension et je continue'] - Texte du bouton
     * @example
     * showModal('Crowdly Extension', {
     *   title: 'Extension détectée',
     *   icon: '🚫'
     * });
     * @since 1.0.0
     */
    var showModal = function(extension, config) {

        config = config || {};

        var modalId = Utils.generateUniqueId();
        var contentClass = Utils.generateUniqueId();
        var iconClass = Utils.generateUniqueId();
        var titleClass = Utils.generateUniqueId();
        var messageClass = Utils.generateUniqueId();
        var buttonClass = Utils.generateUniqueId();
        var buttonId = Utils.generateUniqueId();
        var animationClass = Utils.generateUniqueId();

        // Configuration par défaut
        var modalConfig = {
            icon: config.icon || '⚠️',
            title: config.title || 'Avertissement d\'intégrité académique.',
            message: config.message || '<p>L\'extension <b>&laquo; %extension.name% &raquo;</b> a été détectée sur votre navigateur. Cette extension est incompatible avec les normes d\'intégrité académique de notre plateforme. Veuillez la désactiver ou la désinstaller de votre navigateur pour continuer.</p>',
            buttonText: config.buttonText || 'OK — J\'ai retiré l\'extension et je continue',
            theme: config.theme || {
                primaryColor: 'var(--primary, "#d73502")',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                zIndex: 10000
            }
        };

        currentModalId = modalId;
        // Stocker l'extension key pour l'utiliser dans handleModalButtonClick
        currentExtensionKey = extension.key;

        // Enregistrer l'événement d'affichage AVANT la création de la modale
        if (eventLogger) {
            eventLogger({
                action: "extension_modal_shown",
                data: {
                    extensionKey: extension.key,
                }
            });
        } else {
            console.error('❌ eventLogger non configuré pour extension_modal_shown !');
        }

        // Création de l'élément modal
        var modal = document.createElement('div');
        modal.id = modalId;

        modal.innerHTML = `
            <style>
                html, body {
                    overflow: hidden;
                    height: 100dvh;
                }
                #${modalId} {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: ${modalConfig.theme.zIndex};
                }

                #${modalId} .${contentClass} {
                    background: ${modalConfig.theme.backgroundColor};
                    border-radius: ${modalConfig.theme.borderRadius};
                    padding: 32px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: ${animationClass} 0.3s ease-out;
                }

                @keyframes ${animationClass} {
                    from { 
                        opacity: 0; 
                        transform: scale(0.9) translateY(-20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                }

                #${modalId} .${iconClass} { 
                    font-size: 48px; 
                    margin-bottom: 16px; 
                }

                #${modalId} .${titleClass} { 
                    color: #333; 
                    font-size: 24px; 
                    font-weight: 600; 
                    margin: 0 0 20px 0; 
                    line-height: 1.4;
                }

                #${modalId} .${messageClass} { 
                    color: #333; 
                    font-size: 16px; 
                    line-height: 1.6; 
                    margin-bottom: 16px; 
                }

                #${modalId} .${buttonClass} { 
                    padding: 14px 28px; 
                }
            </style>

            <div class="${contentClass}">
                <div class="${iconClass}">${modalConfig.icon}</div>
                <div class="${titleClass}">${modalConfig.title}</div>
                <div class="${messageClass}">${modalConfig.message.replace('%extension.name%', extension.name)}</div>
                <button class="${buttonClass} btn btn-primary" id="${buttonId}">
                    ${modalConfig.buttonText}
                </button>
            </div>
        `;

        // Ajout à la page
        document.body.appendChild(modal);

        // Attacher l'événement click au bouton
        var button = modal.querySelector('#' + buttonId);
        if (button) {
            button.addEventListener('click', handleModalButtonClick);
        } else {
            console.error('❌ Bouton de modale non trouvé !');
        }

        // Focus sur le bouton pour l'accessibilité
        setTimeout(function() {
            if (button) {
                button.focus();
            }
        }, 100);

    };

    /**
     * Vérifie si un ID d'élément correspond à notre modale actuelle
     * @function isOurModalId
     * @param {string} elementId - ID de l'élément à vérifier
     * @returns {boolean} True si l'ID correspond à notre modale
     * @example
     * if (isOurModalId(element.id)) {
     *   // Ne pas traiter cet élément, c'est notre modale
     * }
     * @since 1.0.0
     */
    var isOurModalId = function(elementId) {
        return currentModalId && elementId === currentModalId;
    };

    /**
     * Ferme la modale actuelle si elle existe
     * @function closeModal
     * @returns {boolean} True si une modale a été fermée
     * @example
     * const closed = closeModal();
     * @since 1.0.0
     */
    var closeModal = function() {
        if (!currentModalId) {
            return false;
        }

        var modal = document.getElementById(currentModalId);
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
            currentModalId = null;
            // CORRECTION: Réinitialiser aussi l'extension key
            currentExtensionKey = null;
            return true;
        }

        currentModalId = null;
        currentExtensionKey = null;
        return false;
    };

    /**
     * Récupère l'ID de la modale actuellement affichée
     * @function getCurrentModalId
     * @returns {string|null} ID de la modale actuelle ou null
     * @example
     * const modalId = getCurrentModalId();
     * @since 1.0.0
     */
    var getCurrentModalId = function() {
        return currentModalId;
    };

    // API publique
    return {
        showModal: showModal,
        isOurModalId: isOurModalId,
        closeModal: closeModal,
        getCurrentModalId: getCurrentModalId,
        setEventLogger: setEventLogger
    };
});