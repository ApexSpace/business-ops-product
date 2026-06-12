(function (global) {
  var RESIZE = "form-embed-widget:resize";
  var LAYOUT_TYPES = { heading: 1, paragraph: 1, divider: 1, spacer: 1, image: 1 };

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function asString(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
  }

  function isEmpty(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "boolean") return value === false;
    return false;
  }

  function flattenFields(fields) {
    var flattened = [];
    function walk(items) {
      (items || []).forEach(function (field) {
        if (!field || typeof field !== "object" || Array.isArray(field)) return;
        var type = field.type || "text";
        if (type === "columns" && Array.isArray(field.columns)) {
          field.columns.forEach(function (column) {
            if (Array.isArray(column)) walk(column);
          });
          return;
        }
        if (LAYOUT_TYPES[type]) return;
        if (type === "name") {
          var base = field.name;
          if (!base) return;
          if (field.showFirstName !== false) flattened.push({ name: base + "_first", type: "text", label: "First name", validation: field.validation || {} });
          if (field.showMiddleName) flattened.push({ name: base + "_middle", type: "text", label: "Middle name", validation: field.validation || {} });
          if (field.showLastName !== false) flattened.push({ name: base + "_last", type: "text", label: "Last name", validation: field.validation || {} });
          return;
        }
        if (type === "address") {
          var addressBase = field.name;
          if (!addressBase) return;
          ["street", "city", "state", "zip", "country"].forEach(function (part) {
            flattened.push({ name: addressBase + "_" + part, type: "text", label: part, validation: field.validation || {} });
          });
          return;
        }
        flattened.push(field);
      });
    }
    walk(fields);
    return flattened;
  }

  function validateField(field, value) {
    var validation = asObject(field.validation);
    var label = field.label || "This field";
    var type = field.type || "text";
    if (validation.required && isEmpty(value)) {
      return validation.customMessage || label + " is required";
    }
    if (isEmpty(value)) return null;
    var stringValue = asString(value);
    if (typeof validation.minLength === "number" && stringValue.length < validation.minLength) {
      return label + " must be at least " + validation.minLength + " characters";
    }
    if (typeof validation.maxLength === "number" && stringValue.length > validation.maxLength) {
      return label + " must be at most " + validation.maxLength + " characters";
    }
    if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
      return label + " must be a valid email address";
    }
    if (type === "website") {
      try {
        var url = new URL(stringValue.indexOf("http") === 0 ? stringValue : "https://" + stringValue);
        if (!url.hostname) return label + " must be a valid URL";
      } catch (e) {
        return label + " must be a valid URL";
      }
    }
    if (validation.pattern) {
      try {
        if (!new RegExp(validation.pattern).test(stringValue)) {
          return validation.patternMessage || label + " is invalid";
        }
      } catch (e) {}
    }
    return null;
  }

  function collectFormData(form, fields) {
    var data = {};
    flattenFields(fields).forEach(function (field) {
      var name = field.name;
      if (!name) return;
      var type = field.type || "text";
      if (type === "checkbox") {
        var options = field.options || [];
        if (options.length > 0) {
          data[name] = options
            .map(function (opt) { return asString(opt.value || opt.label); })
            .filter(function (optValue) {
              var input = form.querySelector('[name="' + name + '"][value="' + optValue + '"]');
              return input && input.checked;
            });
        } else {
          var checkbox = form.querySelector('[name="' + name + '"]');
          data[name] = !!(checkbox && checkbox.checked);
        }
        return;
      }
      if (type === "multiselect") {
        var select = form.querySelector('[name="' + name + '"]');
        data[name] = select ? Array.prototype.map.call(select.selectedOptions || [], function (opt) { return opt.value; }) : [];
        return;
      }
      if (type === "radio") {
        var checked = form.querySelector('[name="' + name + '"]:checked');
        data[name] = checked ? checked.value : "";
        return;
      }
      if (type === "toggle") {
        var toggle = form.querySelector('[name="' + name + '"]');
        data[name] = !!(toggle && toggle.checked);
        return;
      }
      if (type === "hidden") {
        var hidden = form.querySelector('[name="' + name + '"]');
        data[name] = hidden ? hidden.value : asString(field.hiddenValue || field.defaultValue || "");
        return;
      }
      var input = form.querySelector('[name="' + name + '"]');
      data[name] = input ? input.value : "";
    });
    return data;
  }

  function validateForm(form, fields) {
    var data = collectFormData(form, fields);
    var errors = {};
    flattenFields(fields).forEach(function (field) {
      var message = validateField(field, data[field.name]);
      if (message) errors[field.name] = message;
    });
    return { data: data, errors: errors };
  }

  function api(base, path, options) {
    return fetch(base + path, Object.assign({
      headers: { "Content-Type": "application/json" },
    }, options || {})).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) {
          var error = new Error((body && body.message) || "Request failed");
          error.body = body;
          throw error;
        }
        return body.data !== undefined ? body.data : body;
      });
    });
  }

  function radiusClass(value) {
    if (value === "full") return "999px";
    if (value === "lg") return "12px";
    if (value === "md") return "8px";
    if (value === "sm") return "4px";
    return "0";
  }

  function widthStyle(width) {
    if (width === "half" || width === 50) return "50%";
    if (width === 100 || width === "full") return "100%";
    if (typeof width === "number") return width + "%";
    return "100%";
  }

  function renderField(field, settings) {
    var type = field.type || "text";
    var validation = asObject(field.validation);
    var wrap = document.createElement("div");
    wrap.className = "field";
    wrap.dataset.fieldName = field.name || "";
    wrap.style.width = widthStyle(field.style && field.style.width);
    wrap.style.marginBottom = ((field.style && field.style.marginBottom) || 16) + "px";

    if (type === "heading") {
      var heading = document.createElement(field.level === 3 ? "h3" : field.level === 4 ? "h4" : "h2");
      heading.className = "layout-heading";
      heading.textContent = field.content || field.label || "";
      wrap.appendChild(heading);
      return wrap;
    }
    if (type === "paragraph") {
      var para = document.createElement("p");
      para.className = "layout-paragraph";
      para.textContent = field.content || "";
      wrap.appendChild(para);
      return wrap;
    }
    if (type === "divider") {
      wrap.appendChild(document.createElement("hr"));
      return wrap;
    }
    if (type === "spacer") {
      var spacer = document.createElement("div");
      spacer.style.height = (field.spacerHeight || 16) + "px";
      wrap.appendChild(spacer);
      return wrap;
    }

    if (type === "name") {
      var nameBase = field.name;
      if (!nameBase) return wrap;
      if (field.showFirstName !== false) wrap.appendChild(renderField({ type: "text", name: nameBase + "_first", label: "First name", placeholder: "First name", validation: validation }, settings));
      if (field.showMiddleName) wrap.appendChild(renderField({ type: "text", name: nameBase + "_middle", label: "Middle name", placeholder: "Middle name", validation: validation }, settings));
      if (field.showLastName !== false) wrap.appendChild(renderField({ type: "text", name: nameBase + "_last", label: "Last name", placeholder: "Last name", validation: validation }, settings));
      return wrap;
    }

    if (type === "address") {
      var addressBase = field.name;
      if (!addressBase) return wrap;
      [
        ["street", "Street address"],
        ["city", "City"],
        ["state", "State"],
        ["zip", "ZIP code"],
        ["country", "Country"],
      ].forEach(function (pair) {
        wrap.appendChild(renderField({ type: "text", name: addressBase + "_" + pair[0], label: pair[1], placeholder: pair[1], validation: validation }, settings));
      });
      return wrap;
    }

    if (type !== "hidden") {
      var label = document.createElement("label");
      label.textContent = field.label || "";
      if (settings.showRequiredIndicator && validation.required) {
        var req = document.createElement("span");
        req.className = "req";
        req.textContent = " *";
        label.appendChild(req);
      }
      wrap.appendChild(label);
    }

    var control;
    if (type === "textarea") {
      control = document.createElement("textarea");
      control.rows = field.rows || 4;
    } else if (type === "select") {
      control = document.createElement("select");
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = field.placeholder || "Select an option";
      placeholder.disabled = true;
      placeholder.selected = true;
      control.appendChild(placeholder);
      (field.options || []).forEach(function (opt) {
        var option = document.createElement("option");
        option.value = asString(opt.value || opt.label);
        option.textContent = opt.label || opt.value || "";
        control.appendChild(option);
      });
    } else if (type === "multiselect") {
      control = document.createElement("select");
      control.multiple = true;
      (field.options || []).forEach(function (opt) {
        var option = document.createElement("option");
        option.value = asString(opt.value || opt.label);
        option.textContent = opt.label || opt.value || "";
        control.appendChild(option);
      });
    } else if (type === "radio") {
      (field.options || []).forEach(function (opt) {
        var row = document.createElement("label");
        row.className = "radio-row";
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = field.name;
        radio.value = asString(opt.value || opt.label);
        row.appendChild(radio);
        row.appendChild(document.createTextNode(opt.label || opt.value || ""));
        wrap.appendChild(row);
      });
      control = null;
    } else if (type === "checkbox") {
      var options = field.options || [];
      if (options.length > 0) {
        options.forEach(function (opt) {
          var row = document.createElement("label");
          row.className = "checkbox-row";
          var checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.name = field.name;
          checkbox.value = asString(opt.value || opt.label);
          row.appendChild(checkbox);
          row.appendChild(document.createTextNode(opt.label || opt.value || ""));
          wrap.appendChild(row);
        });
        control = null;
      } else {
        control = document.createElement("input");
        control.type = "checkbox";
      }
    } else {
      control = document.createElement("input");
      if (type === "email") control.type = "email";
      else if (type === "password") control.type = "password";
      else if (type === "number" || type === "range" || type === "rating") control.type = "number";
      else if (type === "phone") control.type = "tel";
      else if (type === "date") control.type = "date";
      else if (type === "time") control.type = "time";
      else if (type === "datetime") control.type = "datetime-local";
      else if (type === "website") control.type = "url";
      else if (type === "hidden") control.type = "hidden";
      else control.type = "text";
      if (field.defaultValue != null && type !== "hidden") control.value = asString(field.defaultValue);
      if (type === "hidden") control.value = asString(field.hiddenValue || field.defaultValue || "");
      if (type === "number" || type === "range" || type === "rating") {
        if (validation.min != null) control.min = String(validation.min);
        if (validation.max != null) control.max = String(validation.max);
      }
    }

    if (control) {
      if (field.name) control.name = field.name;
      if (field.placeholder && control.type !== "hidden") control.placeholder = field.placeholder;
      if (validation.required) control.required = true;
      if (validation.minLength != null) control.minLength = validation.minLength;
      if (validation.maxLength != null) control.maxLength = validation.maxLength;
      if (field.style && field.style.inputBgColor) control.style.background = field.style.inputBgColor;
      if (field.style && field.style.inputTextColor) control.style.color = field.style.inputTextColor;
      if (field.style && field.style.inputBorderColor) control.style.borderColor = field.style.inputBorderColor;
      if (field.style && field.style.inputBorderRadius) control.style.borderRadius = radiusClass(field.style.inputBorderRadius);
      wrap.appendChild(control);
    }

    if (field.helpText) {
      var help = document.createElement("div");
      help.className = "help";
      help.textContent = field.helpText;
      wrap.appendChild(help);
    }

    var error = document.createElement("div");
    error.className = "field-error";
    wrap.appendChild(error);
    return wrap;
  }

  function reportHeight() {
    var height = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight || 0);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: RESIZE, height: Math.max(120, height) }, "*");
    }
  }

  function init(options) {
    var publicKey = options.publicKey;
    var apiBase = options.apiBase;
    var root = document.getElementById("root");

    function showUnavailable() {
      root.innerHTML = '<div id="status">This form is unavailable.</div>';
      reportHeight();
    }

    api(apiBase, "/public/forms/" + encodeURIComponent(publicKey) + "/config")
      .then(function (config) {
        var definition = config.definition || {};
        var settings = asObject(definition.settings);
        var fields = Array.isArray(definition.fields) ? definition.fields : [];
        document.title = settings.title || config.name || "Form";
        document.documentElement.style.setProperty("--form-accent", settings.accentColor || "#6366f1");
        if (settings.textColor) document.body.style.color = settings.textColor;
        if (settings.labelFont === "serif") document.body.style.fontFamily = "Georgia, serif";
        if (settings.inputFont === "mono") {
          var style = document.createElement("style");
          style.textContent = ".field input, .field textarea, .field select { font-family: ui-monospace, monospace; }";
          document.head.appendChild(style);
        }

        function drawSuccess(redirectUrl) {
          root.innerHTML = "";
          var success = document.createElement("div");
          success.className = "success";
          var title = document.createElement("h3");
          title.textContent = settings.successMessage || "Thank you for your submission.";
          success.appendChild(title);
          root.appendChild(success);
          reportHeight();
          if (redirectUrl) {
            setTimeout(function () {
              window.top.location.href = redirectUrl;
            }, 1200);
          }
        }

        function showErrors(errors) {
          Object.keys(errors).forEach(function (name) {
            var field = root.querySelector('[data-field-name="' + name + '"]');
            if (!field) return;
            field.classList.add("has-error");
            var error = field.querySelector(".field-error");
            if (error) error.textContent = errors[name];
          });
        }

        function clearErrors() {
          root.querySelectorAll(".field.has-error").forEach(function (field) {
            field.classList.remove("has-error");
            var error = field.querySelector(".field-error");
            if (error) error.textContent = "";
          });
        }

        root.innerHTML = "";
        var wrap = document.createElement("div");
        wrap.className = "form-wrap";
        if (settings.maxWidth) wrap.style.maxWidth = settings.maxWidth + "px";
        if (settings.backgroundColor) wrap.style.background = settings.backgroundColor;
        if (settings.padding != null) wrap.style.padding = settings.padding + "px";
        wrap.style.borderRadius = radiusClass(settings.borderRadius || "lg");

        var header = document.createElement("div");
        header.className = "form-header";
        var heading = document.createElement("h2");
        heading.textContent = settings.title || config.name || "Form";
        header.appendChild(heading);
        if (settings.description) {
          var desc = document.createElement("p");
          desc.textContent = settings.description;
          header.appendChild(desc);
        }
        wrap.appendChild(header);

        var form = document.createElement("form");
        form.noValidate = true;
        fields.forEach(function (field) {
          form.appendChild(renderField(field, settings));
        });

        var submitRow = document.createElement("div");
        submitRow.className = "submit-row " + (settings.submitButtonAlign || "center");
        var button = document.createElement("button");
        button.type = "submit";
        button.className = "submit" + (settings.submitButtonFullWidth ? " full" : "");
        button.textContent = settings.submitButtonLabel || "Submit";
        button.style.background = settings.submitButtonBgColor || settings.accentColor || "#6366f1";
        if (settings.submitButtonTextColor) button.style.color = settings.submitButtonTextColor;
        button.style.borderRadius = radiusClass(settings.submitButtonRadius || "md");
        submitRow.appendChild(button);
        form.appendChild(submitRow);

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          clearErrors();
          var result = validateForm(form, fields);
          if (Object.keys(result.errors).length > 0) {
            showErrors(result.errors);
            reportHeight();
            return;
          }
          button.disabled = true;
          button.textContent = "Submitting…";
          api(apiBase, "/public/forms/" + encodeURIComponent(publicKey) + "/submissions", {
            method: "POST",
            body: JSON.stringify({ data: result.data }),
          })
            .then(function (response) {
              drawSuccess(response.redirectUrl || settings.redirectUrl || null);
            })
            .catch(function (error) {
              button.disabled = false;
              button.textContent = settings.submitButtonLabel || "Submit";
              var mapped = {};
              var envelope = error.body || {};
              var details = envelope.error && envelope.error.details;
              if (Array.isArray(details)) {
                details.forEach(function (item) {
                  if (item && item.field && item.messages && item.messages.length) {
                    mapped[item.field] = item.messages[0];
                  }
                });
              } else if (envelope.errors && typeof envelope.errors === "object") {
                Object.keys(envelope.errors).forEach(function (key) {
                  mapped[key] = Array.isArray(envelope.errors[key])
                    ? envelope.errors[key][0]
                    : String(envelope.errors[key]);
                });
              }
              if (Object.keys(mapped).length > 0) {
                showErrors(mapped);
                reportHeight();
                return;
              }
              root.insertAdjacentHTML("afterbegin", '<div class="form-error">Unable to submit the form. Please try again.</div>');
              reportHeight();
            });
        });

        wrap.appendChild(form);
        root.appendChild(wrap);
        reportHeight();
        window.addEventListener("resize", reportHeight);
      })
      .catch(showUnavailable);
  }

  global.FormEmbed = { init: init };
})(window);
