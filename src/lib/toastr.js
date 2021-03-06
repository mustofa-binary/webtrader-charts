/*
 * Toastr
 * Copyright 2012-2015
 * Authors: John Papa, Hans Fjällemark, and Tim Ferrell.
 * All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
 *
 * ARIA Support: Greta Krafsig
 *
 * Project: https://github.com/CodeSeven/toastr
 */
// Edited by Amin Roosta (github.com/aminroosta), 2017 June 19
import $ from 'jquery';
import './toastr.scss';

var toastType = {
   error: 'error',
   info: 'info',
   success: 'success',
   warning: 'warning'
};

export var toastr = {
   error: error,
   info: info,
   warning: warning,
   success: success,
   clear: clear,
   options: {},
   version: '2.1.2'
};

var previousToasts = { };

function error(message, title, optionsOverride) {
   notify({
      type: toastType.error,
      iconClass: getOptions().iconClasses.error,
      message: message,
      optionsOverride: optionsOverride,
      title: title
   });
}

function getContainer(options, create) {
   var $container = $(`${options.target} .${options.containerId}`);
   if ($container.length) {
      return $container;
   }
   if (create) {
      $container = createContainer(options);
   }
   return $container;
}

function info(message, title, optionsOverride) {
   notify({
      type: toastType.info,
      iconClass: getOptions().iconClasses.info,
      message: message,
      optionsOverride: optionsOverride,
      title: title
   });
}

function success(message, title, optionsOverride) {
   notify({
      type: toastType.success,
      iconClass: getOptions().iconClasses.success,
      message: message,
      optionsOverride: optionsOverride,
      title: title
   });
}

function warning(message, title, optionsOverride) {
   notify({
      type: toastType.warning,
      iconClass: getOptions().iconClasses.warning,
      message: message,
      optionsOverride: optionsOverride,
      title: title
   });
}

function clear() {
   var options = getOptions();
   clearContainer(options);
}

// internal functions

function clearContainer (options) {
   var $containers = getContainer(options);
   $containers.each(function() {
      var toastsToClear = $(this).children();
      for (var i = toastsToClear.length - 1; i >= 0; i--) {
         clearToast($(toastsToClear[i]), options);
      }
   });
   $containers.remove();
   previousToasts = { };
}

function clearToast ($toastElement, options, clearOptions) {
   var force = clearOptions && clearOptions.force ? clearOptions.force : false;
   if ($toastElement && (force || $(':focus', $toastElement).length === 0)) {
      $toastElement[options.hideMethod]({
         duration: options.hideDuration,
         easing: options.hideEasing,
         complete: function () { removeToast($toastElement, options); }
      });
      return true;
   }
   return false;
}

function createContainer(options) {
   $(options.target).each(function() {
      var $target = $(this);
      var $container = $('<div/>')
         .addClass(options.containerId)
         .addClass(options.positionClass)
         .attr('aria-live', 'polite')
         .attr('role', 'alert');
      $container.appendTo($target);
   });
   return $(`${options.target} .${options.containerId}`);
}

function getDefaults() {
   return {
      tapToDismiss: true,
      toastClass: 'toast',
      containerId: 'toast-container',
      debug: false,

      showMethod: 'fadeIn', //fadeIn, slideDown, and show are built into jQuery
      showDuration: 300,
      showEasing: 'swing', //swing and linear are built into jQuery
      onShown: undefined,
      hideMethod: 'fadeOut',
      hideDuration: 1000,
      hideEasing: 'swing',
      closeMethod: false,
      closeDuration: false,
      closeEasing: false,

      extendedTimeOut: 1000,
      iconClasses: {
         error: 'toast-error',
         info: 'toast-info',
         success: 'toast-success',
         warning: 'toast-warning'
      },
      iconClass: 'toast-info',
      positionClass: 'toast-top-right',
      timeOut: 5000, // Set timeOut and extendedTimeOut to 0 to make it sticky
      titleClass: 'toast-title',
      messageClass: 'toast-message',
      escapeHtml: false,
      target: 'body',
      closeHtml: '<button type="button">&times;</button>',
      newestOnTop: true,
      preventDuplicates: false,
      progressBar: false
   };
}

function notify(map) {
   var options = getOptions();
   var iconClass = map.iconClass || options.iconClass;

   if (typeof (map.optionsOverride) !== 'undefined') {
      options = $.extend(options, map.optionsOverride);
      iconClass = map.optionsOverride.iconClass || iconClass;
   }

   if (shouldExit(options, map)) { return; }

   var $containers = getContainer(options, true);
   $containers.each(function() {
      var $container = $(this);

      var intervalId = null;
      var $toastElement = $('<div/>');
      var $titleElement = $('<div/>');
      var $messageElement = $('<div/>');
      var $progressElement = $('<div/>');
      var $closeElement = $(options.closeHtml);
      var progressBar = {
         intervalId: null,
         hideEta: null,
         maxHideTime: null
      };

      personalizeToast();

      displayToast();

      handleEvents();


      function escapeHtml(source) {
         if (source == null)
            source = "";

         return new String(source)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
      }

      function personalizeToast() {
         setIcon();
         setTitle();
         setMessage();
         setCloseButton();
         setProgressBar();
         setSequence();
      }

      function handleEvents() {
         $toastElement.hover(stickAround, delayedHideToast);
         if (!options.onclick && options.tapToDismiss) {
            $toastElement.click(hideToast);
         }

         if (options.closeButton && $closeElement) {
            $closeElement.click(function (event) {
               if (event.stopPropagation) {
                  event.stopPropagation();
               } else if (event.cancelBubble !== undefined && event.cancelBubble !== true) {
                  event.cancelBubble = true;
               }
               hideToast(true);
            });
         }

         if (options.onclick) {
            $toastElement.click(function (event) {
               options.onclick(event);
               hideToast();
            });
         }
      }

      function displayToast() {
         $toastElement.hide();

         $toastElement[options.showMethod](
               {duration: options.showDuration, easing: options.showEasing, complete: options.onShown}
               );

         if (options.timeOut > 0) {
            intervalId = setTimeout(hideToast, options.timeOut);
            progressBar.maxHideTime = parseFloat(options.timeOut);
            progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
            if (options.progressBar) {
               progressBar.intervalId = setInterval(updateProgress, 10);
            }
         }
      }

      function setIcon() {
         if (map.iconClass) {
            $toastElement.addClass(options.toastClass).addClass(iconClass);
         }
      }

      function setSequence() {
         if (options.newestOnTop) {
            $container.prepend($toastElement);
         } else {
            $container.append($toastElement);
         }
      }

      function setTitle() {
         if (map.title) {
            $titleElement.append(!options.escapeHtml ? map.title : escapeHtml(map.title)).addClass(options.titleClass);
            $toastElement.append($titleElement);
         }
      }

      function setMessage() {
         if (map.message) {
            $messageElement.append(!options.escapeHtml ? map.message : escapeHtml(map.message)).addClass(options.messageClass);
            $toastElement.append($messageElement);
         }
      }

      function setCloseButton() {
         if (options.closeButton) {
            $closeElement.addClass('toast-close-button').attr('role', 'button');
            $toastElement.prepend($closeElement);
         }
      }

      function setProgressBar() {
         if (options.progressBar) {
            $progressElement.addClass('toast-progress');
            $toastElement.prepend($progressElement);
         }
      }

      function hideToast(override) {
         var method = override && options.closeMethod !== false ? options.closeMethod : options.hideMethod;
         var duration = override && options.closeDuration !== false ?
            options.closeDuration : options.hideDuration;
         var easing = override && options.closeEasing !== false ? options.closeEasing : options.hideEasing;
         if ($(':focus', $toastElement).length && !override) {
            return;
         }
         clearTimeout(progressBar.intervalId);
         return $toastElement[method]({
            duration: duration,
            easing: easing,
            complete: function () {
               removeToast($toastElement, options);
            }
         });
      }

      function delayedHideToast() {
         if (options.timeOut > 0 || options.extendedTimeOut > 0) {
            intervalId = setTimeout(hideToast, options.extendedTimeOut);
            progressBar.maxHideTime = parseFloat(options.extendedTimeOut);
            progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
         }
      }

      function stickAround() {
         clearTimeout(intervalId);
         progressBar.hideEta = 0;
         $toastElement.stop(true, true)[options.showMethod](
               {duration: options.showDuration, easing: options.showEasing}
               );
      }

      function updateProgress() {
         var percentage = ((progressBar.hideEta - (new Date().getTime())) / progressBar.maxHideTime) * 100;
         $progressElement.width(percentage + '%');
      }
   });

   function shouldExit(options, map) {
      if (options.preventDuplicates) {
         if (map.message === previousToasts[options.target]) {
            return true;
         } else {
            previousToasts[options.target] = map.message;
         }
      }
      return false;
   }

}

function getOptions() {
   return $.extend({}, getDefaults(), toastr.options);
}

function removeToast($toastElement, options) {
   var $container = getContainer(options);
   if ($toastElement.is(':visible')) {
      return;
   }
   $toastElement.remove();
   $toastElement = null;
   if ($container.children().length === 0) {
      $container.remove();
      previousToasts[options.target] = undefined;
   }
}

export default toastr;
