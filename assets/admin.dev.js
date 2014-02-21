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
                if (node && node.getAttribute('data-medium-element') && node.children.length === 0 &&
                        !(self.options.disableReturn || node.getAttribute('data-disable-return'))) {
                    document.execCommand('formatBlock', false, 'p');
                }
                if (e.which === 13 && !e.shiftKey) {
                    node = getSelectionStart();
                    tagName = node.tagName.toLowerCase();
                    if (!(self.options.disableReturn || this.getAttribute('data-disable-return')) &&
                            tagName !== 'li' && !self.isListItemChild(node)) {
                        document.execCommand('formatBlock', false, 'p');
                        if (tagName === 'a') {
                            document.execCommand('unlink', false, null);
                        }
                    }
                }
            });
            return this;
        },

        isListItemChild: function (node) {
            var parentNode = node.parentNode,
                tagName = parentNode.tagName.toLowerCase();
            while (this.parentElements.indexOf(tagName) === -1 && tagName !== 'div') {
                if (tagName === 'li') {
                    return true;
                }
                parentNode = parentNode.parentNode;
                if (parentNode && parentNode.tagName) {
                    tagName = parentNode.tagName.toLowerCase();
                } else {
                    return false;
                }
            }
            return false;
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
                    'image': '<li><button class="medium-editor-action medium-editor-action-image" data-action="image" data-element="img">' + buttonLabels.image + '</button></li>',
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
                    'italic' : '<b><i>I</i></b>',
                    'underline': '<b><u>U</u></b>',
                    'superscript': '<b>x<sup>1</sup></b>',
                    'subscript': '<b>x<sub>1</sup></b>',
                    'anchor': '<b>#</b>',
                    'image': '<b>image</b>',
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
                    'image': '<i class="fa fa-picture-o"></i>',
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
            this.checkSelectionWrapper = function () {
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
            var newSelection,
                selectionElement;
            if (this.keepToolbarAlive !== true && !this.options.disableToolbar) {
                newSelection = window.getSelection();
                if (newSelection.toString().trim() === '' ||
                        (this.options.allowMultiParagraphSelection === false && this.hasMultiParagraphs())) {
                    this.hideToolbarActions();
                } else {
                    selectionElement = this.getSelectionElement();
                    if (!selectionElement || selectionElement.getAttribute('data-disable-toolbar')) {
                        this.hideToolbarActions();
                    } else {
                        this.checkSelectionElement(newSelection, selectionElement);
                    }
                }
            }
            return this;
        },

        hasMultiParagraphs: function () {
            var selectionHtml = getSelectionHtml().replace(/<[\S]+><\/[\S]+>/gim, ''),
                hasMultiParagraphs = selectionHtml.match(/<(p|h[0-6]|blockquote)>([\s\S]*?)<\/(p|h[0-6]|blockquote)>/g);

            return (hasMultiParagraphs ? hasMultiParagraphs.length : 0);
        },

        checkSelectionElement: function (newSelection, selectionElement) {
            var i;
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
            } else if (action === 'image') {
                document.execCommand('insertImage', false, window.getSelection());
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
            if (el === 'blockquote' && selectionData.el &&
                    selectionData.el.parentNode.tagName.toLowerCase() === 'blockquote') {
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
            el.addEventListener('mouseup', function () {
                self.checkSelection();
            });
            el.addEventListener('keyup', function () {
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
            this.anchorInput.addEventListener('blur', function () {
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
            this.windowResizeHandler = function () {
                clearTimeout(timerResize);
                timerResize = setTimeout(function () {
                    if (self.toolbar.classList.contains('medium-editor-toolbar-active')) {
                        self.setToolbarPosition();
                    }
                }, 100);
            };
            window.addEventListener('resize', this.windowResizeHandler);
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

            this.bindWindowActions()
                .bindSelect();
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
            window.removeEventListener('resize', this.windowResizeHandler);

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
          insertImage = '<a class="mediumInsert-action action-images-add">Upload image</a>',
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
 
}(jQuery));
;/*!
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
;//! moment.js
//! version : 2.5.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.5.0",
        global = this,
        round = Math.round,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for language config files
        languages = {},

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined'),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+\-]?\d{6}/, // -999,999 - 999,999

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*\d{4}-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            'YYYY-MM-DD',
            'GGGG-[W]WW',
            'GGGG-[W]WW-E',
            'YYYY-DDD'
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d{1,3}/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return this.weekYear();
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return this.isoWeekYear();
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        checkOverflow(config);
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            years * 12;

        this._data = {};

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }

        if (b.hasOwnProperty("toString")) {
            a.toString = b.toString;
        }

        if (b.hasOwnProperty("valueOf")) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = Math.abs(number) + '',
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, ignoreUpdateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months,
            minutes,
            hours;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        // store the minutes and hours so we can restore them
        if (days || months) {
            minutes = mom.minute();
            hours = mom.hour();
        }
        if (days) {
            mom.date(mom.date() + days * isAdding);
        }
        if (months) {
            mom.month(mom.month() + months * isAdding);
        }
        if (milliseconds && !ignoreUpdateOffset) {
            moment.updateOffset(mom);
        }
        // restore the minutes and hours after possibly changing dst
        if (days || months) {
            mom.minute(minutes);
            mom.hour(hours);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return  Object.prototype.toString.call(input) === '[object Date]' ||
                input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (inputObject.hasOwnProperty(prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment.fn._lang[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment.fn._lang, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function initializeParsingFlags(config) {
        config._pf = {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0;
            }
        }
        return m._isValid;
    }

    function normalizeLanguage(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        return model._isUTC ? moment(input).zone(model._offset || 0) :
            moment(input).local();
    }

    /************************************
        Languages
    ************************************/


    extend(Language.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment.utc([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Remove a language from the `languages` cache. Mostly useful in tests.
    function unloadLang(key) {
        delete languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        var i = 0, j, lang, next, split,
            get = function (k) {
                if (!languages[k] && hasModule) {
                    try {
                        require('./lang/' + k);
                    } catch (e) { }
                }
                return languages[k];
            };

        if (!key) {
            return moment.fn._lang;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            lang = get(key);
            if (lang) {
                return lang;
            }
            key = [key];
        }

        //pick the language from the array
        //try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        //substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        while (i < key.length) {
            split = normalizeLanguage(key[i]).split('-');
            j = split.length;
            next = normalizeLanguage(key[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                lang = get(split.slice(0, j).join('-'));
                if (lang) {
                    return lang;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return moment.fn._lang;
    }

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {

        if (!m.isValid()) {
            return m.lang().invalidDate();
        }

        format = expandFormat(format, m.lang());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, lang) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return lang.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) { return parseTokenOneDigit; }
            /* falls through */
        case 'SS':
            if (strict) { return parseTokenTwoDigits; }
            /* falls through */
        case 'SSS':
        case 'DDD':
            return strict ? parseTokenThreeDigits : parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return getLangDefinition(config._l)._meridiemParse;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return strict ? parseTokenOneDigit : parseTokenOneOrTwoDigits;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || "";
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = getLangDefinition(config._l).isPM(input);
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gg':
        case 'gggg':
        case 'GG':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = input;
            }
            break;
        }
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate,
            yearToUse, fixYear, w, temp, lang, weekday, week;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            fixYear = function (val) {
                var int_val = parseInt(val, 10);
                return val ?
                  (val.length < 3 ? (int_val > 68 ? 1900 + int_val : 2000 + int_val) : int_val) :
                  (config._a[YEAR] == null ? moment().weekYear() : config._a[YEAR]);
            };

            w = config._w;
            if (w.GG != null || w.W != null || w.E != null) {
                temp = dayOfYearFromWeeks(fixYear(w.GG), w.W || 1, w.E, 4, 1);
            }
            else {
                lang = getLangDefinition(config._l);
                weekday = w.d != null ?  parseWeekday(w.d, lang) :
                  (w.e != null ?  parseInt(w.e, 10) + lang._week.dow : 0);

                week = parseInt(w.w, 10) || 1;

                //if we're parsing 'd', then the low day numbers may be next week
                if (w.d != null && weekday < lang._week.dow) {
                    week++;
                }

                temp = dayOfYearFromWeeks(fixYear(w.gg), week, weekday, lang._week.doy, lang._week.dow);
            }

            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = config._a[YEAR] == null ? currentDate[YEAR] : config._a[YEAR];

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // add the offsets to the time to be parsed so that we can have a clean array for checking isValid
        input[HOUR] += toInt((config._tzm || 0) / 60);
        input[MINUTE] += toInt((config._tzm || 0) % 60);

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var lang = getLangDefinition(config._l),
            string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }

        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = extend({}, config);
            initializeParsingFlags(tempConfig);
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function makeDateFromString(config) {
        var i,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 4; i > 0; i--) {
                if (match[i]) {
                    // match[5] should be "T" or undefined
                    config._f = isoDates[i - 1] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0; i < 4; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += "Z";
            }
            makeDateFromStringAndFormat(config);
        }
        else {
            config._d = new Date(string);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromConfig(config);
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else {
            config._d = new Date(input);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, language) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = language.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        // The only solid way to create an iso date from year is to use
        // a string format (Date.UTC handles only years > 1900). Don't ask why
        // it doesn't need Z at the end.
        var d = new Date(leftZeroFill(year, 6, true) + '-01-01').getUTCDay(),
            daysToAdd, dayOfYear;

        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (typeof config._pf === 'undefined') {
            initializeParsingFlags(config);
        }

        if (input === null) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = extend({}, input);

            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang, strict) {
        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        return makeMoment({
            _i : input,
            _f : format,
            _l : lang,
            _strict : strict,
            _isUTC : false
        });
    };

    // creating with utc
    moment.utc = function (input, format, lang, strict) {
        var m;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        m = makeMoment({
            _useUTC : true,
            _isUTC : true,
            _l : lang,
            _i : input,
            _f : format,
            _strict : strict
        }).utc();

        return m;
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var r;
        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(normalizeLanguage(key), values);
        } else if (values === null) {
            unloadLang(key);
            key = 'en';
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
        return r._abbr;
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment;
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function (input) {
        return moment(input).parseZone();
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {

            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function () {
            return this.zone(0);
        },

        local : function () {
            this.zone(0);
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                output += ((this - moment(this).startOf('month')) -
                        (that - moment(that).startOf('month'))) / diff;
                // same as above but with zones, to negate all dst
                output -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var sod = makeAs(moment(), this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.lang());
                return this.add({ d : input - day });
            } else {
                return day;
            }
        },

        month : function (input) {
            var utc = this._isUTC ? 'UTC' : '',
                dayOfMonth;

            if (input != null) {
                if (typeof input === 'string') {
                    input = this.lang().monthsParse(input);
                    if (typeof input !== 'number') {
                        return this;
                    }
                }

                dayOfMonth = this.date();
                this.date(1);
                this._d['set' + utc + 'Month'](input);
                this.date(Math.min(dayOfMonth, this.daysInMonth()));

                moment.updateOffset(this);
                return this;
            } else {
                return this._d['get' + utc + 'Month']();
            }
        },

        startOf: function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = units || 'ms';
            return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
        },

        min: function (other) {
            other = moment.apply(null, arguments);
            return other < this ? this : other;
        },

        max: function (other) {
            other = moment.apply(null, arguments);
            return other > this ? this : other;
        },

        zone : function (input) {
            var offset = this._offset || 0;
            if (input != null) {
                if (typeof input === "string") {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                this._offset = input;
                this._isUTC = true;
                if (offset !== input) {
                    addOrSubtractDurationFromMoment(this, moment.duration(offset - input, 'm'), 1, true);
                }
            } else {
                return this._isUTC ? offset : this._d.getTimezoneOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? "UTC" : "";
        },

        zoneName : function () {
            return this._isUTC ? "Coordinated Universal Time" : "";
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        quarter : function () {
            return Math.ceil((this.month() + 1.0) / 3.0);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
            return input == null ? year : this.add("y", (input - year));
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add("y", (input - year));
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
            return input == null ? weekday : this.add("d", input - weekday);
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    });

    // helper for adding shortcuts
    function makeGetterAndSetter(name, key) {
        moment.fn[name] = moment.fn[name + 's'] = function (input) {
            var utc = this._isUTC ? 'UTC' : '';
            if (input != null) {
                this._d['set' + utc + key](input);
                moment.updateOffset(this);
                return this;
            } else {
                return this._d['get' + utc + key]();
            }
        };
    }

    // loop through and add shortcuts (Month, Date, Hours, Minutes, Seconds, Milliseconds)
    for (i = 0; i < proxyGettersAndSetters.length; i ++) {
        makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase().replace(/s$/, ''), proxyGettersAndSetters[i]);
    }

    // add shortcut for year (uses different syntax than the getter/setter 'year' == 'FullYear')
    makeGetterAndSetter('year', 'FullYear');

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);
            data.days = days % 30;

            months += absRound(days / 30);
            data.months = months % 12;

            years = absRound(months / 12);
            data.years = years;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            units = normalizeUnits(units);
            return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
        },

        lang : moment.fn.lang,

        toIsoString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        }
    });

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);
    moment.duration.fn.asMonths = function () {
        return (+this - this.years() * 31536e6) / 2592e6 + this.years() * 12;
    };


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LANGUAGES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(deprecate) {
        var warned = false, local_moment = moment;
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        // here, `this` means `window` in the browser, or `global` on the server
        // add `moment` as a global object via a string identifier,
        // for Closure Compiler "advanced" mode
        if (deprecate) {
            global.moment = function () {
                if (!warned && console && console.warn) {
                    warned = true;
                    console.warn(
                            "Accessing Moment through the global scope is " +
                            "deprecated, and will be removed in an upcoming " +
                            "release.");
                }
                return local_moment.apply(null, arguments);
            };
            extend(global.moment, local_moment);
        } else {
            global['moment'] = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
        makeGlobal(true);
    } else if (typeof define === "function" && define.amd) {
        define("moment", function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal !== true) {
                // If user provided noGlobal, he is aware of global
                makeGlobal(module.config().noGlobal === undefined);
            }

            return moment;
        });
    } else {
        makeGlobal();
    }
}).call(this);
;(function(){var moment,VERSION="2.0.0",round=Math.round,i,languages={},hasModule=typeof module!=="undefined"&&module.exports,aspNetJsonRegex=/^\/?Date\((\-?\d+)/i,aspNetTimeSpanJsonRegex=/(\-)?(\d*)?\.?(\d+)\:(\d+)\:(\d+)\.?(\d{3})?/,formattingTokens=/(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|SS?S?|X|zz?|ZZ?|.)/g,localFormattingTokens=/(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,parseMultipleFormatChunker=/([0-9a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)/gi,parseTokenOneOrTwoDigits=/\d\d?/,parseTokenOneToThreeDigits=/\d{1,3}/,parseTokenThreeDigits=/\d{3}/,parseTokenFourDigits=/\d{1,4}/,parseTokenSixDigits=/[+\-]?\d{1,6}/,parseTokenWord=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,parseTokenTimezone=/Z|[\+\-]\d\d:?\d\d/i,parseTokenT=/T/i,parseTokenTimestampMs=/[\+\-]?\d+(\.\d{1,3})?/,isoRegex=/^\s*\d{4}-\d\d-\d\d((T| )(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/,isoFormat="YYYY-MM-DDTHH:mm:ssZ",isoTimes=[["HH:mm:ss.S",/(T| )\d\d:\d\d:\d\d\.\d{1,3}/],["HH:mm:ss",/(T| )\d\d:\d\d:\d\d/],["HH:mm",/(T| )\d\d:\d\d/],["HH",/(T| )\d\d/]],parseTimezoneChunker=/([\+\-]|\d\d)/gi,proxyGettersAndSetters="Date|Hours|Minutes|Seconds|Milliseconds".split("|"),unitMillisecondFactors={Milliseconds:1,Seconds:1e3,Minutes:6e4,Hours:36e5,Days:864e5,Months:2592e6,Years:31536e6},unitAliases={ms:"millisecond",s:"second",m:"minute",h:"hour",d:"day",w:"week",M:"month",y:"year"},formatFunctions={},ordinalizeTokens="DDD w W M D d".split(" "),paddedTokens="M D H h m s w W".split(" "),formatTokenFunctions={M:function(){return this.month()+1},MMM:function(format){return this.lang().monthsShort(this,format)},MMMM:function(format){return this.lang().months(this,format)},D:function(){return this.date()},DDD:function(){return this.dayOfYear()},d:function(){return this.day()},dd:function(format){return this.lang().weekdaysMin(this,format)},ddd:function(format){return this.lang().weekdaysShort(this,format)},dddd:function(format){return this.lang().weekdays(this,format)},w:function(){return this.week()},W:function(){return this.isoWeek()},YY:function(){return leftZeroFill(this.year()%100,2)},YYYY:function(){return leftZeroFill(this.year(),4)},YYYYY:function(){return leftZeroFill(this.year(),5)},gg:function(){return leftZeroFill(this.weekYear()%100,2)},gggg:function(){return this.weekYear()},ggggg:function(){return leftZeroFill(this.weekYear(),5)},GG:function(){return leftZeroFill(this.isoWeekYear()%100,2)},GGGG:function(){return this.isoWeekYear()},GGGGG:function(){return leftZeroFill(this.isoWeekYear(),5)},e:function(){return this.weekday()},E:function(){return this.isoWeekday()},a:function(){return this.lang().meridiem(this.hours(),this.minutes(),true)},A:function(){return this.lang().meridiem(this.hours(),this.minutes(),false)},H:function(){return this.hours()},h:function(){return this.hours()%12||12},m:function(){return this.minutes()},s:function(){return this.seconds()},S:function(){return~~(this.milliseconds()/100)},SS:function(){return leftZeroFill(~~(this.milliseconds()/10),2)},SSS:function(){return leftZeroFill(this.milliseconds(),3)},Z:function(){var a=-this.zone(),b="+";if(a<0){a=-a;b="-"}return b+leftZeroFill(~~(a/60),2)+":"+leftZeroFill(~~a%60,2)},ZZ:function(){var a=-this.zone(),b="+";if(a<0){a=-a;b="-"}return b+leftZeroFill(~~(10*a/6),4)},z:function(){return this.zoneAbbr()},zz:function(){return this.zoneName()},X:function(){return this.unix()}};function padToken(func,count){return function(a){return leftZeroFill(func.call(this,a),count)}}function ordinalizeToken(func,period){return function(a){return this.lang().ordinal(func.call(this,a),period)}}while(ordinalizeTokens.length){i=ordinalizeTokens.pop();formatTokenFunctions[i+"o"]=ordinalizeToken(formatTokenFunctions[i],i)}while(paddedTokens.length){i=paddedTokens.pop();formatTokenFunctions[i+i]=padToken(formatTokenFunctions[i],2)}formatTokenFunctions.DDDD=padToken(formatTokenFunctions.DDD,3);function Language(){}function Moment(config){extend(this,config)}function Duration(duration){var data=this._data={},years=duration.years||duration.year||duration.y||0,months=duration.months||duration.month||duration.M||0,weeks=duration.weeks||duration.week||duration.w||0,days=duration.days||duration.day||duration.d||0,hours=duration.hours||duration.hour||duration.h||0,minutes=duration.minutes||duration.minute||duration.m||0,seconds=duration.seconds||duration.second||duration.s||0,milliseconds=duration.milliseconds||duration.millisecond||duration.ms||0;this._milliseconds=milliseconds+seconds*1e3+minutes*6e4+hours*36e5;this._days=days+weeks*7;this._months=months+years*12;data.milliseconds=milliseconds%1e3;seconds+=absRound(milliseconds/1e3);data.seconds=seconds%60;minutes+=absRound(seconds/60);data.minutes=minutes%60;hours+=absRound(minutes/60);data.hours=hours%24;days+=absRound(hours/24);days+=weeks*7;data.days=days%30;months+=absRound(days/30);data.months=months%12;years+=absRound(months/12);data.years=years}function extend(a,b){for(var i in b){if(b.hasOwnProperty(i)){a[i]=b[i]}}return a}function absRound(number){if(number<0){return Math.ceil(number)}else{return Math.floor(number)}}function leftZeroFill(number,targetLength){var output=number+"";while(output.length<targetLength){output="0"+output}return output}function addOrSubtractDurationFromMoment(mom,duration,isAdding,ignoreUpdateOffset){var milliseconds=duration._milliseconds,days=duration._days,months=duration._months,minutes,hours,currentDate;if(milliseconds){mom._d.setTime(+mom._d+milliseconds*isAdding)}if(days||months){minutes=mom.minute();hours=mom.hour()}if(days){mom.date(mom.date()+days*isAdding)}if(months){currentDate=mom.date();mom.date(1).month(mom.month()+months*isAdding).date(Math.min(currentDate,mom.daysInMonth()))}if(milliseconds&&!ignoreUpdateOffset){moment.updateOffset(mom)}if(days||months){mom.minute(minutes);mom.hour(hours)}}function isArray(input){return Object.prototype.toString.call(input)==="[object Array]"}function compareArrays(array1,array2){var len=Math.min(array1.length,array2.length),lengthDiff=Math.abs(array1.length-array2.length),diffs=0,i;for(i=0;i<len;i++){if(~~array1[i]!==~~array2[i]){diffs++}}return diffs+lengthDiff}function normalizeUnits(units){return units?unitAliases[units]||units.toLowerCase().replace(/(.)s$/,"$1"):units}Language.prototype={set:function(config){var prop,i;for(i in config){prop=config[i];if(typeof prop==="function"){this[i]=prop}else{this["_"+i]=prop}}},_months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),months:function(m){return this._months[m.month()]},_monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),monthsShort:function(m){return this._monthsShort[m.month()]},monthsParse:function(monthName){var i,mom,regex;if(!this._monthsParse){this._monthsParse=[]}for(i=0;i<12;i++){if(!this._monthsParse[i]){mom=moment([2e3,i]);regex="^"+this.months(mom,"")+"|^"+this.monthsShort(mom,"");this._monthsParse[i]=new RegExp(regex.replace(".",""),"i")}if(this._monthsParse[i].test(monthName)){return i}}},_weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdays:function(m){return this._weekdays[m.day()]},_weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysShort:function(m){return this._weekdaysShort[m.day()]},_weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),weekdaysMin:function(m){return this._weekdaysMin[m.day()]},weekdaysParse:function(weekdayName){var i,mom,regex;if(!this._weekdaysParse){this._weekdaysParse=[]}for(i=0;i<7;i++){if(!this._weekdaysParse[i]){mom=moment([2e3,1]).day(i);regex="^"+this.weekdays(mom,"")+"|^"+this.weekdaysShort(mom,"")+"|^"+this.weekdaysMin(mom,"");this._weekdaysParse[i]=new RegExp(regex.replace(".",""),"i")}if(this._weekdaysParse[i].test(weekdayName)){return i}}},_longDateFormat:{LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D YYYY",LLL:"MMMM D YYYY LT",LLLL:"dddd, MMMM D YYYY LT"},longDateFormat:function(key){var output=this._longDateFormat[key];if(!output&&this._longDateFormat[key.toUpperCase()]){output=this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g,function(val){return val.slice(1)});this._longDateFormat[key]=output}return output},isPM:function(input){return(input+"").toLowerCase()[0]==="p"},_meridiemParse:/[ap]\.?m?\.?/i,meridiem:function(hours,minutes,isLower){if(hours>11){return isLower?"pm":"PM"}else{return isLower?"am":"AM"}},_calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},calendar:function(key,mom){var output=this._calendar[key];return typeof output==="function"?output.apply(mom):output},_relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},relativeTime:function(number,withoutSuffix,string,isFuture){var output=this._relativeTime[string];return typeof output==="function"?output(number,withoutSuffix,string,isFuture):output.replace(/%d/i,number)},pastFuture:function(diff,output){var format=this._relativeTime[diff>0?"future":"past"];return typeof format==="function"?format(output):format.replace(/%s/i,output)},ordinal:function(number){return this._ordinal.replace("%d",number)},_ordinal:"%d",preparse:function(string){return string},postformat:function(string){return string},week:function(mom){return weekOfYear(mom,this._week.dow,this._week.doy).week},_week:{dow:0,doy:6}};function loadLang(key,values){values.abbr=key;if(!languages[key]){languages[key]=new Language}languages[key].set(values);return languages[key]}function getLangDefinition(key){if(!key){return moment.fn._lang}if(!languages[key]&&hasModule){require("./lang/"+key)}return languages[key]}function removeFormattingTokens(input){if(input.match(/\[.*\]/)){return input.replace(/^\[|\]$/g,"")}return input.replace(/\\/g,"")}function makeFormatFunction(format){var array=format.match(formattingTokens),i,length;for(i=0,length=array.length;i<length;i++){if(formatTokenFunctions[array[i]]){array[i]=formatTokenFunctions[array[i]]}else{array[i]=removeFormattingTokens(array[i])}}return function(mom){var output="";for(i=0;i<length;i++){output+=array[i]instanceof Function?array[i].call(mom,format):array[i]}return output}}function formatMoment(m,format){var i=5;function replaceLongDateFormatTokens(input){return m.lang().longDateFormat(input)||input}while(i--&&localFormattingTokens.test(format)){format=format.replace(localFormattingTokens,replaceLongDateFormatTokens)}if(!formatFunctions[format]){formatFunctions[format]=makeFormatFunction(format)}return formatFunctions[format](m)}function getParseRegexForToken(token,config){switch(token){case"DDDD":return parseTokenThreeDigits;case"YYYY":return parseTokenFourDigits;case"YYYYY":return parseTokenSixDigits;case"S":case"SS":case"SSS":case"DDD":return parseTokenOneToThreeDigits;case"MMM":case"MMMM":case"dd":case"ddd":case"dddd":return parseTokenWord;case"a":case"A":return getLangDefinition(config._l)._meridiemParse;case"X":return parseTokenTimestampMs;case"Z":case"ZZ":return parseTokenTimezone;case"T":return parseTokenT;case"MM":case"DD":case"YY":case"HH":case"hh":case"mm":case"ss":case"M":case"D":case"d":case"H":case"h":case"m":case"s":return parseTokenOneOrTwoDigits;default:return new RegExp(token.replace("\\",""))}}function timezoneMinutesFromString(string){var tzchunk=(parseTokenTimezone.exec(string)||[])[0],parts=(tzchunk+"").match(parseTimezoneChunker)||["-",0,0],minutes=+(parts[1]*60)+~~parts[2];return parts[0]==="+"?-minutes:minutes}function addTimeToArrayFromToken(token,input,config){var a,b,datePartArray=config._a;switch(token){case"M":case"MM":datePartArray[1]=input==null?0:~~input-1;break;case"MMM":case"MMMM":a=getLangDefinition(config._l).monthsParse(input);if(a!=null){datePartArray[1]=a}else{config._isValid=false}break;case"D":case"DD":case"DDD":case"DDDD":if(input!=null){datePartArray[2]=~~input}break;case"YY":datePartArray[0]=~~input+(~~input>68?1900:2e3);break;case"YYYY":case"YYYYY":datePartArray[0]=~~input;break;case"a":case"A":config._isPm=getLangDefinition(config._l).isPM(input);break;case"H":case"HH":case"h":case"hh":datePartArray[3]=~~input;break;case"m":case"mm":datePartArray[4]=~~input;break;case"s":case"ss":datePartArray[5]=~~input;break;case"S":case"SS":case"SSS":datePartArray[6]=~~(("0."+input)*1e3);break;case"X":config._d=new Date(parseFloat(input)*1e3);break;case"Z":case"ZZ":config._useUTC=true;config._tzm=timezoneMinutesFromString(input);break}if(input==null){config._isValid=false}}function dateFromArray(config){var i,date,input=[];if(config._d){return}for(i=0;i<7;i++){config._a[i]=input[i]=config._a[i]==null?i===2?1:0:config._a[i]}input[3]+=~~((config._tzm||0)/60);input[4]+=~~((config._tzm||0)%60);date=new Date(0);if(config._useUTC){date.setUTCFullYear(input[0],input[1],input[2]);date.setUTCHours(input[3],input[4],input[5],input[6])}else{date.setFullYear(input[0],input[1],input[2]);date.setHours(input[3],input[4],input[5],input[6])}config._d=date}function makeDateFromStringAndFormat(config){var tokens=config._f.match(formattingTokens),string=config._i,i,parsedInput;config._a=[];for(i=0;i<tokens.length;i++){parsedInput=(getParseRegexForToken(tokens[i],config).exec(string)||[])[0];if(parsedInput){string=string.slice(string.indexOf(parsedInput)+parsedInput.length)}if(formatTokenFunctions[tokens[i]]){addTimeToArrayFromToken(tokens[i],parsedInput,config)}}if(string){config._il=string}if(config._isPm&&config._a[3]<12){config._a[3]+=12}if(config._isPm===false&&config._a[3]===12){config._a[3]=0}dateFromArray(config)}function makeDateFromStringAndArray(config){var tempConfig,tempMoment,bestMoment,scoreToBeat=99,i,currentScore;for(i=0;i<config._f.length;i++){tempConfig=extend({},config);tempConfig._f=config._f[i];makeDateFromStringAndFormat(tempConfig);tempMoment=new Moment(tempConfig);currentScore=compareArrays(tempConfig._a,tempMoment.toArray());if(tempMoment._il){currentScore+=tempMoment._il.length}if(currentScore<scoreToBeat){scoreToBeat=currentScore;bestMoment=tempMoment}}extend(config,bestMoment)}function makeDateFromString(config){var i,string=config._i,match=isoRegex.exec(string);if(match){config._f="YYYY-MM-DD"+(match[2]||" ");for(i=0;i<4;i++){if(isoTimes[i][1].exec(string)){config._f+=isoTimes[i][0];break}}if(parseTokenTimezone.exec(string)){config._f+=" Z"}makeDateFromStringAndFormat(config)}else{config._d=new Date(string)}}function makeDateFromInput(config){var input=config._i,matched=aspNetJsonRegex.exec(input);if(input===undefined){config._d=new Date}else if(matched){config._d=new Date(+matched[1])}else if(typeof input==="string"){makeDateFromString(config)}else if(isArray(input)){config._a=input.slice(0);dateFromArray(config)}else{config._d=input instanceof Date?new Date(+input):new Date(input)}}function substituteTimeAgo(string,number,withoutSuffix,isFuture,lang){return lang.relativeTime(number||1,!!withoutSuffix,string,isFuture)}function relativeTime(milliseconds,withoutSuffix,lang){var seconds=round(Math.abs(milliseconds)/1e3),minutes=round(seconds/60),hours=round(minutes/60),days=round(hours/24),years=round(days/365),args=seconds<45&&["s",seconds]||minutes===1&&["m"]||minutes<45&&["mm",minutes]||hours===1&&["h"]||hours<22&&["hh",hours]||days===1&&["d"]||days<=25&&["dd",days]||days<=45&&["M"]||days<345&&["MM",round(days/30)]||years===1&&["y"]||["yy",years];args[2]=withoutSuffix;args[3]=milliseconds>0;args[4]=lang;return substituteTimeAgo.apply({},args)}function weekOfYear(mom,firstDayOfWeek,firstDayOfWeekOfYear){var end=firstDayOfWeekOfYear-firstDayOfWeek,daysToDayOfWeek=firstDayOfWeekOfYear-mom.day(),adjustedMoment;if(daysToDayOfWeek>end){daysToDayOfWeek-=7}if(daysToDayOfWeek<end-7){daysToDayOfWeek+=7}adjustedMoment=moment(mom).add("d",daysToDayOfWeek);return{week:Math.ceil(adjustedMoment.dayOfYear()/7),year:adjustedMoment.year()}}function makeMoment(config){var input=config._i,format=config._f;if(input===null||input===""){return null}if(typeof input==="string"){config._i=input=getLangDefinition().preparse(input)}if(moment.isMoment(input)){config=extend({},input);config._d=new Date(+input._d)}else if(format){if(isArray(format)){makeDateFromStringAndArray(config)}else{makeDateFromStringAndFormat(config)}}else{makeDateFromInput(config)}return new Moment(config)}moment=function(input,format,lang){return makeMoment({_i:input,_f:format,_l:lang,_isUTC:false})};moment.utc=function(input,format,lang){return makeMoment({_useUTC:true,_isUTC:true,_l:lang,_i:input,_f:format})};moment.unix=function(input){return moment(input*1e3)};moment.duration=function(input,key){var isDuration=moment.isDuration(input),isNumber=typeof input==="number",duration=isDuration?input._data:isNumber?{}:input,matched=aspNetTimeSpanJsonRegex.exec(input),sign,ret;if(isNumber){if(key){duration[key]=input}else{duration.milliseconds=input}}else if(matched){sign=matched[1]==="-"?-1:1;duration={y:0,d:~~matched[2]*sign,h:~~matched[3]*sign,m:~~matched[4]*sign,s:~~matched[5]*sign,ms:~~matched[6]*sign}}ret=new Duration(duration);if(isDuration&&input.hasOwnProperty("_lang")){ret._lang=input._lang}return ret};moment.version=VERSION;moment.defaultFormat=isoFormat;moment.updateOffset=function(){};moment.lang=function(key,values){var i;if(!key){return moment.fn._lang._abbr}if(values){loadLang(key,values)}else if(!languages[key]){getLangDefinition(key)}moment.duration.fn._lang=moment.fn._lang=getLangDefinition(key)};moment.langData=function(key){if(key&&key._lang&&key._lang._abbr){key=key._lang._abbr}return getLangDefinition(key)};moment.isMoment=function(obj){return obj instanceof Moment};moment.isDuration=function(obj){return obj instanceof Duration};moment.fn=Moment.prototype={clone:function(){return moment(this)},valueOf:function(){return+this._d+(this._offset||0)*6e4},unix:function(){return Math.floor(+this/1e3)},toString:function(){return this.format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},toDate:function(){return this._offset?new Date(+this):this._d},toISOString:function(){return formatMoment(moment(this).utc(),"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")},toArray:function(){var m=this;return[m.year(),m.month(),m.date(),m.hours(),m.minutes(),m.seconds(),m.milliseconds()]},isValid:function(){if(this._isValid==null){if(this._a){this._isValid=!compareArrays(this._a,(this._isUTC?moment.utc(this._a):moment(this._a)).toArray())}else{this._isValid=!isNaN(this._d.getTime())}}return!!this._isValid},utc:function(){return this.zone(0)},local:function(){this.zone(0);this._isUTC=false;return this},format:function(inputString){var output=formatMoment(this,inputString||moment.defaultFormat);return this.lang().postformat(output)},add:function(input,val){var dur;if(typeof input==="string"){dur=moment.duration(+val,input)}else{dur=moment.duration(input,val)}addOrSubtractDurationFromMoment(this,dur,1);return this},subtract:function(input,val){var dur;if(typeof input==="string"){dur=moment.duration(+val,input)}else{dur=moment.duration(input,val)}addOrSubtractDurationFromMoment(this,dur,-1);return this},diff:function(input,units,asFloat){var that=this._isUTC?moment(input).zone(this._offset||0):moment(input).local(),zoneDiff=(this.zone()-that.zone())*6e4,diff,output;units=normalizeUnits(units);if(units==="year"||units==="month"){diff=(this.daysInMonth()+that.daysInMonth())*432e5;output=(this.year()-that.year())*12+(this.month()-that.month());output+=(this-moment(this).startOf("month")-(that-moment(that).startOf("month")))/diff;if(units==="year"){output=output/12}}else{diff=this-that-zoneDiff;output=units==="second"?diff/1e3:units==="minute"?diff/6e4:units==="hour"?diff/36e5:units==="day"?diff/864e5:units==="week"?diff/6048e5:diff}return asFloat?output:absRound(output)},from:function(time,withoutSuffix){return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix)},fromNow:function(withoutSuffix){return this.from(moment(),withoutSuffix)},calendar:function(){var diff=this.diff(moment().startOf("day"),"days",true),format=diff<-6?"sameElse":diff<-1?"lastWeek":diff<0?"lastDay":diff<1?"sameDay":diff<2?"nextDay":diff<7?"nextWeek":"sameElse";return this.format(this.lang().calendar(format,this))},isLeapYear:function(){var year=this.year();return year%4===0&&year%100!==0||year%400===0},isDST:function(){return this.zone()<this.clone().month(0).zone()||this.zone()<this.clone().month(5).zone()},day:function(input){var day=this._isUTC?this._d.getUTCDay():this._d.getDay();if(input!=null){if(typeof input==="string"){input=this.lang().weekdaysParse(input);if(typeof input!=="number"){return this}}return this.add({d:input-day})}else{return day}},month:function(input){var utc=this._isUTC?"UTC":"";if(input!=null){if(typeof input==="string"){input=this.lang().monthsParse(input);if(typeof input!=="number"){return this}}this._d["set"+utc+"Month"](input);moment.updateOffset(this);return this}else{return this._d["get"+utc+"Month"]()}},startOf:function(units){units=normalizeUnits(units);switch(units){case"year":this.month(0);case"month":this.date(1);case"week":case"day":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}if(units==="week"){this.weekday(0)}return this},endOf:function(units){return this.startOf(units).add(units,1).subtract("ms",1)},isAfter:function(input,units){units=typeof units!=="undefined"?units:"millisecond";return+this.clone().startOf(units)>+moment(input).startOf(units)},isBefore:function(input,units){units=typeof units!=="undefined"?units:"millisecond";return+this.clone().startOf(units)<+moment(input).startOf(units)},isSame:function(input,units){units=typeof units!=="undefined"?units:"millisecond";return+this.clone().startOf(units)===+moment(input).startOf(units)},min:function(other){other=moment.apply(null,arguments);return other<this?this:other},max:function(other){other=moment.apply(null,arguments);return other>this?this:other},zone:function(input){var offset=this._offset||0;if(input!=null){if(typeof input==="string"){input=timezoneMinutesFromString(input)}if(Math.abs(input)<16){input=input*60}this._offset=input;this._isUTC=true;if(offset!==input){addOrSubtractDurationFromMoment(this,moment.duration(offset-input,"m"),1,true)}}else{return this._isUTC?offset:this._d.getTimezoneOffset()}return this},zoneAbbr:function(){return this._isUTC?"UTC":""},zoneName:function(){return this._isUTC?"Coordinated Universal Time":""},daysInMonth:function(){return moment.utc([this.year(),this.month()+1,0]).date()},dayOfYear:function(input){var dayOfYear=round((moment(this).startOf("day")-moment(this).startOf("year"))/864e5)+1;return input==null?dayOfYear:this.add("d",input-dayOfYear)},weekYear:function(input){var year=weekOfYear(this,this.lang()._week.dow,this.lang()._week.doy).year;return input==null?year:this.add("y",input-year)},isoWeekYear:function(input){var year=weekOfYear(this,1,4).year;return input==null?year:this.add("y",input-year)},week:function(input){var week=this.lang().week(this);return input==null?week:this.add("d",(input-week)*7)},isoWeek:function(input){var week=weekOfYear(this,1,4).week;return input==null?week:this.add("d",(input-week)*7)},weekday:function(input){var weekday=(this._d.getDay()+7-this.lang()._week.dow)%7;return input==null?weekday:this.add("d",input-weekday)},isoWeekday:function(input){var weekday=(this._d.getDay()+6)%7;return input==null?weekday:this.add("d",input-weekday)},lang:function(key){if(key===undefined){return this._lang}else{this._lang=getLangDefinition(key);return this}}};function makeGetterAndSetter(name,key){moment.fn[name]=moment.fn[name+"s"]=function(input){var utc=this._isUTC?"UTC":"";if(input!=null){this._d["set"+utc+key](input);moment.updateOffset(this);return this}else{return this._d["get"+utc+key]()}}}for(i=0;i<proxyGettersAndSetters.length;i++){makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase().replace(/s$/,""),proxyGettersAndSetters[i])}makeGetterAndSetter("year","FullYear");moment.fn.days=moment.fn.day;moment.fn.months=moment.fn.month;moment.fn.weeks=moment.fn.week;moment.fn.isoWeeks=moment.fn.isoWeek;moment.fn.toJSON=moment.fn.toISOString;moment.duration.fn=Duration.prototype={weeks:function(){return absRound(this.days()/7)},valueOf:function(){return this._milliseconds+this._days*864e5+this._months%12*2592e6+~~(this._months/12)*31536e6},humanize:function(withSuffix){var difference=+this,output=relativeTime(difference,!withSuffix,this.lang());if(withSuffix){output=this.lang().pastFuture(difference,output)}return this.lang().postformat(output)},add:function(input,val){var dur=moment.duration(input,val);this._milliseconds+=dur._milliseconds;this._days+=dur._days;this._months+=dur._months;return this},subtract:function(input,val){var dur=moment.duration(input,val);this._milliseconds-=dur._milliseconds;this._days-=dur._days;this._months-=dur._months;return this},get:function(units){units=normalizeUnits(units);return this[units.toLowerCase()+"s"]()},as:function(units){units=normalizeUnits(units);return this["as"+units.charAt(0).toUpperCase()+units.slice(1)+"s"]()},lang:moment.fn.lang};function makeDurationGetter(name){moment.duration.fn[name]=function(){return this._data[name]}}function makeDurationAsGetter(name,factor){moment.duration.fn["as"+name]=function(){return+this/factor}}for(i in unitMillisecondFactors){if(unitMillisecondFactors.hasOwnProperty(i)){makeDurationAsGetter(i,unitMillisecondFactors[i]);makeDurationGetter(i.toLowerCase())}}makeDurationAsGetter("Weeks",6048e5);moment.duration.fn.asMonths=function(){return(+this-this.years()*31536e6)/2592e6+this.years()*12};moment.lang("en",{ordinal:function(number){var b=number%10,output=~~(number%100/10)===1?"th":b===1?"st":b===2?"nd":b===3?"rd":"th";return number+output}});if(hasModule){module.exports=moment}(function(){var chrono=function(){for(var attr in chrono){this[attr]=chrono[attr]}this.parsers={};for(var p in chrono.parsers)this.parsers[p]=chrono.parsers[p];this.refiners={};for(var r in chrono.refiners)this.refiners[r]=chrono.refiners[r];this.timezoneMap={};for(var r in chrono.timezoneMap)this.timezoneMap[r]=chrono.timezoneMap[r]};chrono.timezoneMap={};chrono.parsers={};chrono.refiners={};chrono.parse=function(text,referrenceDate,option){option=option||{};if(typeof referrenceDate==="string"){var _ref=moment(referrenceDate).zone(referrenceDate);option.timezoneOffset=_ref.zone();referrenceDate=_ref.toDate()}var results=this.integratedParse(text,referrenceDate,option);var results=this.integratedRefine(text,results,option);return results};chrono.parseDate=function(text,referrenceDate,timezoneOffset){var results=this.parse(text,referrenceDate);if(results.length>=1)return results[0].start.date(timezoneOffset);else return null};if(typeof exports=="undefined"){moment=moment||window.moment;window.chrono=chrono}else{if(typeof moment=="undefined")eval("var moment = require('./moment');");var fs=require("fs");function loadModuleDirs(dir){var module_dirs=fs.readdirSync(__dirname+"/"+dir);module_dirs=module_dirs.filter(function(name){return!name.match(/\./)});for(var i in module_dirs){var dirname=module_dirs[i];if(typeof dirname=="function")continue;var parser_files=fs.readdirSync(__dirname+"/"+dir+"/"+dirname);for(var j in parser_files){var filename=parser_files[j];if(typeof filename=="function")continue;if(!filename.match(/\.js$/))continue;eval(fs.readFileSync(__dirname+"/"+dir+"/"+dirname+"/"+filename)+"")}}}eval(fs.readFileSync(__dirname+"/timezone.js")+"");eval(fs.readFileSync(__dirname+"/parsers/ParseResult.js")+"");eval(fs.readFileSync(__dirname+"/parsers/Parser.js")+"");eval(fs.readFileSync(__dirname+"/parsers/IntegratedParsing.js")+"");loadModuleDirs("parsers");eval(fs.readFileSync(__dirname+"/refiners/IntegratedRefinement.js")+"");loadModuleDirs("refiners");module.exports=chrono}})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";chrono.timezoneMap={A:60,ACDT:630,ACST:570,ADT:-180,AEDT:660,AEST:600,AFT:270,AKDT:-480,AKST:-540,ALMT:360,AMST:-180,AMT:-240,ANAST:720,ANAT:720,AQTT:300,ART:-180,AST:-240,AWDT:540,AWST:480,AZOST:0,AZOT:-60,AZST:300,AZT:240,B:120,BNT:480,BOT:-240,BRST:-120,BRT:-180,BST:60,BTT:360,C:180,CAST:480,CAT:120,CCT:390,CDT:-300,CEST:120,CET:60,CHADT:825,CHAST:765,CKT:-600,CLST:-180,CLT:-240,COT:-300,CST:-360,CVT:-60,CXT:420,ChST:600,D:240,DAVT:420,E:300,EASST:-300,EAST:-360,EAT:180,ECT:-300,EDT:-240,EEST:180,EET:120,EGST:0,EGT:-60,EST:-300,ET:-300,F:360,FJST:780,FJT:720,FKST:-180,FKT:-240,FNT:-120,G:420,GALT:-360,GAMT:-540,GET:240,GFT:-180,GILT:720,GMT:0,GST:240,GYT:-240,H:480,HAA:-180,HAC:-300,HADT:-540,HAE:-240,HAP:-420,HAR:-360,HAST:-600,HAT:-90,HAY:-480,HKT:480,HLV:-210,HNA:-240,HNC:-360,HNE:-300,HNP:-480,HNR:-420,HNT:-150,HNY:-540,HOVT:420,I:540,ICT:420,IDT:180,IOT:360,IRDT:270,IRKST:540,IRKT:540,IRST:210,IST:60,JST:540,K:600,KGT:360,KRAST:480,KRAT:480,KST:540,KUYT:240,L:660,LHDT:660,LHST:630,LINT:840,M:720,MAGST:720,MAGT:720,MART:-510,MAWT:300,MDT:-360,MESZ:120,MEZ:60,MHT:720,MMT:390,MSD:240,MSK:240,MST:-420,MUT:240,MVT:300,MYT:480,N:-60,NCT:660,NDT:-90,NFT:690,NOVST:420,NOVT:360,NPT:345,NST:-150,NUT:-660,NZDT:780,NZST:720,O:-120,OMSST:420,OMST:420,P:-180,PDT:-420,PET:-300,PETST:720,PETT:720,PGT:600,PHOT:780,PHT:480,PKT:300,PMDT:-120,PMST:-180,PONT:660,PST:-480,PT:-480,PWT:540,PYST:-180,PYT:-240,Q:-240,R:-300,RET:240,S:-360,SAMT:240,SAST:120,SBT:660,SCT:240,SGT:480,SRT:-180,SST:-660,T:-420,TAHT:-600,TFT:300,TJT:300,TKT:780,TLT:540,TMT:300,TVT:720,U:-480,ULAT:480,UTC:0,UYST:-120,UYT:-180,UZT:300,V:-540,VET:-210,VLAST:660,VLAT:660,VUT:660,W:-600,WAST:120,WAT:60,WEST:60,WESZ:60,WET:0,WEZ:0,WFT:720,WGST:-120,WGT:-180,WIB:420,WIT:540,WITA:480,WST:780,WT:0,X:-660,Y:-720,YAKST:600,YAKT:600,YAPT:600,YEKST:360,YEKT:360,Z:0}})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function DateComponents(components){this.year=components.year;this.month=components.month;this.day=components.day;this.hour=components.hour;this.minute=components.minute;this.second=components.second;this.timezoneOffset=components.timezoneOffset;this.dayOfWeek=components.dayOfWeek;if(components.meridiem)this.meridiem=components.meridiem.toLowerCase();if(components.impliedComponents&&components.impliedComponents.length>0){this.impliedComponents=components.impliedComponents}this.isCertain=function(component){return this[component]!==undefined&&this[component]!==null&&(this.impliedComponents?this.impliedComponents.indexOf(component)<0:true)};this.date=function(timezoneOffset){if(timezoneOffset===undefined||timezoneOffset===null){timezoneOffset=this.timezoneOffset}else{if(this.isCertain("timezoneOffset"))timezoneOffset=this.timezoneOffset}if(timezoneOffset===undefined||timezoneOffset===null)timezoneOffset=(new Date).getTimezoneOffset();var dateMoment=moment(new Date(this.year,this.month,this.day));if(this.hour===undefined||this.hour===null)dateMoment.hours(12);else dateMoment.hours(this.hour);dateMoment.minutes(this.minute);dateMoment.seconds(this.second);dateMoment.add("minutes",timezoneOffset-(new Date).getTimezoneOffset());return dateMoment.toDate()};this.assign=function(component,value){this[component]=value;if(this.impliedComponents&&this.impliedComponents.indexOf(component)>=0){var index=this.impliedComponents.indexOf(component);this.impliedComponents.splice(index,1)}};this.imply=function(component,value){this[component]=value;if(!this.impliedComponents)this.impliedComponents=[];if(this.impliedComponents.indexOf(component)<0){this.impliedComponents.push(component)}};if(this.isCertain("hour")&&this.hour>12){this.assign("meridiem","pm")}}function ParseResult(result){this.start=new DateComponents(result.start);this.startDate=this.start.date();if(result.end){this.end=new DateComponents(result.end);this.endDate=this.end.date()}this.referenceDate=result.referenceDate;this.index=result.index;this.text=result.text;this.concordance=result.concordance;
if(result.timezoneOffset){this.timezoneOffset=result.timezoneOffset}}chrono.DateComponents=DateComponents;chrono.ParseResult=ParseResult})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function Parser(text,ref,opt){opt=opt||{};var timezoneMap=opt.timezoneMap||chrono.timezoneMap;var searchingIndex=0;var searchingText=text;var searchingFinished=false;var searchingResults=[];var parser={};parser.pattern=function(){return/./i};parser.extract=function(text,index){return null};parser.results=function(){return searchingResults};parser.finished=function(){return searchingFinished};parser.mergeOverlapResult=function(text,result1,result2){if(result2.index<result1.index){var tmp=result1;result1=result2;result2=tmp}var begin=result1.index+result1.text.length;var end=result2.index;if(end<begin&&result1.index<result2.index&&begin<result2.index+result2.text.length){var mergedIndex=result1.index;var mergedText=text.substring(result1.index,result2.index+result2.text.length);var impliedComponents1=result1.start.impliedComponents||[];var impliedComponents2=result2.start.impliedComponents||[];if(impliedComponents1.length<impliedComponents2.length){var tmp=result1;result1=result2;result2=tmp;impliedComponents1=result1.start.impliedComponents||[];impliedComponents2=result2.start.impliedComponents||[]}if(impliedComponents1.indexOf("day")<0||impliedComponents1.indexOf("month")<0||impliedComponents1.indexOf("year")<0)return;return new chrono.ParseResult({referenceDate:result1.ref,index:mergedIndex,start:result2.start,end:result2.end,text:mergedText,referenceDate:result1.referenceDate})}var textBetween=text.substring(begin,end);var OVERLAP_PATTERN=/^\s*(to|\-)\s*$/i;if(!textBetween.match(OVERLAP_PATTERN))return null;var mergedText=result1.text+textBetween+result2.text;var components1=new Object(result1.start);var components2=new Object(result2.start);var impliedComponents1=result1.start.impliedComponents||[];var impliedComponents2=result2.start.impliedComponents||[];impliedComponents1.forEach(function(unknown_component){if(components2.isCertain(unknown_component)){components1.assign(unknown_component,components2[unknown_component])}});impliedComponents2.forEach(function(unknown_component){if(components1.isCertain(unknown_component)){components2.assign(unknown_component,components1[unknown_component])}});if(moment(components2.date()).diff(moment(components1.date()))>0){return new chrono.ParseResult({referenceDate:result1.ref,index:result1.index,start:components1,end:components2,text:mergedText,referenceDate:result1.referenceDate})}else{return new chrono.ParseResult({referenceDate:result1.ref,index:result1.index,start:components2,end:components1,text:mergedText,referenceDate:result1.referenceDate})}};parser.extractTime=function(text,result){var SUFFIX_PATTERN=/^\s*,?\s*(at|from)?\s*,?\s*([0-9]{1,4}|noon|midnight)((\.|\:|\：)([0-9]{1,2})((\.|\:|\：)([0-9]{1,2}))?)?(\s*(AM|PM))?(\W|$)/i;if(text.length<=result.index+result.text.length)return null;text=text.substr(result.index+result.text.length);var matchedTokens=text.match(SUFFIX_PATTERN);if(!matchedTokens)return null;var minute=0;var second=0;var hour=matchedTokens[2];if(hour.toLowerCase()=="noon"){result.start.meridiem="pm";hour=12}else if(hour.toLowerCase()=="midnight"){result.start.meridiem="am";hour=0}else hour=parseInt(hour);if(matchedTokens[5]){minute=matchedTokens[5];minute=parseInt(minute);if(minute>=60)return null}else if(hour>100){minute=hour%100;hour=(hour-minute)/100}if(matchedTokens[8]){second=matchedTokens[8];second=parseInt(second);if(second>=60)return null}if(matchedTokens[10]){if(hour>12)return null;if(matchedTokens[10].toLowerCase()=="am"){if(hour==12)hour=0}if(matchedTokens[10].toLowerCase()=="pm"){if(hour!=12)hour+=12}result.start.meridiem=matchedTokens[10].toLowerCase()}if(hour>=12)result.start.meridiem="pm";if(hour>24)return null;result.text=result.text+matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[11].length);if(result.start.hour==undefined){result.start.hour=hour;result.start.minute=minute;result.start.second=second}var TO_SUFFIX_PATTERN=/^\s*(\-|\~|\〜|to|\?)\s*([0-9]{1,4})((\.|\:|\：)([0-9]{1,2})((\.|\:|\：)([0-9]{1,2}))?)?(\s*(AM|PM))?/i;text=text.substr(matchedTokens[0].length-matchedTokens[11].length);matchedTokens=text.match(TO_SUFFIX_PATTERN);if(!matchedTokens){if(result.end&&result.end.hour==undefined){result.end.hour=hour;result.end.minute=minute;result.end.second=second}return new chrono.ParseResult(result)}var minute=0;var second=0;var hour=matchedTokens[2];hour=parseInt(hour);if(matchedTokens[5]){minute=matchedTokens[5];minute=parseInt(minute);if(minute>=60)return null}else if(hour>100){if(!matchedTokens[10])return null;minute=hour%100;hour=(hour-minute)/100}if(matchedTokens[8]){second=matchedTokens[8];second=parseInt(second);if(second>=60)return null}if(matchedTokens[10]){if(hour>12)return null;if(matchedTokens[10].toLowerCase()=="am"){if(hour==12){hour=0;if(!result.end)result.end=new chrono.DateComponents(result.start);result.end.day+=1}}if(matchedTokens[10].toLowerCase()=="pm"){if(hour!=12)hour+=12}if(!result.start.meridiem){if(matchedTokens[10].toLowerCase()=="am"){if(result.start.hour==12)result.start.hour=0}if(matchedTokens[10].toLowerCase()=="pm"){if(result.start.hour!=12)result.start.hour+=12}result.start.imply("meridiem",matchedTokens[10].toLowerCase())}}result.text=result.text+matchedTokens[0];if(!result.end){result.end=new chrono.DateComponents(result.start);result.end.hour=hour;result.end.minute=minute;result.end.second=second}else{result.end.hour=hour;result.end.minute=minute;result.end.second=second}if(matchedTokens[10])result.end.meridiem=matchedTokens[10].toLowerCase();if(hour>=12)result.end.meridiem="pm";return new chrono.ParseResult(result)};parser.extractTimezone=function(text,result){var PATTERN=/^\s*(GMT|UTC)?(\+|\-)(\d{1,2}):?(\d{2})/;if(text.length<=result.index+result.text.length)return null;text=text.substr(result.index+result.text.length);var matchedTokens=text.match(PATTERN);if(matchedTokens){var timezoneOffset=parseInt(matchedTokens[3])*60+parseInt(matchedTokens[4]);var timezoneOffset=parseInt(matchedTokens[2]+timezoneOffset)*-1;if(result.end)result.end.timezoneOffset=timezoneOffset;result.start.timezoneOffset=timezoneOffset;result.text+=matchedTokens[0];text=text.substr(matchedTokens[0].length)}var PATTERN=/^\s*\(?([A-Z]{1,4})\)?(\W|$)/;var matchedTokens=text.match(PATTERN);if(matchedTokens&&timezoneMap[matchedTokens[1]]!==undefined){var timezoneAbbr=matchedTokens[1];var timezoneOffset=-timezoneMap[timezoneAbbr];if(result.start.timezoneOffset===undefined){result.start.timezoneOffset=timezoneOffset;if(result.end)result.end.timezoneOffset=timezoneOffset}result.text+=matchedTokens[0].substring(0,matchedTokens[0].length-matchedTokens[2].length)}return result};parser.extractConcordance=function(text,result){var conLength=30;preText=text.substr(0,result.index);preText=preText.replace(/(\r\n|\n|\r)/gm," ");preText=preText.replace(/(\s+)/gm," ");if(preText.length>conLength)preText="..."+preText.substr(preText.length-conLength+3,conLength-3);else preText=preText.substr(0,conLength);posText=text.substr(result.index+result.text.length);posText=posText.replace(/(\r\n|\n|\r)/gm," ");posText=posText.replace(/(\s+)/gm," ");if(posText.length>conLength)posText=posText.substr(0,conLength-3)+"...";else posText=posText.substr(0,conLength);result.concordance=preText+result.text+posText;return new chrono.ParseResult(result)};parser.exec=function(){if(searchingFinished)return null;var index=searchingText.search(this.pattern());if(index<0){searchingFinished=true;return null}var matchedIndex=index+searchingIndex;var result=this.extract(text,matchedIndex);if(!result){searchingText=searchingText.substr(index+1);searchingIndex=matchedIndex+1;return null}if(result.start.hour===undefined||result.end&&result.end.hour===undefined){var timedResult=this.extractTime(text,result);result=timedResult||result}if(result.start.timezoneOffset===undefined||result.end&&result.end.timezoneOffset===undefined){var resultWithTimezone=this.extractTimezone(text,result);result=resultWithTimezone||result;if(opt.timezoneOffset){if(result.start.timezoneOffset===undefined){result.start.imply("timezoneOffset",opt.timezoneOffset)}if(result.end&&result.end.timezoneOffset===undefined){result.end.imply("timezoneOffset",opt.timezoneOffset)}}}if(searchingResults.length>0){var oldResult=searchingResults[searchingResults.length-1];var overlapResult=this.mergeOverlapResult(text,oldResult,result);result=overlapResult||result}this.extractConcordance(text,result);searchingResults.push(result);searchingText=text.substr(result.index+result.text.length+1);searchingIndex=result.index+result.text.length+1;return result};parser.execAll=function(){while(!this.finished())this.exec()};return parser}chrono.Parser=Parser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function integratedParse(text,ref,opt,parserTypes){opt=opt||{};ref=ref||new Date;parserTypes=parserTypes||Object.keys(this.parsers);opt.timezoneMap=opt.timezoneMap||this.timezoneMap;var currentParserIndex=0;var parsers=[];var results=[];for(var i=0;i<parserTypes.length;i++){if(this.parsers[parserTypes[i]])parsers.push(new this.parsers[parserTypes[i]](text,ref,opt))}while(currentParserIndex<parsers.length){var currenParser=parsers[currentParserIndex];while(!currenParser.finished()){var result=currenParser.exec();if(result)insertNewResult(results,result)}currentParserIndex++}return results}function insertNewResult(results,newResult){var index=0;while(index<results.length&&results[index].index<newResult.index)index++;if(index<results.length){var overlapped_index=index;while(overlapped_index<results.length&&results[overlapped_index].index<newResult.index+newResult.text.length){if(results[overlapped_index].text.length>=newResult.text.length)return results;overlapped_index++}results.splice(index,overlapped_index-index)}if(index-1>=0){var oldResult=results[index-1];if(newResult.index<oldResult.index+oldResult.text.length){if(oldResult.text.length>=newResult.text.length)return results;else{results.splice(index-1,1);index=index-1}}}results.splice(index,0,newResult);return results}chrono.integratedParse=integratedParse})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4}|[0-9]{2})(\W|$)/i;function DEAllNumericFormParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var matchedTokens=text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0];text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[4].length);var days=parseInt(matchedTokens[1]);var months=parseInt(matchedTokens[2])-1;var years=parseInt(matchedTokens[3]);if(years<100){if(years>50)years=years+1900;else years=years+2e3}var date=moment([years,months,days]);if(date.date()!=days||date.month()!=months||date.year()!=years){console.log("out");return null}return new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:date.day()}})};return parser}chrono.parsers.DEAllNumericFormParser=DEAllNumericFormParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/(\W|^)((\,|\(|\（)\s*)?((diese[rn]?|letzte[rn]?|nächste[rn]?)\s*)?(Sonntag|So|Montag|Mo|Dienstag|Di|Mittwoch|Mi|Donnerstag|Do|Freitag|Fr|Samstag|Sonnabend|Sa)(\s*(\,|\)|\）))?(\W|$)/i;var DAYS_OFFSET={sonntag:0,so:0,montag:1,mo:1,dienstag:2,di:2,mittwoch:3,mi:3,donnerstag:4,"do":4,freitag:5,fr:5,samstag:6,sonnabend:6,sa:6};var startsWith=function(string,testPrefix){return string.lastIndexOf(testPrefix,0)===0};function DayOfWeekParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var matchedTokens=text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0];index=index+matchedTokens[1].length;text=matchedTokens[0].substr(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[9].length-matchedTokens[1].length);var prefix=matchedTokens[5];var dayOfWeek=matchedTokens[6];dayOfWeek=dayOfWeek.toLowerCase();var offset=DAYS_OFFSET[dayOfWeek];if(offset===undefined)return null;var date=moment(ref).clone();if(prefix){console.log(prefix);prefix=prefix.toLowerCase();if(startsWith(prefix,"letzte"))date.day(offset-7);else if(startsWith(prefix,"nächste"))date.day(offset+7);else if(startsWith(prefix,"diese")){date.day(offset)}}else{var ref_offset=date.day();if(offset>ref_offset)date.day(offset);else date.day(offset+7)}return new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:offset,impliedComponents:["day","month","year"]}})};return parser}chrono.parsers.DEDayOfWeekParser=DayOfWeekParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var DAYS_OFFSET={sonntag:0,montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6,so:0,mo:1,di:2,mi:3,"do":4,fr:5,sa:6};var MONTHS_OFFSET={januar:0,februar:1,märz:2,april:3,mai:4,juni:5,juli:6,august:7,september:8,oktober:9,november:10,dezember:11,jan:0,feb:1,mrz:2,apr:3,jun:5,jul:6,aug:7,sep:8,okt:9,nov:10,dez:11};var regPattern=/(\W|^)((Sonntag|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|So|Mo|Di|Mi|Do|Fr|Sa)\s*,?\s*)?(den)?\s*([0-9]{1,2})(\.)?(\s*(to|\-|\s)\s*([0-9]{1,2})(\.)?)?\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jan|Feb|Mrz|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)((\s*[0-9]{2,4})(\s*BE)?)?(\W|$)/i;function DEMonthNameLittleEndianParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return regPattern};parser.extract=function(text,index){var impliedComponents=[];var date=null;var dayOfWeek=null;text=text.substr(index);var originalText=text;var remainingText=text;var matchedTokens=text.match(regPattern);text=matchedTokens[0];text=matchedTokens[0].substr(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[15].length-matchedTokens[1].length);index=index+matchedTokens[1].length;var remainingText=remainingText.substr(matchedTokens[1].length+text.length);var originalText=text;if(matchedTokens[6])text=text.replace(matchedTokens[6],"");if(matchedTokens[7])text=text.replace(matchedTokens[7],"");var years=null;if(matchedTokens[12]){years=matchedTokens[13];years=parseInt(years);if(years<100){if(remainingText.match(/\s*(:|am|pm)/i)!=null){text=text.replace(matchedTokens[12],"");originalText=originalText.replace(matchedTokens[12],"");years=null}else{if(years>20)years=null;else years=years+2e3}}else if(matchedTokens[14]){text=text.replace(matchedTokens[14],"");years=years-543}}var days=parseInt(matchedTokens[5]);var months=MONTHS_OFFSET[matchedTokens[11].toLowerCase()];if(years){date=moment([years,months,days]);if(!date)return null}else{impliedComponents.push("year");date=moment([moment(ref).year(),months,days]);if(!date)return null;var nextYear=date.clone().add("y",1);var lastYear=date.clone().add("y",-1);if(Math.abs(nextYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=nextYear}else if(Math.abs(lastYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=lastYear}}if(matchedTokens[3])dayOfWeek=DAYS_OFFSET[matchedTokens[3].toLowerCase()];if(matchedTokens[9]){var endDay=parseInt(matchedTokens[9]);var startDay=parseInt(matchedTokens[5]);var endDate=date.clone();date.date(startDay);endDate.date(endDay);if(date.format("D")!=matchedTokens[5])return null;if(endDate.format("D")!=matchedTokens[9])return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek,impliedComponents:impliedComponents},end:{day:endDate.date(),month:endDate.month(),year:endDate.year(),impliedComponents:impliedComponents}})}else{if(date.format("D")!=matchedTokens[5])return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek,impliedComponents:impliedComponents}})}};return parser}chrono.parsers.DEMonthNameLittleEndianParser=DEMonthNameLittleEndianParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function DateOnlyParser(text,ref,opt){var PATTERN=/(\W|^)(the\s*)?([0-9]{1,2})(th|rd|nd|st)(\W|$)/i;opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var matchedTokens=text.substr(index).match(PATTERN);if(text.substr(index-1).search(PATTERN)==0)return;if(matchedTokens==null){finished=true;return}var text=matchedTokens[0];text=matchedTokens[0].substr(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[1].length-matchedTokens[5].length);index=index+matchedTokens[1].length;var day=matchedTokens[3];day=parseInt(day);var date=moment(ref);date.date(day);if(day>31||date.date()!=day){return}return new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year(),impliedComponents:["month","year"]}})};return parser}chrono.parsers.DateOnlyParser=DateOnlyParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/(\W|^)((\,|\(|\（)\s*)?((this|last|next)\s*)?(Sunday|Sun|Monday|Mon|Tuesday|Wednesday|Wed|Thursday|Thurs|Thur|Friday|Fri|Saturday|Sat)(\s*(\,|\)|\）))?(\W|$)/i;var DAYS_OFFSET={sunday:0,sun:0,monday:1,mon:1,tuesday:2,tue:2,wednesday:3,wed:3,thursday:4,thurs:4,thur:4,thu:4,friday:5,fri:5,saturday:6,sat:6};function DayOfWeekParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var matchedTokens=text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0];index=index+matchedTokens[1].length;text=matchedTokens[0].substr(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[9].length-matchedTokens[1].length);var prefix=matchedTokens[5];var dayOfWeek=matchedTokens[6];dayOfWeek=dayOfWeek.toLowerCase();var offset=DAYS_OFFSET[dayOfWeek];if(offset===undefined)return null;var date=moment(ref).clone();if(prefix){prefix=prefix.toLowerCase();if(prefix=="last")date.day(offset-7);else if(prefix=="next")date.day(offset+7);else if(prefix=="this")date.day(offset)}else{var ref_offset=date.day();if(offset>ref_offset)date.day(offset);else date.day(offset+7)}return new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:offset,impliedComponents:["day","month","year"]}})};return parser}chrono.parsers.DayOfWeekParser=DayOfWeekParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/(today|tonight|tomorrow|yesterday|last\s*night|([0-9]+)\s*day(s)\s*ago|([0-9]{1,2})(\.|\:|\：)([0-9]{2})|([0-9]{1,2}\s*\W?\s*)?([0-9]{1,2})\s*(AM|PM)|at\s*([0-9]{1,2}|noon|midnight)|(noon|midnight))(\W|$)/i;function GeneralDateParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(full_text,index){var matchedTokens=full_text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var impliedComponents=null;var text=matchedTokens[0].toLowerCase();text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[12].length);var ref_moment=moment(ref);if(opt.timezoneOffset!==undefined)ref_moment=ref_moment.zone(opt.timezoneOffset);var date=null;var lowercase_text=text.toLowerCase();if(lowercase_text=="today"||lowercase_text=="tonight"){date=ref_moment.clone()}else if(lowercase_text=="tomorrow"){if(ref_moment.hour()<4)date=ref_moment.clone().hour(6);else date=ref_moment.clone().add("d",1)}else if(lowercase_text=="yesterday")date=ref_moment.clone().add("d",-1);else if(lowercase_text.match("last"))date=ref_moment.clone().add("d",-1);else if(lowercase_text.match("ago")){var days_ago=matchedTokens[2];days_ago=parseInt(days_ago);date=ref_moment.clone().add("d",-days_ago)}else{if(full_text.charAt(index-1).match(/\d/))return null;if(full_text.match(/\d+(\.\d+)%/))return null;while(full_text.charAt(index)==" ")index++;impliedComponents=["year","month","day"];date=ref_moment.clone();text=""}var result=new chrono.ParseResult({referenceDate:ref_moment.toDate(),text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year(),impliedComponents:impliedComponents}});var resultWithTime=parser.extractTime(full_text,result);result=resultWithTime||result;if(result.text.replace(/\s/g,"").length==0)return null;if(lowercase_text.match("night")){if(!resultWithTime){result.start.day=date.date()+1;result.start.hour=0;result.start.minute=0;result.start.second=0;result.start.impliedComponents=["hour","minute","second"];result=new chrono.ParseResult(result)}else if(resultWithTime.start.hour<6){date.add("d",1);result.start.day=date.date();result.start.month=date.month();result.start.year=date.year();result=new chrono.ParseResult(result)}else if(resultWithTime.start.hour<12&&!resultWithTime.start.meridiem){result.start.hour=resultWithTime.start.hour+12;result.start.meridiem="pm";result.start.impliedComponents=result.start.impliedComponents||[];result.start.impliedComponents.push("meridiem");result=new chrono.ParseResult(result)}}return result};return parser}chrono.parsers.GeneralDateParser=GeneralDateParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/([0-9]{4})\-([0-9]{1,2})\-([0-9]{1,2})(\W|$)/i;function InternationalStandardParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var matchedTokens=text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0];text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[4].length);var date=moment(text,"YYYY-MM-DD");if(date.format("YYYY-M-D")!=text&&date.format("YYYY-MM-DD")!=text){return null}return new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:date.day()}})};return parser}chrono.parsers.InternationalStandardParser=InternationalStandardParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var DAYS_OFFSET={sunday:0,sun:0,monday:1,mon:1,tuesday:2,tue:2,wednesday:3,wed:3,thursday:4,thur:4,thu:4,friday:5,fri:5,saturday:6,sat:6};var regPattern=/(\W|^)((Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s*,?\s*)?([0-9]{1,2})(st|nd|rd|th)?(\s*(to|\-|\s)\s*([0-9]{1,2})(st|nd|rd|th)?)?\s*(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|October|Oct|November|Nov|December|Dec)((\s*[0-9]{2,4})(\s*BE)?)?(\W|$)/i;function MonthNameLittleEndianParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return regPattern};parser.extract=function(text,index){var impliedComponents=[];var date=null;var dayOfWeek=null;text=text.substr(index);var originalText=text;var remainingText=text;var matchedTokens=text.match(regPattern);text=matchedTokens[0];text=matchedTokens[0].substr(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[14].length-matchedTokens[1].length);index=index+matchedTokens[1].length;var remainingText=remainingText.substr(matchedTokens[1].length+text.length);var originalText=text;if(matchedTokens[5])text=text.replace(matchedTokens[5],"");if(matchedTokens[6])text=text.replace(matchedTokens[6],"");var years=null;if(matchedTokens[11]){years=matchedTokens[12];years=parseInt(years);if(years<100){if(remainingText.match(/\s*(:|am|pm)/i)!=null){text=text.replace(matchedTokens[11],"");originalText=originalText.replace(matchedTokens[11],"");years=null}else{if(years>20)years=null;else years=years+2e3}}else if(matchedTokens[13]){text=text.replace(matchedTokens[13],"");years=years-543}}if(years){text=matchedTokens[4]+" "+matchedTokens[10]+" "+years;date=moment(text,"DD MMMM YYYY");if(!date)return null}else{text=matchedTokens[4]+" "+matchedTokens[10];date=moment(text,"DD MMMM");if(!date)return null;impliedComponents.push("year");date.year(moment(ref).year());var nextYear=date.clone().add("y",1);var lastYear=date.clone().add("y",-1);if(Math.abs(nextYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=nextYear}else if(Math.abs(lastYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=lastYear}}if(matchedTokens[3])dayOfWeek=DAYS_OFFSET[matchedTokens[3].toLowerCase()];if(matchedTokens[8]){var endDay=parseInt(matchedTokens[8]);var startDay=parseInt(matchedTokens[4]);var endDate=date.clone();date.date(startDay);endDate.date(endDay);if(date.format("D")!=matchedTokens[4])return null;if(endDate.format("D")!=matchedTokens[8])return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek,impliedComponents:impliedComponents},end:{day:endDate.date(),month:endDate.month(),year:endDate.year(),impliedComponents:impliedComponents}})}else{if(date.format("D")!=matchedTokens[4])return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek,impliedComponents:impliedComponents}})}};var baseExtractTime=parser.extractTime;parser.extractTime=function(text,result){var DAY_OF_WEEK_SUFFIX_PATTERN=/(\,|\(|\s)*(Sun|Sunday|Mon|Monday|Tue|Tuesday|Wed|Wednesday|Thur|Thursday|Fri|Friday|Sat|Saturday)(\,|\)|\s)*/i;if(text.length<=result.index+result.text.length)return null;var suffix_text=text.substr(result.index+result.text.length);var matchedTokens=suffix_text.match(DAY_OF_WEEK_SUFFIX_PATTERN);if(matchedTokens&&suffix_text.indexOf(matchedTokens[0])==0){result.text=result.text+matchedTokens[0]}return baseExtractTime.call(this,text,result)};return parser}chrono.parsers.MonthNameLittleEndianParser=MonthNameLittleEndianParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var DAYS_OFFSET={sunday:0,sun:0,monday:1,mon:1,tuesday:2,tue:2,wednesday:3,wed:3,thursday:4,thur:4,thu:4,friday:5,fri:5,saturday:6,sat:6};var regFullPattern=/(\W|^)((Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s*,?\s*)?(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s*(([0-9]{1,2})(st|nd|rd|th)?\s*(to|\-)\s*)?([0-9]{1,2})(st|nd|rd|th)?(,)?(\s*[0-9]{4})(\s*BE)?(\W|$)/i;var regShortPattern=/(\W|^)((Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s*,?\s*)?(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s*(([0-9]{1,2})(st|nd|rd|th)?\s*(to|\-)\s*)?([0-9]{1,2})(st|nd|rd|th)?([^0-9]|$)/i;function MonthNameMiddleEndianParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return regShortPattern};parser.extract=function(text,index){var impliedComponents=[];var date=null;var dayOfWeek=null;var originalText="";text=text.substr(index);var matchedTokens=text.match(regFullPattern);if(matchedTokens&&text.indexOf(matchedTokens[0])==0){var text=matchedTokens[0];text=text.substring(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[14].length);index=index+matchedTokens[1].length;originalText=text;text=text.replace(matchedTokens[2],"");text=text.replace(matchedTokens[4],matchedTokens[4]+" ");if(matchedTokens[5])text=text.replace(matchedTokens[5],"");if(matchedTokens[10])text=text.replace(matchedTokens[10],"");if(matchedTokens[11])text=text.replace(","," ");if(matchedTokens[13]){var years=matchedTokens[12];years=" "+(parseInt(years)-543);text=text.replace(matchedTokens[13],"");text=text.replace(matchedTokens[12],years)}text=text.replace(matchedTokens[9],parseInt(matchedTokens[9])+"");date=moment(text,"MMMM DD YYYY");if(!date)return null}else{matchedTokens=text.match(regShortPattern);if(!matchedTokens)return null;var text=matchedTokens[0];text=text.substring(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[11].length);index=index+matchedTokens[1].length;originalText=text;text=text.replace(matchedTokens[2],"");text=text.replace(matchedTokens[4],matchedTokens[4]+" ");if(matchedTokens[4])text=text.replace(matchedTokens[5],"");date=moment(text,"MMMM DD");if(!date)return null;impliedComponents.push("year");date.year(moment(ref).year());var nextYear=date.clone().add("y",1);var lastYear=date.clone().add("y",-1);if(Math.abs(nextYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=nextYear}else if(Math.abs(lastYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=lastYear}}if(matchedTokens[3])dayOfWeek=DAYS_OFFSET[matchedTokens[3].toLowerCase()];if(matchedTokens[5]){var endDay=parseInt(matchedTokens[9]);var startDay=parseInt(matchedTokens[6]);var endDate=date.clone();date.date(startDay);endDate.date(endDay);if(date.format("D")!=matchedTokens[6])return null;if(endDate.format("D")!=matchedTokens[9])return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek,impliedComponents:impliedComponents},end:{day:endDate.date(),month:endDate.month(),year:endDate.year(),impliedComponents:impliedComponents}})}else{if(date.format("D")!=parseInt(matchedTokens[9])+"")return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek,impliedComponents:impliedComponents}})}};var baseExtractTime=parser.extractTime;parser.extractTime=function(text,result){var DAY_OF_WEEK_SUFFIX_PATTERN=/(\,|\(|\s)*(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Wed|Thu|Fri|Sat)(\,|\)|\s)*/i;if(text.length<=result.index+result.text.length)return null;var suffix_text=text.substr(result.index+result.text.length,15);var matchedTokens=suffix_text.match(DAY_OF_WEEK_SUFFIX_PATTERN);if(matchedTokens&&suffix_text.indexOf(matchedTokens[0])==0){result.text=result.text+matchedTokens[0];var dayOfWeek=DAYS_OFFSET[matchedTokens[2].toLowerCase()];result.start.dayOfWeek=dayOfWeek}if(!result.start.impliedComponents||result.start.impliedComponents.indexOf("year")<0)return baseExtractTime.call(this,text,result);var YEAR_SUFFIX_PATTERN=/(\s*[0-9]{4})(\s*BE)?/i;if(text.length<=result.index+result.text.length)return null;var suffix_text=text.substr(result.index+result.text.length,15);var matchedTokens=suffix_text.match(YEAR_SUFFIX_PATTERN);if(matchedTokens&&suffix_text.indexOf(matchedTokens[0])==0){var years=matchedTokens[1];years=parseInt(years);if(years<100){if(years>20)years=null;else years=years+2e3}else if(matchedTokens[2]){years=years-543}var index=result.start.impliedComponents.indexOf("year");result.start.impliedComponents.splice(index,1);result.start.year=years;result.text=result.text+matchedTokens[0]}return baseExtractTime.call(this,text,result)};return parser
}chrono.parsers.MonthNameMiddleEndianParser=MonthNameMiddleEndianParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var DAYS_OFFSET={sunday:0,sun:0,monday:1,mon:1,tuesday:2,wednesday:3,wed:3,thursday:4,thur:4,friday:5,fri:5,saturday:6,sat:6};var PATTERN=/(\W|^)(Sun|Sunday|Mon|Monday|Tue|Tuesday|Wed|Wednesday|Thur|Thursday|Fri|Friday|Sat|Saturday)?\s*\,?\s*([0-9]{1,2})[\/\.]([0-9]{1,2})([\/\.]([0-9]{4}|[0-9]{2}))?(\W|$)/i;function SlashParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var matchedTokens=text.substr(index).match(PATTERN);if(matchedTokens==null)return;if(matchedTokens[1]=="/"||matchedTokens[7]=="/")return;var text=matchedTokens[0].substr(matchedTokens[1].length,matchedTokens[0].length-matchedTokens[7].length);var orginalText=text;if(text.match(/^\d.\d$/))return;index+=matchedTokens[1].length;if(!matchedTokens[6]&&matchedTokens[0].indexOf("/")<0)return;var date=null;var years=matchedTokens[6]||moment(ref).year()+"";var month=matchedTokens[3];var day=matchedTokens[4];var dayOfWeek=null;if(matchedTokens[2])dayOfWeek=DAYS_OFFSET[matchedTokens[2].toLowerCase()];month=parseInt(month);day=parseInt(day);years=parseInt(years);if(month<1||month>12)return null;if(day<1||day>31)return null;if(years<100){if(years>50){years=years+2500-543}else{years=years+2e3}}text=month+"/"+day+"/"+years;date=moment(text,"M/D/YYYY");if(!date||date.date()!=day){date=moment(text,"D/M/YYYY");if(!date||date.date()!=month)return null}return new chrono.ParseResult({referenceDate:ref,text:orginalText,index:index,start:{day:date.date(),month:date.month(),year:date.year(),dayOfWeek:dayOfWeek}})};return parser}chrono.parsers.SlashParser=SlashParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/(วัน)?(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์)(หน้า|นี้|ที่แล้ว|.|$)/i;var DAYS_OFFSET={อาทิตย์:0,จันทร์:1,อังคาร:2,พุธ:3,พฤหัสบดี:4,ศุกร์:5,เสาร์:6};function THDayOfWeekParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.parsers.THGeneralDateParser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var matchedTokens=text.substr(index).match(PATTERN);if(matchedTokens==null)return;var text=matchedTokens[0];var dayOfWeek=matchedTokens[2];dayOfWeek=dayOfWeek.toLowerCase();var offset=DAYS_OFFSET[dayOfWeek];if(offset===undefined)return null;var date=moment(ref).clone();var suffix=matchedTokens[3];if(suffix=="นี้"){date.day(offset)}else if(suffix=="หน้า"){date.day(offset+7)}else if(suffix=="ที่แล้ว"){date.day(offset-7)}else{date.day(offset);text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[3].length)}return new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year()}})};return parser}chrono.parsers.THDayOfWeekParser=THDayOfWeekParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/(วันนี้|พรุ่งนี้|เมื่อวาน|เมื่อคืน|([1-9]+)\s*(วัน|คืน)(ก่อน|ที่แล้ว))(\W|$)/i;function THGeneralDateParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(full_text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var matchedTokens=full_text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0].toLowerCase();text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[5].length);var date=null;if(text=="วันนี้")date=moment(ref).clone();else if(text=="พรุ่งนี้")date=moment(ref).clone().add("d",1);else if(text=="เมื่อวาน")date=moment(ref).clone().add("d",-1);else if(text=="เมื่อคืน")date=moment(ref).clone().add("d",-1);else{var days_ago=matchedTokens[2];days_ago=parseInt(days_ago);date=moment(ref).clone().add("d",-days_ago)}var result=new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year()}});var resultWithTime=parser.extractTime(full_text,result);result=resultWithTime||result;if(text.match("คืน")){if(!resultWithTime){result.start.day=date.date()+1;result.start.hour=0;result.start.minute=0;result.start.second=0;result=new chrono.ParseResult(result)}else if(resultWithTime.start.hour<12){date.add("d",1);result.start.day=date.date();result.start.month=date.month();result.start.year=date.year();result=new chrono.ParseResult(result)}}return result};return parser}chrono.parsers.THGeneralDateParser=THGeneralDateParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var regFullPattern=/([0-9]{1,2})(\s*(ถึง|\-)?\s*([0-9]{1,2}))?\s+(มกราคม|ม.ค.|กุมภาพัน|ก.พ.|มีนาคม|มี.ค.|เมษายน|เม.ย.|พฤษภาคม|พ.ค.|มิถุนายน|ม.ย.|มิ.ย.|กรกฎาคม|ก.ค.|สิงหาคม|ส.ค.|กันยายน|ก.ย.|ตุลาคม|ต.ค.|พฤศจิกายน|พ.ย.|ธันวาคม|ธ.ค.)(พ.ศ.|ค.ศ.)?(\s+[0-9]{2,4})(\W|$)/i;var regShortPattern=/([0-9]{1,2})(\s*(ถึง|\-)?\s*([0-9]{1,2}))?\s+(มกราคม|ม.ค.|กุมภาพัน|ก.พ.|มีนาคม|มี.ค.|เมษายน|เม.ย.|พฤษภาคม|พ.ค.|มิถุนายน|ม.ย.|มิ.ย.|กรกฏาคม|ก.ค.|สิงหาคม|ส.ค.|กันยายน|ก.ย.|ตุลาคม|ต.ค.|พฤศจิกายน|พ.ย.|ธันวาคม|ธ.ค.)(\W|$)/i;var momthTranslation={มกราคม:0,"ม.ค.":0,กุมภาพัน:1,"ก.พ.":1,มีนาคม:2,"มี.ค.":2,เมษายน:3,"เม.ย.":4,พฤษภาคม:4,"พ.ค.":4,มิถุนายน:5,"มิ.ย.":5,กรกฎาคม:6,"ก.ค.":6,สิงหาคม:7,"ส.ค.":7,กันยายน:8,"ก.ย.":8,ตุลาคม:9,"ต.ค.":9,พฤศจิกายน:10,"พ.ย.":10,ธันวาคม:11,"ธ.ค.":11};function THMonthNameLittleEndianParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.parsers.THGeneralDateParser(text,ref,opt);parser.pattern=function(){return regShortPattern};parser.extract=function(text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var date=null;text=text.substr(index);originalText=text;var matchedTokens=text.match(regFullPattern);if(matchedTokens&&text.indexOf(matchedTokens[0])==0){text=matchedTokens[0];text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[8].length);originalText=text;var years=matchedTokens[7];years=parseInt(years);if(matchedTokens[3]&&matchedTokens[3]=="ค.ศ."){if(years<=30)years=years+2e3;else if(years<100)years=years+1900}else{if(years<543)years=years+2500;years=years-543}var months=momthTranslation[matchedTokens[5]];if(typeof months!="number")return null;var days=matchedTokens[1];days=parseInt(days);var formatedText=years+"-"+(months+1)+"-"+days;var date=moment(formatedText,"YYYY-MM-DD");if(date.format("YYYY-M-D")!=formatedText){return null}}else{matchedTokens=text.match(regShortPattern);if(!matchedTokens)return null;var text=matchedTokens[0];text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[6].length);originalText=text;var months=momthTranslation[matchedTokens[5]];if(typeof months!="number")return null;var days=matchedTokens[1];days=parseInt(days);var formatedText=months+1+"-"+days;var date=moment(formatedText,"MM-DD");if(date.format("M-D")!=formatedText){return null}date.year(moment(ref).year());var nextYear=date.clone().add("y",1);var lastYear=date.clone().add("y",-1);if(Math.abs(nextYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=nextYear}else if(Math.abs(lastYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=lastYear}}if(matchedTokens[4]){var endDay=parseInt(matchedTokens[4]);var startDay=parseInt(matchedTokens[1]);var endDate=date.clone();date.date(startDay);endDate.date(endDay);if(date.format("D")!=matchedTokens[1])return null;if(endDate.format("D")!=matchedTokens[4])return null;return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year()},end:{day:endDate.date(),month:endDate.month(),year:endDate.year()}})}return new chrono.ParseResult({referenceDate:ref,text:originalText,index:index,start:{day:date.date(),month:date.month(),year:date.year()}})};return parser}chrono.parsers.THMonthNameLittleEndianParser=THMonthNameLittleEndianParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/(今日|昨日|明日|([1-9]+)\s*日前)(\W|$)/i;function JPGeneralDateParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.Parser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(full_text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var matchedTokens=full_text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0].toLowerCase();text=matchedTokens[0].substr(0,matchedTokens[0].length-matchedTokens[3].length);var date=null;if(text=="今日")date=moment(ref).clone();else if(text=="明日")date=moment(ref).clone().add("d",1);else if(text=="昨日")date=moment(ref).clone().add("d",-1);else{var days_ago=matchedTokens[2];days_ago=parseInt(days_ago);date=moment(ref).clone().add("d",-days_ago)}var result=new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year()}});var resultWithTime=parser.extractTime(full_text,result);result=resultWithTime||result;return result};var baseExtractTime=parser.extractTime;parser.extractTime=function(text,result){var baseResult=baseExtractTime.call(this,text,result);if(baseResult)return baseResult;var SUFFIX_PATTERN=/\s*(午前|午後)?\s*([0-9]{1,2})時?(([0-9]{1,2})分)?/i;if(text.length<=result.index+result.text.length)return null;text=text.substr(result.index+result.text.length);var matchedTokens=text.match(SUFFIX_PATTERN);if(!matchedTokens||text.indexOf(matchedTokens[0])!=0)return null;var minute=0;var second=0;var hour=matchedTokens[2];hour=parseInt(hour);if(matchedTokens[1]){if(hour>12)return null;if(matchedTokens[1]=="午後"){hour+=12}}if(matchedTokens[4]){minute=matchedTokens[4];minute=parseInt(minute);if(minute>=60)return null}result.text=result.text+matchedTokens[0];if(result.start.hour==undefined){result.start.hour=hour;result.start.minute=minute;result.start.second=second}if(result.end&&result.end.hour==undefined){result.end.hour=hour;result.end.minute=minute;result.end.second=second}return new chrono.ParseResult(result)};return parser}chrono.parsers.JPGeneralDateParser=JPGeneralDateParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";var PATTERN=/((同|((平成)?([0-9０-９]{2,4})))年\s*)?([0-9０-９]{1,2})月\s*([0-9０-９]{1,2})日/i;function cleanZengakuNumber(str){var cleanStr=str;cleanStr=cleanStr.replace(/０/g,"0");cleanStr=cleanStr.replace(/１/g,"1");cleanStr=cleanStr.replace(/２/g,"2");cleanStr=cleanStr.replace(/３/g,"3");cleanStr=cleanStr.replace(/４/g,"4");cleanStr=cleanStr.replace(/５/g,"5");cleanStr=cleanStr.replace(/６/g,"6");cleanStr=cleanStr.replace(/７/g,"7");cleanStr=cleanStr.replace(/８/g,"8");cleanStr=cleanStr.replace(/９/g,"9");return cleanStr}function JPStandardDateParser(text,ref,opt){opt=opt||{};ref=ref||new Date;var parser=chrono.parsers.JPGeneralDateParser(text,ref,opt);parser.pattern=function(){return PATTERN};parser.extract=function(full_text,index){var results=this.results();var lastResult=results[results.length-1];if(lastResult){if(index<lastResult.index+lastResult.text.length)return null}var matchedTokens=full_text.substr(index).match(PATTERN);if(matchedTokens==null){finished=true;return}var text=matchedTokens[0].toLowerCase();var date=null;text=matchedTokens[0];var months=matchedTokens[6];months=cleanZengakuNumber(months);months=parseInt(months);if(!months||months==NaN)return null;var days=matchedTokens[7];days=cleanZengakuNumber(days);days=parseInt(days);if(!days||days==NaN)return null;var years=matchedTokens[5];if(years){years=cleanZengakuNumber(years);years=parseInt(years)}if(years&&years!==NaN){if(matchedTokens[4]=="平成"){years=years+1989}else if(years<100){years=years+2e3}var dateText=years+"-"+months+"-"+days;date=moment(dateText,"YYYY-MM-DD");if(date.format("YYYY-M-D")!=dateText)return null}else{var dateText=months+"-"+days;date=moment(dateText,"MM-DD");date.year(moment(ref).year());var nextYear=date.clone().add("y",1);var lastYear=date.clone().add("y",-1);if(Math.abs(nextYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=nextYear}else if(Math.abs(lastYear.diff(moment(ref)))<Math.abs(date.diff(moment(ref)))){date=lastYear}}var result=new chrono.ParseResult({referenceDate:ref,text:text,index:index,start:{day:date.date(),month:date.month(),year:date.year()}});var resultWithTime=parser.extractTime(full_text,result);result=resultWithTime||result;return result};var baseExtractTime=parser.extractTime;parser.extractTime=function(text,result){var DAY_OF_WEEK_SUFFIX_PATTERN=/(\,|\(|（|\s)*(月|火|水|木|金|土|日)(曜日|曜)?\s*(\,|）|\))/i;if(text.length<=result.index+result.text.length)return null;var suffix_text=text.substr(result.index+result.text.length);var matchedTokens=suffix_text.match(DAY_OF_WEEK_SUFFIX_PATTERN);if(matchedTokens&&suffix_text.indexOf(matchedTokens[0])==0){result.text=result.text+matchedTokens[0]}return baseExtractTime.call(this,text,result)};return parser}chrono.parsers.JPStandardDateParser=JPStandardDateParser})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function integratedRefine(text,results,opt){var orderedRefiners={};for(var name in this.refiners){var refiner=this.refiners[name];var order=refiner.order||0;orderedRefiners[order]=orderedRefiners[order]||[];orderedRefiners[order].push(refiner)}for(var order in orderedRefiners){orderedRefiners[order].forEach(function(refiner){results=refiner.refine(text,results,opt)})}return results}chrono.integratedRefine=integratedRefine})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function MergeComponentsRefine(text,results,opt){if(results.length<2)return results;var new_results=[];for(var i=0;i<results.length-1;i++){var refResult=results[i+1];var result=results[i];var textBetween=text.substring(result.index+result.text.length,refResult.index);var OVERLAP_PATTERN=/^\s*(of|on|\W)?\s*$/i;if(!textBetween.match(OVERLAP_PATTERN)){new_results.push(result);continue}if(result.start.hour===undefined){if(refResult.start.hour===undefined){new_results.push(result);continue}var dateComponents=new Object(result.start);var timeComponents=new Object(refResult.start)}else{if(refResult.start.hour!==undefined){new_results.push(result);continue}var timeComponents=new Object(result.start);var dateComponents=new Object(refResult.start)}dateComponents.hour=timeComponents.hour;dateComponents.minute=timeComponents.minute;dateComponents.second=timeComponents.second;dateComponents.meridiem=timeComponents.meridiem;dateComponents.impliedComponents=dateComponents.impliedComponents||[];result.start=new chrono.DateComponents(dateComponents);if(result.end||refResult.end){if(result.start.hour!==undefined){timeComponents=result.end||timeComponents;dateComponents=refResult.end||dateComponents}else{dateComponents=result.end||dateComponents;timeComponents=refResult.end||timeComponents}dateComponents.hour=timeComponents.hour;dateComponents.minute=timeComponents.minute;dateComponents.second=timeComponents.second;dateComponents.impliedComponents=dateComponents.impliedComponents||[];result.end=new chrono.DateComponents(dateComponents)}result.text=result.text+textBetween+refResult.text;new_results.push(new chrono.ParseResult(result));i++}if(i<results.length)new_results.push(results[i]);return new_results}chrono.refiners.MergeComponentsRefine={refine:MergeComponentsRefine}})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function MissingComponentsRefine(text,results,opt){if(results.length<2)return results;for(var i=0;i<results.length;i++){var refResult=null;var result=results[i];if(!results[i+1])refResult=results[i-1];else if(!results[i-1])refResult=results[i+1];else{var nextResult=results[i+1];var distanceNextResult=nextResult.index-(result.index+result.text.length);var prevResult=results[i-1];var distancePrevResult=result.index-(prevResult.index+prevResult.text.length);if(distancePrevResult>distanceNextResult)refResult=nextResult;else refResult=prevResult}var impliedComponents=result.start.impliedComponents||[];var refImpliedComponents=refResult.start.impliedComponents||[];if(result.start.hour===undefined)impliedComponents.push("hour");if(result.start.minute===undefined)impliedComponents.push("minute");impliedComponents.forEach(function(component){if(refResult.start.isCertain(component)){result.start.imply(component,refResult.start[component])}});result.startDate=result.start.date();if(!result.start.isCertain("day")&&!result.start.isCertain("month")&&result.start.isCertain("dayOfWeek")){var date=moment(result.start.date());date.day(result.start.dayOfWeek);result.start.day=date.date();result.start.month=date.month()}if(result.start.dayOfWeek===undefined||impliedComponents.indexOf("dayOfWeek")>=0){var date=moment(result.start.date());result.start.imply("dayOfWeek",date.day())}result.startDate=result.start.date()}return results}chrono.refiners.MissingComponentsRefiner={refine:MissingComponentsRefine,order:500}})();(function(){if(typeof chrono=="undefined")throw"Cannot find the chrono main module";function RemoveReplicateRefine(text,results,opt){var improved_results=[];var PREFIX_TYPO_PATTERN=/(\W)\s*$/;var SUFFIX_TYPO_PATTERN=/^\s*(\W)/;for(var i=0;i<results.length;i++){appendResults(improved_results,results[i])}return improved_results}function appendResults(results,newResult){var index=0;while(index<results.length&&results[index].index<newResult.index)index++;if(index<results.length){var overlapped_index=index;while(overlapped_index<results.length&&results[overlapped_index].index<newResult.index+newResult.text.length){if(results[overlapped_index].text.length>=newResult.text.length)return results;overlapped_index++}results.splice(index,overlapped_index-index)}if(index-1>=0){var oldResult=results[index-1];if(newResult.index<oldResult.index+oldResult.text.length){if(oldResult.text.length>=newResult.text.length)return results;else{results.splice(index-1,1);index=index-1}}}results.splice(index,0,newResult);return results}chrono.refiners.RemoveReplicateRefiner={refine:RemoveReplicateRefine,order:1e3}})()})();;// loaded after editables.js
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
;Spirit.Models.Post = Backbone.Model.extend({

    idAttribute : '_id',
    
    urlRoot: '/post',

    validate: function(attrs) {
      // [TODO] validation needed
    },
    
    initialize: function( options ) {
      //this.fetch()
      this.on('invalid', this.invalid )
    }, 

    invalid : function( model, error ) {
      alert(error) 
    },

})
;Spirit.Router = Backbone.Router.extend({

  routes : {
    "post/:id" : "post"
  },

  initialize : function(options) {},

  post : function(id) {
    Spirit.live.post.model.set({_id:id})
  }

})
;Spirit.Views.Post =  Backbone.View.extend({

    el : '.spirit-bar', 

    events : {
      'click a.save'    : 'save' ,
      'click a.delete'  : 'delete',
      'click a.publish' : 'publish',
    },

    initialize : function(options) {
      _.bindAll(this, 'save', 'delete', 'publish', 'notify' ) 
      this.model.on( 'sync', this.notify )
      this.model.on( 'destroy', this.navigate )
      this.$form = $('form.post')
    },

    // [TODO] use a router instead?
    navigate : function() {
      window.location = '/'
    },

    notify : function( model, response ) {
      Spirit.Notify.message( 'post saved' )
    },

    save : function(e) {
      e.preventDefault()
      var formdata = this.$form.serializeJSON()
      this.model.save( formdata , { wait: true } ) 
    },

    delete: function(e) {
      this.model.destroy({ wait: true }) 
    },

    publish: function(e) {
      e.preventDefault()   
      this.$form.find('.status').val( 'published' )
      this.save()
    }

})
;Spirit.Views.Editable = Backbone.View.extend({

    template : '<textarea id="textarea-<%= id %>" name="<%= id %>" class="hidden mirror"><%= content %></textarea>',

    defaults : {
      disableHtml : false 
    },

    events : {
      'input' : 'mirror'
    },

    initialize: function( options ) {
      _.extend( this.defaults, options )
      _.bindAll( this, 'textarea' )
      this.render()
    },

    render : function() {
      this.editor()
      this.textarea()
    },

    editor : function() {
      this.editor = new MediumEditor( '#' + this.el.id )
      this.$el.mediumInsert( { 
        editor              : this.editor,
        imagesUploadScript  : '/upload' 
      })
    },

    textarea : function( el, index ) {

      var textarea = _.template( this.template, { 
        id: this.$el.attr('id'),
        content : this.$el.html() 
      } )

      this.$el.after( textarea ) 
    },

    mirror: function(e) {
      var content = this.editor.serialize()[e.target.id].value
      if ( this.defaults.disableHtml ) 
        content = $(content).html()
      $( '#textarea-'+e.target.id ).val( content )
    }
  
})
;Spirit.Views.Date =  Backbone.View.extend({

  el: '.date',

  events: {
    'input' : 'parse',
    'blur'  : 'date'
  },

  parse: _.debounce( function( e ) {
    var parsed = chrono.parseDate( e.currentTarget.innerHTML )
    if ( moment( parsed ).isValid() ) 
      $('.timestamp').val( parsed )
  }, 100 ),

  date : function(e) {
    var date = $('.timestamp').val() 
    this.$el.html( moment(date).format('MMMM Do YYYY, h:mm a'))
  },

  initialize: function( options ) {
    this.date()
  }

})  
;window.Spirit = Spirit || {}

Spirit.Notify = {

  View : Backbone.View.extend({

    defaults : {
      message : '',
      duration : 700,
      delay    : 500
    },

    el : '.notification',
  
    initialize : function( options ) {
      _.bindAll(this, 'animate', 'out', 'reset')
      this.options = _.defaults( options || {}, this.defaults );
      this.render()
    },

    render : function() {
      this.$el.html( this.options.message ) 
      this.animate()
    },

    animate : function() {
      this.$el.animate({ bottom: 0, opacity: 1 }, this.options.duration , this.out )
    },

    out: function() {
      this.$el.delay( this.options.delay ).animate({ bottom: 40, opacity: 0 }, this.options.duration , this.reset )
    },

    reset : function() {
      this.$el.css({ bottom:-30 })   
    }
  
  }),

  message : function(message) {
    var options = _.extend({}, {message : message })
    new this.View( options ) 
  }

}
