/*global jQuery:false, alert:false */

/*
 * Default text - jQuery plugin for html5 dragging files from desktop to browser
 *
 * Author: Weixi Yen
 *
 * Email: [Firstname][Lastname]@gmail.com
 *
 * Copyright (c) 2010 Resopollution
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.github.com/weixiyen/jquery-filedrop
 *
 * Version:  0.1.0
 *
 * Features:
 *      Allows sending of extra parameters with file.
 *      Works with Firefox 3.6+
 *      Future-compliant with HTML5 spec (will work with Webkit browsers and IE9)
 * Usage:
 *  See README at project homepage
 *
 */
;(function($) {

  jQuery.event.props.push("dataTransfer");

  var default_opts = {
      fallback_id: '',
      url: '',
      refresh: 1000,
      paramname: 'userfile',
      requestType: 'POST',    // just in case you want to use another HTTP verb
      allowedfileextensions:[],
      allowedfiletypes:[],
      maxfiles: 25,           // Ignored if queuefiles is set > 0
      maxfilesize: 1,         // MB file size limit
      queuefiles: 0,          // Max files before queueing (for large volume uploads)
      queuewait: 200,         // Queue wait time if full
      data: {},
      headers: {},
      drop: empty,
      dragStart: empty,
      dragEnter: empty,
      dragOver: empty,
      dragLeave: empty,
      docEnter: empty,
      docOver: empty,
      docLeave: empty,
      beforeEach: empty,
      afterAll: empty,
      rename: empty,
      error: function(err, file, i, status) {
        alert(err);
      },
      uploadStarted: empty,
      uploadFinished: empty,
      progressUpdated: empty,
      globalProgressUpdated: empty,
      speedUpdated: empty
      },
      errors = ["BrowserNotSupported", "TooManyFiles", "FileTooLarge", "FileTypeNotAllowed", "NotFound", "NotReadable", "AbortError", "ReadError", "FileExtensionNotAllowed"];

  $.fn.filedrop = function(options) {
    var opts = $.extend({}, default_opts, options),
        global_progress = [],
        doc_leave_timer, stop_loop = false,
        files_count = 0,
        files;

    $('#' + opts.fallback_id).css({
      display: 'none',
      width: 0,
      height: 0
    });

    this.on('drop', drop).on('dragstart', opts.dragStart).on('dragenter', dragEnter).on('dragover', dragOver).on('dragleave', dragLeave);
    $(document).on('drop', docDrop).on('dragenter', docEnter).on('dragover', docOver).on('dragleave', docLeave);

    this.on('click', function(e){
      $('#' + opts.fallback_id).trigger(e);
    });

    $('#' + opts.fallback_id).change(function(e) {
      opts.drop(e);
      files = e.target.files;
      files_count = files.length;
      upload();
    });

    function drop(e) {
      if( opts.drop.call(this, e) === false ) return false;
      if(!e.dataTransfer)
        return;
      files = e.dataTransfer.files;
      if (files === null || files === undefined || files.length === 0) {
        opts.error(errors[0]);
        return false;
      }
      files_count = files.length;
      upload();
      e.preventDefault();
      return false;
    }

    function getBuilder(filename, filedata, mime, boundary) {
      var dashdash = '--',
          crlf = '\r\n',
          builder = '',
          paramname = opts.paramname;

      if (opts.data) {
        var params = $.param(opts.data).replace(/\+/g, '%20').split(/&/);

        $.each(params, function() {
          var pair = this.split("=", 2),
              name = decodeURIComponent(pair[0]),
              val  = decodeURIComponent(pair[1]);

          if (pair.length !== 2) {
              return;
          }

          builder += dashdash;
          builder += boundary;
          builder += crlf;
          builder += 'Content-Disposition: form-data; name="' + name + '"';
          builder += crlf;
          builder += crlf;
          builder += val;
          builder += crlf;
        });
      }

      if (jQuery.isFunction(paramname)){
        paramname = paramname(filename);
      }

      builder += dashdash;
      builder += boundary;
      builder += crlf;
      builder += 'Content-Disposition: form-data; name="' + (paramname||"") + '"';
      builder += '; filename="' + filename + '"';
      builder += crlf;

      builder += 'Content-Type: ' + mime;
      builder += crlf;
      builder += crlf;

      builder += filedata;
      builder += crlf;

      builder += dashdash;
      builder += boundary;
      builder += dashdash;
      builder += crlf;
      return builder;
    }

    function progress(e) {
      if (e.lengthComputable) {
        var percentage = Math.round((e.loaded * 100) / e.total);
        if (this.currentProgress !== percentage) {

          this.currentProgress = percentage;
          opts.progressUpdated(this.index, this.file, this.currentProgress);

          global_progress[this.global_progress_index] = this.currentProgress;
          globalProgress();

          var elapsed = new Date().getTime();
          var diffTime = elapsed - this.currentStart;
          if (diffTime >= opts.refresh) {
            var diffData = e.loaded - this.startData;
            var speed = diffData / diffTime; // KB per second
            opts.speedUpdated(this.index, this.file, speed);
            this.startData = e.loaded;
            this.currentStart = elapsed;
          }
        }
      }
    }

    function globalProgress() {
      if (global_progress.length === 0) {
        return;
      }

      var total = 0, index;
      for (index in global_progress) {
        if(global_progress.hasOwnProperty(index)) {
          total = total + global_progress[index];
        }
      }

      opts.globalProgressUpdated(Math.round(total / global_progress.length));
    }

    // Respond to an upload
    function upload() {
      stop_loop = false;

      if (!files) {
        opts.error(errors[0]);
        return false;
      }

      if (opts.allowedfiletypes.push && opts.allowedfiletypes.length) {
        for(var fileIndex = files.length;fileIndex--;) {
          if(!files[fileIndex].type || $.inArray(files[fileIndex].type, opts.allowedfiletypes) < 0) {
            opts.error(errors[3], files[fileIndex]);
            return false;
          }
        }
      }

      if (opts.allowedfileextensions.push && opts.allowedfileextensions.length) {
        for(var fileIndex = files.length;fileIndex--;) {
          var allowedextension = false;
          for (i=0;i<opts.allowedfileextensions.length;i++){
            if (files[fileIndex].name.substr(files[fileIndex].name.length-opts.allowedfileextensions[i].length) == opts.allowedfileextensions[i]) {
              allowedextension = true;
            }
          }
          if (!allowedextension){
            opts.error(errors[8], files[fileIndex]);
            return false;
          }
        }
      }

      var filesDone = 0,
          filesRejected = 0;

      if (files_count > opts.maxfiles && opts.queuefiles === 0) {
        opts.error(errors[1]);
        return false;
      }

      // Define queues to manage upload process
      var workQueue = [];
      var processingQueue = [];
      var doneQueue = [];

      // Add everything to the workQueue
      for (var i = 0; i < files_count; i++) {
        workQueue.push(i);
      }

      // Helper function to enable pause of processing to wait
      // for in process queue to complete
      var pause = function(timeout) {
        setTimeout(process, timeout);
        return;
      };

      // Process an upload, recursive
      var process = function() {

        var fileIndex;

        if (stop_loop) {
          return false;
        }

        // Check to see if are in queue mode
        if (opts.queuefiles > 0 && processingQueue.length >= opts.queuefiles) {
          return pause(opts.queuewait);
        } else {
          // Take first thing off work queue
          fileIndex = workQueue[0];
          workQueue.splice(0, 1);

          // Add to processing queue
          processingQueue.push(fileIndex);
        }

        try {
          if (beforeEach(files[fileIndex]) !== false) {
            if (fileIndex === files_count) {
              return;
            }
            var reader = new FileReader(),
                max_file_size = 1048576 * opts.maxfilesize;

            reader.index = fileIndex;
            if (files[fileIndex].size > max_file_size) {
              opts.error(errors[2], files[fileIndex], fileIndex);
              // Remove from queue
              processingQueue.forEach(function(value, key) {
                if (value === fileIndex) {
                  processingQueue.splice(key, 1);
                }
              });
              filesRejected++;
              return true;
            }

            reader.onerror = function(e) {
                switch(e.target.error.code) {
                    case e.target.error.NOT_FOUND_ERR:
                        opts.error(errors[4]);
                        return false;
                    case e.target.error.NOT_READABLE_ERR:
                        opts.error(errors[5]);
                        return false;
                    case e.target.error.ABORT_ERR:
                        opts.error(errors[6]);
                        return false;
                    default:
                        opts.error(errors[7]);
                        return false;
                };
            };

            reader.onloadend = !opts.beforeSend ? send : function (e) {
              opts.beforeSend(files[fileIndex], fileIndex, function () { send(e); });
            };

            reader.readAsDataURL(files[fileIndex]);

          } else {
            filesRejected++;
          }
        } catch (err) {
          // Remove from queue
          processingQueue.forEach(function(value, key) {
            if (value === fileIndex) {
              processingQueue.splice(key, 1);
            }
          });
          opts.error(errors[0]);
          return false;
        }

        // If we still have work to do,
        if (workQueue.length > 0) {
          process();
        }
      };

      var send = function(e) {

        var fileIndex = (e.srcElement || e.target).index;

        // Sometimes the index is not attached to the
        // event object. Find it by size. Hack for sure.
        if (e.target.index === undefined) {
          e.target.index = getIndexBySize(e.total);
        }

        var xhr = new XMLHttpRequest(),
            upload = xhr.upload,
            file = files[e.target.index],
            index = e.target.index,
            start_time = new Date().getTime(),
            boundary = '------multipartformboundary' + (new Date()).getTime(),
            global_progress_index = global_progress.length,
            builder,
            newName = rename(file.name),
            mime = file.type;

        if (opts.withCredentials) {
          xhr.withCredentials = opts.withCredentials;
        }

        var data = atob(e.target.result.split(',')[1]);
        if (typeof newName === "string") {
          builder = getBuilder(newName, data, mime, boundary);
        } else {
          builder = getBuilder(file.name, data, mime, boundary);
        }

        upload.index = index;
        upload.file = file;
        upload.downloadStartTime = start_time;
        upload.currentStart = start_time;
        upload.currentProgress = 0;
        upload.global_progress_index = global_progress_index;
        upload.startData = 0;
        upload.addEventListener("progress", progress, false);

        // Allow url to be a method
        if (jQuery.isFunction(opts.url)) {
            xhr.open(opts.requestType, opts.url(), true);
        } else {
            xhr.open(opts.requestType, opts.url, true);
        }

        xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        // Add headers
        $.each(opts.headers, function(k, v) {
          xhr.setRequestHeader(k, v);
        });

        xhr.sendAsBinary(builder);

        global_progress[global_progress_index] = 0;
        globalProgress();

        opts.uploadStarted(index, file, files_count);

        xhr.onload = function() {
            var serverResponse = null;

            if (xhr.responseText) {
              try {
                serverResponse = jQuery.parseJSON(xhr.responseText);
              }
              catch (e) {
                serverResponse = xhr.responseText;
              }
            }

            var now = new Date().getTime(),
                timeDiff = now - start_time,
                result = opts.uploadFinished(index, file, serverResponse, timeDiff, xhr);
            filesDone++;

            // Remove from processing queue
            processingQueue.forEach(function(value, key) {
              if (value === fileIndex) {
                processingQueue.splice(key, 1);
              }
            });

            // Add to donequeue
            doneQueue.push(fileIndex);

            // Make sure the global progress is updated
            global_progress[global_progress_index] = 100;
            globalProgress();

            if (filesDone === (files_count - filesRejected)) {
              afterAll();
            }
            if (result === false) {
              stop_loop = true;
            }


          // Pass any errors to the error option
          if (xhr.status < 200 || xhr.status > 299) {
            opts.error(xhr.statusText, file, fileIndex, xhr.status);
          }
        };
      };

      // Initiate the processing loop
      process();
    }

    function getIndexBySize(size) {
      for (var i = 0; i < files_count; i++) {
        if (files[i].size === size) {
          return i;
        }
      }

      return undefined;
    }

    function rename(name) {
      return opts.rename(name);
    }

    function beforeEach(file) {
      return opts.beforeEach(file);
    }

    function afterAll() {
      return opts.afterAll();
    }

    function dragEnter(e) {
      clearTimeout(doc_leave_timer);
      e.preventDefault();
      opts.dragEnter.call(this, e);
    }

    function dragOver(e) {
      clearTimeout(doc_leave_timer);
      e.preventDefault();
      opts.docOver.call(this, e);
      opts.dragOver.call(this, e);
    }

    function dragLeave(e) {
      clearTimeout(doc_leave_timer);
      opts.dragLeave.call(this, e);
      e.stopPropagation();
    }

    function docDrop(e) {
      e.preventDefault();
      opts.docLeave.call(this, e);
      return false;
    }

    function docEnter(e) {
      clearTimeout(doc_leave_timer);
      e.preventDefault();
      opts.docEnter.call(this, e);
      return false;
    }

    function docOver(e) {
      clearTimeout(doc_leave_timer);
      e.preventDefault();
      opts.docOver.call(this, e);
      return false;
    }

    function docLeave(e) {
      doc_leave_timer = setTimeout((function(_this) {
        return function() {
          opts.docLeave.call(_this, e);
        };
      })(this), 200);
    }

    return this;
  };

  function empty() {}

  try {
    if (XMLHttpRequest.prototype.sendAsBinary) {
        return;
    }
    XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
      function byteValue(x) {
        return x.charCodeAt(0) & 0xff;
      }
      var ords = Array.prototype.map.call(datastr, byteValue);
      var ui8a = new Uint8Array(ords);

      // Not pretty: Chrome 22 deprecated sending ArrayBuffer, moving instead
      // to sending ArrayBufferView.  Sadly, no proper way to detect this
      // functionality has been discovered.  Happily, Chrome 22 also introduced
      // the base ArrayBufferView class, not present in Chrome 21.
      if ('ArrayBufferView' in window)
        this.send(ui8a);
      else
        this.send(ui8a.buffer);
    };
  } catch (e) {}

})(jQuery);
;/*!
  SerializeJSON jQuery plugin.
  https://github.com/marioizquierdo/jquery.serializeJSON
  version 1.0.2 (Aug 20, 2012)

  Copyright (c) 2012 Mario Izquierdo
  Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
  and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
*/
(function ($) {
  "use strict";

  $.fn.serializeJSON = function () {
    var obj, formAsArray;
    obj = {};
    formAsArray = this.serializeArray();

    $.each(formAsArray, function (i, input) {
      var name, value, keys;
      name = input.name;
      value = input.value;

      // Split the input name in programatically readable keys
      // name = "foo"              => keys = ['foo']
      // name = "[foo]"            => keys = ['foo']
      // name = "foo[inn][bar]"    => keys = ['foo', 'inn', 'bar']
      // name = "foo[inn][arr][0]" => keys = ['foo', 'inn', 'arr', '0']
      // name = "arr[][val]"       => keys = ['arr', '', 'val']
      keys = $.map(name.split('['), function (key) {
        var last;
        last = key[key.length - 1];
        return last === ']' ? key.substring(0, key.length - 1) : key;
      });
      if (keys[0] === '') { keys.shift(); } // "[foo][inn]" should be same as "foo[inn]"

      // Set value in the object using the keys
      $.deepSet(obj, keys, value);
    });
    return obj;
  };

  // Auxiliar function to check if a variable is an Object
  var isObject = function (obj) {
    return obj === Object(obj);
  };

  /**
  Access the object in a deep key and assigns the value:

  // Examples:
  deepSet(obj, ['foo'], v)                //=> obj['foo'] = v
  deepSet(obj, ['foo', 'inn'], v)         //=> obj['foo']['inn'] = v // Create the inner obj['foo'] object, if needed
  deepSet(obj, ['foo', 'inn', 'inn'], v)  //=> obj['foo']['inn']['inn'] = v
  deepSet(obj, ['0'], v)                  //=> obj[0] = v // obj may be an Array
  deepSet(obj, [''], v)                   //=> obj.push(v) // assume obj as array, and add a new value to the end
  deepSet(obj, ['arr', '0'], v)           //=> obj['arr']['0'] = v // obj['arr'] is created as Array if needed
  deepSet(obj, ['arr', ''], v)            //=> obj['arr'].push(v)
  deepSet(obj, ['foo', 'arr', '0'], v)    //=> obj['foo']['arr'][0] = v // obj['foo'] is created as object and obj['foo']['arr'] as a Array, if needed
  deepSet(obj, ['arr', '0', 'foo'], v)    //=> obj['arr']['0']['foo'] = v // obj['foo'] is created as object and obj['foo']['arr'] as a Array and obj['foo']['arr'][0] as object, if needed

  // Complex example with array empty index,
  // it creates a new element, unless there is a nested non repeated key, so it assigns to the last element object:
  var arr = []
  deepSet(arr, [''], v)                   //=> arr === [v]
  deepSet(arr, ['', 'foo'], v)            //=> arr === [v, {foo: v}]
  deepSet(arr, ['', 'bar'], v)            //=> arr === [v, {foo: v, bar: v}]
  deepSet(arr, ['', 'bar'], v)            //=> arr === [v, {foo: v, bar: v}, {bar: v}]
  */
  $.deepSet = function (obj, keys, value) {
    if (!keys || keys.length === 0) { throw new Error("ArgumentError: keys param expected to be an array with least one key"); }
    var key, next, tail, defaultIfNotDefined, lastKey, lastElement;
    key = keys[0];
    next = keys[1];
    if (next !== undefined && next !== null) {
      tail = keys.slice(1);
      if (key === '') { // Empty key with => merge keys in the object element
        lastKey = obj.length - 1;
        lastElement = obj[obj.length - 1];
        if (isObject(lastElement) && !lastElement[next]) { // if next key is a new attribute in the last object element then set the new value in there
          key = lastKey;
        } else { // if the array does not have an object as last element, create one
          obj.push({});
          key = lastKey + 1;
        }
      }
      if (obj[key] === undefined) { // obj[key] ||= defaultIfNotDefined
        defaultIfNotDefined = (next === '' || !isNaN(parseInt(next, 10))) ? [] : {}; // Array or Object depending on next key
        obj[key] = defaultIfNotDefined;
      }
      $.deepSet(obj[key], tail, value); // Recursive access the inner Object
    } else {
      if (key === '') {
        obj.push(value);
      } else {
        obj[key] = value;
      }
    }
  };

}(jQuery));;function MediumEditor(elements, options) {
    'use strict';
    return this.init(elements, options);
}

if (typeof module === 'object') {
    module.exports = MediumEditor;
}

(function (window, document) {
    'use strict';

    function extend(b, a) {
        var prop;
        if (b === undefined) {
            return a;
        }
        for (prop in a) {
            if (a.hasOwnProperty(prop) && b.hasOwnProperty(prop) === false) {
                b[prop] = a[prop];
            }
        }
        return b;
    }

    // http://stackoverflow.com/questions/5605401/insert-link-in-contenteditable-element
    // by Tim Down
    function saveSelection() {
        var i,
            len,
            ranges,
            sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            ranges = [];
            for (i = 0, len = sel.rangeCount; i < len; i += 1) {
                ranges.push(sel.getRangeAt(i));
            }
            return ranges;
        }
        return null;
    }

    function restoreSelection(savedSel) {
        var i,
            len,
            sel = window.getSelection();
        if (savedSel) {
            sel.removeAllRanges();
            for (i = 0, len = savedSel.length; i < len; i += 1) {
                sel.addRange(savedSel[i]);
            }
        }
    }

    // http://stackoverflow.com/questions/1197401/how-can-i-get-the-element-the-caret-is-in-with-javascript-when-using-contentedi
    // by You
    function getSelectionStart() {
        var node = document.getSelection().anchorNode,
            startNode = (node && node.nodeType === 3 ? node.parentNode : node);
        return startNode;
    }

    // http://stackoverflow.com/questions/4176923/html-of-selected-text
    // by Tim Down
    function getSelectionHtml() {
        var i,
            html = '',
            sel,
            len,
            container;
        if (window.getSelection !== undefined) {
            sel = window.getSelection();
            if (sel.rangeCount) {
                container = document.createElement('div');
                for (i = 0, len = sel.rangeCount; i < len; i += 1) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        } else if (document.selection !== undefined) {
            if (document.selection.type === 'Text') {
                html = document.selection.createRange().htmlText;
            }
        }
        return html;
    }

    MediumEditor.prototype = {
        defaults: {
            allowMultiParagraphSelection: true,
            anchorInputPlaceholder: 'Paste or type a link',
            buttons: ['bold', 'italic', 'underline', 'anchor', 'header1', 'header2', 'quote'],
            buttonLabels: false,
            delay: 0,
            diffLeft: 0,
            diffTop: -10,
            disableReturn: false,
            disableToolbar: false,
            firstHeader: 'h3',
            forcePlainText: true,
            placeholder: 'Type your text',
            secondHeader: 'h4',
            targetBlank: false
        },

        init: function (elements, options) {
            this.elements = typeof elements === 'string' ? document.querySelectorAll(elements) : elements;
            if (this.elements.length === 0) {
                return;
            }
            this.isActive = true;
            this.parentElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre'];
            this.id = document.querySelectorAll('.medium-editor-toolbar').length + 1;
            this.options = extend(options, this.defaults);
            return this.initElements()
                       .bindSelect()
                       .bindPaste()
                       .setPlaceholders()
                       .bindWindowActions();
        },

        initElements: function () {
            var i,
                addToolbar = false;
            for (i = 0; i < this.elements.length; i += 1) {
                this.elements[i].setAttribute('contentEditable', true);
                if (!this.elements[i].getAttribute('data-placeholder')) {
                    this.elements[i].setAttribute('data-placeholder', this.options.placeholder);
                }
                this.elements[i].setAttribute('data-medium-element', true);
                this.bindParagraphCreation(i).bindReturn(i).bindTab(i);
                if (!this.options.disableToolbar && !this.elements[i].getAttribute('data-disable-toolbar')) {
                    addToolbar = true;
                }
            }
            // Init toolbar
            if (addToolbar) {
                this.initToolbar()
                    .bindButtons()
                    .bindAnchorForm();
            }
            return this;
        },

        serialize: function () {
            var i,
                elementid,
                content = {};
            for (i = 0; i < this.elements.length; i += 1) {
                elementid = (this.elements[i].id !== '') ? this.elements[i].id : 'element-' + i;
                content[elementid] = {
                    value: this.elements[i].innerHTML.trim()
                };
            }
            return content;
        },

        bindParagraphCreation: function (index) {
            var self = this;
            this.elements[index].addEventListener('keyup', function (e) {
                var node = getSelectionStart(),
                    tagName;
                if (node && node.getAttribute('data-medium-element') && node.children.length === 0
                        && !(self.options.disableReturn || node.getAttribute('data-disable-return'))) {
                    document.execCommand('formatBlock', false, 'p');
                }
                if (e.which === 13 && !e.shiftKey) {
                    node = getSelectionStart();
                    tagName = node.tagName.toLowerCase();
                    if (!(self.options.disableReturn || this.getAttribute('data-disable-return'))
                            && tagName !== 'li') {
                        document.execCommand('formatBlock', false, 'p');
                        if (tagName === 'a') {
                            document.execCommand('unlink', false, null);
                        }
                    }
                }
            });
            return this;
        },

        bindReturn: function (index) {
            var self = this;
            this.elements[index].addEventListener('keypress', function (e) {
                if (e.which === 13) {
                    if (self.options.disableReturn || this.getAttribute('data-disable-return')) {
                        e.preventDefault();
                    }
                }
            });
            return this;
        },

        bindTab: function (index) {
            this.elements[index].addEventListener('keydown', function (e) {
                if (e.which === 9) {
                    // Override tab only for pre nodes
                    var tag = getSelectionStart().tagName.toLowerCase();
                    if (tag === "pre") {
                        e.preventDefault();
                        document.execCommand('insertHtml', null, '    ');
                    }
                }
            });
        },

        buttonTemplate: function (btnType) {
            var buttonLabels = this.getButtonLabels(this.options.buttonLabels),
                buttonTemplates = {
                    'bold': '<li><button class="medium-editor-action medium-editor-action-bold" data-action="bold" data-element="b">' + buttonLabels.bold + '</button></li>',
                    'italic': '<li><button class="medium-editor-action medium-editor-action-italic" data-action="italic" data-element="i">' + buttonLabels.italic + '</button></li>',
                    'underline': '<li><button class="medium-editor-action medium-editor-action-underline" data-action="underline" data-element="u">' + buttonLabels.underline + '</button></li>',
                    'strikethrough': '<li><button class="medium-editor-action medium-editor-action-strikethrough" data-action="strikethrough" data-element="strike"><strike>A</strike></button></li>',
                    'superscript': '<li><button class="medium-editor-action medium-editor-action-superscript" data-action="superscript" data-element="sup">' + buttonLabels.superscript + '</button></li>',
                    'subscript': '<li><button class="medium-editor-action medium-editor-action-subscript" data-action="subscript" data-element="sub">' + buttonLabels.subscript + '</button></li>',
                    'anchor': '<li><button class="medium-editor-action medium-editor-action-anchor" data-action="anchor" data-element="a">' + buttonLabels.anchor + '</button></li>',
                    'header1': '<li><button class="medium-editor-action medium-editor-action-header1" data-action="append-' + this.options.firstHeader + '" data-element="' + this.options.firstHeader + '">' + buttonLabels.header1 + '</button></li>',
                    'header2': '<li><button class="medium-editor-action medium-editor-action-header2" data-action="append-' + this.options.secondHeader + '" data-element="' + this.options.secondHeader + '">' + buttonLabels.header2 + '</button></li>',
                    'quote': '<li><button class="medium-editor-action medium-editor-action-quote" data-action="append-blockquote" data-element="blockquote">' + buttonLabels.quote + '</button></li>',
                    'orderedlist': '<li><button class="medium-editor-action medium-editor-action-orderedlist" data-action="insertorderedlist" data-element="ol">' + buttonLabels.orderedlist + '</button></li>',
                    'unorderedlist': '<li><button class="medium-editor-action medium-editor-action-unorderedlist" data-action="insertunorderedlist" data-element="ul">' + buttonLabels.unorderedlist + '</button></li>',
                    'pre': '<li><button class="medium-editor-action medium-editor-action-pre" data-action="append-pre" data-element="pre">' + buttonLabels.pre + '</button></li>'
                };
            return buttonTemplates[btnType] || false;
        },

        // TODO: break method
        getButtonLabels: function (buttonLabelType) {
            var customButtonLabels,
                attrname,
                buttonLabels = {
                    'bold': '<b>B</b>',
                    'italic' : '<b><i>I<i></b>',
                    'underline': '<b><u>U</u></b>',
                    'superscript': '<b>x<sup>1</sup></b>',
                    'subscript': '<b>x<sub>1</sup></b>',
                    'anchor': '<b>#</b>',
                    'header1': '<b>H1</b>',
                    'header2': '<b>H2</b>',
                    'quote': '<b>&ldquo;</b>',
                    'orderedlist': '<b>1.</b>',
                    'unorderedlist': '<b>&bull;</b>',
                    'pre': '<b>0101</b>'
                };
            if (buttonLabelType === 'fontawesome') {
                customButtonLabels = {
                    'bold': '<i class="fa fa-bold"></i>',
                    'italic' : '<i class="fa fa-italic"></i>',
                    'underline': '<i class="fa fa-underline"></i>',
                    'superscript': '<i class="fa fa-superscript"></i>',
                    'subscript': '<i class="fa fa-subscript"></i>',
                    'anchor': '<i class="fa fa-link"></i>',
                    'quote': '<i class="fa fa-quote-right"></i>',
                    'orderedlist': '<i class="fa fa-list-ol"></i>',
                    'unorderedlist': '<i class="fa fa-list-ul"></i>',
                    'pre': '<i class="fa fa-code fa-lg"></i>'
                };
            } else if (typeof buttonLabelType === 'object') {
                customButtonLabels = buttonLabelType;
            }
            if (typeof customButtonLabels === 'object') {
                for (attrname in customButtonLabels) {
                    if (customButtonLabels.hasOwnProperty(attrname)) {
                        buttonLabels[attrname] = customButtonLabels[attrname];
                    }
                }
            }
            return buttonLabels;
        },

        //TODO: actionTemplate
        toolbarTemplate: function () {
            var btns = this.options.buttons,
                html = '<ul id="medium-editor-toolbar-actions" class="medium-editor-toolbar-actions clearfix">',
                i,
                tpl;

            for (i = 0; i < btns.length; i += 1) {
                tpl = this.buttonTemplate(btns[i]);
                if (tpl) {
                    html += tpl;
                }
            }
            html += '</ul>' +
                '<div class="medium-editor-toolbar-form-anchor" id="medium-editor-toolbar-form-anchor">' +
                '    <input type="text" value="" placeholder="' + this.options.anchorInputPlaceholder + '">' +
                '    <a href="#">&times;</a>' +
                '</div>';
            return html;
        },

        initToolbar: function () {
            if (this.toolbar) {
                return this;
            }
            this.toolbar = this.createToolbar();
            this.keepToolbarAlive = false;
            this.anchorForm = this.toolbar.querySelector('.medium-editor-toolbar-form-anchor');
            this.anchorInput = this.anchorForm.querySelector('input');
            this.toolbarActions = this.toolbar.querySelector('.medium-editor-toolbar-actions');
            return this;
        },

        createToolbar: function () {
            var toolbar = document.createElement('div');
            toolbar.id = 'medium-editor-toolbar-' + this.id;
            toolbar.className = 'medium-editor-toolbar';
            toolbar.innerHTML = this.toolbarTemplate();
            document.getElementsByTagName('body')[0].appendChild(toolbar);
            return toolbar;
        },

        bindSelect: function () {
            var self = this,
                timer = '',
                i;
            this.checkSelectionWrapper = function (e) {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    self.checkSelection();
                }, self.options.delay);
            };

            document.documentElement.addEventListener('mouseup', this.checkSelectionWrapper);

            for (i = 0; i < this.elements.length; i += 1) {
                this.elements[i].addEventListener('keyup', this.checkSelectionWrapper);
                this.elements[i].addEventListener('blur', this.checkSelectionWrapper);
            }
            return this;
        },

        checkSelection: function () {
            var i,
                newSelection,
                hasMultiParagraphs,
                selectionHtml,
                selectionElement;
            if (this.keepToolbarAlive !== true && !this.options.disableToolbar) {
                newSelection = window.getSelection();
                selectionHtml = getSelectionHtml();
                selectionHtml = selectionHtml.replace(/<[\S]+><\/[\S]+>/gim, '');
                // Check if selection is between multi paragraph <p>.
                hasMultiParagraphs = selectionHtml.match(/<(p|h[0-6]|blockquote)>([\s\S]*?)<\/(p|h[0-6]|blockquote)>/g);
                hasMultiParagraphs = hasMultiParagraphs ? hasMultiParagraphs.length : 0;
                if (newSelection.toString().trim() === ''
                        || (this.options.allowMultiParagraphSelection === false && hasMultiParagraphs)) {
                    this.hideToolbarActions();
                } else {
                    selectionElement = this.getSelectionElement();
                    if (!selectionElement || selectionElement.getAttribute('data-disable-toolbar')) {
                        this.hideToolbarActions();
                    } else {
                        this.selection = newSelection;
                        this.selectionRange = this.selection.getRangeAt(0);
                        for (i = 0; i < this.elements.length; i += 1) {
                            if (this.elements[i] === selectionElement) {
                                this.setToolbarButtonStates()
                                    .setToolbarPosition()
                                    .showToolbarActions();
                                return;
                            }
                        }
                        this.hideToolbarActions();
                    }
                }
            }
            return this;
        },

        getSelectionElement: function () {
            var selection = window.getSelection(),
                range = selection.getRangeAt(0),
                current = range.commonAncestorContainer,
                parent = current.parentNode,
                result,
                getMediumElement = function(e) {
                    var parent = e;
                    try {
                        while (!parent.getAttribute('data-medium-element')) {
                            parent = parent.parentNode;
                        }
                    } catch (errb) {
                        return false;
                    }
                    return parent;
                };
            // First try on current node
            try {
                if (current.getAttribute('data-medium-element')) {
                    result = current;
                } else {
                    result = getMediumElement(parent);
                }
            // If not search in the parent nodes.
            } catch (err) {
                result = getMediumElement(parent);
            }
            return result;
        },

        setToolbarPosition: function () {
            var buttonHeight = 50,
                selection = window.getSelection(),
                range = selection.getRangeAt(0),
                boundary = range.getBoundingClientRect(),
                defaultLeft = (this.options.diffLeft) - (this.toolbar.offsetWidth / 2),
                middleBoundary = (boundary.left + boundary.right) / 2,
                halfOffsetWidth = this.toolbar.offsetWidth / 2;
            if (boundary.top < buttonHeight) {
                this.toolbar.classList.add('medium-toolbar-arrow-over');
                this.toolbar.classList.remove('medium-toolbar-arrow-under');
                this.toolbar.style.top = buttonHeight + boundary.bottom - this.options.diffTop + window.pageYOffset - this.toolbar.offsetHeight + 'px';
            } else {
                this.toolbar.classList.add('medium-toolbar-arrow-under');
                this.toolbar.classList.remove('medium-toolbar-arrow-over');
                this.toolbar.style.top = boundary.top + this.options.diffTop + window.pageYOffset - this.toolbar.offsetHeight + 'px';
            }
            if (middleBoundary < halfOffsetWidth) {
                this.toolbar.style.left = defaultLeft + halfOffsetWidth + 'px';
            } else if ((window.innerWidth - middleBoundary) < halfOffsetWidth) {
                this.toolbar.style.left = window.innerWidth + defaultLeft - halfOffsetWidth + 'px';
            } else {
                this.toolbar.style.left = defaultLeft + middleBoundary + 'px';
            }
            return this;
        },

        setToolbarButtonStates: function () {
            var buttons = this.toolbarActions.querySelectorAll('button'),
                i;
            for (i = 0; i < buttons.length; i += 1) {
                buttons[i].classList.remove('medium-editor-button-active');
            }
            this.checkActiveButtons();
            return this;
        },

        checkActiveButtons: function () {
            var parentNode = this.selection.anchorNode;
            if (!parentNode.tagName) {
                parentNode = this.selection.anchorNode.parentNode;
            }
            while (parentNode.tagName !== undefined && this.parentElements.indexOf(parentNode.tagName) === -1) {
                this.activateButton(parentNode.tagName.toLowerCase());
                parentNode = parentNode.parentNode;
            }
        },

        activateButton: function (tag) {
            var el = this.toolbar.querySelector('[data-element="' + tag + '"]');
            if (el !== null && el.className.indexOf('medium-editor-button-active') === -1) {
                el.className += ' medium-editor-button-active';
            }
        },

        bindButtons: function () {
            var buttons = this.toolbar.querySelectorAll('button'),
                i,
                self = this,
                triggerAction = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (self.selection === undefined) {
                        self.checkSelection();
                    }
                    if (this.className.indexOf('medium-editor-button-active') > -1) {
                        this.classList.remove('medium-editor-button-active');
                    } else {
                        this.className += ' medium-editor-button-active';
                    }
                    console.log(this.getAttribute('data-action'));
                    self.execAction(this.getAttribute('data-action'), e);
                };
            for (i = 0; i < buttons.length; i += 1) {
                buttons[i].addEventListener('click', triggerAction);
            }
            this.setFirstAndLastItems(buttons);
            return this;
        },

        setFirstAndLastItems: function (buttons) {
            buttons[0].className += ' medium-editor-button-first';
            buttons[buttons.length - 1].className += ' medium-editor-button-last';
            return this;
        },

        execAction: function (action, e) {
            if (action.indexOf('append-') > -1) {
                this.execFormatBlock(action.replace('append-', ''));
                this.setToolbarPosition();
                this.setToolbarButtonStates();
            } else if (action === 'anchor') {
                this.triggerAnchorAction(e);
            } else {
                document.execCommand(action, false, null);
                this.setToolbarPosition();
            }
        },

        triggerAnchorAction: function () {
            if (this.selection.anchorNode.parentNode.tagName.toLowerCase() === 'a') {
                document.execCommand('unlink', false, null);
            } else {
                if (this.anchorForm.style.display === 'block') {
                    this.showToolbarActions();
                } else {
                    this.showAnchorForm();
                }
            }
            return this;
        },

        execFormatBlock: function (el) {
            var selectionData = this.getSelectionData(this.selection.anchorNode);
            // FF handles blockquote differently on formatBlock
            // allowing nesting, we need to use outdent
            // https://developer.mozilla.org/en-US/docs/Rich-Text_Editing_in_Mozilla
            if (el === 'blockquote' && selectionData.el
                    && selectionData.el.parentNode.tagName.toLowerCase() === 'blockquote') {
                return document.execCommand('outdent', false, null);
            }
            if (selectionData.tagName === el) {
                el = 'p';
            }
            return document.execCommand('formatBlock', false, el);
        },

        getSelectionData: function (el) {
            var tagName;

            if (el && el.tagName) {
                tagName = el.tagName.toLowerCase();
            }

            while (el && this.parentElements.indexOf(tagName) === -1) {
                el = el.parentNode;
                if (el && el.tagName) {
                    tagName = el.tagName.toLowerCase();
                }
            }

            return {
                el: el,
                tagName: tagName
            };
        },

        getFirstChild: function (el) {
            var firstChild = el.firstChild;
            while (firstChild !== null && firstChild.nodeType !== 1) {
                firstChild = firstChild.nextSibling;
            }
            return firstChild;
        },

        bindElementToolbarEvents: function (el) {
            var self = this;
            el.addEventListener('mouseup', function (e) {
                self.checkSelection();
            });
            el.addEventListener('keyup', function (e) {
                self.checkSelection();
            });
        },

        hideToolbarActions: function () {
            this.keepToolbarAlive = false;
            this.toolbar.classList.remove('medium-editor-toolbar-active');
        },

        showToolbarActions: function () {
            var self = this,
                timer;
            this.anchorForm.style.display = 'none';
            this.toolbarActions.style.display = 'block';
            this.keepToolbarAlive = false;
            clearTimeout(timer);
            timer = setTimeout(function() {
                if (!self.toolbar.classList.contains('medium-editor-toolbar-active')) {
                    self.toolbar.classList.add('medium-editor-toolbar-active');
                }
            }, 100);
        },

        showAnchorForm: function () {
            this.toolbarActions.style.display = 'none';
            this.savedSelection = saveSelection();
            this.anchorForm.style.display = 'block';
            this.keepToolbarAlive = true;
            this.anchorInput.focus();
            this.anchorInput.value = '';
        },

        bindAnchorForm: function () {
            var linkCancel = this.anchorForm.querySelector('a'),
                self = this;
            this.anchorForm.addEventListener('click', function (e) {
                e.stopPropagation();
            });
            this.anchorInput.addEventListener('keyup', function (e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    self.createLink(this);
                }
            });
            this.anchorInput.addEventListener('blur', function (e) {
                self.keepToolbarAlive = false;
                self.checkSelection();
            });
            linkCancel.addEventListener('click', function (e) {
                e.preventDefault();
                self.showToolbarActions();
                restoreSelection(self.savedSelection);
            });
            return this;
        },

        setTargetBlank: function () {
            var el = getSelectionStart(),
                i;
            if (el.tagName.toLowerCase() === 'a') {
                el.target = '_blank';
            } else {
                el = el.getElementsByTagName('a');
                for (i = 0; i < el.length; i += 1) {
                    el[i].target = '_blank';
                }
            }
        },

        createLink: function (input) {
            restoreSelection(this.savedSelection);
            document.execCommand('createLink', false, input.value);
            if (this.options.targetBlank) {
                this.setTargetBlank();
            }
            this.showToolbarActions();
            input.value = '';
        },

        bindWindowActions: function () {
            var timerResize,
                self = this;
            window.addEventListener('resize', function () {
                clearTimeout(timerResize);
                timerResize = setTimeout(function () {
                    if (self.toolbar.classList.contains('medium-editor-toolbar-active')) {
                        self.setToolbarPosition();
                    }
                }, 100);
            });
            return this;
        },

        activate: function () {
            var i;
            if (this.isActive) {
                return;
            }

            if (this.toolbar !== undefined) {
                this.toolbar.style.display = 'block';
            }

            this.isActive = true;
            for (i = 0; i < this.elements.length; i += 1) {
                this.elements[i].setAttribute('contentEditable', true);
            }
            this.bindSelect();
        },

        deactivate: function () {
            var i;
            if (!this.isActive) {
                return;
            }
            this.isActive = false;

            if (this.toolbar !== undefined) {
                this.toolbar.style.display = 'none';
            }

            document.documentElement.removeEventListener('mouseup', this.checkSelectionWrapper);

            for (i = 0; i < this.elements.length; i += 1) {
                this.elements[i].removeEventListener('keyup', this.checkSelectionWrapper);
                this.elements[i].removeEventListener('blur', this.checkSelectionWrapper);
                this.elements[i].removeAttribute('contentEditable');
            }
        },

        bindPaste: function () {
            if (!this.options.forcePlainText) {
                return this;
            }
            var i,
                self = this,
                pasteWrapper = function (e) {
                    var paragraphs,
                        html = '',
                        p;
                    this.classList.remove('medium-editor-placeholder');
                    if (e.clipboardData && e.clipboardData.getData) {
                        e.preventDefault();
                        if (!self.options.disableReturn) {
                            paragraphs = e.clipboardData.getData('text/plain').split(/[\r\n]/g);
                            for (p = 0; p < paragraphs.length; p += 1) {
                                if (paragraphs[p] !== '') {
                                    html += '<p>' + paragraphs[p] + '</p>';
                                }
                            }
                            document.execCommand('insertHTML', false, html);
                        } else {
                            document.execCommand('insertHTML', false, e.clipboardData.getData('text/plain'));
                        }
                    }
                };
            for (i = 0; i < this.elements.length; i += 1) {
                this.elements[i].addEventListener('paste', pasteWrapper);
            }
            return this;
        },

        setPlaceholders: function () {
            var i,
                activatePlaceholder = function (el) {
                    if (el.textContent.replace(/^\s+|\s+$/g, '') === '') {
                        el.classList.add('medium-editor-placeholder');
                    }
                },
                placeholderWrapper = function (e) {
                    this.classList.remove('medium-editor-placeholder');
                    if (e.type !== 'keypress') {
                        activatePlaceholder(this);
                    }
                };
            for (i = 0; i < this.elements.length; i += 1) {
                activatePlaceholder(this.elements[i]);
                this.elements[i].addEventListener('blur', placeholderWrapper);
                this.elements[i].addEventListener('keypress', placeholderWrapper);
            }
            return this;
        }

    };

}(window, document));
;/*! 
 * medium-editor-insert-plugin v0.1.1 - jQuery insert plugin for MediumEditor
 *
 * Addon Initialization
 *
 * https://github.com/orthes/medium-editor-images-plugin
 * 
 * Copyright (c) 2013 Pavel Linkesch (http://linkesch.sk)
 * Released under the MIT license
 */

(function ($) {
    
  /**
  * Extend MediumEditor's serialize function to get rid of unnecesarry Medium Editor Insert Plugin stuff
  * @return {object} content Object containing HTML content of each element
  */
  
  MediumEditor.prototype.serialize = function () {
    var i, j,
        elementid,
        content = {},
        $clone, $inserts, $insert, $insertData, html;
    for (i = 0; i < this.elements.length; i += 1) {
      elementid = (this.elements[i].id !== '') ? this.elements[i].id : 'element-' + i;
      
      $clone = $(this.elements[i]).clone();
      $inserts = $('.mediumInsert', $clone);
      for (j = 0; j < $inserts.length; j++) {
        $insert = $($inserts[j]);
        $insertData = $('.mediumInsert-placeholder', $insert).children();
        if ($insertData.length === 0) {
          $insert.remove();
        } else {
          $insert.removeAttr('contenteditable');
          $('img[draggable]', $insert).removeAttr('draggable');
          if ($insert.hasClass('small')) {
            $insertData.addClass('small');
          }
          $('.mediumInsert-buttons', $insert).remove();
          $insertData.unwrap();  
        }
      }
      
      html = $clone.html().trim();
      content[elementid] = {
        value: html
      };
    }
    return content;
  };
  
  
  
  /**
  * Medium Editor Insert Plugin
  * @param {object} options Options for the plugin
  * @param {void}
  */

  $.fn.mediumInsert = function (options) {
 
    $.fn.mediumInsert.settings = $.extend($.fn.mediumInsert.settings, options);

    
    /**
    * Initial plugin loop
    */
     
    return this.each(function () {

      $('p', this).bind('dragover drop', function (e) {
        e.preventDefault();
        return false;
      });
    
      $.fn.mediumInsert.insert.init($(this));
      
      if ($.fn.mediumInsert.settings.images === true) {
        $.fn.mediumInsert.images.init(); 
      }
      
      if ($.fn.mediumInsert.settings.maps === true) {
        $.fn.mediumInsert.maps.init(); 
      }
       
    });
 
  };
  
  
  /**
  * Settings
  */
  
  $.fn.mediumInsert.settings = {
    'imagesUploadScript': 'upload.php',
    'images': true,
    'maps': false,
  };
  
  
  /**
  * Addon Initialization
  */
    
  $.fn.mediumInsert.insert = {
  
    /**
    * Insert initial function
    * @param {element} el Parent container element
    * @return {void}
    */
      
    init: function ($el) {
      this.$el = $el;
      this.setPlaceholders();  
    },
    
    /**
    * Deselect selected text
    * @return {void}
    */
    
    deselect: function () {
      document.getSelection().removeAllRanges();
    },
    
    /**
    * Method setting placeholders and basic events on them
    * @return {void}
    */
    
    setPlaceholders: function () {
      var that = this,
          $el = $.fn.mediumInsert.insert.$el,
          insertBlock = '',
          insertImage = '<a class="mediumInsert-action action-images-add">Image</a>',
          insertMap = '<a class="mediumInsert-action action-maps-add">Map</a>';
         
      if($.fn.mediumInsert.settings.images === true && $.fn.mediumInsert.settings.maps === true) {
        insertBlock = '<a class="mediumInsert-buttonsShow">Insert</a>'+
          '<ul class="mediumInsert-buttonsOptions">'+
            '<li>' + insertImage + '</li>' +
            '<li>' + insertMap + '</li>' +
          '</ul>';
      } else if ($.fn.mediumInsert.settings.images === true) {
        insertBlock = insertImage;
      } else if ($.fn.mediumInsert.settings.maps === true) {
        insertBlock = insertMap;
      }   
         
      if (insertBlock !== '') {
        insertBlock = '<div class="mediumInsert" contenteditable="false">'+
          '<div class="mediumInsert-buttons">'+
            '<div class="mediumInsert-buttonsIcon">&rarr;</div>'+
            insertBlock +
          '</div>'+
          '<div class="mediumInsert-placeholder"></div>'+
        '</div>';
      } else {
        return;
      }  
         
      if ($el.is(':empty')) {
        $el.html('<p><br></p>');
      }   
            
      $el.keyup(function () {        
        var i = 0;
      
        $el.children('p').each(function () {
          if ($(this).next().hasClass('mediumInsert') === false) {
            $(this).after(insertBlock);     
            $(this).next('.mediumInsert').attr('id', 'mediumInsert-'+ i);            
          }
          i++;
        });
      }).keyup(); 
        
      $el.on('selectstart', '.mediumInsert', function (e) {
        e.preventDefault();
        return false;
      });
      
      $el.on('blur', function () {
        var $clone = $(this).clone(),
            cloneHtml;
            
        $clone.find('.mediumInsert').remove();
        cloneHtml = $clone.html().replace(/^\s+|\s+$/g, '');

        if (cloneHtml === '' || cloneHtml === '<p><br></p>') {
          $(this).addClass('medium-editor-placeholder');  
        }
      });
  
        
      $el.on('click', '.mediumInsert-buttons a.mediumInsert-buttonsShow', function () {
        var $options = $(this).siblings('.mediumInsert-buttonsOptions'),
            $placeholder = $(this).parent().siblings('.mediumInsert-placeholder');

        if ($(this).hasClass('active')) {
          $(this).removeClass('active');
          $options.hide();
          
          $('a', $options).show();
        } else {
          $(this).addClass('active');
          $options.show();  
          
          $('a', $options).each(function () {
            var aClass = $(this).attr('class').split('action-')[1],
                plugin = aClass.split('-')[0];
            if ($('.mediumInsert-'+ plugin, $placeholder).length > 0) {
              $('a:not(.action-'+ aClass +')', $options).hide(); 
            }
          });
        }
          
        that.deselect();
      });
        
      $el.on('mouseleave', '.mediumInsert', function () {
        $('a.mediumInsert-buttonsShow', this).removeClass('active');
        $('.mediumInsert-buttonsOptions', this).hide();
      });
        
      $el.on('click', '.mediumInsert-buttons .mediumInsert-action', function () {
        var action = $(this).attr('class').split('action-')[1].split('-'),
            $placeholder = $(this).parents('.mediumInsert-buttons').siblings('.mediumInsert-placeholder');
        
        if ($.fn.mediumInsert[action[0]] && $.fn.mediumInsert[action[0]][action[1]]) {
          $.fn.mediumInsert[action[0]][action[1]]($placeholder);
        }
        
        $(this).parents('.mediumInsert').mouseleave();
      });
    } 
      
  };
 
}(jQuery));;/*!
 * medium-editor-insert-plugin v0.1.1 - jQuery insert plugin for MediumEditor
 *
 * Images Addon
 *
 * https://github.com/orthes/medium-editor-images-plugin
 *
 * Copyright (c) 2013 Pavel Linkesch (http://linkesch.sk)
 * Released under the MIT license
 */

(function ($) {

  $.fn.mediumInsert.images = {

    /**
    * Images initial function
    * @return {void}
    */

    init: function () {
      this.$el = $.fn.mediumInsert.insert.$el;
      this.options = $.extend(this.default,
        $.fn.mediumInsert.settings.imagesPlugin);

      this.setImageEvents();
      this.setDragAndDropEvents();
      this.preparePreviousImages();
    },

    /**
    * Images default options
    */

    default: {
      formatData: function (file) {
        var formData = new FormData();
        formData.append('file', file);
        return formData;
      }
    },

    /**
    * Make existing images interactive
    */
    preparePreviousImages: function () {
      this.$el.find('.mediumInsert-images').each(function() {
        var $parent = $(this).parent();
        $parent.html('<div class="mediumInsert-placeholder" draggable="true">' + $parent.html() + '</div>');
      });
    },

    /**
    * Add image to placeholder
    * @param {element} $placeholder Placeholder to add image to
    * @return {element} $selectFile <input type="file"> element
    */

    add: function ($placeholder) {
      var that = this,
          $selectFile, files;

      $selectFile = $('<input type="file">').click();
      $selectFile.change(function () {
        files = this.files;
        that.uploadFiles($placeholder, files);
      });

      $.fn.mediumInsert.insert.deselect();

      return $selectFile;
    },

    /**
    * Update progressbar while upload
    * @param {event} e XMLHttpRequest.upload.onprogress event
    * @return {void}
    */

    updateProgressBar: function (e) {
      var $progress = $('.progress:first', this.$el),
          complete;

      if (e.lengthComputable) {
        complete = (e.loaded / e.total * 100 | 0);
        $progress.attr('value', complete);
        $progress.html(complete);
      }
    },

    /**
    * Show uploaded image after upload completed
    * @param {jqXHR} jqxhr jqXHR object
    * @return {void}
    */

    uploadCompleted: function (jqxhr) {
      var $progress = $('.progress:first', this.$el),
          $img;

      $progress.attr('value', 100);
      $progress.html(100);

      $progress.before('<div class="mediumInsert-images"><img src="'+ jqxhr.responseText +'" draggable="true" alt=""></div>');
      $img = $progress.siblings('img');
      $progress.remove();

      $img.load(function () {
        $img.parent().mouseleave().mouseenter();
      });
    },


    /**
    * Upload files, display progress bar and finally uploaded file
    * @param {element} placeholder Placeholder to add image to
    * @param {FileList} files Files to upload
    * @return {void}
    */

    uploadFiles: function ($placeholder, files) {
      var acceptedTypes = {
        'image/png': true,
        'image/jpeg': true,
        'image/gif': true
      },
      that = this,
      xhr = function () {
        var xhr = new XMLHttpRequest();
        xhr.upload.onprogress = that.updateProgressBar;
        return xhr;
      };

      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        if (acceptedTypes[file.type] === true) {
          $placeholder.append('<progress class="progress" min="0" max="100" value="0">0</progress>');

          $.ajax({
            type: "post",
            url: $.fn.mediumInsert.settings.imagesUploadScript,
            xhr: xhr,
            cache: false,
            contentType: false,
            complete: this.uploadCompleted,
            processData: false,
            data: this.options.formatData(file)
          });
        }
      }
    },

    /**
    * Set image events displaying remove and resize buttons
    * @return {void}
    */

    setImageEvents: function () {
      this.$el.on('mouseenter', '.mediumInsert-images', function () {
        var $img = $('img', this),
            positionTop,
            positionLeft;

        if ($img.length > 0) {
          $(this).append('<a class="mediumInsert-imageRemove"></a>');

          if ($(this).parent().parent().hasClass('small')) {
            $(this).append('<a class="mediumInsert-imageResizeBigger"></a>');
          } else {
            $(this).append('<a class="mediumInsert-imageResizeSmaller"></a>');
          }

          positionTop = $img.position().top + parseInt($img.css('margin-top'), 10);
          positionLeft = $img.position().left + $img.width() -30;
          $('.mediumInsert-imageRemove', this).css({
            'right': 'auto',
            'top': positionTop,
            'left': positionLeft
          });
          $('.mediumInsert-imageResizeBigger, .mediumInsert-imageResizeSmaller', this).css({
            'right': 'auto',
            'top': positionTop,
            'left': positionLeft-31
          });
        }
      });

      this.$el.on('mouseleave', '.mediumInsert-images', function () {
        $('.mediumInsert-imageRemove, .mediumInsert-imageResizeSmaller, .mediumInsert-imageResizeBigger', this).remove();
      });

      this.$el.on('click', '.mediumInsert-imageResizeSmaller', function () {
        $(this).parent().parent().parent().addClass('small');
        $(this).parent().mouseleave().mouseleave();

        $.fn.mediumInsert.insert.deselect();
      });

      this.$el.on('click', '.mediumInsert-imageResizeBigger', function () {
        $(this).parent().parent().parent().removeClass('small');
        $(this).parent().mouseleave().mouseleave();

        $.fn.mediumInsert.insert.deselect();
      });

      this.$el.on('click', '.mediumInsert-imageRemove', function () {
        if ($(this).parent().siblings().length === 0) {
          $(this).parent().parent().parent().removeClass('small');
        }
        $(this).parent().remove();

        $.fn.mediumInsert.insert.deselect();
      });
    },

    /**
    * Set drag and drop evnets
    * @return {void}
    */

    setDragAndDropEvents: function () {
      var that = this,
          dropSuccessful = false,
          dropSort = false,
          dropSortIndex, dropSortParent;

      $(document).on('dragover', 'body', function () {
        $(this).addClass('hover');
      });

      $(document).on('dragend', 'body', function () {
        $(this).removeClass('hover');
      });

      this.$el.on('dragover', '.mediumInsert', function () {
        $(this).addClass('hover');
        $(this).attr('contenteditable', true);
      });

      this.$el.on('dragleave', '.mediumInsert', function () {
        $(this).removeClass('hover');
        $(this).attr('contenteditable', false);
      });

      this.$el.on('dragstart', '.mediumInsert .mediumInsert-images img', function (e) {
        dropSortIndex = $(this).parent().index();
        dropSortParent = $(this).parent().parent().parent().attr('id');
      });

      this.$el.on('dragend', '.mediumInsert .mediumInsert-images img', function (e) {
        if (dropSuccessful === true) {
          if ($(e.originalEvent.target.parentNode).siblings().length === 0) {
            $(e.originalEvent.target.parentNode).parent().parent().removeClass('small');
          }
          $(e.originalEvent.target.parentNode).mouseleave();
          $(e.originalEvent.target.parentNode).remove();
          dropSuccessful = false;
          dropSort = false;
        }
      });

      this.$el.on('dragover', '.mediumInsert .mediumInsert-images img', function (e) {
        e.preventDefault();
      });

      this.$el.on('drop', '.mediumInsert .mediumInsert-images img', function (e) {
        var index, $dragged, finalIndex;

        if (dropSortParent !== $(this).parent().parent().parent().attr('id')) {
          dropSort = false;
          dropSortIndex = dropSortParent = null;
          return;
        }

        index = parseInt(dropSortIndex, 10);

        // Sort
        $dragged = $(this).parent().parent().find('.mediumInsert-images:nth-child('+ (index+1) +')');
        finalIndex = $(this).parent().index();
        if(index < finalIndex) {
          $dragged.insertAfter($(this).parent());
        } else if(index > finalIndex) {
          $dragged.insertBefore($(this).parent());
        }

        $dragged.mouseleave();

        dropSort = true;
        dropSortIndex = null;
      });

      this.$el.on('drop', '.mediumInsert', function (e) {
        var files;

        e.preventDefault();
        $(this).removeClass('hover');
        $('body').removeClass('hover');
        $(this).attr('contenteditable', false);

        files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
          // File upload
          that.uploadFiles($('.mediumInsert-placeholder', this), files);
        } else if (dropSort === true) {
          dropSort = false;
        } else {
          // Image move from block to block
          $('.mediumInsert-placeholder', this).append('<div class="mediumInsert-images">'+ e.originalEvent.dataTransfer.getData('text/html') +'</div>');
          $('meta', this).remove();
          dropSuccessful = true;
        }
      });
    }
  };
}(jQuery));
;(function($) {

  // [TODO] add events for dragstart 
  // [TODO] render div.drag-over with underscore
  var Dropspot = Backbone.View.extend({

    el  : '.splash.dropspot',
    input : 'input.dropspot',

    events : {
      'hover .drag-over' : 'overlay'     
    },

    settings: {
      url         : '/upload',
      maxfilesize : 3,
    },

    initialize: function( options ) {
      _.bindAll( this, 'finished' )
      _.extend( this.settings, { uploadFinished : this.finished })
      this.render()
    },

    render : function() {
      $(this.el).filedrop( this.settings )
    },

    finished: function( index, file, res, time ) {
      this.$el.css( 'background-image', 'url('+ res +')' )
      $(this.input).val( res );
    }

  })

  var dropspot = new Dropspot()

})(jQuery)
;(function($){

  var Post = Backbone.Model.extend({

    idAttribute : '_id',
    
    urlRoot: '/post',

    validate: function(attrs) {
      console.log('validating ' + JSON.stringify( attrs ) )
    },
    
    initialize: function( options ) {
      this.fetch()
    }

  })

  var AddPostView = Backbone.View.extend({

    el : 'form', 

    events : {
      'submit' : 'add' ,
      'click a.delete' : 'remove'
    },

    initialize : function(options) {
      _.bindAll(this, 'add', 'remove' ) 
    },

    add : function(e) {

      e.preventDefault()
      var formdata = this.$el.serializeJSON()
      this.model.save( formdata , { wait: true } ) 

    },

    remove: function(e) {
      e.preventDefault()
      this.model.destroy() 
    }

  })


  var post = new Post({ _id : postdata._id })
    , postsview = new AddPostView({ model : post })

})(jQuery)
;(function($) {

  var EditableView = Backbone.View.extend({

    el : '.editable',
    template : '<textarea id="textarea-<%= id %>" name="<%= id %>" class="hidden mirror"><%= content %></textarea>',

    events : {
      'input' : 'mirror'
    },

    initialize: function( options ) {
      _.bindAll( this, 'textarea' )
      this.editor = new MediumEditor( this.$el.selector )
      this.$el.mediumInsert( { editor : this.editor, imagesUploadScript: '/upload' })
      this.render()
    },

    render : function() {
      _.map( this.$el, this.textarea )
    },

    textarea : function( el, index ) {
      var textarea = _.template( this.template, { id: this.$el.get(index).id, content : this.$el.eq(index).html() } )
      this.$el.eq(index).after( textarea ) 
    },

    mirror: function(e) {
      var content = this.editor.serialize()[e.target.id].value
      $( '#textarea-'+e.target.id ).val( content )
      //this.$el.closest('form').data( 'editables', this.editor.serialize() )
    }
  
  })

  var editables = new EditableView();


//  var FormView = Backbone.View.extend({
//
//    el : 'form',
//
//    events: {
//      'submit' : 'submit' 
//    },
//
//    submit: function() {
//      var editables = this.$el.data( 'editables' ) 
//      _.zip(_.keys( editables ), _.pluck( editables , 'value'))
//    }
//
//
//  })
//  $('form').submit(function() {
//
//    var $this = $(this)
//      , post = editor.serialize()
//
//    $.post( $this.attr('action'), {
//
//      title : $(post.title.value).text(),
//      body  : post.body.value,
//      image : $('#image').val(),
//      id    : $('#id').val()
//
//    });
//
//    return false;   
//  })

})(jQuery)
;// loaded after editables.js
// (function ($) {
// 
//   $.fn.contentEditable = function() {
//     var template = '<textarea id="<%= id =>" class="hidden"></textarea>';
// 
//     return this.each(function() {
//       _.template()
//       $(this).append('<textarea class="hidden"></textarea>')
//     })
//   
//   }
// 
//   $('[contenteditable]').contentEditable()
// 
// })(jQuery);
