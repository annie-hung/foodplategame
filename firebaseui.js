(function ()
{
	(function ()
	{
		var supportCustomEvent = window.CustomEvent;
		if (!supportCustomEvent || typeof supportCustomEvent === "object")
		{
			supportCustomEvent = function CustomEvent(event, x)
			{
				x = x ||
				{};
				var ev = document.createEvent("CustomEvent");
				ev.initCustomEvent(event, !!x.bubbles, !!x.cancelable, x.detail || null);
				return ev
			};
			supportCustomEvent.prototype = window.Event.prototype
		}

		function createsStackingContext(el)
		{
			while (el && el !== document.body)
			{
				var s = window.getComputedStyle(el);
				var invalid = function (k, ok)
				{
					return !(s[k] === undefined || s[k] ===
						ok)
				};
				if (s.opacity < 1 || invalid("zIndex", "auto") || invalid("transform", "none") || invalid("mixBlendMode", "normal") || invalid("filter", "none") || invalid("perspective", "none") || s["isolation"] === "isolate" || s.position === "fixed" || s.webkitOverflowScrolling === "touch") return true;
				el = el.parentElement
			}
			return false
		}

		function findNearestDialog(el)
		{
			while (el)
			{
				if (el.localName === "dialog") return el;
				el = el.parentElement
			}
			return null
		}

		function safeBlur(el)
		{
			if (el && el.blur && el !== document.body) el.blur()
		}

		function inNodeList(nodeList,
			node)
		{
			for (var i = 0; i < nodeList.length; ++i)
				if (nodeList[i] === node) return true;
			return false
		}

		function isFormMethodDialog(el)
		{
			if (!el || !el.hasAttribute("method")) return false;
			return el.getAttribute("method").toLowerCase() === "dialog"
		}

		function dialogPolyfillInfo(dialog)
		{
			this.dialog_ = dialog;
			this.replacedStyleTop_ = false;
			this.openAsModal_ = false;
			if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
			dialog.show = this.show.bind(this);
			dialog.showModal = this.showModal.bind(this);
			dialog.close = this.close.bind(this);
			if (!("returnValue" in dialog)) dialog.returnValue = "";
			if ("MutationObserver" in window)
			{
				var mo = new MutationObserver(this.maybeHideModal.bind(this));
				mo.observe(dialog,
				{
					attributes: true,
					attributeFilter: ["open"]
				})
			}
			else
			{
				var removed = false;
				var cb = function ()
				{
					removed ? this.downgradeModal() : this.maybeHideModal();
					removed = false
				}.bind(this);
				var timeout;
				var delayModel = function (ev)
				{
					if (ev.target !== dialog) return;
					var cand = "DOMNodeRemoved";
					removed |= ev.type.substr(0, cand.length) === cand;
					window.clearTimeout(timeout);
					timeout =
						window.setTimeout(cb, 0)
				};
				["DOMAttrModified", "DOMNodeRemoved", "DOMNodeRemovedFromDocument"].forEach(function (name)
				{
					dialog.addEventListener(name, delayModel)
				})
			}
			Object.defineProperty(dialog, "open",
			{
				set: this.setOpen.bind(this),
				get: dialog.hasAttribute.bind(dialog, "open")
			});
			this.backdrop_ = document.createElement("div");
			this.backdrop_.className = "backdrop";
			this.backdrop_.addEventListener("click", this.backdropClick_.bind(this))
		}
		dialogPolyfillInfo.prototype = {
			get dialog()
			{
				return this.dialog_
			},
			maybeHideModal: function ()
			{
				if (this.dialog_.hasAttribute("open") &&
					document.body.contains(this.dialog_)) return;
				this.downgradeModal()
			},
			downgradeModal: function ()
			{
				if (!this.openAsModal_) return;
				this.openAsModal_ = false;
				this.dialog_.style.zIndex = "";
				if (this.replacedStyleTop_)
				{
					this.dialog_.style.top = "";
					this.replacedStyleTop_ = false
				}
				this.backdrop_.parentNode && this.backdrop_.parentNode.removeChild(this.backdrop_);
				dialogPolyfill.dm.removeDialog(this)
			},
			setOpen: function (value)
			{
				if (value) this.dialog_.hasAttribute("open") || this.dialog_.setAttribute("open", "");
				else
				{
					this.dialog_.removeAttribute("open");
					this.maybeHideModal()
				}
			},
			backdropClick_: function (e)
			{
				if (!this.dialog_.hasAttribute("tabindex"))
				{
					var fake = document.createElement("div");
					this.dialog_.insertBefore(fake, this.dialog_.firstChild);
					fake.tabIndex = -1;
					fake.focus();
					this.dialog_.removeChild(fake)
				}
				else this.dialog_.focus();
				var redirectedEvent = document.createEvent("MouseEvents");
				redirectedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, window, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
				this.dialog_.dispatchEvent(redirectedEvent);
				e.stopPropagation()
			},
			focus_: function ()
			{
				var target = this.dialog_.querySelector("[autofocus]:not([disabled])");
				if (!target && this.dialog_.tabIndex >= 0) target = this.dialog_;
				if (!target)
				{
					var opts = ["button", "input", "keygen", "select", "textarea"];
					var query = opts.map(function (el)
					{
						return el + ":not([disabled])"
					});
					query.push('[tabindex]:not([disabled]):not([tabindex=""])');
					target = this.dialog_.querySelector(query.join(", "))
				}
				safeBlur(document.activeElement);
				target && target.focus()
			},
			updateZIndex: function (dialogZ, backdropZ)
			{
				if (dialogZ < backdropZ) throw new Error("dialogZ should never be < backdropZ");
				this.dialog_.style.zIndex = dialogZ;
				this.backdrop_.style.zIndex = backdropZ
			},
			show: function ()
			{
				if (!this.dialog_.open)
				{
					this.setOpen(true);
					this.focus_()
				}
			},
			showModal: function ()
			{
				if (this.dialog_.hasAttribute("open")) throw new Error("Failed to execute 'showModal' on dialog: The element is already open, and therefore cannot be opened modally.");
				if (!document.body.contains(this.dialog_)) throw new Error("Failed to execute 'showModal' on dialog: The element is not in a Document.");
				if (!dialogPolyfill.dm.pushDialog(this)) throw new Error("Failed to execute 'showModal' on dialog: There are too many open modal dialogs.");
				if (createsStackingContext(this.dialog_.parentElement)) console.warn("A dialog is being shown inside a stacking context. " + "This may cause it to be unusable. For more information, see this link: " + "https://github.com/GoogleChrome/dialog-polyfill/#stacking-context");
				this.setOpen(true);
				this.openAsModal_ = true;
				if (dialogPolyfill.needsCentering(this.dialog_))
				{
					dialogPolyfill.reposition(this.dialog_);
					this.replacedStyleTop_ = true
				}
				else this.replacedStyleTop_ = false;
				this.dialog_.parentNode.insertBefore(this.backdrop_, this.dialog_.nextSibling);
				this.focus_()
			},
			close: function (opt_returnValue)
			{
				if (!this.dialog_.hasAttribute("open")) throw new Error("Failed to execute 'close' on dialog: The element does not have an 'open' attribute, and therefore cannot be closed.");
				this.setOpen(false);
				if (opt_returnValue !== undefined) this.dialog_.returnValue = opt_returnValue;
				var closeEvent = new supportCustomEvent("close",
				{
					bubbles: false,
					cancelable: false
				});
				this.dialog_.dispatchEvent(closeEvent)
			}
		};
		var dialogPolyfill = {};
		dialogPolyfill.reposition = function (element)
		{
			var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
			var topValue = scrollTop + (window.innerHeight - element.offsetHeight) / 2;
			element.style.top = Math.max(scrollTop, topValue) + "px"
		};
		dialogPolyfill.isInlinePositionSetByStylesheet = function (element)
		{
			for (var i = 0; i < document.styleSheets.length; ++i)
			{
				var styleSheet = document.styleSheets[i];
				var cssRules = null;
				try
				{
					cssRules =
						styleSheet.cssRules
				}
				catch (e)
				{}
				if (!cssRules) continue;
				for (var j = 0; j < cssRules.length; ++j)
				{
					var rule = cssRules[j];
					var selectedNodes = null;
					try
					{
						selectedNodes = document.querySelectorAll(rule.selectorText)
					}
					catch (e$0)
					{}
					if (!selectedNodes || !inNodeList(selectedNodes, element)) continue;
					var cssTop = rule.style.getPropertyValue("top");
					var cssBottom = rule.style.getPropertyValue("bottom");
					if (cssTop && cssTop !== "auto" || cssBottom && cssBottom !== "auto") return true
				}
			}
			return false
		};
		dialogPolyfill.needsCentering = function (dialog)
		{
			var computedStyle =
				window.getComputedStyle(dialog);
			if (computedStyle.position !== "absolute") return false;
			if (dialog.style.top !== "auto" && dialog.style.top !== "" || dialog.style.bottom !== "auto" && dialog.style.bottom !== "") return false;
			return !dialogPolyfill.isInlinePositionSetByStylesheet(dialog)
		};
		dialogPolyfill.forceRegisterDialog = function (element)
		{
			if (window.HTMLDialogElement || element.showModal) console.warn("This browser already supports <dialog>, the polyfill " + "may not work correctly", element);
			if (element.localName !== "dialog") throw new Error("Failed to register dialog: The element is not a dialog.");
			new dialogPolyfillInfo(element)
		};
		dialogPolyfill.registerDialog = function (element)
		{
			if (!element.showModal) dialogPolyfill.forceRegisterDialog(element)
		};
		dialogPolyfill.DialogManager = function ()
		{
			this.pendingDialogStack = [];
			var checkDOM = this.checkDOM_.bind(this);
			this.overlay = document.createElement("div");
			this.overlay.className = "_dialog_overlay";
			this.overlay.addEventListener("click", function (e)
			{
				this.forwardTab_ = undefined;
				e.stopPropagation();
				checkDOM([])
			}.bind(this));
			this.handleKey_ = this.handleKey_.bind(this);
			this.handleFocus_ = this.handleFocus_.bind(this);
			this.zIndexLow_ = 1E5;
			this.zIndexHigh_ = 1E5 + 150;
			this.forwardTab_ = undefined;
			if ("MutationObserver" in window) this.mo_ = new MutationObserver(function (records)
			{
				var removed = [];
				records.forEach(function (rec)
				{
					for (var i = 0, c; c = rec.removedNodes[i]; ++i)
					{
						if (!(c instanceof Element)) continue;
						else if (c.localName === "dialog") removed.push(c);
						removed = removed.concat(c.querySelectorAll("dialog"))
					}
				});
				removed.length && checkDOM(removed)
			})
		};
		dialogPolyfill.DialogManager.prototype.blockDocument =
			function ()
			{
				document.documentElement.addEventListener("focus", this.handleFocus_, true);
				document.addEventListener("keydown", this.handleKey_);
				this.mo_ && this.mo_.observe(document,
				{
					childList: true,
					subtree: true
				})
			};
		dialogPolyfill.DialogManager.prototype.unblockDocument = function ()
		{
			document.documentElement.removeEventListener("focus", this.handleFocus_, true);
			document.removeEventListener("keydown", this.handleKey_);
			this.mo_ && this.mo_.disconnect()
		};
		dialogPolyfill.DialogManager.prototype.updateStacking = function ()
		{
			var zIndex =
				this.zIndexHigh_;
			for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i)
			{
				dpi.updateZIndex(--zIndex, --zIndex);
				if (i === 0) this.overlay.style.zIndex = --zIndex
			}
			var last = this.pendingDialogStack[0];
			if (last)
			{
				var p = last.dialog.parentNode || document.body;
				p.appendChild(this.overlay)
			}
			else if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay)
		};
		dialogPolyfill.DialogManager.prototype.containedByTopDialog_ = function (candidate)
		{
			while (candidate = findNearestDialog(candidate))
			{
				for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i)
					if (dpi.dialog ===
						candidate) return i === 0;
				candidate = candidate.parentElement
			}
			return false
		};
		dialogPolyfill.DialogManager.prototype.handleFocus_ = function (event)
		{
			if (this.containedByTopDialog_(event.target)) return;
			event.preventDefault();
			event.stopPropagation();
			safeBlur(event.target);
			if (this.forwardTab_ === undefined) return;
			var dpi = this.pendingDialogStack[0];
			var dialog = dpi.dialog;
			var position = dialog.compareDocumentPosition(event.target);
			if (position & Node.DOCUMENT_POSITION_PRECEDING)
				if (this.forwardTab_) dpi.focus_();
				else document.documentElement.focus();
			else;
			return false
		};
		dialogPolyfill.DialogManager.prototype.handleKey_ = function (event)
		{
			this.forwardTab_ = undefined;
			if (event.keyCode === 27)
			{
				event.preventDefault();
				event.stopPropagation();
				var cancelEvent = new supportCustomEvent("cancel",
				{
					bubbles: false,
					cancelable: true
				});
				var dpi = this.pendingDialogStack[0];
				if (dpi && dpi.dialog.dispatchEvent(cancelEvent)) dpi.dialog.close()
			}
			else if (event.keyCode === 9) this.forwardTab_ = !event.shiftKey
		};
		dialogPolyfill.DialogManager.prototype.checkDOM_ = function (removed)
		{
			var clone = this.pendingDialogStack.slice();
			clone.forEach(function (dpi)
			{
				if (removed.indexOf(dpi.dialog) !== -1) dpi.downgradeModal();
				else dpi.maybeHideModal()
			})
		};
		dialogPolyfill.DialogManager.prototype.pushDialog = function (dpi)
		{
			var allowed = (this.zIndexHigh_ - this.zIndexLow_) / 2 - 1;
			if (this.pendingDialogStack.length >= allowed) return false;
			if (this.pendingDialogStack.unshift(dpi) === 1) this.blockDocument();
			this.updateStacking();
			return true
		};
		dialogPolyfill.DialogManager.prototype.removeDialog = function (dpi)
		{
			var index = this.pendingDialogStack.indexOf(dpi);
			if (index ===
				-1) return;
			this.pendingDialogStack.splice(index, 1);
			if (this.pendingDialogStack.length === 0) this.unblockDocument();
			this.updateStacking()
		};
		dialogPolyfill.dm = new dialogPolyfill.DialogManager;
		dialogPolyfill.formSubmitter = null;
		dialogPolyfill.useValue = null;
		if (window.HTMLDialogElement === undefined)
		{
			var testForm = document.createElement("form");
			testForm.setAttribute("method", "dialog");
			if (testForm.method !== "dialog")
			{
				var methodDescriptor = Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, "method");
				if (methodDescriptor)
				{
					var realGet =
						methodDescriptor.get;
					methodDescriptor.get = function ()
					{
						if (isFormMethodDialog(this)) return "dialog";
						return realGet.call(this)
					};
					var realSet = methodDescriptor.set;
					methodDescriptor.set = function (v)
					{
						if (typeof v === "string" && v.toLowerCase() === "dialog") return this.setAttribute("method", v);
						return realSet.call(this, v)
					};
					Object.defineProperty(HTMLFormElement.prototype, "method", methodDescriptor)
				}
			}
			document.addEventListener("click", function (ev)
			{
				dialogPolyfill.formSubmitter = null;
				dialogPolyfill.useValue = null;
				if (ev.defaultPrevented) return;
				var target = ev.target;
				if (!target || !isFormMethodDialog(target.form)) return;
				var valid = target.type === "submit" && ["button", "input"].indexOf(target.localName) > -1;
				if (!valid)
				{
					if (!(target.localName === "input" && target.type === "image")) return;
					dialogPolyfill.useValue = ev.offsetX + "," + ev.offsetY
				}
				var dialog = findNearestDialog(target);
				if (!dialog) return;
				dialogPolyfill.formSubmitter = target
			}, false);
			var nativeFormSubmit = HTMLFormElement.prototype.submit;
			var replacementFormSubmit = function ()
			{
				if (!isFormMethodDialog(this)) return nativeFormSubmit.call(this);
				var dialog = findNearestDialog(this);
				dialog && dialog.close()
			};
			HTMLFormElement.prototype.submit = replacementFormSubmit;
			document.addEventListener("submit", function (ev)
			{
				var form = ev.target;
				if (!isFormMethodDialog(form)) return;
				ev.preventDefault();
				var dialog = findNearestDialog(form);
				if (!dialog) return;
				var s = dialogPolyfill.formSubmitter;
				if (s && s.form === form) dialog.close(dialogPolyfill.useValue || s.value);
				else dialog.close();
				dialogPolyfill.formSubmitter = null
			}, true)
		}
		dialogPolyfill["forceRegisterDialog"] = dialogPolyfill.forceRegisterDialog;
		dialogPolyfill["registerDialog"] = dialogPolyfill.registerDialog;
		if (typeof define === "function" && "amd" in define) define(function ()
		{
			return dialogPolyfill
		});
		else if (typeof module === "object" && typeof module["exports"] === "object") module["exports"] = dialogPolyfill;
		else window["dialogPolyfill"] = dialogPolyfill
	})();
	/*

	 Copyright 2015 Google Inc. All Rights Reserved.

	 Licensed under the Apache License, Version 2.0 (the "License");
	 you may not use this file except in compliance with the License.
	 You may obtain a copy of the License at

	      http://www.apache.org/licenses/LICENSE-2.0

	 Unless required by applicable law or agreed to in writing, software
	 distributed under the License is distributed on an "AS IS" BASIS,
	 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 See the License for the specific language governing permissions and
	 limitations under the License.
	*/
	var componentHandler = {
		upgradeDom: function (optJsClass, optCssClass) {},
		upgradeElement: function (element, optJsClass) {},
		upgradeElements: function (elements) {},
		upgradeAllRegistered: function () {},
		registerUpgradedCallback: function (jsClass, callback) {},
		register: function (config) {},
		downgradeElements: function (nodes) {}
	};
	componentHandler = function ()
	{
		var registeredComponents_ = [];
		var createdComponents_ = [];
		var componentConfigProperty_ = "mdlComponentConfigInternal_";

		function findRegisteredClass_(name, optReplace)
		{
			for (var i = 0; i < registeredComponents_.length; i++)
				if (registeredComponents_[i].className === name)
				{
					if (typeof optReplace !== "undefined") registeredComponents_[i] = optReplace;
					return registeredComponents_[i]
				}
			return false
		}

		function getUpgradedListOfElement_(element)
		{
			var dataUpgraded = element.getAttribute("data-upgraded");
			return dataUpgraded ===
				null ? [""] : dataUpgraded.split(",")
		}

		function isElementUpgraded_(element, jsClass)
		{
			var upgradedList = getUpgradedListOfElement_(element);
			return upgradedList.indexOf(jsClass) !== -1
		}

		function upgradeDomInternal(optJsClass, optCssClass)
		{
			if (typeof optJsClass === "undefined" && typeof optCssClass === "undefined")
				for (var i = 0; i < registeredComponents_.length; i++) upgradeDomInternal(registeredComponents_[i].className, registeredComponents_[i].cssClass);
			else
			{
				var jsClass = optJsClass;
				if (typeof optCssClass === "undefined")
				{
					var registeredClass =
						findRegisteredClass_(jsClass);
					if (registeredClass) optCssClass = registeredClass.cssClass
				}
				var elements = document.querySelectorAll("." + optCssClass);
				for (var n = 0; n < elements.length; n++) upgradeElementInternal(elements[n], jsClass)
			}
		}

		function upgradeElementInternal(element, optJsClass)
		{
			if (!(typeof element === "object" && element instanceof Element)) throw new Error("Invalid argument provided to upgrade MDL element.");
			var upgradedList = getUpgradedListOfElement_(element);
			var classesToUpgrade = [];
			if (!optJsClass)
			{
				var classList =
					element.classList;
				registeredComponents_.forEach(function (component)
				{
					if (classList.contains(component.cssClass) && classesToUpgrade.indexOf(component) === -1 && !isElementUpgraded_(element, component.className)) classesToUpgrade.push(component)
				})
			}
			else if (!isElementUpgraded_(element, optJsClass)) classesToUpgrade.push(findRegisteredClass_(optJsClass));
			for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++)
			{
				registeredClass = classesToUpgrade[i];
				if (registeredClass)
				{
					upgradedList.push(registeredClass.className);
					element.setAttribute("data-upgraded", upgradedList.join(","));
					var instance = new registeredClass.classConstructor(element);
					instance[componentConfigProperty_] = registeredClass;
					createdComponents_.push(instance);
					for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) registeredClass.callbacks[j](element);
					if (registeredClass.widget) element[registeredClass.className] = instance
				}
				else throw new Error("Unable to find a registered component for the given class.");
				var ev;
				if ("CustomEvent" in window && typeof window.CustomEvent ===
					"function") ev = new CustomEvent("mdl-componentupgraded",
				{
					bubbles: true,
					cancelable: false
				});
				else
				{
					ev = document.createEvent("Events");
					ev.initEvent("mdl-componentupgraded", true, true)
				}
				element.dispatchEvent(ev)
			}
		}

		function upgradeElementsInternal(elements)
		{
			if (!Array.isArray(elements))
				if (elements instanceof Element) elements = [elements];
				else elements = Array.prototype.slice.call(elements);
			for (var i = 0, n = elements.length, element; i < n; i++)
			{
				element = elements[i];
				if (element instanceof HTMLElement)
				{
					upgradeElementInternal(element);
					if (element.children.length > 0) upgradeElementsInternal(element.children)
				}
			}
		}

		function registerInternal(config)
		{
			var widgetMissing = typeof config.widget === "undefined" && typeof config["widget"] === "undefined";
			var widget = true;
			if (!widgetMissing) widget = config.widget || config["widget"];
			var newConfig = {
				classConstructor: config.constructor || config["constructor"],
				className: config.classAsString || config["classAsString"],
				cssClass: config.cssClass || config["cssClass"],
				widget: widget,
				callbacks: []
			};
			registeredComponents_.forEach(function (item)
			{
				if (item.cssClass ===
					newConfig.cssClass) throw new Error("The provided cssClass has already been registered: " + item.cssClass);
				if (item.className === newConfig.className) throw new Error("The provided className has already been registered");
			});
			if (config.constructor.prototype.hasOwnProperty(componentConfigProperty_)) throw new Error("MDL component classes must not have " + componentConfigProperty_ + " defined as a property.");
			var found = findRegisteredClass_(config.classAsString, newConfig);
			if (!found) registeredComponents_.push(newConfig)
		}

		function registerUpgradedCallbackInternal(jsClass, callback)
		{
			var regClass = findRegisteredClass_(jsClass);
			if (regClass) regClass.callbacks.push(callback)
		}

		function upgradeAllRegisteredInternal()
		{
			for (var n = 0; n < registeredComponents_.length; n++) upgradeDomInternal(registeredComponents_[n].className)
		}

		function deconstructComponentInternal(component)
		{
			if (component)
			{
				var componentIndex = createdComponents_.indexOf(component);
				createdComponents_.splice(componentIndex, 1);
				var upgrades = component.element_.getAttribute("data-upgraded").split(",");
				var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
				upgrades.splice(componentPlace, 1);
				component.element_.setAttribute("data-upgraded", upgrades.join(","));
				var ev;
				if ("CustomEvent" in window && typeof window.CustomEvent === "function") ev = new CustomEvent("mdl-componentdowngraded",
				{
					bubbles: true,
					cancelable: false
				});
				else
				{
					ev = document.createEvent("Events");
					ev.initEvent("mdl-componentdowngraded", true, true)
				}
				component.element_.dispatchEvent(ev)
			}
		}

		function downgradeNodesInternal(nodes)
		{
			var downgradeNode =
				function (node)
				{
					createdComponents_.filter(function (item)
					{
						return item.element_ === node
					}).forEach(deconstructComponentInternal)
				};
			if (nodes instanceof Array || nodes instanceof NodeList)
				for (var n = 0; n < nodes.length; n++) downgradeNode(nodes[n]);
			else if (nodes instanceof Node) downgradeNode(nodes);
			else throw new Error("Invalid argument provided to downgrade MDL nodes.");
		}
		return {
			upgradeDom: upgradeDomInternal,
			upgradeElement: upgradeElementInternal,
			upgradeElements: upgradeElementsInternal,
			upgradeAllRegistered: upgradeAllRegisteredInternal,
			registerUpgradedCallback: registerUpgradedCallbackInternal,
			register: registerInternal,
			downgradeElements: downgradeNodesInternal
		}
	}();
	componentHandler.ComponentConfigPublic;
	componentHandler.ComponentConfig;
	componentHandler.Component;
	componentHandler["upgradeDom"] = componentHandler.upgradeDom;
	componentHandler["upgradeElement"] = componentHandler.upgradeElement;
	componentHandler["upgradeElements"] = componentHandler.upgradeElements;
	componentHandler["upgradeAllRegistered"] = componentHandler.upgradeAllRegistered;
	componentHandler["registerUpgradedCallback"] = componentHandler.registerUpgradedCallback;
	componentHandler["register"] = componentHandler.register;
	componentHandler["downgradeElements"] = componentHandler.downgradeElements;
	window.componentHandler = componentHandler;
	window["componentHandler"] = componentHandler;
	window.addEventListener("load", function ()
	{
		if ("classList" in document.createElement("div") && "querySelector" in document && "addEventListener" in window && Array.prototype.forEach)
		{
			document.documentElement.classList.add("mdl-js");
			componentHandler.upgradeAllRegistered()
		}
		else
		{
			componentHandler.upgradeElement = function () {};
			componentHandler.register = function () {}
		}
	});
	(function ()
	{
		var MaterialButton = function MaterialButton(element)
		{
			this.element_ = element;
			this.init()
		};
		window["MaterialButton"] = MaterialButton;
		MaterialButton.prototype.Constant_ = {};
		MaterialButton.prototype.CssClasses_ = {
			RIPPLE_EFFECT: "mdl-js-ripple-effect",
			RIPPLE_CONTAINER: "mdl-button__ripple-container",
			RIPPLE: "mdl-ripple"
		};
		MaterialButton.prototype.blurHandler_ = function (event)
		{
			if (event) this.element_.blur()
		};
		MaterialButton.prototype.disable = function ()
		{
			this.element_.disabled = true
		};
		MaterialButton.prototype["disable"] =
			MaterialButton.prototype.disable;
		MaterialButton.prototype.enable = function ()
		{
			this.element_.disabled = false
		};
		MaterialButton.prototype["enable"] = MaterialButton.prototype.enable;
		MaterialButton.prototype.init = function ()
		{
			if (this.element_)
			{
				if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT))
				{
					var rippleContainer = document.createElement("span");
					rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
					this.rippleElement_ = document.createElement("span");
					this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
					rippleContainer.appendChild(this.rippleElement_);
					this.boundRippleBlurHandler = this.blurHandler_.bind(this);
					this.rippleElement_.addEventListener("mouseup", this.boundRippleBlurHandler);
					this.element_.appendChild(rippleContainer)
				}
				this.boundButtonBlurHandler = this.blurHandler_.bind(this);
				this.element_.addEventListener("mouseup", this.boundButtonBlurHandler);
				this.element_.addEventListener("mouseleave", this.boundButtonBlurHandler)
			}
		};
		componentHandler.register(
		{
			constructor: MaterialButton,
			classAsString: "MaterialButton",
			cssClass: "mdl-js-button",
			widget: true
		})
	})();
	(function ()
	{
		var MaterialProgress = function MaterialProgress(element)
		{
			this.element_ = element;
			this.init()
		};
		window["MaterialProgress"] = MaterialProgress;
		MaterialProgress.prototype.Constant_ = {};
		MaterialProgress.prototype.CssClasses_ = {
			INDETERMINATE_CLASS: "mdl-progress__indeterminate"
		};
		MaterialProgress.prototype.setProgress = function (p)
		{
			if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) return;
			this.progressbar_.style.width = p + "%"
		};
		MaterialProgress.prototype["setProgress"] = MaterialProgress.prototype.setProgress;
		MaterialProgress.prototype.setBuffer = function (p)
		{
			this.bufferbar_.style.width = p + "%";
			this.auxbar_.style.width = 100 - p + "%"
		};
		MaterialProgress.prototype["setBuffer"] = MaterialProgress.prototype.setBuffer;
		MaterialProgress.prototype.init = function ()
		{
			if (this.element_)
			{
				var el = document.createElement("div");
				el.className = "progressbar bar bar1";
				this.element_.appendChild(el);
				this.progressbar_ = el;
				el = document.createElement("div");
				el.className = "bufferbar bar bar2";
				this.element_.appendChild(el);
				this.bufferbar_ = el;
				el = document.createElement("div");
				el.className = "auxbar bar bar3";
				this.element_.appendChild(el);
				this.auxbar_ = el;
				this.progressbar_.style.width = "0%";
				this.bufferbar_.style.width = "100%";
				this.auxbar_.style.width = "0%";
				this.element_.classList.add("is-upgraded")
			}
		};
		componentHandler.register(
		{
			constructor: MaterialProgress,
			classAsString: "MaterialProgress",
			cssClass: "mdl-js-progress",
			widget: true
		})
	})();
	(function ()
	{
		var MaterialSpinner = function MaterialSpinner(element)
		{
			this.element_ = element;
			this.init()
		};
		window["MaterialSpinner"] = MaterialSpinner;
		MaterialSpinner.prototype.Constant_ = {
			MDL_SPINNER_LAYER_COUNT: 4
		};
		MaterialSpinner.prototype.CssClasses_ = {
			MDL_SPINNER_LAYER: "mdl-spinner__layer",
			MDL_SPINNER_CIRCLE_CLIPPER: "mdl-spinner__circle-clipper",
			MDL_SPINNER_CIRCLE: "mdl-spinner__circle",
			MDL_SPINNER_GAP_PATCH: "mdl-spinner__gap-patch",
			MDL_SPINNER_LEFT: "mdl-spinner__left",
			MDL_SPINNER_RIGHT: "mdl-spinner__right"
		};
		MaterialSpinner.prototype.createLayer = function (index)
		{
			var layer = document.createElement("div");
			layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER);
			layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER + "-" + index);
			var leftClipper = document.createElement("div");
			leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
			leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);
			var gapPatch = document.createElement("div");
			gapPatch.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);
			var rightClipper =
				document.createElement("div");
			rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
			rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);
			var circleOwners = [leftClipper, gapPatch, rightClipper];
			for (var i = 0; i < circleOwners.length; i++)
			{
				var circle = document.createElement("div");
				circle.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE);
				circleOwners[i].appendChild(circle)
			}
			layer.appendChild(leftClipper);
			layer.appendChild(gapPatch);
			layer.appendChild(rightClipper);
			this.element_.appendChild(layer)
		};
		MaterialSpinner.prototype["createLayer"] = MaterialSpinner.prototype.createLayer;
		MaterialSpinner.prototype.stop = function ()
		{
			this.element_.classList.remove("is-active")
		};
		MaterialSpinner.prototype["stop"] = MaterialSpinner.prototype.stop;
		MaterialSpinner.prototype.start = function ()
		{
			this.element_.classList.add("is-active")
		};
		MaterialSpinner.prototype["start"] = MaterialSpinner.prototype.start;
		MaterialSpinner.prototype.init = function ()
		{
			if (this.element_)
			{
				for (var i = 1; i <= this.Constant_.MDL_SPINNER_LAYER_COUNT; i++) this.createLayer(i);
				this.element_.classList.add("is-upgraded")
			}
		};
		componentHandler.register(
		{
			constructor: MaterialSpinner,
			classAsString: "MaterialSpinner",
			cssClass: "mdl-js-spinner",
			widget: true
		})
	})();
	(function ()
	{
		var MaterialTextfield = function MaterialTextfield(element)
		{
			this.element_ = element;
			this.maxRows = this.Constant_.NO_MAX_ROWS;
			this.init()
		};
		window["MaterialTextfield"] = MaterialTextfield;
		MaterialTextfield.prototype.Constant_ = {
			NO_MAX_ROWS: -1,
			MAX_ROWS_ATTRIBUTE: "maxrows"
		};
		MaterialTextfield.prototype.CssClasses_ = {
			LABEL: "mdl-textfield__label",
			INPUT: "mdl-textfield__input",
			IS_DIRTY: "is-dirty",
			IS_FOCUSED: "is-focused",
			IS_DISABLED: "is-disabled",
			IS_INVALID: "is-invalid",
			IS_UPGRADED: "is-upgraded",
			HAS_PLACEHOLDER: "has-placeholder"
		};
		MaterialTextfield.prototype.onKeyDown_ = function (event)
		{
			var currentRowCount = event.target.value.split("\n").length;
			if (event.keyCode === 13)
				if (currentRowCount >= this.maxRows) event.preventDefault()
		};
		MaterialTextfield.prototype.onFocus_ = function (event)
		{
			this.element_.classList.add(this.CssClasses_.IS_FOCUSED)
		};
		MaterialTextfield.prototype.onBlur_ = function (event)
		{
			this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)
		};
		MaterialTextfield.prototype.onReset_ = function (event)
		{
			this.updateClasses_()
		};
		MaterialTextfield.prototype.updateClasses_ =
			function ()
			{
				this.checkDisabled();
				this.checkValidity();
				this.checkDirty();
				this.checkFocus()
			};
		MaterialTextfield.prototype.checkDisabled = function ()
		{
			if (this.input_.disabled) this.element_.classList.add(this.CssClasses_.IS_DISABLED);
			else this.element_.classList.remove(this.CssClasses_.IS_DISABLED)
		};
		MaterialTextfield.prototype["checkDisabled"] = MaterialTextfield.prototype.checkDisabled;
		MaterialTextfield.prototype.checkFocus = function ()
		{
			if (Boolean(this.element_.querySelector(":focus"))) this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
			else this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)
		};
		MaterialTextfield.prototype["checkFocus"] = MaterialTextfield.prototype.checkFocus;
		MaterialTextfield.prototype.checkValidity = function ()
		{
			if (this.input_.validity)
				if (this.input_.validity.valid) this.element_.classList.remove(this.CssClasses_.IS_INVALID);
				else this.element_.classList.add(this.CssClasses_.IS_INVALID)
		};
		MaterialTextfield.prototype["checkValidity"] = MaterialTextfield.prototype.checkValidity;
		MaterialTextfield.prototype.checkDirty =
			function ()
			{
				if (this.input_.value && this.input_.value.length > 0) this.element_.classList.add(this.CssClasses_.IS_DIRTY);
				else this.element_.classList.remove(this.CssClasses_.IS_DIRTY)
			};
		MaterialTextfield.prototype["checkDirty"] = MaterialTextfield.prototype.checkDirty;
		MaterialTextfield.prototype.disable = function ()
		{
			this.input_.disabled = true;
			this.updateClasses_()
		};
		MaterialTextfield.prototype["disable"] = MaterialTextfield.prototype.disable;
		MaterialTextfield.prototype.enable = function ()
		{
			this.input_.disabled = false;
			this.updateClasses_()
		};
		MaterialTextfield.prototype["enable"] = MaterialTextfield.prototype.enable;
		MaterialTextfield.prototype.change = function (value)
		{
			this.input_.value = value || "";
			this.updateClasses_()
		};
		MaterialTextfield.prototype["change"] = MaterialTextfield.prototype.change;
		MaterialTextfield.prototype.init = function ()
		{
			if (this.element_)
			{
				this.label_ = this.element_.querySelector("." + this.CssClasses_.LABEL);
				this.input_ = this.element_.querySelector("." + this.CssClasses_.INPUT);
				if (this.input_)
				{
					if (this.input_.hasAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE))
					{
						this.maxRows =
							parseInt(this.input_.getAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE), 10);
						if (isNaN(this.maxRows)) this.maxRows = this.Constant_.NO_MAX_ROWS
					}
					if (this.input_.hasAttribute("placeholder")) this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER);
					this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
					this.boundFocusHandler = this.onFocus_.bind(this);
					this.boundBlurHandler = this.onBlur_.bind(this);
					this.boundResetHandler = this.onReset_.bind(this);
					this.input_.addEventListener("input", this.boundUpdateClassesHandler);
					this.input_.addEventListener("focus", this.boundFocusHandler);
					this.input_.addEventListener("blur", this.boundBlurHandler);
					this.input_.addEventListener("reset", this.boundResetHandler);
					if (this.maxRows !== this.Constant_.NO_MAX_ROWS)
					{
						this.boundKeyDownHandler = this.onKeyDown_.bind(this);
						this.input_.addEventListener("keydown", this.boundKeyDownHandler)
					}
					var invalid = this.element_.classList.contains(this.CssClasses_.IS_INVALID);
					this.updateClasses_();
					this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
					if (invalid) this.element_.classList.add(this.CssClasses_.IS_INVALID);
					if (this.input_.hasAttribute("autofocus"))
					{
						this.element_.focus();
						this.checkFocus()
					}
				}
			}
		};
		componentHandler.register(
		{
			constructor: MaterialTextfield,
			classAsString: "MaterialTextfield",
			cssClass: "mdl-js-textfield",
			widget: true
		})
	})();
	(function ()
	{
		var m, aa = "function" == typeof Object.defineProperties ? Object.defineProperty : function (a, b, c)
			{
				a != Array.prototype && a != Object.prototype && (a[b] = c.value)
			},
			ca = "undefined" != typeof window && window === this ? this : "undefined" != typeof global && null != global ? global : this;

		function da(a, b)
		{
			if (b)
			{
				var c = ca;
				a = a.split(".");
				for (var d = 0; d < a.length - 1; d++)
				{
					var e = a[d];
					e in c || (c[e] = {});
					c = c[e]
				}
				a = a[a.length - 1];
				d = c[a];
				b = b(d);
				b != d && null != b && aa(c, a,
				{
					configurable: !0,
					writable: !0,
					value: b
				})
			}
		}

		function ea(a)
		{
			var b = 0;
			return function ()
			{
				return b <
					a.length ?
					{
						done: !1,
						value: a[b++]
					} :
					{
						done: !0
					}
			}
		}

		function fa(a)
		{
			var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
			return b ? b.call(a) :
			{
				next: ea(a)
			}
		}
		da("Promise", function (a)
		{
			function b(g)
			{
				this.f = 0;
				this.h = void 0;
				this.a = [];
				var h = this.j();
				try
				{
					g(h.resolve, h.reject)
				}
				catch (k)
				{
					h.reject(k)
				}
			}

			function c()
			{
				this.a = null
			}

			function d(g)
			{
				return g instanceof b ? g : new b(function (h)
				{
					h(g)
				})
			}
			if (a) return a;
			c.prototype.f = function (g)
			{
				if (null == this.a)
				{
					this.a = [];
					var h = this;
					this.h(function ()
					{
						h.i()
					})
				}
				this.a.push(g)
			};
			var e = ca.setTimeout;
			c.prototype.h = function (g)
			{
				e(g, 0)
			};
			c.prototype.i = function ()
			{
				for (; this.a && this.a.length;)
				{
					var g = this.a;
					this.a = [];
					for (var h = 0; h < g.length; ++h)
					{
						var k = g[h];
						g[h] = null;
						try
						{
							k()
						}
						catch (l)
						{
							this.j(l)
						}
					}
				}
				this.a = null
			};
			c.prototype.j = function (g)
			{
				this.h(function ()
				{
					throw g;
				})
			};
			b.prototype.j = function ()
			{
				function g(l)
				{
					return function (w)
					{
						k || (k = !0, l.call(h, w))
					}
				}
				var h = this,
					k = !1;
				return {
					resolve: g(this.I),
					reject: g(this.i)
				}
			};
			b.prototype.I = function (g)
			{
				if (g === this) this.i(new TypeError("A Promise cannot resolve to itself"));
				else if (g instanceof b) this.K(g);
				else
				{
					a: switch (typeof g)
					{
					case "object":
						var h = null != g;
						break a;
					case "function":
						h = !0;
						break a;
					default:
						h = !1
					}
					h ? this.F(g) : this.v(g)
				}
			};
			b.prototype.F = function (g)
			{
				var h = void 0;
				try
				{
					h = g.then
				}
				catch (k)
				{
					this.i(k);
					return
				}
				"function" == typeof h ? this.O(h, g) : this.v(g)
			};
			b.prototype.i = function (g)
			{
				this.w(2, g)
			};
			b.prototype.v = function (g)
			{
				this.w(1, g)
			};
			b.prototype.w = function (g, h)
			{
				if (0 != this.f) throw Error("Cannot settle(" + g + ", " + h + "): Promise already settled in state" + this.f);
				this.f = g;
				this.h = h;
				this.C()
			};
			b.prototype.C = function ()
			{
				if (null != this.a)
				{
					for (var g = 0; g < this.a.length; ++g) f.f(this.a[g]);
					this.a = null
				}
			};
			var f = new c;
			b.prototype.K = function (g)
			{
				var h = this.j();
				g.Da(h.resolve, h.reject)
			};
			b.prototype.O = function (g, h)
			{
				var k = this.j();
				try
				{
					g.call(h, k.resolve, k.reject)
				}
				catch (l)
				{
					k.reject(l)
				}
			};
			b.prototype.then = function (g, h)
			{
				function k(sa, Da)
				{
					return "function" == typeof sa ? function (Ka)
					{
						try
						{
							l(sa(Ka))
						}
						catch (ba)
						{
							w(ba)
						}
					} : Da
				}
				var l, w, ya = new b(function (sa, Da)
				{
					l = sa;
					w = Da
				});
				this.Da(k(g, l), k(h, w));
				return ya
			};
			b.prototype.catch =
				function (g)
				{
					return this.then(void 0, g)
				};
			b.prototype.Da = function (g, h)
			{
				function k()
				{
					switch (l.f)
					{
					case 1:
						g(l.h);
						break;
					case 2:
						h(l.h);
						break;
					default:
						throw Error("Unexpected state: " + l.f);
					}
				}
				var l = this;
				null == this.a ? f.f(k) : this.a.push(k)
			};
			b.resolve = d;
			b.reject = function (g)
			{
				return new b(function (h, k)
				{
					k(g)
				})
			};
			b.race = function (g)
			{
				return new b(function (h, k)
				{
					for (var l = fa(g), w = l.next(); !w.done; w = l.next()) d(w.value).Da(h, k)
				})
			};
			b.all = function (g)
			{
				var h = fa(g),
					k = h.next();
				return k.done ? d([]) : new b(function (l, w)
				{
					function ya(Ka)
					{
						return function (ba)
						{
							sa[Ka] =
								ba;
							Da--;
							0 == Da && l(sa)
						}
					}
					var sa = [],
						Da = 0;
					do sa.push(void 0), Da++, d(k.value).Da(ya(sa.length - 1), w), k = h.next(); while (!k.done)
				})
			};
			return b
		});
		var n = this;

		function ha(a)
		{
			return void 0 !== a
		}

		function p(a)
		{
			return "string" == typeof a
		}
		var ia = /^[\w+/_-]+[=]{0,2}$/,
			ja = null;

		function ka()
		{}

		function la(a)
		{
			a.V = void 0;
			a.Ua = function ()
			{
				return a.V ? a.V : a.V = new a
			}
		}

		function ma(a)
		{
			var b = typeof a;
			if ("object" == b)
				if (a)
				{
					if (a instanceof Array) return "array";
					if (a instanceof Object) return b;
					var c = Object.prototype.toString.call(a);
					if ("[object Window]" ==
						c) return "object";
					if ("[object Array]" == c || "number" == typeof a.length && "undefined" != typeof a.splice && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("splice")) return "array";
					if ("[object Function]" == c || "undefined" != typeof a.call && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("call")) return "function"
				}
			else return "null";
			else if ("function" == b && "undefined" == typeof a.call) return "object";
			return b
		}

		function na(a)
		{
			return null != a
		}

		function oa(a)
		{
			return "array" == ma(a)
		}

		function pa(a)
		{
			var b =
				ma(a);
			return "array" == b || "object" == b && "number" == typeof a.length
		}

		function qa(a)
		{
			return "function" == ma(a)
		}

		function ra(a)
		{
			var b = typeof a;
			return "object" == b && null != a || "function" == b
		}
		var ta = "closure_uid_" + (1E9 * Math.random() >>> 0),
			ua = 0;

		function va(a, b, c)
		{
			return a.call.apply(a.bind, arguments)
		}

		function wa(a, b, c)
		{
			if (!a) throw Error();
			if (2 < arguments.length)
			{
				var d = Array.prototype.slice.call(arguments, 2);
				return function ()
				{
					var e = Array.prototype.slice.call(arguments);
					Array.prototype.unshift.apply(e, d);
					return a.apply(b,
						e)
				}
			}
			return function ()
			{
				return a.apply(b, arguments)
			}
		}

		function q(a, b, c)
		{
			Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? q = va : q = wa;
			return q.apply(null, arguments)
		}

		function xa(a, b)
		{
			var c = Array.prototype.slice.call(arguments, 1);
			return function ()
			{
				var d = c.slice();
				d.push.apply(d, arguments);
				return a.apply(this, d)
			}
		}

		function r(a, b)
		{
			for (var c in b) a[c] = b[c]
		}
		var za = Date.now || function ()
		{
			return +new Date
		};

		function Aa(a, b)
		{
			a = a.split(".");
			var c = n;
			a[0] in c || "undefined" == typeof c.execScript ||
				c.execScript("var " + a[0]);
			for (var d; a.length && (d = a.shift());) !a.length && ha(b) ? c[d] = b : c[d] && c[d] !== Object.prototype[d] ? c = c[d] : c = c[d] = {}
		}

		function t(a, b)
		{
			function c()
			{}
			c.prototype = b.prototype;
			a.o = b.prototype;
			a.prototype = new c;
			a.prototype.constructor = a;
			a.cc = function (d, e, f)
			{
				for (var g = Array(arguments.length - 2), h = 2; h < arguments.length; h++) g[h - 2] = arguments[h];
				return b.prototype[e].apply(d, g)
			}
		}

		function Ba(a)
		{
			if (Error.captureStackTrace) Error.captureStackTrace(this, Ba);
			else
			{
				var b = Error().stack;
				b && (this.stack =
					b)
			}
			a && (this.message = String(a))
		}
		t(Ba, Error);
		Ba.prototype.name = "CustomError";
		var Ca;

		function Ea(a, b)
		{
			a = a.split("%s");
			for (var c = "", d = a.length - 1, e = 0; e < d; e++) c += a[e] + (e < b.length ? b[e] : "%s");
			Ba.call(this, c + a[d])
		}
		t(Ea, Ba);
		Ea.prototype.name = "AssertionError";

		function Fa(a, b)
		{
			throw new Ea("Failure" + (a ? ": " + a : ""), Array.prototype.slice.call(arguments, 1));
		}
		var Ga = Array.prototype.indexOf ? function (a, b)
			{
				return Array.prototype.indexOf.call(a, b, void 0)
			} : function (a, b)
			{
				if (p(a)) return p(b) && 1 == b.length ? a.indexOf(b, 0) :
					-1;
				for (var c = 0; c < a.length; c++)
					if (c in a && a[c] === b) return c;
				return -1
			},
			Ha = Array.prototype.forEach ? function (a, b, c)
			{
				Array.prototype.forEach.call(a, b, c)
			} : function (a, b, c)
			{
				for (var d = a.length, e = p(a) ? a.split("") : a, f = 0; f < d; f++) f in e && b.call(c, e[f], f, a)
			};

		function Ia(a, b)
		{
			for (var c = p(a) ? a.split("") : a, d = a.length - 1; 0 <= d; --d) d in c && b.call(void 0, c[d], d, a)
		}
		var Ja = Array.prototype.filter ? function (a, b)
			{
				return Array.prototype.filter.call(a, b, void 0)
			} : function (a, b)
			{
				for (var c = a.length, d = [], e = 0, f = p(a) ? a.split("") : a, g =
						0; g < c; g++)
					if (g in f)
					{
						var h = f[g];
						b.call(void 0, h, g, a) && (d[e++] = h)
					}
				return d
			},
			La = Array.prototype.map ? function (a, b)
			{
				return Array.prototype.map.call(a, b, void 0)
			} : function (a, b)
			{
				for (var c = a.length, d = Array(c), e = p(a) ? a.split("") : a, f = 0; f < c; f++) f in e && (d[f] = b.call(void 0, e[f], f, a));
				return d
			},
			Ma = Array.prototype.some ? function (a, b)
			{
				return Array.prototype.some.call(a, b, void 0)
			} : function (a, b)
			{
				for (var c = a.length, d = p(a) ? a.split("") : a, e = 0; e < c; e++)
					if (e in d && b.call(void 0, d[e], e, a)) return !0;
				return !1
			};

		function Na(a,
			b, c)
		{
			for (var d = a.length, e = p(a) ? a.split("") : a, f = 0; f < d; f++)
				if (f in e && b.call(c, e[f], f, a)) return f;
			return -1
		}

		function Oa(a, b)
		{
			return 0 <= Ga(a, b)
		}

		function Pa(a, b)
		{
			b = Ga(a, b);
			var c;
			(c = 0 <= b) && Qa(a, b);
			return c
		}

		function Qa(a, b)
		{
			return 1 == Array.prototype.splice.call(a, b, 1).length
		}

		function Ra(a, b)
		{
			b = Na(a, b, void 0);
			0 <= b && Qa(a, b)
		}

		function Sa(a, b)
		{
			var c = 0;
			Ia(a, function (d, e)
			{
				b.call(void 0, d, e, a) && Qa(a, e) && c++
			})
		}

		function Ta(a)
		{
			return Array.prototype.concat.apply([], arguments)
		}

		function Ua(a)
		{
			var b = a.length;
			if (0 < b)
			{
				for (var c =
						Array(b), d = 0; d < b; d++) c[d] = a[d];
				return c
			}
			return []
		}

		function Va(a, b, c, d)
		{
			return Array.prototype.splice.apply(a, Wa(arguments, 1))
		}

		function Wa(a, b, c)
		{
			return 2 >= arguments.length ? Array.prototype.slice.call(a, b) : Array.prototype.slice.call(a, b, c)
		}
		var Xa = String.prototype.trim ? function (a)
			{
				return a.trim()
			} : function (a)
			{
				return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1]
			},
			Ya = /&/g,
			Za = /</g,
			$a = />/g,
			ab = /"/g,
			bb = /'/g,
			cb = /\x00/g,
			db = /[\x00&<>"']/;

		function eb(a, b)
		{
			return a < b ? -1 : a > b ? 1 : 0
		}
		var fb;
		a:
		{
			var gb = n.navigator;
			if (gb)
			{
				var hb =
					gb.userAgent;
				if (hb)
				{
					fb = hb;
					break a
				}
			}
			fb = ""
		}

		function u(a)
		{
			return -1 != fb.indexOf(a)
		}

		function ib(a, b, c)
		{
			for (var d in a) b.call(c, a[d], d, a)
		}

		function jb(a)
		{
			var b = {},
				c;
			for (c in a) b[c] = a[c];
			return b
		}
		var kb = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");

		function lb(a, b)
		{
			for (var c, d, e = 1; e < arguments.length; e++)
			{
				d = arguments[e];
				for (c in d) a[c] = d[c];
				for (var f = 0; f < kb.length; f++) c = kb[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c])
			}
		}

		function mb()
		{
			return (u("Chrome") ||
				u("CriOS")) && !u("Edge")
		}

		function nb(a)
		{
			db.test(a) && (-1 != a.indexOf("&") && (a = a.replace(Ya, "&amp;")), -1 != a.indexOf("<") && (a = a.replace(Za, "&lt;")), -1 != a.indexOf(">") && (a = a.replace($a, "&gt;")), -1 != a.indexOf('"') && (a = a.replace(ab, "&quot;")), -1 != a.indexOf("'") && (a = a.replace(bb, "&#39;")), -1 != a.indexOf("\x00") && (a = a.replace(cb, "&#0;")));
			return a
		}

		function ob(a)
		{
			ob[" "](a);
			return a
		}
		ob[" "] = ka;

		function pb(a, b)
		{
			var c = qb;
			return Object.prototype.hasOwnProperty.call(c, a) ? c[a] : c[a] = b(a)
		}
		var rb = u("Opera"),
			v = u("Trident") ||
			u("MSIE"),
			sb = u("Edge"),
			tb = sb || v,
			ub = u("Gecko") && !(-1 != fb.toLowerCase().indexOf("webkit") && !u("Edge")) && !(u("Trident") || u("MSIE")) && !u("Edge"),
			vb = -1 != fb.toLowerCase().indexOf("webkit") && !u("Edge"),
			wb = vb && u("Mobile"),
			xb = u("Macintosh");

		function yb()
		{
			var a = n.document;
			return a ? a.documentMode : void 0
		}
		var zb;
		a:
		{
			var Ab = "",
				Bb = function ()
				{
					var a = fb;
					if (ub) return /rv:([^\);]+)(\)|;)/.exec(a);
					if (sb) return /Edge\/([\d\.]+)/.exec(a);
					if (v) return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);
					if (vb) return /WebKit\/(\S+)/.exec(a);
					if (rb) return /(?:Version)[ \/]?(\S+)/.exec(a)
				}();Bb && (Ab = Bb ? Bb[1] : "");
			if (v)
			{
				var Cb = yb();
				if (null != Cb && Cb > parseFloat(Ab))
				{
					zb = String(Cb);
					break a
				}
			}
			zb = Ab
		}
		var qb = {};

		function Db(a)
		{
			return pb(a, function ()
			{
				for (var b = 0, c = Xa(String(zb)).split("."), d = Xa(String(a)).split("."), e = Math.max(c.length, d.length), f = 0; 0 == b && f < e; f++)
				{
					var g = c[f] || "",
						h = d[f] || "";
					do {
						g = /(\d*)(\D*)(.*)/.exec(g) || ["", "", "", ""];
						h = /(\d*)(\D*)(.*)/.exec(h) || ["", "", "", ""];
						if (0 == g[0].length && 0 == h[0].length) break;
						b = eb(0 == g[1].length ? 0 : parseInt(g[1],
							10), 0 == h[1].length ? 0 : parseInt(h[1], 10)) || eb(0 == g[2].length, 0 == h[2].length) || eb(g[2], h[2]);
						g = g[3];
						h = h[3]
					} while (0 == b)
				}
				return 0 <= b
			})
		}
		var Eb;
		var Fb = n.document;
		Eb = Fb && v ? yb() || ("CSS1Compat" == Fb.compatMode ? parseInt(zb, 10) : 5) : void 0;

		function Gb(a, b)
		{
			this.a = a === Hb && b || "";
			this.f = Ib
		}
		Gb.prototype.ma = !0;
		Gb.prototype.ka = function ()
		{
			return this.a
		};
		Gb.prototype.toString = function ()
		{
			return "Const{" + this.a + "}"
		};

		function Jb(a)
		{
			if (a instanceof Gb && a.constructor === Gb && a.f === Ib) return a.a;
			Fa("expected object of type Const, got '" +
				a + "'");
			return "type_error:Const"
		}
		var Ib = {},
			Hb = {};

		function Kb()
		{
			this.a = "";
			this.h = Lb
		}
		Kb.prototype.ma = !0;
		Kb.prototype.ka = function ()
		{
			return this.a.toString()
		};
		Kb.prototype.f = function ()
		{
			return 1
		};
		Kb.prototype.toString = function ()
		{
			return "TrustedResourceUrl{" + this.a + "}"
		};

		function Mb(a)
		{
			if (a instanceof Kb && a.constructor === Kb && a.h === Lb) return a.a;
			Fa("expected object of type TrustedResourceUrl, got '" + a + "' of type " + ma(a));
			return "type_error:TrustedResourceUrl"
		}
		var Lb = {};

		function Nb(a)
		{
			var b = new Kb;
			b.a = a;
			return b
		}

		function Ob()
		{
			this.a = "";
			this.h = Pb
		}
		Ob.prototype.ma = !0;
		Ob.prototype.ka = function ()
		{
			return this.a.toString()
		};
		Ob.prototype.f = function ()
		{
			return 1
		};
		Ob.prototype.toString = function ()
		{
			return "SafeUrl{" + this.a + "}"
		};

		function Qb(a)
		{
			return Rb(a).toString()
		}

		function Rb(a)
		{
			if (a instanceof Ob && a.constructor === Ob && a.h === Pb) return a.a;
			Fa("expected object of type SafeUrl, got '" + a + "' of type " + ma(a));
			return "type_error:SafeUrl"
		}
		var Sb = /^(?:(?:https?|mailto|ftp):|[^:/?#]*(?:[/?#]|$))/i;

		function Tb(a)
		{
			if (a instanceof Ob) return a;
			a = "object" == typeof a && a.ma ? a.ka() : String(a);
			Sb.test(a) || (a = "about:invalid#zClosurez");
			return Ub(a)
		}
		var Pb = {};

		function Ub(a)
		{
			var b = new Ob;
			b.a = a;
			return b
		}
		Ub("about:blank");

		function Vb()
		{
			this.a = "";
			this.f = Wb
		}
		Vb.prototype.ma = !0;
		var Wb = {};
		Vb.prototype.ka = function ()
		{
			return this.a
		};
		Vb.prototype.toString = function ()
		{
			return "SafeStyle{" + this.a + "}"
		};

		function Xb()
		{
			this.a = "";
			this.j = Yb;
			this.h = null
		}
		Xb.prototype.f = function ()
		{
			return this.h
		};
		Xb.prototype.ma = !0;
		Xb.prototype.ka = function ()
		{
			return this.a.toString()
		};
		Xb.prototype.toString =
			function ()
			{
				return "SafeHtml{" + this.a + "}"
			};

		function Zb(a)
		{
			if (a instanceof Xb && a.constructor === Xb && a.j === Yb) return a.a;
			Fa("expected object of type SafeHtml, got '" + a + "' of type " + ma(a));
			return "type_error:SafeHtml"
		}
		var Yb = {};

		function $b(a, b)
		{
			var c = new Xb;
			c.a = a;
			c.h = b;
			return c
		}
		$b("<!DOCTYPE html>", 0);
		var ac = $b("", 0);
		$b("<br>", 0);
		var bc = function (a)
		{
			var b = !1,
				c;
			return function ()
			{
				b || (c = a(), b = !0);
				return c
			}
		}(function ()
		{
			if ("undefined" === typeof document) return !1;
			var a = document.createElement("div"),
				b = document.createElement("div");
			b.appendChild(document.createElement("div"));
			a.appendChild(b);
			if (!a.firstChild) return !1;
			b = a.firstChild.firstChild;
			a.innerHTML = Zb(ac);
			return !b.parentElement
		});

		function cc(a, b)
		{
			a.src = Mb(b);
			if (null === ja) b:
			{
				b = n.document;
				if ((b = b.querySelector && b.querySelector("script[nonce]")) && (b = b.nonce || b.getAttribute("nonce")) && ia.test(b))
				{
					ja = b;
					break b
				}
				ja = ""
			}
			b = ja;
			b && a.setAttribute("nonce", b)
		}

		function dc(a, b)
		{
			this.a = ha(a) ? a : 0;
			this.f = ha(b) ? b : 0
		}
		dc.prototype.toString = function ()
		{
			return "(" + this.a + ", " + this.f + ")"
		};
		dc.prototype.ceil =
			function ()
			{
				this.a = Math.ceil(this.a);
				this.f = Math.ceil(this.f);
				return this
			};
		dc.prototype.floor = function ()
		{
			this.a = Math.floor(this.a);
			this.f = Math.floor(this.f);
			return this
		};
		dc.prototype.round = function ()
		{
			this.a = Math.round(this.a);
			this.f = Math.round(this.f);
			return this
		};

		function ec(a, b)
		{
			this.width = a;
			this.height = b
		}
		m = ec.prototype;
		m.toString = function ()
		{
			return "(" + this.width + " x " + this.height + ")"
		};
		m.aspectRatio = function ()
		{
			return this.width / this.height
		};
		m.ceil = function ()
		{
			this.width = Math.ceil(this.width);
			this.height =
				Math.ceil(this.height);
			return this
		};
		m.floor = function ()
		{
			this.width = Math.floor(this.width);
			this.height = Math.floor(this.height);
			return this
		};
		m.round = function ()
		{
			this.width = Math.round(this.width);
			this.height = Math.round(this.height);
			return this
		};

		function fc(a)
		{
			return a ? new gc(hc(a)) : Ca || (Ca = new gc)
		}

		function ic(a, b)
		{
			var c = b || document;
			return c.querySelectorAll && c.querySelector ? c.querySelectorAll("." + a) : jc(document, a, b)
		}

		function kc(a, b)
		{
			var c = b || document;
			if (c.getElementsByClassName) a = c.getElementsByClassName(a)[0];
			else
			{
				c = document;
				var d = b || c;
				a = d.querySelectorAll && d.querySelector && a ? d.querySelector(a ? "." + a : "") : jc(c, a, b)[0] || null
			}
			return a || null
		}

		function jc(a, b, c)
		{
			var d;
			a = c || a;
			if (a.querySelectorAll && a.querySelector && b) return a.querySelectorAll(b ? "." + b : "");
			if (b && a.getElementsByClassName)
			{
				var e = a.getElementsByClassName(b);
				return e
			}
			e = a.getElementsByTagName("*");
			if (b)
			{
				var f = {};
				for (c = d = 0; a = e[c]; c++)
				{
					var g = a.className;
					"function" == typeof g.split && Oa(g.split(/\s+/), b) && (f[d++] = a)
				}
				f.length = d;
				return f
			}
			return e
		}

		function lc(a,
			b)
		{
			ib(b, function (c, d)
			{
				c && "object" == typeof c && c.ma && (c = c.ka());
				"style" == d ? a.style.cssText = c : "class" == d ? a.className = c : "for" == d ? a.htmlFor = c : mc.hasOwnProperty(d) ? a.setAttribute(mc[d], c) : 0 == d.lastIndexOf("aria-", 0) || 0 == d.lastIndexOf("data-", 0) ? a.setAttribute(d, c) : a[d] = c
			})
		}
		var mc = {
			cellpadding: "cellPadding",
			cellspacing: "cellSpacing",
			colspan: "colSpan",
			frameborder: "frameBorder",
			height: "height",
			maxlength: "maxLength",
			nonce: "nonce",
			role: "role",
			rowspan: "rowSpan",
			type: "type",
			usemap: "useMap",
			valign: "vAlign",
			width: "width"
		};

		function nc(a)
		{
			return a.scrollingElement ? a.scrollingElement : vb || "CSS1Compat" != a.compatMode ? a.body || a.documentElement : a.documentElement
		}

		function oc(a)
		{
			a && a.parentNode && a.parentNode.removeChild(a)
		}

		function hc(a)
		{
			return 9 == a.nodeType ? a : a.ownerDocument || a.document
		}

		function pc(a, b)
		{
			if ("textContent" in a) a.textContent = b;
			else if (3 == a.nodeType) a.data = String(b);
			else if (a.firstChild && 3 == a.firstChild.nodeType)
			{
				for (; a.lastChild != a.firstChild;) a.removeChild(a.lastChild);
				a.firstChild.data = String(b)
			}
			else
			{
				for (var c; c =
					a.firstChild;) a.removeChild(c);
				a.appendChild(hc(a).createTextNode(String(b)))
			}
		}

		function qc(a, b)
		{
			return b ? rc(a, function (c)
			{
				return !b || p(c.className) && Oa(c.className.split(/\s+/), b)
			}) : null
		}

		function rc(a, b)
		{
			for (var c = 0; a;)
			{
				if (b(a)) return a;
				a = a.parentNode;
				c++
			}
			return null
		}

		function gc(a)
		{
			this.a = a || n.document || document
		}
		gc.prototype.N = function ()
		{
			return p(void 0) ? this.a.getElementById(void 0) : void 0
		};
		var sc = "StopIteration" in n ? n.StopIteration :
		{
			message: "StopIteration",
			stack: ""
		};

		function tc()
		{}
		tc.prototype.next =
			function ()
			{
				throw sc;
			};
		tc.prototype.ha = function ()
		{
			return this
		};

		function uc(a)
		{
			if (a instanceof tc) return a;
			if ("function" == typeof a.ha) return a.ha(!1);
			if (pa(a))
			{
				var b = 0,
					c = new tc;
				c.next = function ()
				{
					for (;;)
					{
						if (b >= a.length) throw sc;
						if (b in a) return a[b++];
						b++
					}
				};
				return c
			}
			throw Error("Not implemented");
		}

		function vc(a, b)
		{
			if (pa(a)) try
			{
				Ha(a, b, void 0)
			}
			catch (c)
			{
				if (c !== sc) throw c;
			}
			else
			{
				a = uc(a);
				try
				{
					for (;;) b.call(void 0, a.next(), void 0, a)
				}
				catch (c$1)
				{
					if (c$1 !== sc) throw c$1;
				}
			}
		}

		function wc(a)
		{
			if (pa(a)) return Ua(a);
			a =
				uc(a);
			var b = [];
			vc(a, function (c)
			{
				b.push(c)
			});
			return b
		}

		function xc(a, b)
		{
			this.f = {};
			this.a = [];
			this.j = this.h = 0;
			var c = arguments.length;
			if (1 < c)
			{
				if (c % 2) throw Error("Uneven number of arguments");
				for (var d = 0; d < c; d += 2) this.set(arguments[d], arguments[d + 1])
			}
			else if (a)
				if (a instanceof xc)
					for (c = a.ja(), d = 0; d < c.length; d++) this.set(c[d], a.get(c[d]));
				else
					for (d in a) this.set(d, a[d])
		}
		m = xc.prototype;
		m.la = function ()
		{
			yc(this);
			for (var a = [], b = 0; b < this.a.length; b++) a.push(this.f[this.a[b]]);
			return a
		};
		m.ja = function ()
		{
			yc(this);
			return this.a.concat()
		};
		m.clear = function ()
		{
			this.f = {};
			this.j = this.h = this.a.length = 0
		};

		function yc(a)
		{
			if (a.h != a.a.length)
			{
				for (var b = 0, c = 0; b < a.a.length;)
				{
					var d = a.a[b];
					zc(a.f, d) && (a.a[c++] = d);
					b++
				}
				a.a.length = c
			}
			if (a.h != a.a.length)
			{
				var e = {};
				for (c = b = 0; b < a.a.length;) d = a.a[b], zc(e, d) || (a.a[c++] = d, e[d] = 1), b++;
				a.a.length = c
			}
		}
		m.get = function (a, b)
		{
			return zc(this.f, a) ? this.f[a] : b
		};
		m.set = function (a, b)
		{
			zc(this.f, a) || (this.h++, this.a.push(a), this.j++);
			this.f[a] = b
		};
		m.forEach = function (a, b)
		{
			for (var c = this.ja(), d = 0; d < c.length; d++)
			{
				var e =
					c[d],
					f = this.get(e);
				a.call(b, f, e, this)
			}
		};
		m.ha = function (a)
		{
			yc(this);
			var b = 0,
				c = this.j,
				d = this,
				e = new tc;
			e.next = function ()
			{
				if (c != d.j) throw Error("The map has changed since the iterator was created");
				if (b >= d.a.length) throw sc;
				var f = d.a[b++];
				return a ? f : d.f[f]
			};
			return e
		};

		function zc(a, b)
		{
			return Object.prototype.hasOwnProperty.call(a, b)
		}
		var Ac = /^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;

		function Bc(a, b)
		{
			if (a)
			{
				a = a.split("&");
				for (var c =
						0; c < a.length; c++)
				{
					var d = a[c].indexOf("="),
						e = null;
					if (0 <= d)
					{
						var f = a[c].substring(0, d);
						e = a[c].substring(d + 1)
					}
					else f = a[c];
					b(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "")
				}
			}
		}

		function Cc(a, b, c, d)
		{
			for (var e = c.length; 0 <= (b = a.indexOf(c, b)) && b < d;)
			{
				var f = a.charCodeAt(b - 1);
				if (38 == f || 63 == f)
					if (f = a.charCodeAt(b + e), !f || 61 == f || 38 == f || 35 == f) return b;
				b += e + 1
			}
			return -1
		}
		var Dc = /#|$/;

		function Ec(a, b)
		{
			var c = a.search(Dc),
				d = Cc(a, 0, b, c);
			if (0 > d) return null;
			var e = a.indexOf("&", d);
			if (0 > e || e > c) e = c;
			d += b.length + 1;
			return decodeURIComponent(a.substr(d,
				e - d).replace(/\+/g, " "))
		}
		var Fc = /[?&]($|#)/;

		function Gc(a, b)
		{
			this.h = this.w = this.j = "";
			this.C = null;
			this.i = this.f = "";
			this.v = !1;
			var c;
			a instanceof Gc ? (this.v = ha(b) ? b : a.v, Hc(this, a.j), this.w = a.w, this.h = a.h, Ic(this, a.C), this.f = a.f, Jc(this, Kc(a.a)), this.i = a.i) : a && (c = String(a).match(Ac)) ? (this.v = !!b, Hc(this, c[1] || "", !0), this.w = Lc(c[2] || ""), this.h = Lc(c[3] || "", !0), Ic(this, c[4]), this.f = Lc(c[5] || "", !0), Jc(this, c[6] || "", !0), this.i = Lc(c[7] || "")) : (this.v = !!b, this.a = new Mc(null, this.v))
		}
		Gc.prototype.toString = function ()
		{
			var a = [],
				b = this.j;
			b && a.push(Nc(b, Oc, !0), ":");
			var c = this.h;
			if (c || "file" == b) a.push("//"), (b = this.w) && a.push(Nc(b, Oc, !0), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.C, null != c && a.push(":", String(c));
			if (c = this.f) this.h && "/" != c.charAt(0) && a.push("/"), a.push(Nc(c, "/" == c.charAt(0) ? Pc : Qc, !0));
			(c = this.a.toString()) && a.push("?", c);
			(c = this.i) && a.push("#", Nc(c, Rc));
			return a.join("")
		};
		Gc.prototype.resolve = function (a)
		{
			var b = new Gc(this),
				c = !!a.j;
			c ? Hc(b, a.j) : c = !!a.w;
			c ? b.w = a.w :
				c = !!a.h;
			c ? b.h = a.h : c = null != a.C;
			var d = a.f;
			if (c) Ic(b, a.C);
			else if (c = !!a.f)
			{
				if ("/" != d.charAt(0))
					if (this.h && !this.f) d = "/" + d;
					else
					{
						var e = b.f.lastIndexOf("/"); - 1 != e && (d = b.f.substr(0, e + 1) + d)
					}
				e = d;
				if (".." == e || "." == e) d = "";
				else if (-1 != e.indexOf("./") || -1 != e.indexOf("/."))
				{
					d = 0 == e.lastIndexOf("/", 0);
					e = e.split("/");
					for (var f = [], g = 0; g < e.length;)
					{
						var h = e[g++];
						"." == h ? d && g == e.length && f.push("") : ".." == h ? ((1 < f.length || 1 == f.length && "" != f[0]) && f.pop(), d && g == e.length && f.push("")) : (f.push(h), d = !0)
					}
					d = f.join("/")
				}
				else d = e
			}
			c ?
				b.f = d : c = "" !== a.a.toString();
			c ? Jc(b, Kc(a.a)) : c = !!a.i;
			c && (b.i = a.i);
			return b
		};

		function Hc(a, b, c)
		{
			a.j = c ? Lc(b, !0) : b;
			a.j && (a.j = a.j.replace(/:$/, ""))
		}

		function Ic(a, b)
		{
			if (b)
			{
				b = Number(b);
				if (isNaN(b) || 0 > b) throw Error("Bad port number " + b);
				a.C = b
			}
			else a.C = null
		}

		function Jc(a, b, c)
		{
			b instanceof Mc ? (a.a = b, Sc(a.a, a.v)) : (c || (b = Nc(b, Tc)), a.a = new Mc(b, a.v))
		}

		function Uc(a)
		{
			return a instanceof Gc ? new Gc(a) : new Gc(a, void 0)
		}

		function Vc(a, b)
		{
			a instanceof Gc || (a = Uc(a));
			b instanceof Gc || (b = Uc(b));
			return a.resolve(b)
		}

		function Lc(a,
			b)
		{
			return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : ""
		}

		function Nc(a, b, c)
		{
			return p(a) ? (a = encodeURI(a).replace(b, Wc), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null
		}

		function Wc(a)
		{
			a = a.charCodeAt(0);
			return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16)
		}
		var Oc = /[#\/\?@]/g,
			Qc = /[#\?:]/g,
			Pc = /[#\?]/g,
			Tc = /[#\?@]/g,
			Rc = /#/g;

		function Mc(a, b)
		{
			this.f = this.a = null;
			this.h = a || null;
			this.j = !!b
		}

		function Xc(a)
		{
			a.a || (a.a = new xc, a.f = 0, a.h && Bc(a.h, function (b, c)
			{
				a.add(decodeURIComponent(b.replace(/\+/g,
					" ")), c)
			}))
		}
		m = Mc.prototype;
		m.add = function (a, b)
		{
			Xc(this);
			this.h = null;
			a = Yc(this, a);
			var c = this.a.get(a);
			c || this.a.set(a, c = []);
			c.push(b);
			this.f += 1;
			return this
		};

		function Zc(a, b)
		{
			Xc(a);
			b = Yc(a, b);
			zc(a.a.f, b) && (a.h = null, a.f -= a.a.get(b).length, a = a.a, zc(a.f, b) && (delete a.f[b], a.h--, a.j++, a.a.length > 2 * a.h && yc(a)))
		}
		m.clear = function ()
		{
			this.a = this.h = null;
			this.f = 0
		};

		function $c(a, b)
		{
			Xc(a);
			b = Yc(a, b);
			return zc(a.a.f, b)
		}
		m.forEach = function (a, b)
		{
			Xc(this);
			this.a.forEach(function (c, d)
			{
				Ha(c, function (e)
					{
						a.call(b, e, d, this)
					},
					this)
			}, this)
		};
		m.ja = function ()
		{
			Xc(this);
			for (var a = this.a.la(), b = this.a.ja(), c = [], d = 0; d < b.length; d++)
				for (var e = a[d], f = 0; f < e.length; f++) c.push(b[d]);
			return c
		};
		m.la = function (a)
		{
			Xc(this);
			var b = [];
			if (p(a)) $c(this, a) && (b = Ta(b, this.a.get(Yc(this, a))));
			else
			{
				a = this.a.la();
				for (var c = 0; c < a.length; c++) b = Ta(b, a[c])
			}
			return b
		};
		m.set = function (a, b)
		{
			Xc(this);
			this.h = null;
			a = Yc(this, a);
			$c(this, a) && (this.f -= this.a.get(a).length);
			this.a.set(a, [b]);
			this.f += 1;
			return this
		};
		m.get = function (a, b)
		{
			if (!a) return b;
			a = this.la(a);
			return 0 <
				a.length ? String(a[0]) : b
		};
		m.toString = function ()
		{
			if (this.h) return this.h;
			if (!this.a) return "";
			for (var a = [], b = this.a.ja(), c = 0; c < b.length; c++)
			{
				var d = b[c],
					e = encodeURIComponent(String(d));
				d = this.la(d);
				for (var f = 0; f < d.length; f++)
				{
					var g = e;
					"" !== d[f] && (g += "=" + encodeURIComponent(String(d[f])));
					a.push(g)
				}
			}
			return this.h = a.join("&")
		};

		function Kc(a)
		{
			var b = new Mc;
			b.h = a.h;
			a.a && (b.a = new xc(a.a), b.f = a.f);
			return b
		}

		function Yc(a, b)
		{
			b = String(b);
			a.j && (b = b.toLowerCase());
			return b
		}

		function Sc(a, b)
		{
			b && !a.j && (Xc(a), a.h = null,
				a.a.forEach(function (c, d)
				{
					var e = d.toLowerCase();
					d != e && (Zc(this, d), Zc(this, e), 0 < c.length && (this.h = null, this.a.set(Yc(this, e), Ua(c)), this.f += c.length))
				}, a));
			a.j = b
		}
		var ad = {
				nc: !0
			},
			bd = {
				pc: !0
			},
			cd = {
				mc: !0
			},
			dd = {
				oc: !0
			};

		function ed()
		{
			throw Error("Do not instantiate directly");
		}
		ed.prototype.ta = null;
		ed.prototype.toString = function ()
		{
			return this.content
		};

		function fd(a, b, c, d)
		{
			a = a(b || gd, void 0, c);
			d = (d || fc()).a.createElement("DIV");
			a = hd(a);
			a.match(id);
			a = $b(a, null);
			if (bc())
				for (; d.lastChild;) d.removeChild(d.lastChild);
			d.innerHTML = Zb(a);
			1 == d.childNodes.length && (a = d.firstChild, 1 == a.nodeType && (d = a));
			return d
		}

		function hd(a)
		{
			if (!ra(a)) return nb(String(a));
			if (a instanceof ed)
			{
				if (a.ea === ad) return a.content;
				if (a.ea === dd) return nb(a.content)
			}
			Fa("Soy template output is unsafe for use as HTML: " + a);
			return "zSoyz"
		}
		var id = /^<(body|caption|col|colgroup|head|html|tr|td|th|tbody|thead|tfoot)>/i,
			gd = {};

		function jd(a)
		{
			if (null != a) switch (a.ta)
			{
			case 1:
				return 1;
			case -1:
				return -1;
			case 0:
				return 0
			}
			return null
		}

		function kd()
		{
			ed.call(this)
		}
		t(kd, ed);
		kd.prototype.ea = ad;

		function x(a)
		{
			return null != a && a.ea === ad ? a : a instanceof Xb ? y(Zb(a).toString(), a.f()) : y(nb(String(String(a))), jd(a))
		}

		function ld()
		{
			ed.call(this)
		}
		t(ld, ed);
		ld.prototype.ea = bd;
		ld.prototype.ta = 1;

		function md(a, b)
		{
			this.content = String(a);
			this.ta = null != b ? b : null
		}
		t(md, ed);
		md.prototype.ea = dd;

		function z(a)
		{
			return new md(a, void 0)
		}
		var y = function (a)
			{
				function b(c)
				{
					this.content = c
				}
				b.prototype = a.prototype;
				return function (c, d)
				{
					c = new b(String(c));
					void 0 !== d && (c.ta = d);
					return c
				}
			}(kd),
			nd = function (a)
			{
				function b(c)
				{
					this.content =
						c
				}
				b.prototype = a.prototype;
				return function (c)
				{
					return new b(String(c))
				}
			}(ld);

		function od(a)
		{
			function b()
			{}
			var c = {
				label: A("New password")
			};
			b.prototype = a;
			a = new b;
			for (var d in c) a[d] = c[d];
			return a
		}

		function A(a)
		{
			return (a = String(a)) ? new md(a, void 0) : ""
		}
		var pd = function (a)
		{
			function b(c)
			{
				this.content = c
			}
			b.prototype = a.prototype;
			return function (c, d)
			{
				c = String(c);
				if (!c) return "";
				c = new b(c);
				void 0 !== d && (c.ta = d);
				return c
			}
		}(kd);

		function qd(a)
		{
			return null != a && a.ea === ad ? String(String(a.content).replace(rd, "").replace(sd,
				"&lt;")).replace(ud, vd) : nb(String(a))
		}

		function wd(a)
		{
			null != a && a.ea === bd ? a = String(a).replace(xd, yd) : a instanceof Ob ? a = String(Qb(a)).replace(xd, yd) : (a = String(a), zd.test(a) ? a = a.replace(xd, yd) : (Fa("Bad value `%s` for |filterNormalizeUri", [a]), a = "#zSoyz"));
			return a
		}
		var Ad = {
			"\x00": "&#0;",
			"\t": "&#9;",
			"\n": "&#10;",
			"\x0B": "&#11;",
			"\f": "&#12;",
			"\r": "&#13;",
			" ": "&#32;",
			'"': "&quot;",
			"&": "&amp;",
			"'": "&#39;",
			"-": "&#45;",
			"/": "&#47;",
			"<": "&lt;",
			"=": "&#61;",
			">": "&gt;",
			"`": "&#96;",
			"": "&#133;",
			" ": "&#160;",
			" ": "&#8232;",
			" ": "&#8233;"
		};

		function vd(a)
		{
			return Ad[a]
		}
		var Bd = {
			"\x00": "%00",
			"\u0001": "%01",
			"\u0002": "%02",
			"\u0003": "%03",
			"\u0004": "%04",
			"\u0005": "%05",
			"\u0006": "%06",
			"\u0007": "%07",
			"\b": "%08",
			"\t": "%09",
			"\n": "%0A",
			"\x0B": "%0B",
			"\f": "%0C",
			"\r": "%0D",
			"\u000e": "%0E",
			"\u000f": "%0F",
			"\u0010": "%10",
			"\u0011": "%11",
			"\u0012": "%12",
			"\u0013": "%13",
			"\u0014": "%14",
			"\u0015": "%15",
			"\u0016": "%16",
			"\u0017": "%17",
			"\u0018": "%18",
			"\u0019": "%19",
			"\u001a": "%1A",
			"\u001b": "%1B",
			"\u001c": "%1C",
			"\u001d": "%1D",
			"\u001e": "%1E",
			"\u001f": "%1F",
			" ": "%20",
			'"': "%22",
			"'": "%27",
			"(": "%28",
			")": "%29",
			"<": "%3C",
			">": "%3E",
			"\\": "%5C",
			"{": "%7B",
			"}": "%7D",
			"": "%7F",
			"": "%C2%85",
			" ": "%C2%A0",
			" ": "%E2%80%A8",
			" ": "%E2%80%A9",
			"！": "%EF%BC%81",
			"＃": "%EF%BC%83",
			"＄": "%EF%BC%84",
			"＆": "%EF%BC%86",
			"＇": "%EF%BC%87",
			"（": "%EF%BC%88",
			"）": "%EF%BC%89",
			"＊": "%EF%BC%8A",
			"＋": "%EF%BC%8B",
			"，": "%EF%BC%8C",
			"／": "%EF%BC%8F",
			"：": "%EF%BC%9A",
			"；": "%EF%BC%9B",
			"＝": "%EF%BC%9D",
			"？": "%EF%BC%9F",
			"＠": "%EF%BC%A0",
			"［": "%EF%BC%BB",
			"］": "%EF%BC%BD"
		};

		function yd(a)
		{
			return Bd[a]
		}
		var ud = /[\x00\x22\x27\x3c\x3e]/g,
			xd = /[\x00- \x22\x27-\x29\x3c\x3e\\\x7b\x7d\x7f\x85\xa0\u2028\u2029\uff01\uff03\uff04\uff06-\uff0c\uff0f\uff1a\uff1b\uff1d\uff1f\uff20\uff3b\uff3d]/g,
			Cd = /^(?!-*(?:expression|(?:moz-)?binding))(?:[.#]?-?(?:[_a-z0-9-]+)(?:-[_a-z0-9-]+)*-?|-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[a-z]{1,2}|%)?|!important|)$/i,
			zd = /^(?![^#?]*\/(?:\.|%2E){2}(?:[\/?#]|$))(?:(?:https?|mailto):|[^&:\/?#]*(?:[\/?#]|$))/i,
			rd = /<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g,
			sd = /</g;

		function Dd()
		{
			return z("Enter a valid phone number")
		}

		function Ed()
		{
			return z("Something went wrong. Please try again.")
		}

		function Fd()
		{
			return z("This email already exists without any means of sign-in. Please reset the password to recover.")
		}

		function Gd()
		{
			return z("Please login again to perform this operation")
		}

		function Hd(a, b, c)
		{
			this.code = Id + a;
			if (!(a = b))
			{
				a = "";
				switch (this.code)
				{
				case "firebaseui/merge-conflict":
					a += "The current anonymous user failed to upgrade. The non-anonymous credential is already associated with a different user account.";
					break;
				default:
					a += Ed()
				}
				a = z(a).toString()
			}
			this.message = a || "";
			this.credential = c || null
		}
		t(Hd, Error);
		Hd.prototype.Z = function ()
		{
			return {
				code: this.code,
				message: this.message
			}
		};
		Hd.prototype.toJSON = function ()
		{
			return this.Z()
		};
		var Id = "firebaseui/";

		function Jd()
		{
			this.V = {}
		}

		function Kd(a, b, c)
		{
			if (b.toLowerCase() in a.V) throw Error("Configuration " + b + " has already been defined.");
			a.V[b.toLowerCase()] = c
		}

		function Ld(a, b, c)
		{
			if (!(b.toLowerCase() in a.V)) throw Error("Configuration " + b + " is not defined.");
			a.V[b.toLowerCase()] =
				c
		}
		Jd.prototype.get = function (a)
		{
			if (!(a.toLowerCase() in this.V)) throw Error("Configuration " + a + " is not defined.");
			return this.V[a.toLowerCase()]
		};

		function Md(a, b)
		{
			a = a.get(b);
			if (!a) throw Error("Configuration " + b + " is required.");
			return a
		}

		function Nd()
		{
			this.f = void 0;
			this.a = {}
		}
		m = Nd.prototype;
		m.set = function (a, b)
		{
			Od(this, a, b, !1)
		};
		m.add = function (a, b)
		{
			Od(this, a, b, !0)
		};

		function Od(a, b, c, d)
		{
			for (var e = 0; e < b.length; e++)
			{
				var f = b.charAt(e);
				a.a[f] || (a.a[f] = new Nd);
				a = a.a[f]
			}
			if (d && void 0 !== a.f) throw Error('The collection already contains the key "' +
				b + '"');
			a.f = c
		}
		m.get = function (a)
		{
			a:
			{
				for (var b = this, c = 0; c < a.length; c++)
					if (b = b.a[a.charAt(c)], !b)
					{
						a = void 0;
						break a
					}
				a = b
			}
			return a ? a.f : void 0
		};
		m.la = function ()
		{
			var a = [];
			Pd(this, a);
			return a
		};

		function Pd(a, b)
		{
			void 0 !== a.f && b.push(a.f);
			for (var c in a.a) Pd(a.a[c], b)
		}
		m.ja = function ()
		{
			var a = [];
			Qd(this, "", a);
			return a
		};

		function Qd(a, b, c)
		{
			void 0 !== a.f && c.push(b);
			for (var d in a.a) Qd(a.a[d], b + d, c)
		}
		m.clear = function ()
		{
			this.a = {};
			this.f = void 0
		};

		function Rd(a)
		{
			this.a = a;
			this.f = new Nd;
			for (a = 0; a < this.a.length; a++)
			{
				var b = this.f.get("+" +
					this.a[a].b);
				b ? b.push(this.a[a]) : this.f.add("+" + this.a[a].b, [this.a[a]])
			}
		}

		function Sd(a, b)
		{
			a = a.f;
			var c = {},
				d = 0;
			void 0 !== a.f && (c[d] = a.f);
			for (; d < b.length; d++)
			{
				var e = b.charAt(d);
				if (!(e in a.a)) break;
				a = a.a[e];
				void 0 !== a.f && (c[d] = a.f)
			}
			for (var f in c)
				if (c.hasOwnProperty(f)) return c[f];
			return []
		}

		function Td(a)
		{
			for (var b = 0; b < Ud.length; b++)
				if (Ud[b].c === a) return Ud[b];
			return null
		}

		function Vd(a)
		{
			a = a.toUpperCase();
			for (var b = [], c = 0; c < Ud.length; c++) Ud[c].g === a && b.push(Ud[c]);
			return b
		}

		function Wd(a)
		{
			if (0 < a.length &&
				"+" == a.charAt(0))
			{
				a = a.substring(1);
				for (var b = [], c = 0; c < Ud.length; c++) Ud[c].b == a && b.push(Ud[c]);
				a = b
			}
			else a = Vd(a);
			return a
		}

		function Xd(a)
		{
			a.sort(function (b, c)
			{
				return b.name.localeCompare(c.name, "en")
			})
		}
		var Ud = [
		{
			name: "Afghanistan",
			c: "93-AF-0",
			b: "93",
			g: "AF"
		},
		{
			name: "Åland Islands",
			c: "358-AX-0",
			b: "358",
			g: "AX"
		},
		{
			name: "Albania",
			c: "355-AL-0",
			b: "355",
			g: "AL"
		},
		{
			name: "Algeria",
			c: "213-DZ-0",
			b: "213",
			g: "DZ"
		},
		{
			name: "American Samoa",
			c: "1-AS-0",
			b: "1",
			g: "AS"
		},
		{
			name: "Andorra",
			c: "376-AD-0",
			b: "376",
			g: "AD"
		},
		{
			name: "Angola",
			c: "244-AO-0",
			b: "244",
			g: "AO"
		},
		{
			name: "Anguilla",
			c: "1-AI-0",
			b: "1",
			g: "AI"
		},
		{
			name: "Antigua and Barbuda",
			c: "1-AG-0",
			b: "1",
			g: "AG"
		},
		{
			name: "Argentina",
			c: "54-AR-0",
			b: "54",
			g: "AR"
		},
		{
			name: "Armenia",
			c: "374-AM-0",
			b: "374",
			g: "AM"
		},
		{
			name: "Aruba",
			c: "297-AW-0",
			b: "297",
			g: "AW"
		},
		{
			name: "Ascension Island",
			c: "247-AC-0",
			b: "247",
			g: "AC"
		},
		{
			name: "Australia",
			c: "61-AU-0",
			b: "61",
			g: "AU"
		},
		{
			name: "Austria",
			c: "43-AT-0",
			b: "43",
			g: "AT"
		},
		{
			name: "Azerbaijan",
			c: "994-AZ-0",
			b: "994",
			g: "AZ"
		},
		{
			name: "Bahamas",
			c: "1-BS-0",
			b: "1",
			g: "BS"
		},
		{
			name: "Bahrain",
			c: "973-BH-0",
			b: "973",
			g: "BH"
		},
		{
			name: "Bangladesh",
			c: "880-BD-0",
			b: "880",
			g: "BD"
		},
		{
			name: "Barbados",
			c: "1-BB-0",
			b: "1",
			g: "BB"
		},
		{
			name: "Belarus",
			c: "375-BY-0",
			b: "375",
			g: "BY"
		},
		{
			name: "Belgium",
			c: "32-BE-0",
			b: "32",
			g: "BE"
		},
		{
			name: "Belize",
			c: "501-BZ-0",
			b: "501",
			g: "BZ"
		},
		{
			name: "Benin",
			c: "229-BJ-0",
			b: "229",
			g: "BJ"
		},
		{
			name: "Bermuda",
			c: "1-BM-0",
			b: "1",
			g: "BM"
		},
		{
			name: "Bhutan",
			c: "975-BT-0",
			b: "975",
			g: "BT"
		},
		{
			name: "Bolivia",
			c: "591-BO-0",
			b: "591",
			g: "BO"
		},
		{
			name: "Bosnia and Herzegovina",
			c: "387-BA-0",
			b: "387",
			g: "BA"
		},
		{
			name: "Botswana",
			c: "267-BW-0",
			b: "267",
			g: "BW"
		},
		{
			name: "Brazil",
			c: "55-BR-0",
			b: "55",
			g: "BR"
		},
		{
			name: "British Indian Ocean Territory",
			c: "246-IO-0",
			b: "246",
			g: "IO"
		},
		{
			name: "British Virgin Islands",
			c: "1-VG-0",
			b: "1",
			g: "VG"
		},
		{
			name: "Brunei",
			c: "673-BN-0",
			b: "673",
			g: "BN"
		},
		{
			name: "Bulgaria",
			c: "359-BG-0",
			b: "359",
			g: "BG"
		},
		{
			name: "Burkina Faso",
			c: "226-BF-0",
			b: "226",
			g: "BF"
		},
		{
			name: "Burundi",
			c: "257-BI-0",
			b: "257",
			g: "BI"
		},
		{
			name: "Cambodia",
			c: "855-KH-0",
			b: "855",
			g: "KH"
		},
		{
			name: "Cameroon",
			c: "237-CM-0",
			b: "237",
			g: "CM"
		},
		{
			name: "Canada",
			c: "1-CA-0",
			b: "1",
			g: "CA"
		},
		{
			name: "Cape Verde",
			c: "238-CV-0",
			b: "238",
			g: "CV"
		},
		{
			name: "Caribbean Netherlands",
			c: "599-BQ-0",
			b: "599",
			g: "BQ"
		},
		{
			name: "Cayman Islands",
			c: "1-KY-0",
			b: "1",
			g: "KY"
		},
		{
			name: "Central African Republic",
			c: "236-CF-0",
			b: "236",
			g: "CF"
		},
		{
			name: "Chad",
			c: "235-TD-0",
			b: "235",
			g: "TD"
		},
		{
			name: "Chile",
			c: "56-CL-0",
			b: "56",
			g: "CL"
		},
		{
			name: "China",
			c: "86-CN-0",
			b: "86",
			g: "CN"
		},
		{
			name: "Christmas Island",
			c: "61-CX-0",
			b: "61",
			g: "CX"
		},
		{
			name: "Cocos [Keeling] Islands",
			c: "61-CC-0",
			b: "61",
			g: "CC"
		},
		{
			name: "Colombia",
			c: "57-CO-0",
			b: "57",
			g: "CO"
		},
		{
			name: "Comoros",
			c: "269-KM-0",
			b: "269",
			g: "KM"
		},
		{
			name: "Democratic Republic Congo",
			c: "243-CD-0",
			b: "243",
			g: "CD"
		},
		{
			name: "Republic of Congo",
			c: "242-CG-0",
			b: "242",
			g: "CG"
		},
		{
			name: "Cook Islands",
			c: "682-CK-0",
			b: "682",
			g: "CK"
		},
		{
			name: "Costa Rica",
			c: "506-CR-0",
			b: "506",
			g: "CR"
		},
		{
			name: "Côte d'Ivoire",
			c: "225-CI-0",
			b: "225",
			g: "CI"
		},
		{
			name: "Croatia",
			c: "385-HR-0",
			b: "385",
			g: "HR"
		},
		{
			name: "Cuba",
			c: "53-CU-0",
			b: "53",
			g: "CU"
		},
		{
			name: "Curaçao",
			c: "599-CW-0",
			b: "599",
			g: "CW"
		},
		{
			name: "Cyprus",
			c: "357-CY-0",
			b: "357",
			g: "CY"
		},
		{
			name: "Czech Republic",
			c: "420-CZ-0",
			b: "420",
			g: "CZ"
		},
		{
			name: "Denmark",
			c: "45-DK-0",
			b: "45",
			g: "DK"
		},
		{
			name: "Djibouti",
			c: "253-DJ-0",
			b: "253",
			g: "DJ"
		},
		{
			name: "Dominica",
			c: "1-DM-0",
			b: "1",
			g: "DM"
		},
		{
			name: "Dominican Republic",
			c: "1-DO-0",
			b: "1",
			g: "DO"
		},
		{
			name: "East Timor",
			c: "670-TL-0",
			b: "670",
			g: "TL"
		},
		{
			name: "Ecuador",
			c: "593-EC-0",
			b: "593",
			g: "EC"
		},
		{
			name: "Egypt",
			c: "20-EG-0",
			b: "20",
			g: "EG"
		},
		{
			name: "El Salvador",
			c: "503-SV-0",
			b: "503",
			g: "SV"
		},
		{
			name: "Equatorial Guinea",
			c: "240-GQ-0",
			b: "240",
			g: "GQ"
		},
		{
			name: "Eritrea",
			c: "291-ER-0",
			b: "291",
			g: "ER"
		},
		{
			name: "Estonia",
			c: "372-EE-0",
			b: "372",
			g: "EE"
		},
		{
			name: "Ethiopia",
			c: "251-ET-0",
			b: "251",
			g: "ET"
		},
		{
			name: "Falkland Islands [Islas Malvinas]",
			c: "500-FK-0",
			b: "500",
			g: "FK"
		},
		{
			name: "Faroe Islands",
			c: "298-FO-0",
			b: "298",
			g: "FO"
		},
		{
			name: "Fiji",
			c: "679-FJ-0",
			b: "679",
			g: "FJ"
		},
		{
			name: "Finland",
			c: "358-FI-0",
			b: "358",
			g: "FI"
		},
		{
			name: "France",
			c: "33-FR-0",
			b: "33",
			g: "FR"
		},
		{
			name: "French Guiana",
			c: "594-GF-0",
			b: "594",
			g: "GF"
		},
		{
			name: "French Polynesia",
			c: "689-PF-0",
			b: "689",
			g: "PF"
		},
		{
			name: "Gabon",
			c: "241-GA-0",
			b: "241",
			g: "GA"
		},
		{
			name: "Gambia",
			c: "220-GM-0",
			b: "220",
			g: "GM"
		},
		{
			name: "Georgia",
			c: "995-GE-0",
			b: "995",
			g: "GE"
		},
		{
			name: "Germany",
			c: "49-DE-0",
			b: "49",
			g: "DE"
		},
		{
			name: "Ghana",
			c: "233-GH-0",
			b: "233",
			g: "GH"
		},
		{
			name: "Gibraltar",
			c: "350-GI-0",
			b: "350",
			g: "GI"
		},
		{
			name: "Greece",
			c: "30-GR-0",
			b: "30",
			g: "GR"
		},
		{
			name: "Greenland",
			c: "299-GL-0",
			b: "299",
			g: "GL"
		},
		{
			name: "Grenada",
			c: "1-GD-0",
			b: "1",
			g: "GD"
		},
		{
			name: "Guadeloupe",
			c: "590-GP-0",
			b: "590",
			g: "GP"
		},
		{
			name: "Guam",
			c: "1-GU-0",
			b: "1",
			g: "GU"
		},
		{
			name: "Guatemala",
			c: "502-GT-0",
			b: "502",
			g: "GT"
		},
		{
			name: "Guernsey",
			c: "44-GG-0",
			b: "44",
			g: "GG"
		},
		{
			name: "Guinea Conakry",
			c: "224-GN-0",
			b: "224",
			g: "GN"
		},
		{
			name: "Guinea-Bissau",
			c: "245-GW-0",
			b: "245",
			g: "GW"
		},
		{
			name: "Guyana",
			c: "592-GY-0",
			b: "592",
			g: "GY"
		},
		{
			name: "Haiti",
			c: "509-HT-0",
			b: "509",
			g: "HT"
		},
		{
			name: "Heard Island and McDonald Islands",
			c: "672-HM-0",
			b: "672",
			g: "HM"
		},
		{
			name: "Honduras",
			c: "504-HN-0",
			b: "504",
			g: "HN"
		},
		{
			name: "Hong Kong",
			c: "852-HK-0",
			b: "852",
			g: "HK"
		},
		{
			name: "Hungary",
			c: "36-HU-0",
			b: "36",
			g: "HU"
		},
		{
			name: "Iceland",
			c: "354-IS-0",
			b: "354",
			g: "IS"
		},
		{
			name: "India",
			c: "91-IN-0",
			b: "91",
			g: "IN"
		},
		{
			name: "Indonesia",
			c: "62-ID-0",
			b: "62",
			g: "ID"
		},
		{
			name: "Iran",
			c: "98-IR-0",
			b: "98",
			g: "IR"
		},
		{
			name: "Iraq",
			c: "964-IQ-0",
			b: "964",
			g: "IQ"
		},
		{
			name: "Ireland",
			c: "353-IE-0",
			b: "353",
			g: "IE"
		},
		{
			name: "Isle of Man",
			c: "44-IM-0",
			b: "44",
			g: "IM"
		},
		{
			name: "Israel",
			c: "972-IL-0",
			b: "972",
			g: "IL"
		},
		{
			name: "Italy",
			c: "39-IT-0",
			b: "39",
			g: "IT"
		},
		{
			name: "Jamaica",
			c: "1-JM-0",
			b: "1",
			g: "JM"
		},
		{
			name: "Japan",
			c: "81-JP-0",
			b: "81",
			g: "JP"
		},
		{
			name: "Jersey",
			c: "44-JE-0",
			b: "44",
			g: "JE"
		},
		{
			name: "Jordan",
			c: "962-JO-0",
			b: "962",
			g: "JO"
		},
		{
			name: "Kazakhstan",
			c: "7-KZ-0",
			b: "7",
			g: "KZ"
		},
		{
			name: "Kenya",
			c: "254-KE-0",
			b: "254",
			g: "KE"
		},
		{
			name: "Kiribati",
			c: "686-KI-0",
			b: "686",
			g: "KI"
		},
		{
			name: "Kosovo",
			c: "377-XK-0",
			b: "377",
			g: "XK"
		},
		{
			name: "Kosovo",
			c: "381-XK-0",
			b: "381",
			g: "XK"
		},
		{
			name: "Kosovo",
			c: "386-XK-0",
			b: "386",
			g: "XK"
		},
		{
			name: "Kuwait",
			c: "965-KW-0",
			b: "965",
			g: "KW"
		},
		{
			name: "Kyrgyzstan",
			c: "996-KG-0",
			b: "996",
			g: "KG"
		},
		{
			name: "Laos",
			c: "856-LA-0",
			b: "856",
			g: "LA"
		},
		{
			name: "Latvia",
			c: "371-LV-0",
			b: "371",
			g: "LV"
		},
		{
			name: "Lebanon",
			c: "961-LB-0",
			b: "961",
			g: "LB"
		},
		{
			name: "Lesotho",
			c: "266-LS-0",
			b: "266",
			g: "LS"
		},
		{
			name: "Liberia",
			c: "231-LR-0",
			b: "231",
			g: "LR"
		},
		{
			name: "Libya",
			c: "218-LY-0",
			b: "218",
			g: "LY"
		},
		{
			name: "Liechtenstein",
			c: "423-LI-0",
			b: "423",
			g: "LI"
		},
		{
			name: "Lithuania",
			c: "370-LT-0",
			b: "370",
			g: "LT"
		},
		{
			name: "Luxembourg",
			c: "352-LU-0",
			b: "352",
			g: "LU"
		},
		{
			name: "Macau",
			c: "853-MO-0",
			b: "853",
			g: "MO"
		},
		{
			name: "Macedonia",
			c: "389-MK-0",
			b: "389",
			g: "MK"
		},
		{
			name: "Madagascar",
			c: "261-MG-0",
			b: "261",
			g: "MG"
		},
		{
			name: "Malawi",
			c: "265-MW-0",
			b: "265",
			g: "MW"
		},
		{
			name: "Malaysia",
			c: "60-MY-0",
			b: "60",
			g: "MY"
		},
		{
			name: "Maldives",
			c: "960-MV-0",
			b: "960",
			g: "MV"
		},
		{
			name: "Mali",
			c: "223-ML-0",
			b: "223",
			g: "ML"
		},
		{
			name: "Malta",
			c: "356-MT-0",
			b: "356",
			g: "MT"
		},
		{
			name: "Marshall Islands",
			c: "692-MH-0",
			b: "692",
			g: "MH"
		},
		{
			name: "Martinique",
			c: "596-MQ-0",
			b: "596",
			g: "MQ"
		},
		{
			name: "Mauritania",
			c: "222-MR-0",
			b: "222",
			g: "MR"
		},
		{
			name: "Mauritius",
			c: "230-MU-0",
			b: "230",
			g: "MU"
		},
		{
			name: "Mayotte",
			c: "262-YT-0",
			b: "262",
			g: "YT"
		},
		{
			name: "Mexico",
			c: "52-MX-0",
			b: "52",
			g: "MX"
		},
		{
			name: "Micronesia",
			c: "691-FM-0",
			b: "691",
			g: "FM"
		},
		{
			name: "Moldova",
			c: "373-MD-0",
			b: "373",
			g: "MD"
		},
		{
			name: "Monaco",
			c: "377-MC-0",
			b: "377",
			g: "MC"
		},
		{
			name: "Mongolia",
			c: "976-MN-0",
			b: "976",
			g: "MN"
		},
		{
			name: "Montenegro",
			c: "382-ME-0",
			b: "382",
			g: "ME"
		},
		{
			name: "Montserrat",
			c: "1-MS-0",
			b: "1",
			g: "MS"
		},
		{
			name: "Morocco",
			c: "212-MA-0",
			b: "212",
			g: "MA"
		},
		{
			name: "Mozambique",
			c: "258-MZ-0",
			b: "258",
			g: "MZ"
		},
		{
			name: "Myanmar [Burma]",
			c: "95-MM-0",
			b: "95",
			g: "MM"
		},
		{
			name: "Namibia",
			c: "264-NA-0",
			b: "264",
			g: "NA"
		},
		{
			name: "Nauru",
			c: "674-NR-0",
			b: "674",
			g: "NR"
		},
		{
			name: "Nepal",
			c: "977-NP-0",
			b: "977",
			g: "NP"
		},
		{
			name: "Netherlands",
			c: "31-NL-0",
			b: "31",
			g: "NL"
		},
		{
			name: "New Caledonia",
			c: "687-NC-0",
			b: "687",
			g: "NC"
		},
		{
			name: "New Zealand",
			c: "64-NZ-0",
			b: "64",
			g: "NZ"
		},
		{
			name: "Nicaragua",
			c: "505-NI-0",
			b: "505",
			g: "NI"
		},
		{
			name: "Niger",
			c: "227-NE-0",
			b: "227",
			g: "NE"
		},
		{
			name: "Nigeria",
			c: "234-NG-0",
			b: "234",
			g: "NG"
		},
		{
			name: "Niue",
			c: "683-NU-0",
			b: "683",
			g: "NU"
		},
		{
			name: "Norfolk Island",
			c: "672-NF-0",
			b: "672",
			g: "NF"
		},
		{
			name: "North Korea",
			c: "850-KP-0",
			b: "850",
			g: "KP"
		},
		{
			name: "Northern Mariana Islands",
			c: "1-MP-0",
			b: "1",
			g: "MP"
		},
		{
			name: "Norway",
			c: "47-NO-0",
			b: "47",
			g: "NO"
		},
		{
			name: "Oman",
			c: "968-OM-0",
			b: "968",
			g: "OM"
		},
		{
			name: "Pakistan",
			c: "92-PK-0",
			b: "92",
			g: "PK"
		},
		{
			name: "Palau",
			c: "680-PW-0",
			b: "680",
			g: "PW"
		},
		{
			name: "Palestinian Territories",
			c: "970-PS-0",
			b: "970",
			g: "PS"
		},
		{
			name: "Panama",
			c: "507-PA-0",
			b: "507",
			g: "PA"
		},
		{
			name: "Papua New Guinea",
			c: "675-PG-0",
			b: "675",
			g: "PG"
		},
		{
			name: "Paraguay",
			c: "595-PY-0",
			b: "595",
			g: "PY"
		},
		{
			name: "Peru",
			c: "51-PE-0",
			b: "51",
			g: "PE"
		},
		{
			name: "Philippines",
			c: "63-PH-0",
			b: "63",
			g: "PH"
		},
		{
			name: "Poland",
			c: "48-PL-0",
			b: "48",
			g: "PL"
		},
		{
			name: "Portugal",
			c: "351-PT-0",
			b: "351",
			g: "PT"
		},
		{
			name: "Puerto Rico",
			c: "1-PR-0",
			b: "1",
			g: "PR"
		},
		{
			name: "Qatar",
			c: "974-QA-0",
			b: "974",
			g: "QA"
		},
		{
			name: "Réunion",
			c: "262-RE-0",
			b: "262",
			g: "RE"
		},
		{
			name: "Romania",
			c: "40-RO-0",
			b: "40",
			g: "RO"
		},
		{
			name: "Russia",
			c: "7-RU-0",
			b: "7",
			g: "RU"
		},
		{
			name: "Rwanda",
			c: "250-RW-0",
			b: "250",
			g: "RW"
		},
		{
			name: "Saint Barthélemy",
			c: "590-BL-0",
			b: "590",
			g: "BL"
		},
		{
			name: "Saint Helena",
			c: "290-SH-0",
			b: "290",
			g: "SH"
		},
		{
			name: "St. Kitts",
			c: "1-KN-0",
			b: "1",
			g: "KN"
		},
		{
			name: "St. Lucia",
			c: "1-LC-0",
			b: "1",
			g: "LC"
		},
		{
			name: "Saint Martin",
			c: "590-MF-0",
			b: "590",
			g: "MF"
		},
		{
			name: "Saint Pierre and Miquelon",
			c: "508-PM-0",
			b: "508",
			g: "PM"
		},
		{
			name: "St. Vincent",
			c: "1-VC-0",
			b: "1",
			g: "VC"
		},
		{
			name: "Samoa",
			c: "685-WS-0",
			b: "685",
			g: "WS"
		},
		{
			name: "San Marino",
			c: "378-SM-0",
			b: "378",
			g: "SM"
		},
		{
			name: "São Tomé and Príncipe",
			c: "239-ST-0",
			b: "239",
			g: "ST"
		},
		{
			name: "Saudi Arabia",
			c: "966-SA-0",
			b: "966",
			g: "SA"
		},
		{
			name: "Senegal",
			c: "221-SN-0",
			b: "221",
			g: "SN"
		},
		{
			name: "Serbia",
			c: "381-RS-0",
			b: "381",
			g: "RS"
		},
		{
			name: "Seychelles",
			c: "248-SC-0",
			b: "248",
			g: "SC"
		},
		{
			name: "Sierra Leone",
			c: "232-SL-0",
			b: "232",
			g: "SL"
		},
		{
			name: "Singapore",
			c: "65-SG-0",
			b: "65",
			g: "SG"
		},
		{
			name: "Sint Maarten",
			c: "1-SX-0",
			b: "1",
			g: "SX"
		},
		{
			name: "Slovakia",
			c: "421-SK-0",
			b: "421",
			g: "SK"
		},
		{
			name: "Slovenia",
			c: "386-SI-0",
			b: "386",
			g: "SI"
		},
		{
			name: "Solomon Islands",
			c: "677-SB-0",
			b: "677",
			g: "SB"
		},
		{
			name: "Somalia",
			c: "252-SO-0",
			b: "252",
			g: "SO"
		},
		{
			name: "South Africa",
			c: "27-ZA-0",
			b: "27",
			g: "ZA"
		},
		{
			name: "South Georgia and the South Sandwich Islands",
			c: "500-GS-0",
			b: "500",
			g: "GS"
		},
		{
			name: "South Korea",
			c: "82-KR-0",
			b: "82",
			g: "KR"
		},
		{
			name: "South Sudan",
			c: "211-SS-0",
			b: "211",
			g: "SS"
		},
		{
			name: "Spain",
			c: "34-ES-0",
			b: "34",
			g: "ES"
		},
		{
			name: "Sri Lanka",
			c: "94-LK-0",
			b: "94",
			g: "LK"
		},
		{
			name: "Sudan",
			c: "249-SD-0",
			b: "249",
			g: "SD"
		},
		{
			name: "Suriname",
			c: "597-SR-0",
			b: "597",
			g: "SR"
		},
		{
			name: "Svalbard and Jan Mayen",
			c: "47-SJ-0",
			b: "47",
			g: "SJ"
		},
		{
			name: "Swaziland",
			c: "268-SZ-0",
			b: "268",
			g: "SZ"
		},
		{
			name: "Sweden",
			c: "46-SE-0",
			b: "46",
			g: "SE"
		},
		{
			name: "Switzerland",
			c: "41-CH-0",
			b: "41",
			g: "CH"
		},
		{
			name: "Syria",
			c: "963-SY-0",
			b: "963",
			g: "SY"
		},
		{
			name: "Taiwan",
			c: "886-TW-0",
			b: "886",
			g: "TW"
		},
		{
			name: "Tajikistan",
			c: "992-TJ-0",
			b: "992",
			g: "TJ"
		},
		{
			name: "Tanzania",
			c: "255-TZ-0",
			b: "255",
			g: "TZ"
		},
		{
			name: "Thailand",
			c: "66-TH-0",
			b: "66",
			g: "TH"
		},
		{
			name: "Togo",
			c: "228-TG-0",
			b: "228",
			g: "TG"
		},
		{
			name: "Tokelau",
			c: "690-TK-0",
			b: "690",
			g: "TK"
		},
		{
			name: "Tonga",
			c: "676-TO-0",
			b: "676",
			g: "TO"
		},
		{
			name: "Trinidad/Tobago",
			c: "1-TT-0",
			b: "1",
			g: "TT"
		},
		{
			name: "Tunisia",
			c: "216-TN-0",
			b: "216",
			g: "TN"
		},
		{
			name: "Turkey",
			c: "90-TR-0",
			b: "90",
			g: "TR"
		},
		{
			name: "Turkmenistan",
			c: "993-TM-0",
			b: "993",
			g: "TM"
		},
		{
			name: "Turks and Caicos Islands",
			c: "1-TC-0",
			b: "1",
			g: "TC"
		},
		{
			name: "Tuvalu",
			c: "688-TV-0",
			b: "688",
			g: "TV"
		},
		{
			name: "U.S. Virgin Islands",
			c: "1-VI-0",
			b: "1",
			g: "VI"
		},
		{
			name: "Uganda",
			c: "256-UG-0",
			b: "256",
			g: "UG"
		},
		{
			name: "Ukraine",
			c: "380-UA-0",
			b: "380",
			g: "UA"
		},
		{
			name: "United Arab Emirates",
			c: "971-AE-0",
			b: "971",
			g: "AE"
		},
		{
			name: "United Kingdom",
			c: "44-GB-0",
			b: "44",
			g: "GB"
		},
		{
			name: "United States",
			c: "1-US-0",
			b: "1",
			g: "US"
		},
		{
			name: "Uruguay",
			c: "598-UY-0",
			b: "598",
			g: "UY"
		},
		{
			name: "Uzbekistan",
			c: "998-UZ-0",
			b: "998",
			g: "UZ"
		},
		{
			name: "Vanuatu",
			c: "678-VU-0",
			b: "678",
			g: "VU"
		},
		{
			name: "Vatican City",
			c: "379-VA-0",
			b: "379",
			g: "VA"
		},
		{
			name: "Venezuela",
			c: "58-VE-0",
			b: "58",
			g: "VE"
		},
		{
			name: "Vietnam",
			c: "84-VN-0",
			b: "84",
			g: "VN"
		},
		{
			name: "Wallis and Futuna",
			c: "681-WF-0",
			b: "681",
			g: "WF"
		},
		{
			name: "Western Sahara",
			c: "212-EH-0",
			b: "212",
			g: "EH"
		},
		{
			name: "Yemen",
			c: "967-YE-0",
			b: "967",
			g: "YE"
		},
		{
			name: "Zambia",
			c: "260-ZM-0",
			b: "260",
			g: "ZM"
		},
		{
			name: "Zimbabwe",
			c: "263-ZW-0",
			b: "263",
			g: "ZW"
		}];
		Xd(Ud);
		var Yd = new Rd(Ud);

		function Zd(a, b)
		{
			this.a = a;
			this.va = b
		}

		function $d(a)
		{
			a = Xa(a);
			var b = Sd(Yd, a);
			return 0 < b.length ? new Zd("1" == b[0].b ? "1-US-0" : b[0].c, Xa(a.substr(b[0].b.length + 1))) : null
		}

		function ae(a)
		{
			var b = Td(a.a);
			if (!b) throw Error("Country ID " + a.a + " not found.");
			return "+" + b.b + a.va
		}

		function be(a, b)
		{
			for (var c = 0; c < a.length; c++)
				if (!Oa(ce, a[c]) && (null !== de && a[c] in de || Oa(b, a[c]))) return a[c];
			return null
		}
		var ce = ["emailLink", "password", "phone"],
			de = {
				"facebook.com": "FacebookAuthProvider",
				"github.com": "GithubAuthProvider",
				"google.com": "GoogleAuthProvider",
				password: "EmailAuthProvider",
				"twitter.com": "TwitterAuthProvider",
				phone: "PhoneAuthProvider"
			};
		var ee = Object.freeze || function (a)
		{
			return a
		};

		function fe(a, b, c)
		{
			this.reset(a, b, c, void 0, void 0)
		}
		fe.prototype.a = null;
		var ge = 0;
		fe.prototype.reset =
			function (a, b, c, d, e)
			{
				"number" == typeof e || ge++;
				this.h = d || za();
				this.j = a;
				this.i = b;
				this.f = c;
				delete this.a
			};

		function he(a)
		{
			this.i = a;
			this.a = this.h = this.j = this.f = null
		}

		function ie(a, b)
		{
			this.name = a;
			this.value = b
		}
		ie.prototype.toString = function ()
		{
			return this.name
		};
		var je = new ie("SEVERE", 1E3),
			ke = new ie("WARNING", 900),
			le = new ie("CONFIG", 700);

		function me(a)
		{
			if (a.j) return a.j;
			if (a.f) return me(a.f);
			Fa("Root logger has no level set.");
			return null
		}
		he.prototype.log = function (a, b, c)
		{
			if (a.value >= me(this).value)
				for (qa(b) &&
					(b = b()), a = new fe(a, String(b), this.i), c && (a.a = c), c = this; c;)
				{
					var d = c,
						e = a;
					if (d.a)
						for (var f = 0; b = d.a[f]; f++) b(e);
					c = c.f
				}
		};
		var ne = {},
			oe = null;

		function pe()
		{
			oe || (oe = new he(""), ne[""] = oe, oe.j = le)
		}

		function qe(a)
		{
			pe();
			var b;
			if (!(b = ne[a]))
			{
				b = new he(a);
				var c = a.lastIndexOf("."),
					d = a.substr(c + 1);
				c = qe(a.substr(0, c));
				c.h || (c.h = {});
				c.h[d] = b;
				b.f = c;
				ne[a] = b
			}
			return b
		}

		function re()
		{
			this.a = za()
		}
		var se = null;
		re.prototype.set = function (a)
		{
			this.a = a
		};
		re.prototype.reset = function ()
		{
			this.set(za())
		};
		re.prototype.get = function ()
		{
			return this.a
		};

		function te(a)
		{
			this.j = a || "";
			se || (se = new re);
			this.i = se
		}
		te.prototype.a = !0;
		te.prototype.f = !0;
		te.prototype.h = !1;

		function ue(a)
		{
			return 10 > a ? "0" + a : String(a)
		}

		function ve(a, b)
		{
			a = (a.h - b) / 1E3;
			b = a.toFixed(3);
			var c = 0;
			if (1 > a) c = 2;
			else
				for (; 100 > a;) c++, a *= 10;
			for (; 0 < c--;) b = " " + b;
			return b
		}

		function we(a)
		{
			te.call(this, a)
		}
		t(we, te);

		function xe(a, b)
		{
			var c = [];
			c.push(a.j, " ");
			if (a.f)
			{
				var d = new Date(b.h);
				c.push("[", ue(d.getFullYear() - 2E3) + ue(d.getMonth() + 1) + ue(d.getDate()) + " " + ue(d.getHours()) + ":" + ue(d.getMinutes()) + ":" + ue(d.getSeconds()) +
					"." + ue(Math.floor(d.getMilliseconds() / 10)), "] ")
			}
			c.push("[", ve(b, a.i.get()), "s] ");
			c.push("[", b.f, "] ");
			c.push(b.i);
			a.h && (b = b.a) && c.push("\n", b instanceof Error ? b.message : b.toString());
			a.a && c.push("\n");
			return c.join("")
		}

		function ye()
		{
			this.i = q(this.h, this);
			this.a = new we;
			this.a.f = !1;
			this.a.h = !1;
			this.f = this.a.a = !1;
			this.j = {}
		}
		ye.prototype.h = function (a)
		{
			function b(f)
			{
				if (f)
				{
					if (f.value >= je.value) return "error";
					if (f.value >= ke.value) return "warn";
					if (f.value >= le.value) return "log"
				}
				return "debug"
			}
			if (!this.j[a.f])
			{
				var c =
					xe(this.a, a),
					d = ze;
				if (d)
				{
					var e = b(a.j);
					Ae(d, e, c, a.a)
				}
			}
		};
		var ze = n.console;

		function Ae(a, b, c, d)
		{
			if (a[b]) a[b](c, d || "");
			else a.log(c, d || "")
		}

		function Be(a, b)
		{
			var c = Ce;
			c && c.log(je, a, b)
		}
		var Ce;
		Ce = qe("firebaseui");
		var De = new ye;
		if (1 != De.f)
		{
			var Ee;
			pe();
			Ee = oe;
			var Fe = De.i;
			Ee.a || (Ee.a = []);
			Ee.a.push(Fe);
			De.f = !0
		}

		function Ge(a)
		{
			var b = Ce;
			b && b.log(ke, a, void 0)
		}

		function He(a)
		{
			if (!a) return !1;
			try
			{
				return !!a.$goog_Thenable
			}
			catch (b)
			{
				return !1
			}
		}

		function Ie(a, b)
		{
			this.h = a;
			this.j = b;
			this.f = 0;
			this.a = null
		}
		Ie.prototype.get = function ()
		{
			if (0 <
				this.f)
			{
				this.f--;
				var a = this.a;
				this.a = a.next;
				a.next = null
			}
			else a = this.h();
			return a
		};

		function Je(a, b)
		{
			a.j(b);
			100 > a.f && (a.f++, b.next = a.a, a.a = b)
		}

		function Ke()
		{
			this.f = this.a = null
		}
		var Me = new Ie(function ()
		{
			return new Le
		}, function (a)
		{
			a.reset()
		});
		Ke.prototype.add = function (a, b)
		{
			var c = Me.get();
			c.set(a, b);
			this.f ? this.f.next = c : this.a = c;
			this.f = c
		};

		function Ne()
		{
			var a = Oe,
				b = null;
			a.a && (b = a.a, a.a = a.a.next, a.a || (a.f = null), b.next = null);
			return b
		}

		function Le()
		{
			this.next = this.f = this.a = null
		}
		Le.prototype.set = function (a, b)
		{
			this.a =
				a;
			this.f = b;
			this.next = null
		};
		Le.prototype.reset = function ()
		{
			this.next = this.f = this.a = null
		};

		function Pe(a)
		{
			n.setTimeout(function ()
			{
				throw a;
			}, 0)
		}
		var Qe;

		function Re()
		{
			var a = n.MessageChannel;
			"undefined" === typeof a && "undefined" !== typeof window && window.postMessage && window.addEventListener && !u("Presto") && (a = function ()
			{
				var e = document.createElement("IFRAME");
				e.style.display = "none";
				e.src = "";
				document.documentElement.appendChild(e);
				var f = e.contentWindow;
				e = f.document;
				e.open();
				e.write("");
				e.close();
				var g = "callImmediate" +
					Math.random(),
					h = "file:" == f.location.protocol ? "*" : f.location.protocol + "//" + f.location.host;
				e = q(function (k)
				{
					if (("*" == h || k.origin == h) && k.data == g) this.port1.onmessage()
				}, this);
				f.addEventListener("message", e, !1);
				this.port1 = {};
				this.port2 = {
					postMessage: function ()
					{
						f.postMessage(g, h)
					}
				}
			});
			if ("undefined" !== typeof a && !u("Trident") && !u("MSIE"))
			{
				var b = new a,
					c = {},
					d = c;
				b.port1.onmessage = function ()
				{
					if (ha(c.next))
					{
						c = c.next;
						var e = c.eb;
						c.eb = null;
						e()
					}
				};
				return function (e)
				{
					d.next = {
						eb: e
					};
					d = d.next;
					b.port2.postMessage(0)
				}
			}
			return "undefined" !==
				typeof document && "onreadystatechange" in document.createElement("SCRIPT") ? function (e)
				{
					var f = document.createElement("SCRIPT");
					f.onreadystatechange = function ()
					{
						f.onreadystatechange = null;
						f.parentNode.removeChild(f);
						f = null;
						e();
						e = null
					};
					document.documentElement.appendChild(f)
				} : function (e)
				{
					n.setTimeout(e, 0)
				}
		}

		function Se(a, b)
		{
			Te || Ue();
			Ve || (Te(), Ve = !0);
			Oe.add(a, b)
		}
		var Te;

		function Ue()
		{
			if (n.Promise && n.Promise.resolve)
			{
				var a = n.Promise.resolve(void 0);
				Te = function ()
				{
					a.then(We)
				}
			}
			else Te = function ()
			{
				var b = We;
				!qa(n.setImmediate) ||
					n.Window && n.Window.prototype && !u("Edge") && n.Window.prototype.setImmediate == n.setImmediate ? (Qe || (Qe = Re()), Qe(b)) : n.setImmediate(b)
			}
		}
		var Ve = !1,
			Oe = new Ke;

		function We()
		{
			for (var a; a = Ne();)
			{
				try
				{
					a.a.call(a.f)
				}
				catch (b)
				{
					Pe(b)
				}
				Je(Me, a)
			}
			Ve = !1
		}

		function Xe(a)
		{
			this.a = Ye;
			this.w = void 0;
			this.j = this.f = this.h = null;
			this.i = this.v = !1;
			if (a != ka) try
			{
				var b = this;
				a.call(void 0, function (c)
				{
					Ze(b, $e, c)
				}, function (c)
				{
					if (!(c instanceof af)) try
					{
						if (c instanceof Error) throw c;
						throw Error("Promise rejected.");
					}
					catch (d)
					{}
					Ze(b, bf, c)
				})
			}
			catch (c)
			{
				Ze(this,
					bf, c)
			}
		}
		var Ye = 0,
			$e = 2,
			bf = 3;

		function cf()
		{
			this.next = this.context = this.f = this.h = this.a = null;
			this.j = !1
		}
		cf.prototype.reset = function ()
		{
			this.context = this.f = this.h = this.a = null;
			this.j = !1
		};
		var df = new Ie(function ()
		{
			return new cf
		}, function (a)
		{
			a.reset()
		});

		function ef(a, b, c)
		{
			var d = df.get();
			d.h = a;
			d.f = b;
			d.context = c;
			return d
		}

		function B(a)
		{
			if (a instanceof Xe) return a;
			var b = new Xe(ka);
			Ze(b, $e, a);
			return b
		}

		function ff(a)
		{
			return new Xe(function (b, c)
			{
				c(a)
			})
		}
		Xe.prototype.then = function (a, b, c)
		{
			return gf(this, qa(a) ? a : null,
				qa(b) ? b : null, c)
		};
		Xe.prototype.$goog_Thenable = !0;

		function hf(a, b)
		{
			return gf(a, null, b, void 0)
		}
		Xe.prototype.cancel = function (a)
		{
			this.a == Ye && Se(function ()
			{
				var b = new af(a);
				jf(this, b)
			}, this)
		};

		function jf(a, b)
		{
			if (a.a == Ye)
				if (a.h)
				{
					var c = a.h;
					if (c.f)
					{
						for (var d = 0, e = null, f = null, g = c.f; g && (g.j || (d++, g.a == a && (e = g), !(e && 1 < d))); g = g.next) e || (f = g);
						e && (c.a == Ye && 1 == d ? jf(c, b) : (f ? (d = f, d.next == c.j && (c.j = d), d.next = d.next.next) : kf(c), lf(c, e, bf, b)))
					}
					a.h = null
				}
			else Ze(a, bf, b)
		}

		function mf(a, b)
		{
			a.f || a.a != $e && a.a != bf || nf(a);
			a.j ? a.j.next =
				b : a.f = b;
			a.j = b
		}

		function gf(a, b, c, d)
		{
			var e = ef(null, null, null);
			e.a = new Xe(function (f, g)
			{
				e.h = b ? function (h)
				{
					try
					{
						var k = b.call(d, h);
						f(k)
					}
					catch (l)
					{
						g(l)
					}
				} : f;
				e.f = c ? function (h)
				{
					try
					{
						var k = c.call(d, h);
						!ha(k) && h instanceof af ? g(h) : f(k)
					}
					catch (l)
					{
						g(l)
					}
				} : g
			});
			e.a.h = a;
			mf(a, e);
			return e.a
		}
		Xe.prototype.F = function (a)
		{
			this.a = Ye;
			Ze(this, $e, a)
		};
		Xe.prototype.I = function (a)
		{
			this.a = Ye;
			Ze(this, bf, a)
		};

		function Ze(a, b, c)
		{
			if (a.a == Ye)
			{
				a === c && (b = bf, c = new TypeError("Promise cannot resolve to itself"));
				a.a = 1;
				a:
				{
					var d = c,
						e = a.F,
						f = a.I;
					if (d instanceof Xe)
					{
						mf(d, ef(e || ka, f || null, a));
						var g = !0
					}
					else if (He(d)) d.then(e, f, a),
					g = !0;
					else
					{
						if (ra(d)) try
						{
							var h = d.then;
							if (qa(h))
							{ of (d, h, e, f, a);
								g = !0;
								break a
							}
						}
						catch (k)
						{
							f.call(a, k);
							g = !0;
							break a
						}
						g = !1
					}
				}
				g || (a.w = c, a.a = b, a.h = null, nf(a), b != bf || c instanceof af || pf(a, c))
			}
		}

		function of (a, b, c, d, e)
		{
			function f(k)
			{
				h || (h = !0, d.call(e, k))
			}

			function g(k)
			{
				h || (h = !0, c.call(e, k))
			}
			var h = !1;
			try
			{
				b.call(a, g, f)
			}
			catch (k)
			{
				f(k)
			}
		}

		function nf(a)
		{
			a.v || (a.v = !0, Se(a.C, a))
		}

		function kf(a)
		{
			var b = null;
			a.f && (b = a.f, a.f = b.next, b.next = null);
			a.f || (a.j = null);
			return b
		}
		Xe.prototype.C = function ()
		{
			for (var a; a = kf(this);) lf(this, a, this.a, this.w);
			this.v = !1
		};

		function lf(a, b, c, d)
		{
			if (c == bf && b.f && !b.j)
				for (; a && a.i; a = a.h) a.i = !1;
			if (b.a) b.a.h = null, qf(b, c, d);
			else try
			{
				b.j ? b.h.call(b.context) : qf(b, c, d)
			}
			catch (e)
			{
				rf.call(null, e)
			}
			Je(df, b)
		}

		function qf(a, b, c)
		{
			b == $e ? a.h.call(a.context, c) : a.f && a.f.call(a.context, c)
		}

		function pf(a, b)
		{
			a.i = !0;
			Se(function ()
			{
				a.i && rf.call(null, b)
			})
		}
		var rf = Pe;

		function af(a)
		{
			Ba.call(this, a)
		}
		t(af, Ba);
		af.prototype.name = "cancel";
		var sf = !v || 9 <= Number(Eb),
			tf = v && !Db("9"),
			uf = function ()
			{
				if (!n.addEventListener || !Object.defineProperty) return !1;
				var a = !1,
					b = Object.defineProperty(
					{}, "passive",
					{
						get: function ()
						{
							a = !0
						}
					});
				try
				{
					n.addEventListener("test", ka, b), n.removeEventListener("test", ka, b)
				}
				catch (c)
				{}
				return a
			}();

		function vf()
		{
			0 != wf && (xf[this[ta] || (this[ta] = ++ua)] = this);
			this.O = this.O;
			this.C = this.C
		}
		var wf = 0,
			xf = {};
		vf.prototype.O = !1;
		vf.prototype.m = function ()
		{
			if (!this.O && (this.O = !0, this.l(), 0 != wf))
			{
				var a = this[ta] || (this[ta] = ++ua);
				if (0 != wf && this.C && 0 < this.C.length) throw Error(this +
					" did not empty its onDisposeCallbacks queue. This probably means it overrode dispose() or disposeInternal() without calling the superclass' method.");
				delete xf[a]
			}
		};

		function yf(a, b)
		{
			a.O ? ha(void 0) ? b.call(void 0) : b() : (a.C || (a.C = []), a.C.push(ha(void 0) ? q(b, void 0) : b))
		}
		vf.prototype.l = function ()
		{
			if (this.C)
				for (; this.C.length;) this.C.shift()()
		};

		function zf(a)
		{
			a && "function" == typeof a.m && a.m()
		}

		function Af(a, b)
		{
			this.type = a;
			this.f = this.target = b;
			this.h = !1;
			this.mb = !0
		}
		Af.prototype.stopPropagation = function ()
		{
			this.h = !0
		};
		Af.prototype.preventDefault = function ()
		{
			this.mb = !1
		};

		function Bf(a, b)
		{
			Af.call(this, a ? a.type : "");
			this.relatedTarget = this.f = this.target = null;
			this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0;
			this.key = "";
			this.j = this.keyCode = 0;
			this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
			this.pointerId = 0;
			this.pointerType = "";
			this.a = null;
			if (a)
			{
				var c = this.type = a.type,
					d = a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : null;
				this.target = a.target || a.srcElement;
				this.f = b;
				if (b = a.relatedTarget)
				{
					if (ub)
					{
						a:
						{
							try
							{
								ob(b.nodeName);
								var e = !0;
								break a
							}
							catch (f)
							{}
							e = !1
						}
						e || (b = null)
					}
				}
				else "mouseover" == c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);
				this.relatedTarget = b;
				d ? (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0) : (this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0);
				this.button = a.button;
				this.keyCode = a.keyCode || 0;
				this.key = a.key ||
					"";
				this.j = a.charCode || ("keypress" == c ? a.keyCode : 0);
				this.ctrlKey = a.ctrlKey;
				this.altKey = a.altKey;
				this.shiftKey = a.shiftKey;
				this.metaKey = a.metaKey;
				this.pointerId = a.pointerId || 0;
				this.pointerType = p(a.pointerType) ? a.pointerType : Cf[a.pointerType] || "";
				this.a = a;
				a.defaultPrevented && this.preventDefault()
			}
		}
		t(Bf, Af);
		var Cf = ee(
		{
			2: "touch",
			3: "pen",
			4: "mouse"
		});
		Bf.prototype.stopPropagation = function ()
		{
			Bf.o.stopPropagation.call(this);
			this.a.stopPropagation ? this.a.stopPropagation() : this.a.cancelBubble = !0
		};
		Bf.prototype.preventDefault =
			function ()
			{
				Bf.o.preventDefault.call(this);
				var a = this.a;
				if (a.preventDefault) a.preventDefault();
				else if (a.returnValue = !1, tf) try
				{
					if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode) a.keyCode = -1
				}
				catch (b)
				{}
			};
		var Df = "closure_listenable_" + (1E6 * Math.random() | 0),
			Ef = 0;

		function Ff(a, b, c, d, e)
		{
			this.listener = a;
			this.proxy = null;
			this.src = b;
			this.type = c;
			this.capture = !!d;
			this.Fa = e;
			this.key = ++Ef;
			this.qa = this.Ca = !1
		}

		function Gf(a)
		{
			a.qa = !0;
			a.listener = null;
			a.proxy = null;
			a.src = null;
			a.Fa = null
		}

		function Hf(a)
		{
			this.src = a;
			this.a = {};
			this.f =
				0
		}
		Hf.prototype.add = function (a, b, c, d, e)
		{
			var f = a.toString();
			a = this.a[f];
			a || (a = this.a[f] = [], this.f++);
			var g = If(a, b, d, e); - 1 < g ? (b = a[g], c || (b.Ca = !1)) : (b = new Ff(b, this.src, f, !!d, e), b.Ca = c, a.push(b));
			return b
		};

		function Jf(a, b)
		{
			var c = b.type;
			c in a.a && Pa(a.a[c], b) && (Gf(b), 0 == a.a[c].length && (delete a.a[c], a.f--))
		}

		function If(a, b, c, d)
		{
			for (var e = 0; e < a.length; ++e)
			{
				var f = a[e];
				if (!f.qa && f.listener == b && f.capture == !!c && f.Fa == d) return e
			}
			return -1
		}
		var Kf = "closure_lm_" + (1E6 * Math.random() | 0),
			Lf = {},
			Mf = 0;

		function Nf(a, b,
			c, d, e)
		{
			if (d && d.once) return Of(a, b, c, d, e);
			if (oa(b))
			{
				for (var f = 0; f < b.length; f++) Nf(a, b[f], c, d, e);
				return null
			}
			c = Pf(c);
			return a && a[Df] ? a.F.add(String(b), c, !1, ra(d) ? !!d.capture : !!d, e) : Qf(a, b, c, !1, d, e)
		}

		function Qf(a, b, c, d, e, f)
		{
			if (!b) throw Error("Invalid event type");
			var g = ra(e) ? !!e.capture : !!e,
				h = Rf(a);
			h || (a[Kf] = h = new Hf(a));
			c = h.add(b, c, d, g, f);
			if (c.proxy) return c;
			d = Sf();
			c.proxy = d;
			d.src = a;
			d.listener = c;
			if (a.addEventListener) uf || (e = g), void 0 === e && (e = !1), a.addEventListener(b.toString(), d, e);
			else if (a.attachEvent) a.attachEvent(Tf(b.toString()),
				d);
			else if (a.addListener && a.removeListener) a.addListener(d);
			else throw Error("addEventListener and attachEvent are unavailable.");
			Mf++;
			return c
		}

		function Sf()
		{
			var a = Uf,
				b = sf ? function (c)
				{
					return a.call(b.src, b.listener, c)
				} : function (c)
				{
					c = a.call(b.src, b.listener, c);
					if (!c) return c
				};
			return b
		}

		function Of(a, b, c, d, e)
		{
			if (oa(b))
			{
				for (var f = 0; f < b.length; f++) Of(a, b[f], c, d, e);
				return null
			}
			c = Pf(c);
			return a && a[Df] ? a.F.add(String(b), c, !0, ra(d) ? !!d.capture : !!d, e) : Qf(a, b, c, !0, d, e)
		}

		function Vf(a, b, c, d, e)
		{
			if (oa(b))
				for (var f =
						0; f < b.length; f++) Vf(a, b[f], c, d, e);
			else(d = ra(d) ? !!d.capture : !!d, c = Pf(c), a && a[Df]) ? (a = a.F, b = String(b).toString(), b in a.a && (f = a.a[b], c = If(f, c, d, e), -1 < c && (Gf(f[c]), Qa(f, c), 0 == f.length && (delete a.a[b], a.f--)))) : a && (a = Rf(a)) && (b = a.a[b.toString()], a = -1, b && (a = If(b, c, d, e)), (c = -1 < a ? b[a] : null) && Wf(c))
		}

		function Wf(a)
		{
			if ("number" != typeof a && a && !a.qa)
			{
				var b = a.src;
				if (b && b[Df]) Jf(b.F, a);
				else
				{
					var c = a.type,
						d = a.proxy;
					b.removeEventListener ? b.removeEventListener(c, d, a.capture) : b.detachEvent ? b.detachEvent(Tf(c), d) : b.addListener &&
						b.removeListener && b.removeListener(d);
					Mf--;
					(c = Rf(b)) ? (Jf(c, a), 0 == c.f && (c.src = null, b[Kf] = null)) : Gf(a)
				}
			}
		}

		function Tf(a)
		{
			return a in Lf ? Lf[a] : Lf[a] = "on" + a
		}

		function Xf(a, b, c, d)
		{
			var e = !0;
			if (a = Rf(a))
				if (b = a.a[b.toString()])
					for (b = b.concat(), a = 0; a < b.length; a++)
					{
						var f = b[a];
						f && f.capture == c && !f.qa && (f = Yf(f, d), e = e && !1 !== f)
					}
			return e
		}

		function Yf(a, b)
		{
			var c = a.listener,
				d = a.Fa || a.src;
			a.Ca && Wf(a);
			return c.call(d, b)
		}

		function Uf(a, b)
		{
			if (a.qa) return !0;
			if (!sf)
			{
				if (!b) a:
				{
					b = ["window", "event"];
					for (var c = n, d = 0; d < b.length; d++)
						if (c =
							c[b[d]], null == c)
						{
							b = null;
							break a
						}
					b = c
				}
				d = b;
				b = new Bf(d, this);
				c = !0;
				if (!(0 > d.keyCode || void 0 != d.returnValue))
				{
					a:
					{
						var e = !1;
						if (0 == d.keyCode) try
						{
							d.keyCode = -1;
							break a
						}
						catch (g)
						{
							e = !0
						}
						if (e || void 0 == d.returnValue) d.returnValue = !0
					}
					d = [];
					for (e = b.f; e; e = e.parentNode) d.push(e);a = a.type;
					for (e = d.length - 1; !b.h && 0 <= e; e--)
					{
						b.f = d[e];
						var f = Xf(d[e], a, !0, b);
						c = c && f
					}
					for (e = 0; !b.h && e < d.length; e++) b.f = d[e],
					f = Xf(d[e], a, !1, b),
					c = c && f
				}
				return c
			}
			return Yf(a, new Bf(b, this))
		}

		function Rf(a)
		{
			a = a[Kf];
			return a instanceof Hf ? a : null
		}
		var Zf = "__closure_events_fn_" +
			(1E9 * Math.random() >>> 0);

		function Pf(a)
		{
			if (qa(a)) return a;
			a[Zf] || (a[Zf] = function (b)
			{
				return a.handleEvent(b)
			});
			return a[Zf]
		}

		function $f(a, b, c)
		{
			b || (b = {});
			c = c || window;
			var d = a instanceof Ob ? a : Tb("undefined" != typeof a.href ? a.href : String(a));
			a = b.target || a.target;
			var e = [];
			for (f in b) switch (f)
			{
			case "width":
			case "height":
			case "top":
			case "left":
				e.push(f + "=" + b[f]);
				break;
			case "target":
			case "noopener":
			case "noreferrer":
				break;
			default:
				e.push(f + "=" + (b[f] ? 1 : 0))
			}
			var f = e.join(",");
			(u("iPhone") && !u("iPod") && !u("iPad") ||
				u("iPad") || u("iPod")) && c.navigator && c.navigator.standalone && a && "_self" != a ? (f = c.document.createElement("A"), d instanceof Ob || d instanceof Ob || (d = "object" == typeof d && d.ma ? d.ka() : String(d), Sb.test(d) || (d = "about:invalid#zClosurez"), d = Ub(d)), f.href = Rb(d), f.setAttribute("target", a), b.noreferrer && f.setAttribute("rel", "noreferrer"), b = document.createEvent("MouseEvent"), b.initMouseEvent("click", !0, !0, c, 1), f.dispatchEvent(b), c = {}) : b.noreferrer ? (c = c.open("", a, f), b = Qb(d), c && (tb && -1 != b.indexOf(";") && (b = "'" + b.replace(/'/g,
				"%27") + "'"), c.opener = null, b = $b('<meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0; url=' + nb(b) + '">', null), c.document.write(Zb(b)), c.document.close())) : (c = c.open(Qb(d), a, f)) && b.noopener && (c.opener = null);
			return c
		}

		function ag(a)
		{
			window.location.assign(Qb(Tb(a)))
		}

		function bg()
		{
			try
			{
				return !!(window.opener && window.opener.location && window.opener.location.assign && window.opener.location.hostname === window.location.hostname && window.opener.location.protocol === window.location.protocol)
			}
			catch (a)
			{}
			return !1
		}

		function cg(a)
		{
			$f(a,
			{
				target: window.cordova && window.cordova.InAppBrowser ? "_system" : "_blank"
			}, void 0)
		}

		function dg(a)
		{
			a = ra(a) && 1 == a.nodeType ? a : document.querySelector(String(a));
			if (null == a) throw Error("Could not find the FirebaseUI widget element on the page.");
			return a
		}

		function eg()
		{
			return window.location.href
		}

		function fg()
		{
			var a = null;
			return hf(new Xe(function (b)
			{
				"complete" == n.document.readyState ? b() : (a = function ()
				{
					b()
				}, Of(window, "load", a))
			}), function (b)
			{
				Vf(window, "load", a);
				throw b;
			})
		}

		function gg()
		{
			for (var a =
					32, b = []; 0 < a;) b.push("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(62 * Math.random()))), a--;
			return b.join("")
		}

		function hg()
		{
			this.a = new Jd;
			Kd(this.a, "acUiConfig");
			Kd(this.a, "autoUpgradeAnonymousUsers");
			Kd(this.a, "callbacks");
			Kd(this.a, "credentialHelper", ig);
			Kd(this.a, "immediateFederatedRedirect", !1);
			Kd(this.a, "popupMode", !1);
			Kd(this.a, "privacyPolicyUrl");
			Kd(this.a, "queryParameterForSignInSuccessUrl", "signInSuccessUrl");
			Kd(this.a, "queryParameterForWidgetMode", "mode");
			Kd(this.a, "signInFlow");
			Kd(this.a, "signInOptions");
			Kd(this.a, "signInSuccessUrl");
			Kd(this.a, "siteName");
			Kd(this.a, "tosUrl");
			Kd(this.a, "widgetUrl")
		}
		var ig = "accountchooser.com",
			jg = {
				Sb: ig,
				Vb: "googleyolo",
				NONE: "none"
			},
			kg = {
				Wb: "popup",
				Yb: "redirect"
			};

		function lg(a)
		{
			return a.a.get("acUiConfig") || null
		}
		var mg = {
				Ub: "callback",
				Xb: "recoverEmail",
				Zb: "resetPassword",
				$b: "select",
				ac: "signIn",
				bc: "verifyEmail"
			},
			og = ["anonymous"],
			pg = ["sitekey", "tabindex", "callback", "expired-callback"];

		function qg(a)
		{
			var b = a.a.get("widgetUrl") ||
				eg();
			return rg(a, b)
		}

		function rg(a, b)
		{
			a = sg(a);
			for (var c = b.search(Dc), d = 0, e, f = []; 0 <= (e = Cc(b, d, a, c));) f.push(b.substring(d, e)), d = Math.min(b.indexOf("&", e) + 1 || c, c);
			f.push(b.substr(d));
			b = f.join("").replace(Fc, "$1");
			c = "=" + encodeURIComponent("select");
			(a += c) ? (c = b.indexOf("#"), 0 > c && (c = b.length), d = b.indexOf("?"), 0 > d || d > c ? (d = c, e = "") : e = b.substring(d + 1, c), b = [b.substr(0, d), e, b.substr(c)], c = b[1], b[1] = a ? c ? c + "&" + a : a : c, a = b[0] + (b[1] ? "?" + b[1] : "") + b[2]) : a = b;
			return a
		}

		function tg(a)
		{
			var b = !!a.a.get("autoUpgradeAnonymousUsers");
			b && !ug(a) && Be('Missing "signInFailure" callback: "signInFailure" callback needs to be provided when "autoUpgradeAnonymousUsers" is set to true.', void 0);
			return b
		}

		function vg(a)
		{
			a = a.a.get("signInOptions") || [];
			for (var b = [], c = 0; c < a.length; c++)
			{
				var d = a[c];
				d = ra(d) ? d :
				{
					provider: d
				};
				d.provider && b.push(d)
			}
			return b
		}

		function wg(a, b)
		{
			a = vg(a);
			for (var c = 0; c < a.length; c++)
				if (a[c].provider === b) return a[c];
			return null
		}

		function xg(a)
		{
			return La(vg(a), function (b)
			{
				return b.provider
			})
		}

		function yg(a, b)
		{
			a = zg(a);
			for (var c =
					0; c < a.length; c++)
				if (a[c].providerId === b) return a[c];
			return null
		}

		function zg(a)
		{
			return La(vg(a), function (b)
			{
				return de[b.provider] || Oa(og, b.provider) ?
				{
					providerId: b.provider
				} :
				{
					providerId: b.provider,
					lb: b.providerName || null,
					cb: b.buttonColor || null,
					jb: b.iconUrl ? Qb(Tb(b.iconUrl)) : null,
					Db: b.loginHintKey || null
				}
			})
		}

		function Ag(a)
		{
			var b = [],
				c = [];
			Ha(vg(a), function (e)
			{
				e.authMethod && (b.push(e.authMethod), e.clientId && c.push(
				{
					uri: e.authMethod,
					clientId: e.clientId
				}))
			});
			var d = null;
			"googleyolo" === Bg(a) && b.length && (d = {
				supportedIdTokenProviders: c,
				supportedAuthMethods: b
			});
			return d
		}

		function Cg(a, b)
		{
			var c = null;
			Ha(vg(a), function (d)
			{
				d.authMethod === b && (c = d.provider)
			});
			return c
		}

		function Dg(a)
		{
			var b = null;
			Ha(vg(a), function (d)
			{
				d.provider == firebase.auth.PhoneAuthProvider.PROVIDER_ID && ra(d.recaptchaParameters) && !oa(d.recaptchaParameters) && (b = jb(d.recaptchaParameters))
			});
			if (b)
			{
				var c = [];
				Ha(pg, function (d)
				{
					"undefined" !== typeof b[d] && (c.push(d), delete b[d])
				});
				c.length && Ge('The following provided "recaptchaParameters" keys are not allowed: ' + c.join(", "))
			}
			return b
		}

		function Eg(a, b)
		{
			a = (a = wg(a, b)) && a.scopes;
			return oa(a) ? a : []
		}

		function Fg(a, b)
		{
			a = (a = wg(a, b)) && a.customParameters;
			return ra(a) ? (a = jb(a), b === firebase.auth.GoogleAuthProvider.PROVIDER_ID && delete a.login_hint, b === firebase.auth.GithubAuthProvider.PROVIDER_ID && delete a.login, a) : null
		}

		function Gg(a)
		{
			a = wg(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID);
			var b = null;
			a && p(a.loginHint) && (b = $d(a.loginHint));
			return a && a.defaultNationalNumber || b && b.va || null
		}

		function Hg(a)
		{
			var b = (a = wg(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID)) &&
				a.defaultCountry || null;
			b = b && Vd(b);
			var c = null;
			a && p(a.loginHint) && (c = $d(a.loginHint));
			return b && b[0] || c && Td(c.a) || null
		}

		function Ig(a)
		{
			a = wg(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID);
			if (!a) return null;
			var b = a.whitelistedCountries,
				c = a.blacklistedCountries;
			if ("undefined" !== typeof b && (!oa(b) || 0 == b.length)) throw Error("WhitelistedCountries must be a non-empty array.");
			if ("undefined" !== typeof c && !oa(c)) throw Error("BlacklistedCountries must be an array.");
			if (b && c) throw Error("Both whitelistedCountries and blacklistedCountries are provided.");
			if (!b && !c) return Ud;
			a = [];
			if (b)
			{
				c = {};
				for (var d = 0; d < b.length; d++)
				{
					var e = Wd(b[d]);
					for (var f = 0; f < e.length; f++) c[e[f].c] = e[f]
				}
				for (var g in c) c.hasOwnProperty(g) && a.push(c[g])
			}
			else
			{
				g = {};
				for (d = 0; d < c.length; d++)
					for (e = Wd(c[d]), f = 0; f < e.length; f++) g[e[f].c] = e[f];
				for (b = 0; b < Ud.length; b++) null !== g && Ud[b].c in g || a.push(Ud[b])
			}
			return a
		}

		function sg(a)
		{
			return Md(a.a, "queryParameterForWidgetMode")
		}

		function C(a)
		{
			var b = a.a.get("tosUrl") || null;
			a = a.a.get("privacyPolicyUrl") || null;
			b && !a && Ge("Privacy Policy URL is missing, the link will not be displayed.");
			if (b && a)
			{
				if (qa(b)) return b;
				if (p(b)) return function ()
				{
					cg(b)
				}
			}
			return null
		}

		function D(a)
		{
			var b = a.a.get("tosUrl") || null,
				c = a.a.get("privacyPolicyUrl") || null;
			c && !b && Ge("Term of Service URL is missing, the link will not be displayed.");
			if (b && c)
			{
				if (qa(c)) return c;
				if (p(c)) return function ()
				{
					cg(c)
				}
			}
			return null
		}

		function Jg(a)
		{
			return (a = wg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID)) && "undefined" !== typeof a.requireDisplayName ? !!a.requireDisplayName : !0
		}

		function Kg(a)
		{
			a = wg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID);
			return !(!a || a.signInMethod !== firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD)
		}

		function Lg(a)
		{
			a = wg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID);
			return !(!a || !a.forceSameDevice)
		}

		function Mg(a)
		{
			if (Kg(a))
			{
				var b = {
					url: eg(),
					handleCodeInApp: !0
				};
				(a = wg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID)) && "function" === typeof a.emailLinkSignIn && lb(b, a.emailLinkSignIn());
				b.url = Vc(eg(), b.url).toString();
				return b
			}
			return null
		}

		function Ng(a)
		{
			var b = !!a.a.get("immediateFederatedRedirect"),
				c = xg(a);
			a = Og(a);
			return b &&
				1 == c.length && !Oa(ce, c[0]) && "redirect" == a
		}

		function Og(a)
		{
			a = a.a.get("signInFlow");
			for (var b in kg)
				if (kg[b] == a) return kg[b];
			return "redirect"
		}

		function Pg(a)
		{
			return Qg(a).uiShown || null
		}

		function Rg(a)
		{
			return Qg(a).signInSuccess || null
		}

		function Sg(a)
		{
			return Qg(a).signInSuccessWithAuthResult || null
		}

		function ug(a)
		{
			return Qg(a).signInFailure || null
		}

		function Qg(a)
		{
			return a.a.get("callbacks") ||
			{}
		}

		function Bg(a)
		{
			if ("http:" !== (window.location && window.location.protocol) && "https:" !== (window.location && window.location.protocol)) return "none";
			a = a.a.get("credentialHelper");
			for (var b in jg)
				if (jg[b] == a) return jg[b];
			return ig
		}

		function Tg(a)
		{
			this.a = Uc(a)
		}
		var E = {
			Ja: "ui_auid",
			Tb: "apiKey",
			Ka: "ui_sd",
			pb: "mode",
			Xa: "oobCode",
			PROVIDER_ID: "ui_pid",
			Na: "ui_sid",
			qb: "tenantId"
		};

		function Ug(a, b)
		{
			b ? a.a.a.set(E.Na, b) : Zc(a.a.a, E.Na)
		}

		function Vg(a, b)
		{
			null !== b ? a.a.a.set(E.Ka, b ? "1" : "0") : Zc(a.a.a, E.Ka)
		}

		function Wg(a)
		{
			return a.a.a.get(E.Ja) || null
		}

		function Xg(a, b)
		{
			b ? a.a.a.set(E.PROVIDER_ID, b) : Zc(a.a.a, E.PROVIDER_ID)
		}
		Tg.prototype.toString = function ()
		{
			return this.a.toString()
		};

		function F()
		{
			vf.call(this);
			this.F = new Hf(this);
			this.rb = this;
			this.Ba = null
		}
		t(F, vf);
		F.prototype[Df] = !0;
		F.prototype.Wa = function (a)
		{
			this.Ba = a
		};
		F.prototype.removeEventListener = function (a, b, c, d)
		{
			Vf(this, a, b, c, d)
		};

		function Yg(a, b)
		{
			var c, d = a.Ba;
			if (d)
				for (c = []; d; d = d.Ba) c.push(d);
			a = a.rb;
			d = b.type || b;
			if (p(b)) b = new Af(b, a);
			else if (b instanceof Af) b.target = b.target || a;
			else
			{
				var e = b;
				b = new Af(d, a);
				lb(b, e)
			}
			e = !0;
			if (c)
				for (var f = c.length - 1; !b.h && 0 <= f; f--)
				{
					var g = b.f = c[f];
					e = Zg(g, d, !0, b) && e
				}
			b.h || (g = b.f = a, e = Zg(g, d, !0, b) && e,
				b.h || (e = Zg(g, d, !1, b) && e));
			if (c)
				for (f = 0; !b.h && f < c.length; f++) g = b.f = c[f], e = Zg(g, d, !1, b) && e;
			return e
		}
		F.prototype.l = function ()
		{
			F.o.l.call(this);
			if (this.F)
			{
				var a = this.F,
					b = 0,
					c;
				for (c in a.a)
				{
					for (var d = a.a[c], e = 0; e < d.length; e++) ++b, Gf(d[e]);
					delete a.a[c];
					a.f--
				}
			}
			this.Ba = null
		};

		function Zg(a, b, c, d)
		{
			b = a.F.a[String(b)];
			if (!b) return !0;
			b = b.concat();
			for (var e = !0, f = 0; f < b.length; ++f)
			{
				var g = b[f];
				if (g && !g.qa && g.capture == c)
				{
					var h = g.listener,
						k = g.Fa || g.src;
					g.Ca && Jf(a.F, g);
					e = !1 !== h.call(k, d) && e
				}
			}
			return e && 0 != d.mb
		}
		var $g = {},
			ah = 0;

		function bh(a, b)
		{
			if (!a) throw Error("Event target element must be provided!");
			a = ch(a);
			if ($g[a] && $g[a].length)
				for (var c = 0; c < $g[a].length; c++) Yg($g[a][c], b)
		}

		function dh(a)
		{
			var b = ch(a.N());
			$g[b] && $g[b].length && (Ra($g[b], function (c)
			{
				return c == a
			}), $g[b].length || delete $g[b])
		}

		function ch(a)
		{
			"undefined" === typeof a.a && (a.a = ah, ah++);
			return a.a
		}

		function eh(a)
		{
			if (!a) throw Error("Event target element must be provided!");
			this.a = a;
			F.call(this)
		}
		t(eh, F);
		eh.prototype.N = function ()
		{
			return this.a
		};
		eh.prototype.register =
			function ()
			{
				var a = ch(this.N());
				$g[a] ? Oa($g[a], this) || $g[a].push(this) : $g[a] = [this]
			};

		function fh(a)
		{
			var b = gh;
			this.i = [];
			this.O = b;
			this.K = a || null;
			this.j = this.a = !1;
			this.h = void 0;
			this.F = this.s = this.w = !1;
			this.v = 0;
			this.f = null;
			this.C = 0
		}
		fh.prototype.cancel = function (a)
		{
			if (this.a) this.h instanceof fh && this.h.cancel();
			else
			{
				if (this.f)
				{
					var b = this.f;
					delete this.f;
					a ? b.cancel(a) : (b.C--, 0 >= b.C && b.cancel())
				}
				this.O ? this.O.call(this.K, this) : this.F = !0;
				this.a || (a = new hh(this), ih(this), jh(this, !1, a))
			}
		};
		fh.prototype.I = function (a,
			b)
		{
			this.w = !1;
			jh(this, a, b)
		};

		function jh(a, b, c)
		{
			a.a = !0;
			a.h = c;
			a.j = !b;
			kh(a)
		}

		function ih(a)
		{
			if (a.a)
			{
				if (!a.F) throw new lh(a);
				a.F = !1
			}
		}

		function mh(a, b, c)
		{
			a.i.push([b, c, void 0]);
			a.a && kh(a)
		}
		fh.prototype.then = function (a, b, c)
		{
			var d, e, f = new Xe(function (g, h)
			{
				d = g;
				e = h
			});
			mh(this, d, function (g)
			{
				g instanceof hh ? f.cancel() : e(g)
			});
			return f.then(a, b, c)
		};
		fh.prototype.$goog_Thenable = !0;

		function nh(a)
		{
			return Ma(a.i, function (b)
			{
				return qa(b[1])
			})
		}

		function kh(a)
		{
			if (a.v && a.a && nh(a))
			{
				var b = a.v,
					c = oh[b];
				c && (n.clearTimeout(c.a), delete oh[b]);
				a.v = 0
			}
			a.f && (a.f.C--, delete a.f);
			b = a.h;
			for (var d = c = !1; a.i.length && !a.w;)
			{
				var e = a.i.shift(),
					f = e[0],
					g = e[1];
				e = e[2];
				if (f = a.j ? g : f) try
				{
					var h = f.call(e || a.K, b);
					ha(h) && (a.j = a.j && (h == b || h instanceof Error), a.h = b = h);
					if (He(b) || "function" === typeof n.Promise && b instanceof n.Promise) d = !0, a.w = !0
				}
				catch (k)
				{
					b = k, a.j = !0, nh(a) || (c = !0)
				}
			}
			a.h = b;
			d && (h = q(a.I, a, !0), d = q(a.I, a, !1), b instanceof fh ? (mh(b, h, d), b.s = !0) : b.then(h, d));
			c && (b = new ph(b), oh[b.a] = b, a.v = b.a)
		}

		function lh()
		{
			Ba.call(this)
		}
		t(lh, Ba);
		lh.prototype.message = "Deferred has already fired";
		lh.prototype.name = "AlreadyCalledError";

		function hh()
		{
			Ba.call(this)
		}
		t(hh, Ba);
		hh.prototype.message = "Deferred was canceled";
		hh.prototype.name = "CanceledError";

		function ph(a)
		{
			this.a = n.setTimeout(q(this.h, this), 0);
			this.f = a
		}
		ph.prototype.h = function ()
		{
			delete oh[this.a];
			throw this.f;
		};
		var oh = {};

		function qh(a)
		{
			var b = {},
				c = b.document || document,
				d = Mb(a).toString(),
				e = document.createElement("SCRIPT"),
				f = {
					nb: e,
					ob: void 0
				},
				g = new fh(f),
				h = null,
				k = null != b.timeout ? b.timeout : 5E3;
			0 < k && (h = window.setTimeout(function ()
			{
				rh(e, !0);
				var l = new sh(th, "Timeout reached for loading script " + d);
				ih(g);
				jh(g, !1, l)
			}, k), f.ob = h);
			e.onload = e.onreadystatechange = function ()
			{
				e.readyState && "loaded" != e.readyState && "complete" != e.readyState || (rh(e, b.ec || !1, h), ih(g), jh(g, !0, null))
			};
			e.onerror = function ()
			{
				rh(e, !0, h);
				var l = new sh(uh, "Error while loading script " + d);
				ih(g);
				jh(g, !1, l)
			};
			f = b.attributes ||
			{};
			lb(f,
			{
				type: "text/javascript",
				charset: "UTF-8"
			});
			lc(e, f);
			cc(e, a);
			vh(c).appendChild(e);
			return g
		}

		function vh(a)
		{
			var b = (a || document).getElementsByTagName("HEAD");
			return b && 0 != b.length ? b[0] : a.documentElement
		}

		function gh()
		{
			if (this && this.nb)
			{
				var a = this.nb;
				a && "SCRIPT" == a.tagName && rh(a, !0, this.ob)
			}
		}

		function rh(a, b, c)
		{
			null != c && n.clearTimeout(c);
			a.onload = ka;
			a.onerror = ka;
			a.onreadystatechange = ka;
			b && window.setTimeout(function ()
			{
				oc(a)
			}, 0)
		}
		var uh = 0,
			th = 1;

		function sh(a, b)
		{
			var c = "Jsloader error (code #" + a + ")";
			b && (c += ": " + b);
			Ba.call(this, c);
			this.code = a
		}
		t(sh, Ba);

		function wh(a)
		{
			this.a = a || n.googleyolo;
			this.f = null;
			this.h = !1
		}
		la(wh);
		var xh = new Gb(Hb, "https://smartlock.google.com/client");
		wh.prototype.cancel = function ()
		{
			this.a && this.h && (this.f = this.a.cancelLastOperation().catch(function () {}))
		};

		function yh(a, b, c)
		{
			if (a.a && b)
			{
				var d = function ()
				{
					a.h = !0;
					var e = Promise.resolve(null);
					c || (e = a.a.retrieve(b).catch(function (f)
					{
						if ("userCanceled" === f.type || "illegalConcurrentRequest" === f.type) throw f;
						return null
					}));
					return e.then(function (f)
					{
						return f ? f : a.a.hint(b)
					}).catch(function (f)
					{
						if ("userCanceled" === f.type) a.f = Promise.resolve();
						else if ("illegalConcurrentRequest" === f.type) return a.cancel(), yh(a, b,
							c);
						return null
					})
				};
				return a.f ? a.f.then(d) : d()
			}
			if (b) return d = hf(zh.Ua().load().then(function ()
			{
				a.a = n.googleyolo;
				return yh(a, b, c)
			}), function ()
			{
				return null
			}), Promise.resolve(d);
			if ("undefined" !== typeof Promise) return Promise.resolve(null);
			throw Error("One-Tap sign in not supported in the current browser!");
		}

		function zh()
		{
			this.a = null
		}
		la(zh);
		zh.prototype.load = function ()
		{
			var a = this;
			if (this.a) return this.a;
			var b = Nb(Jb(xh));
			return n.googleyolo ? B() : this.a = fg().then(function ()
			{
				if (!n.googleyolo) return new Xe(function (c,
					d)
				{
					var e = setTimeout(function ()
					{
						a.a = null;
						d(Error("Network error!"))
					}, 1E4);
					n.onGoogleYoloLoad = function ()
					{
						clearTimeout(e);
						c()
					};
					hf(B(qh(b)), function (f)
					{
						clearTimeout(e);
						a.a = null;
						d(f)
					})
				})
			})
		};

		function Ah(a, b)
		{
			this.a = a;
			this.f = b || function (c)
			{
				throw c;
			}
		}
		Ah.prototype.confirm = function (a)
		{
			return hf(B(this.a.confirm(a)), this.f)
		};

		function Bh(a, b, c, d)
		{
			this.a = a;
			this.h = b || null;
			this.j = c || null;
			this.f = d || null
		}
		Bh.prototype.Z = function ()
		{
			return {
				email: this.a,
				displayName: this.h,
				photoUrl: this.j,
				providerId: this.f
			}
		};

		function Ch(a)
		{
			return a.email ?
				new Bh(a.email, a.displayName, a.photoUrl, a.providerId) : null
		}

		function Dh()
		{
			this.a = ("undefined" == typeof document ? null : document) ||
			{
				cookie: ""
			}
		}
		m = Dh.prototype;
		m.set = function (a, b, c, d, e, f)
		{
			if (/[;=\s]/.test(a)) throw Error('Invalid cookie name "' + a + '"');
			if (/[;\r\n]/.test(b)) throw Error('Invalid cookie value "' + b + '"');
			ha(c) || (c = -1);
			e = e ? ";domain=" + e : "";
			d = d ? ";path=" + d : "";
			f = f ? ";secure" : "";
			c = 0 > c ? "" : 0 == c ? ";expires=" + (new Date(1970, 1, 1)).toUTCString() : ";expires=" + (new Date(za() + 1E3 * c)).toUTCString();
			this.a.cookie =
				a + "=" + b + e + d + c + f
		};
		m.get = function (a, b)
		{
			for (var c = a + "=", d = (this.a.cookie || "").split(";"), e = 0, f; e < d.length; e++)
			{
				f = Xa(d[e]);
				if (0 == f.lastIndexOf(c, 0)) return f.substr(c.length);
				if (f == a) return ""
			}
			return b
		};
		m.ja = function ()
		{
			return Eh(this).keys
		};
		m.la = function ()
		{
			return Eh(this).values
		};
		m.clear = function ()
		{
			for (var a = Eh(this).keys, b = a.length - 1; 0 <= b; b--)
			{
				var c = a[b];
				this.get(c);
				this.set(c, "", 0, void 0, void 0)
			}
		};

		function Eh(a)
		{
			a = (a.a.cookie || "").split(";");
			for (var b = [], c = [], d, e, f = 0; f < a.length; f++) e = Xa(a[f]), d = e.indexOf("="), -1 == d ? (b.push(""), c.push(e)) : (b.push(e.substring(0, d)), c.push(e.substring(d + 1)));
			return {
				keys: b,
				values: c
			}
		}
		var Fh = new Dh;

		function Gh()
		{}

		function Hh(a, b, c, d)
		{
			this.h = "undefined" !== typeof a && null !== a ? a : -1;
			this.f = b || null;
			this.a = c || null;
			this.j = !!d
		}
		t(Hh, Gh);
		Hh.prototype.set = function (a, b)
		{
			Fh.set(a, b, this.h, this.f, this.a, this.j)
		};
		Hh.prototype.get = function (a)
		{
			return Fh.get(a) || null
		};
		Hh.prototype.pa = function (a)
		{
			var b = this.f,
				c = this.a;
			Fh.get(a);
			Fh.set(a, "", 0, b, c)
		};

		function Ih(a, b)
		{
			this.f = a;
			this.a = b || null
		}
		Ih.prototype.Z =
			function ()
			{
				return {
					email: this.f,
					credential: this.a && this.a.toJSON()
				}
			};

		function Jh(a)
		{
			if (a && a.email)
			{
				var b = a.credential && firebase.auth.AuthCredential.fromJSON(a.credential);
				return new Ih(a.email, b)
			}
			return null
		}

		function Kh(a)
		{
			this.a = a || null
		}
		Kh.prototype.Z = function ()
		{
			return {
				tenantId: this.a
			}
		};

		function Lh(a)
		{
			for (var b = [], c = 0, d = 0; d < a.length; d++)
			{
				var e = a.charCodeAt(d);
				255 < e && (b[c++] = e & 255, e >>= 8);
				b[c++] = e
			}
			return b
		}

		function Mh(a)
		{
			return La(a, function (b)
			{
				b = b.toString(16);
				return 1 < b.length ? b : "0" + b
			}).join("")
		}

		function Nh(a)
		{
			this.v = a;
			this.f = this.v.length / 4;
			this.j = this.f + 6;
			this.h = [
				[],
				[],
				[],
				[]
			];
			this.i = [
				[],
				[],
				[],
				[]
			];
			this.a = Array(Oh * (this.j + 1));
			for (a = 0; a < this.f; a++) this.a[a] = [this.v[4 * a], this.v[4 * a + 1], this.v[4 * a + 2], this.v[4 * a + 3]];
			var b = Array(4);
			for (a = this.f; a < Oh * (this.j + 1); a++)
			{
				b[0] = this.a[a - 1][0];
				b[1] = this.a[a - 1][1];
				b[2] = this.a[a - 1][2];
				b[3] = this.a[a - 1][3];
				if (0 == a % this.f)
				{
					var c = b,
						d = c[0];
					c[0] = c[1];
					c[1] = c[2];
					c[2] = c[3];
					c[3] = d;
					Ph(b);
					b[0] ^= Qh[a / this.f][0];
					b[1] ^= Qh[a / this.f][1];
					b[2] ^= Qh[a / this.f][2];
					b[3] ^= Qh[a / this.f][3]
				}
				else 6 <
					this.f && 4 == a % this.f && Ph(b);
				this.a[a] = Array(4);
				this.a[a][0] = this.a[a - this.f][0] ^ b[0];
				this.a[a][1] = this.a[a - this.f][1] ^ b[1];
				this.a[a][2] = this.a[a - this.f][2] ^ b[2];
				this.a[a][3] = this.a[a - this.f][3] ^ b[3]
			}
		}
		Nh.prototype.w = 16;
		var Oh = Nh.prototype.w / 4;

		function Rh(a, b)
		{
			for (var c, d = 0; d < Oh; d++)
				for (var e = 0; 4 > e; e++) c = 4 * e + d, c = b[c], a.h[d][e] = c
		}

		function Sh(a)
		{
			for (var b = [], c = 0; c < Oh; c++)
				for (var d = 0; 4 > d; d++) b[4 * d + c] = a.h[c][d];
			return b
		}

		function Th(a, b)
		{
			for (var c = 0; 4 > c; c++)
				for (var d = 0; 4 > d; d++) a.h[c][d] ^= a.a[4 * b + d][c]
		}

		function Uh(a,
			b)
		{
			for (var c = 0; 4 > c; c++)
				for (var d = 0; 4 > d; d++) a.h[c][d] = b[a.h[c][d]]
		}

		function Vh(a)
		{
			for (var b = 1; 4 > b; b++)
				for (var c = 0; 4 > c; c++) a.i[b][c] = a.h[b][c];
			for (b = 1; 4 > b; b++)
				for (c = 0; 4 > c; c++) a.h[b][c] = a.i[b][(c + b) % Oh]
		}

		function Wh(a)
		{
			for (var b = 1; 4 > b; b++)
				for (var c = 0; 4 > c; c++) a.i[b][(c + b) % Oh] = a.h[b][c];
			for (b = 1; 4 > b; b++)
				for (c = 0; 4 > c; c++) a.h[b][c] = a.i[b][c]
		}

		function Ph(a)
		{
			a[0] = Xh[a[0]];
			a[1] = Xh[a[1]];
			a[2] = Xh[a[2]];
			a[3] = Xh[a[3]]
		}
		var Xh = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240,
				173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36,
				92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22
			],
			Yh = [82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129, 243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68, 196, 222, 233, 203, 84, 123, 148, 50, 166, 194, 35, 61, 238, 76, 149, 11, 66, 250, 195, 78,
				8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162, 73, 109, 139, 209, 37, 114, 248, 246, 100, 134, 104, 152, 22, 212, 164, 92, 204, 93, 101, 182, 146, 108, 112, 72, 80, 253, 237, 185, 218, 94, 21, 70, 87, 167, 141, 157, 132, 144, 216, 171, 0, 140, 188, 211, 10, 247, 228, 88, 5, 184, 179, 69, 6, 208, 44, 30, 143, 202, 63, 15, 2, 193, 175, 189, 3, 1, 19, 138, 107, 58, 145, 17, 65, 79, 103, 220, 234, 151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116, 34, 231, 173, 53, 133, 226, 249, 55, 232, 28, 117, 223, 110, 71, 241, 26, 113, 29, 41, 197, 137, 111, 183, 98, 14, 170, 24, 190, 27, 252, 86, 62, 75, 198, 210, 121, 32, 154, 219, 192, 254,
				120, 205, 90, 244, 31, 221, 168, 51, 136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169, 25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59, 77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4, 126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125
			],
			Qh = [
				[0, 0, 0, 0],
				[1, 0, 0, 0],
				[2, 0, 0, 0],
				[4, 0, 0, 0],
				[8, 0, 0, 0],
				[16, 0, 0, 0],
				[32, 0, 0, 0],
				[64, 0, 0, 0],
				[128, 0, 0, 0],
				[27, 0, 0, 0],
				[54, 0, 0, 0]
			],
			Zh = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92,
				94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 166, 168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 196, 198, 200, 202, 204, 206, 208, 210, 212, 214, 216, 218, 220, 222, 224, 226, 228, 230, 232, 234, 236, 238, 240, 242, 244, 246, 248, 250, 252, 254, 27, 25, 31, 29, 19, 17, 23, 21, 11, 9, 15, 13, 3, 1, 7, 5, 59, 57, 63, 61, 51, 49, 55, 53, 43, 41, 47, 45, 35, 33, 39, 37, 91, 89, 95, 93, 83, 81, 87, 85, 75, 73, 79, 77, 67, 65, 71, 69, 123, 121, 127, 125, 115, 113, 119, 117, 107, 105, 111,
				109, 99, 97, 103, 101, 155, 153, 159, 157, 147, 145, 151, 149, 139, 137, 143, 141, 131, 129, 135, 133, 187, 185, 191, 189, 179, 177, 183, 181, 171, 169, 175, 173, 163, 161, 167, 165, 219, 217, 223, 221, 211, 209, 215, 213, 203, 201, 207, 205, 195, 193, 199, 197, 251, 249, 255, 253, 243, 241, 247, 245, 235, 233, 239, 237, 227, 225, 231, 229
			],
			$h = [0, 3, 6, 5, 12, 15, 10, 9, 24, 27, 30, 29, 20, 23, 18, 17, 48, 51, 54, 53, 60, 63, 58, 57, 40, 43, 46, 45, 36, 39, 34, 33, 96, 99, 102, 101, 108, 111, 106, 105, 120, 123, 126, 125, 116, 119, 114, 113, 80, 83, 86, 85, 92, 95, 90, 89, 72, 75, 78, 77, 68, 71, 66, 65, 192, 195, 198, 197, 204, 207,
				202, 201, 216, 219, 222, 221, 212, 215, 210, 209, 240, 243, 246, 245, 252, 255, 250, 249, 232, 235, 238, 237, 228, 231, 226, 225, 160, 163, 166, 165, 172, 175, 170, 169, 184, 187, 190, 189, 180, 183, 178, 177, 144, 147, 150, 149, 156, 159, 154, 153, 136, 139, 142, 141, 132, 135, 130, 129, 155, 152, 157, 158, 151, 148, 145, 146, 131, 128, 133, 134, 143, 140, 137, 138, 171, 168, 173, 174, 167, 164, 161, 162, 179, 176, 181, 182, 191, 188, 185, 186, 251, 248, 253, 254, 247, 244, 241, 242, 227, 224, 229, 230, 239, 236, 233, 234, 203, 200, 205, 206, 199, 196, 193, 194, 211, 208, 213, 214, 223, 220, 217, 218, 91, 88, 93, 94, 87,
				84, 81, 82, 67, 64, 69, 70, 79, 76, 73, 74, 107, 104, 109, 110, 103, 100, 97, 98, 115, 112, 117, 118, 127, 124, 121, 122, 59, 56, 61, 62, 55, 52, 49, 50, 35, 32, 37, 38, 47, 44, 41, 42, 11, 8, 13, 14, 7, 4, 1, 2, 19, 16, 21, 22, 31, 28, 25, 26
			],
			ai = [0, 9, 18, 27, 36, 45, 54, 63, 72, 65, 90, 83, 108, 101, 126, 119, 144, 153, 130, 139, 180, 189, 166, 175, 216, 209, 202, 195, 252, 245, 238, 231, 59, 50, 41, 32, 31, 22, 13, 4, 115, 122, 97, 104, 87, 94, 69, 76, 171, 162, 185, 176, 143, 134, 157, 148, 227, 234, 241, 248, 199, 206, 213, 220, 118, 127, 100, 109, 82, 91, 64, 73, 62, 55, 44, 37, 26, 19, 8, 1, 230, 239, 244, 253, 194, 203, 208, 217,
				174, 167, 188, 181, 138, 131, 152, 145, 77, 68, 95, 86, 105, 96, 123, 114, 5, 12, 23, 30, 33, 40, 51, 58, 221, 212, 207, 198, 249, 240, 235, 226, 149, 156, 135, 142, 177, 184, 163, 170, 236, 229, 254, 247, 200, 193, 218, 211, 164, 173, 182, 191, 128, 137, 146, 155, 124, 117, 110, 103, 88, 81, 74, 67, 52, 61, 38, 47, 16, 25, 2, 11, 215, 222, 197, 204, 243, 250, 225, 232, 159, 150, 141, 132, 187, 178, 169, 160, 71, 78, 85, 92, 99, 106, 113, 120, 15, 6, 29, 20, 43, 34, 57, 48, 154, 147, 136, 129, 190, 183, 172, 165, 210, 219, 192, 201, 246, 255, 228, 237, 10, 3, 24, 17, 46, 39, 60, 53, 66, 75, 80, 89, 102, 111, 116, 125, 161, 168, 179,
				186, 133, 140, 151, 158, 233, 224, 251, 242, 205, 196, 223, 214, 49, 56, 35, 42, 21, 28, 7, 14, 121, 112, 107, 98, 93, 84, 79, 70
			],
			bi = [0, 11, 22, 29, 44, 39, 58, 49, 88, 83, 78, 69, 116, 127, 98, 105, 176, 187, 166, 173, 156, 151, 138, 129, 232, 227, 254, 245, 196, 207, 210, 217, 123, 112, 109, 102, 87, 92, 65, 74, 35, 40, 53, 62, 15, 4, 25, 18, 203, 192, 221, 214, 231, 236, 241, 250, 147, 152, 133, 142, 191, 180, 169, 162, 246, 253, 224, 235, 218, 209, 204, 199, 174, 165, 184, 179, 130, 137, 148, 159, 70, 77, 80, 91, 106, 97, 124, 119, 30, 21, 8, 3, 50, 57, 36, 47, 141, 134, 155, 144, 161, 170, 183, 188, 213, 222, 195, 200, 249,
				242, 239, 228, 61, 54, 43, 32, 17, 26, 7, 12, 101, 110, 115, 120, 73, 66, 95, 84, 247, 252, 225, 234, 219, 208, 205, 198, 175, 164, 185, 178, 131, 136, 149, 158, 71, 76, 81, 90, 107, 96, 125, 118, 31, 20, 9, 2, 51, 56, 37, 46, 140, 135, 154, 145, 160, 171, 182, 189, 212, 223, 194, 201, 248, 243, 238, 229, 60, 55, 42, 33, 16, 27, 6, 13, 100, 111, 114, 121, 72, 67, 94, 85, 1, 10, 23, 28, 45, 38, 59, 48, 89, 82, 79, 68, 117, 126, 99, 104, 177, 186, 167, 172, 157, 150, 139, 128, 233, 226, 255, 244, 197, 206, 211, 216, 122, 113, 108, 103, 86, 93, 64, 75, 34, 41, 52, 63, 14, 5, 24, 19, 202, 193, 220, 215, 230, 237, 240, 251, 146, 153, 132, 143,
				190, 181, 168, 163
			],
			ci = [0, 13, 26, 23, 52, 57, 46, 35, 104, 101, 114, 127, 92, 81, 70, 75, 208, 221, 202, 199, 228, 233, 254, 243, 184, 181, 162, 175, 140, 129, 150, 155, 187, 182, 161, 172, 143, 130, 149, 152, 211, 222, 201, 196, 231, 234, 253, 240, 107, 102, 113, 124, 95, 82, 69, 72, 3, 14, 25, 20, 55, 58, 45, 32, 109, 96, 119, 122, 89, 84, 67, 78, 5, 8, 31, 18, 49, 60, 43, 38, 189, 176, 167, 170, 137, 132, 147, 158, 213, 216, 207, 194, 225, 236, 251, 246, 214, 219, 204, 193, 226, 239, 248, 245, 190, 179, 164, 169, 138, 135, 144, 157, 6, 11, 28, 17, 50, 63, 40, 37, 110, 99, 116, 121, 90, 87, 64, 77, 218, 215, 192, 205, 238, 227,
				244, 249, 178, 191, 168, 165, 134, 139, 156, 145, 10, 7, 16, 29, 62, 51, 36, 41, 98, 111, 120, 117, 86, 91, 76, 65, 97, 108, 123, 118, 85, 88, 79, 66, 9, 4, 19, 30, 61, 48, 39, 42, 177, 188, 171, 166, 133, 136, 159, 146, 217, 212, 195, 206, 237, 224, 247, 250, 183, 186, 173, 160, 131, 142, 153, 148, 223, 210, 197, 200, 235, 230, 241, 252, 103, 106, 125, 112, 83, 94, 73, 68, 15, 2, 21, 24, 59, 54, 33, 44, 12, 1, 22, 27, 56, 53, 34, 47, 100, 105, 126, 115, 80, 93, 74, 71, 220, 209, 198, 203, 232, 229, 242, 255, 180, 185, 174, 163, 128, 141, 154, 151
			],
			di = [0, 14, 28, 18, 56, 54, 36, 42, 112, 126, 108, 98, 72, 70, 84, 90, 224, 238, 252, 242,
				216, 214, 196, 202, 144, 158, 140, 130, 168, 166, 180, 186, 219, 213, 199, 201, 227, 237, 255, 241, 171, 165, 183, 185, 147, 157, 143, 129, 59, 53, 39, 41, 3, 13, 31, 17, 75, 69, 87, 89, 115, 125, 111, 97, 173, 163, 177, 191, 149, 155, 137, 135, 221, 211, 193, 207, 229, 235, 249, 247, 77, 67, 81, 95, 117, 123, 105, 103, 61, 51, 33, 47, 5, 11, 25, 23, 118, 120, 106, 100, 78, 64, 82, 92, 6, 8, 26, 20, 62, 48, 34, 44, 150, 152, 138, 132, 174, 160, 178, 188, 230, 232, 250, 244, 222, 208, 194, 204, 65, 79, 93, 83, 121, 119, 101, 107, 49, 63, 45, 35, 9, 7, 21, 27, 161, 175, 189, 179, 153, 151, 133, 139, 209, 223, 205, 195, 233, 231, 245,
				251, 154, 148, 134, 136, 162, 172, 190, 176, 234, 228, 246, 248, 210, 220, 206, 192, 122, 116, 102, 104, 66, 76, 94, 80, 10, 4, 22, 24, 50, 60, 46, 32, 236, 226, 240, 254, 212, 218, 200, 198, 156, 146, 128, 142, 164, 170, 184, 182, 12, 2, 16, 30, 52, 58, 40, 38, 124, 114, 96, 110, 68, 74, 88, 86, 55, 57, 43, 37, 15, 1, 19, 29, 71, 73, 91, 85, 127, 113, 99, 109, 215, 217, 203, 197, 239, 225, 243, 253, 167, 169, 187, 181, 159, 145, 131, 141
			];

		function ei(a, b)
		{
			a = new Nh(fi(a));
			b = Lh(b);
			for (var c = Va(b, 0, 16), d = "", e; c.length;)
			{
				e = 16 - c.length;
				for (var f = 0; f < e; f++) c.push(0);
				e = a;
				Rh(e, c);
				Th(e, 0);
				for (c = 1; c <
					e.j; ++c)
				{
					Uh(e, Xh);
					Vh(e);
					f = e.h;
					for (var g = e.i[0], h = 0; 4 > h; h++) g[0] = f[0][h], g[1] = f[1][h], g[2] = f[2][h], g[3] = f[3][h], f[0][h] = Zh[g[0]] ^ $h[g[1]] ^ g[2] ^ g[3], f[1][h] = g[0] ^ Zh[g[1]] ^ $h[g[2]] ^ g[3], f[2][h] = g[0] ^ g[1] ^ Zh[g[2]] ^ $h[g[3]], f[3][h] = $h[g[0]] ^ g[1] ^ g[2] ^ Zh[g[3]];
					Th(e, c)
				}
				Uh(e, Xh);
				Vh(e);
				Th(e, e.j);
				d += Mh(Sh(e));
				c = Va(b, 0, 16)
			}
			return d
		}

		function gi(a, b)
		{
			a = new Nh(fi(a));
			for (var c = [], d = 0; d < b.length; d += 2) c.push(parseInt(b.substring(d, d + 2), 16));
			var e = Va(c, 0, 16);
			for (b = ""; e.length;)
			{
				d = a;
				Rh(d, e);
				Th(d, d.j);
				for (e = 1; e < d.j; ++e)
				{
					Wh(d);
					Uh(d, Yh);
					Th(d, d.j - e);
					for (var f = d.h, g = d.i[0], h = 0; 4 > h; h++) g[0] = f[0][h], g[1] = f[1][h], g[2] = f[2][h], g[3] = f[3][h], f[0][h] = di[g[0]] ^ bi[g[1]] ^ ci[g[2]] ^ ai[g[3]], f[1][h] = ai[g[0]] ^ di[g[1]] ^ bi[g[2]] ^ ci[g[3]], f[2][h] = ci[g[0]] ^ ai[g[1]] ^ di[g[2]] ^ bi[g[3]], f[3][h] = bi[g[0]] ^ ci[g[1]] ^ ai[g[2]] ^ di[g[3]]
				}
				Wh(d);
				Uh(d, Yh);
				Th(d, 0);
				d = Sh(d);
				if (8192 >= d.length) d = String.fromCharCode.apply(null, d);
				else
				{
					e = "";
					for (f = 0; f < d.length; f += 8192) e += String.fromCharCode.apply(null, Wa(d, f, f + 8192));
					d = e
				}
				b += d;
				e = Va(c, 0, 16)
			}
			return b.replace(/(\x00)+$/,
				"")
		}

		function fi(a)
		{
			a = Lh(a.substring(0, 32));
			for (var b = 32 - a.length, c = 0; c < b; c++) a.push(0);
			return a
		}

		function hi(a)
		{
			var b = [];
			ii(new ji, a, b);
			return b.join("")
		}

		function ji()
		{}

		function ii(a, b, c)
		{
			if (null == b) c.push("null");
			else
			{
				if ("object" == typeof b)
				{
					if (oa(b))
					{
						var d = b;
						b = d.length;
						c.push("[");
						for (var e = "", f = 0; f < b; f++) c.push(e), ii(a, d[f], c), e = ",";
						c.push("]");
						return
					}
					if (b instanceof String || b instanceof Number || b instanceof Boolean) b = b.valueOf();
					else
					{
						c.push("{");
						e = "";
						for (d in b) Object.prototype.hasOwnProperty.call(b,
							d) && (f = b[d], "function" != typeof f && (c.push(e), ki(d, c), c.push(":"), ii(a, f, c), e = ","));
						c.push("}");
						return
					}
				}
				switch (typeof b)
				{
				case "string":
					ki(b, c);
					break;
				case "number":
					c.push(isFinite(b) && !isNaN(b) ? String(b) : "null");
					break;
				case "boolean":
					c.push(String(b));
					break;
				case "function":
					c.push("null");
					break;
				default:
					throw Error("Unknown type: " + typeof b);
				}
			}
		}
		var li = {
				'"': '\\"',
				"\\": "\\\\",
				"/": "\\/",
				"\b": "\\b",
				"\f": "\\f",
				"\n": "\\n",
				"\r": "\\r",
				"\t": "\\t",
				"\x0B": "\\u000b"
			},
			mi = /\uffff/.test("￿") ? /[\\"\x00-\x1f\x7f-\uffff]/g :
			/[\\"\x00-\x1f\x7f-\xff]/g;

		function ki(a, b)
		{
			b.push('"', a.replace(mi, function (c)
			{
				var d = li[c];
				d || (d = "\\u" + (c.charCodeAt(0) | 65536).toString(16).substr(1), li[c] = d);
				return d
			}), '"')
		}

		function ni(a)
		{
			this.a = a
		}
		ni.prototype.set = function (a, b)
		{
			ha(b) ? this.a.set(a, hi(b)) : this.a.pa(a)
		};
		ni.prototype.get = function (a)
		{
			try
			{
				var b = this.a.get(a)
			}
			catch (c)
			{
				return
			}
			if (null !== b) try
			{
				return JSON.parse(b)
			}
			catch (c$2)
			{
				throw "Storage: Invalid value was encountered";
			}
		};

		function oi()
		{}
		t(oi, Gh);
		oi.prototype.clear = function ()
		{
			var a = wc(this.ha(!0)),
				b = this;
			Ha(a, function (c)
			{
				b.pa(c)
			})
		};

		function pi(a)
		{
			this.a = a
		}
		t(pi, oi);

		function qi(a)
		{
			if (!a.a) return !1;
			try
			{
				return a.a.setItem("__sak", "1"), a.a.removeItem("__sak"), !0
			}
			catch (b)
			{
				return !1
			}
		}
		m = pi.prototype;
		m.set = function (a, b)
		{
			try
			{
				this.a.setItem(a, b)
			}
			catch (c)
			{
				if (0 == this.a.length) throw "Storage mechanism: Storage disabled";
				throw "Storage mechanism: Quota exceeded";
			}
		};
		m.get = function (a)
		{
			a = this.a.getItem(a);
			if (!p(a) && null !== a) throw "Storage mechanism: Invalid value was encountered";
			return a
		};
		m.pa = function (a)
		{
			this.a.removeItem(a)
		};
		m.ha = function (a)
		{
			var b = 0,
				c = this.a,
				d = new tc;
			d.next = function ()
			{
				if (b >= c.length) throw sc;
				var e = c.key(b++);
				if (a) return e;
				e = c.getItem(e);
				if (!p(e)) throw "Storage mechanism: Invalid value was encountered";
				return e
			};
			return d
		};
		m.clear = function ()
		{
			this.a.clear()
		};
		m.key = function (a)
		{
			return this.a.key(a)
		};

		function ri()
		{
			var a = null;
			try
			{
				a = window.localStorage || null
			}
			catch (b)
			{}
			this.a = a
		}
		t(ri, pi);

		function si()
		{
			var a = null;
			try
			{
				a = window.sessionStorage || null
			}
			catch (b)
			{}
			this.a = a
		}
		t(si, pi);

		function ti(a, b)
		{
			this.f = a;
			this.a = b + "::"
		}
		t(ti, oi);
		ti.prototype.set = function (a, b)
		{
			this.f.set(this.a + a, b)
		};
		ti.prototype.get = function (a)
		{
			return this.f.get(this.a + a)
		};
		ti.prototype.pa = function (a)
		{
			this.f.pa(this.a + a)
		};
		ti.prototype.ha = function (a)
		{
			var b = this.f.ha(!0),
				c = this,
				d = new tc;
			d.next = function ()
			{
				for (var e = b.next(); e.substr(0, c.a.length) != c.a;) e = b.next();
				return a ? e.substr(c.a.length) : c.f.get(e)
			};
			return d
		};
		var ui, vi = new ri;
		ui = qi(vi) ? new ti(vi, "firebaseui") : null;
		var wi = new ni(ui),
			xi, yi = new si;
		xi = qi(yi) ? new ti(yi, "firebaseui") : null;
		var zi = new ni(xi),
			Ai = {
				name: "pendingEmailCredential",
				storage: zi
			},
			Bi = {
				name: "redirectStatus",
				storage: zi
			},
			Ci = {
				name: "redirectUrl",
				storage: zi
			},
			Di = {
				name: "rememberAccount",
				storage: zi
			},
			Ei = {
				name: "rememberedAccounts",
				storage: wi
			},
			Fi = {
				name: "emailForSignIn",
				storage: new ni(new Hh(3600, "/"))
			},
			Gi = {
				name: "pendingEncryptedCredential",
				storage: new ni(new Hh(3600, "/"))
			};

		function Hi(a, b)
		{
			return a.storage.get(b ? a.name + ":" + b : a.name)
		}

		function G(a, b)
		{
			a.storage.a.pa(b ? a.name + ":" + b : a.name)
		}

		function Ii(a, b, c)
		{
			a.storage.set(c ? a.name + ":" + c : a.name,
				b)
		}

		function Ji(a)
		{
			return Hi(Ci, a) || null
		}

		function Ki(a, b)
		{
			Ii(Ci, a, b)
		}

		function Li(a, b)
		{
			Ii(Di, a, b)
		}

		function Mi(a)
		{
			a = Hi(Ei, a) || [];
			a = La(a, function (b)
			{
				return Ch(b)
			});
			return Ja(a, na)
		}

		function Ni(a, b)
		{
			var c = Mi(b),
				d = Na(c, function (e)
				{
					return e.a == a.a && (e.f || null) == (a.f || null)
				}); - 1 < d && Qa(c, d);
			c.unshift(a);
			Ii(Ei, La(c, function (e)
			{
				return e.Z()
			}), b)
		}

		function Oi(a)
		{
			a = Hi(Ai, a) || null;
			return Jh(a)
		}

		function Pi(a)
		{
			G(Ai, a)
		}

		function Qi(a, b)
		{
			Ii(Ai, a.Z(), b)
		}

		function Ri(a)
		{
			return (a = Hi(Bi, a) || null) && "undefined" !== typeof a.tenantId ?
				new Kh(a.tenantId) : null
		}

		function Si(a, b)
		{
			Ii(Bi, a.Z(), b)
		}

		function Ti(a, b)
		{
			b = Hi(Fi, b);
			var c = null;
			if (b) try
			{
				var d = gi(a, b),
					e = JSON.parse(d);
				c = e && e.email || null
			}
			catch (f)
			{}
			return c
		}

		function Ui(a, b)
		{
			b = Hi(Gi, b);
			var c = null;
			if (b) try
			{
				var d = gi(a, b);
				c = JSON.parse(d)
			}
			catch (e)
			{}
			return Jh(c || null)
		}

		function Vi(a, b, c)
		{
			Ii(Gi, ei(a, JSON.stringify(b.Z())), c)
		}
		var Wi = null;

		function Xi(a)
		{
			return !(!a || -32E3 != a.code || "Service unavailable" != a.message)
		}

		function Yi(a, b, c, d)
		{
			Wi || (a = {
				callbacks:
				{
					empty: a,
					select: function (e, f)
					{
						e && e.account &&
							b ? b(Ch(e.account)) : c && c(!Xi(f))
					},
					store: a,
					update: a
				},
				language: "en",
				providers: void 0,
				ui: d
			}, "undefined" != typeof accountchooser && accountchooser.Api && accountchooser.Api.init ? Wi = accountchooser.Api.init(a) : (Wi = new Zi(a), $i()))
		}

		function aj(a, b, c)
		{
			function d()
			{
				var e = Vc(window.location.href, c).toString();
				Wi.select(La(b || [], function (f)
				{
					return f.Z()
				}),
				{
					clientCallbackUrl: e
				})
			}
			b && b.length ? d() : Wi.checkEmpty(function (e, f)
			{
				e || f ? a(!Xi(f)) : d()
			})
		}

		function Zi(a)
		{
			this.a = a;
			this.a.callbacks = this.a.callbacks ||
			{}
		}

		function $i()
		{
			var a =
				Wi;
			qa(a.a.callbacks.empty) && a.a.callbacks.empty()
		}
		var bj = {
			code: -32E3,
			message: "Service unavailable",
			data: "Service is unavailable."
		};
		m = Zi.prototype;
		m.store = function ()
		{
			qa(this.a.callbacks.store) && this.a.callbacks.store(void 0, bj)
		};
		m.select = function ()
		{
			qa(this.a.callbacks.select) && this.a.callbacks.select(void 0, bj)
		};
		m.update = function ()
		{
			qa(this.a.callbacks.update) && this.a.callbacks.update(void 0, bj)
		};
		m.checkDisabled = function (a)
		{
			a(!0)
		};
		m.checkEmpty = function (a)
		{
			a(void 0, bj)
		};
		m.checkAccountExist = function (a,
			b)
		{
			b(void 0, bj)
		};
		m.checkShouldUpdate = function (a, b)
		{
			b(void 0, bj)
		};
		var cj, dj, ej, fj, H = {};

		function I(a, b, c, d)
		{
			H[a].apply(null, Array.prototype.slice.call(arguments, 1))
		}
		var gj = /MSIE ([\d.]+).*Windows NT ([\d.]+)/,
			hj = /Firefox\/([\d.]+)/,
			ij = /Opera[ \/]([\d.]+)(.*Version\/([\d.]+))?/,
			jj = /Chrome\/([\d.]+)/,
			kj = /((Windows NT ([\d.]+))|(Mac OS X ([\d_]+))).*Version\/([\d.]+).*Safari/,
			lj = /Mac OS X;.*(?!(Version)).*Safari/,
			mj = /Android ([\d.]+).*Safari/,
			nj = /OS ([\d_]+) like Mac OS X.*Mobile.*Safari/,
			oj = /Konqueror\/([\d.]+)/,
			pj = /MSIE ([\d.]+).*Windows Phone OS ([\d.]+)/;

		function qj(a, b)
		{
			a = a.split(b || ".");
			this.a = [];
			for (b = 0; b < a.length; b++) this.a.push(parseInt(a[b], 10))
		}

		function rj(a, b)
		{
			b instanceof qj || (b = new qj(String(b)));
			for (var c = Math.max(a.a.length, b.a.length), d = 0; d < c; d++)
			{
				var e = a.a[d],
					f = b.a[d];
				if (void 0 !== e && void 0 !== f && e !== f) return e - f;
				if (void 0 === e) return -1;
				if (void 0 === f) return 1
			}
			return 0
		}

		function sj(a, b)
		{
			return 0 <= rj(a, b)
		}

		function tj()
		{
			var a = window.navigator && window.navigator.userAgent;
			if (a)
			{
				var b;
				if (b = a.match(ij))
				{
					var c =
						new qj(b[3] || b[1]);
					return 0 <= a.indexOf("Opera Mini") ? !1 : 0 <= a.indexOf("Opera Mobi") ? 0 <= a.indexOf("Android") && sj(c, "10.1") : sj(c, "8.0")
				}
				if (b = a.match(hj)) return sj(new qj(b[1]), "2.0");
				if (b = a.match(jj)) return sj(new qj(b[1]), "6.0");
				if (b = a.match(kj)) return c = new qj(b[6]), a = b[3] && new qj(b[3]), b = b[5] && new qj(b[5], "_"), (!(!a || !sj(a, "6.0")) || !(!b || !sj(b, "10.5.6"))) && sj(c, "3.0");
				if (b = a.match(mj)) return sj(new qj(b[1]), "3.0");
				if (b = a.match(nj)) return sj(new qj(b[1], "_"), "4.0");
				if (b = a.match(oj)) return sj(new qj(b[1]),
					"4.7");
				if (b = a.match(pj)) return c = new qj(b[1]), a = new qj(b[2]), sj(c, "7.0") && sj(a, "7.0");
				if (b = a.match(gj)) return c = new qj(b[1]), a = new qj(b[2]), sj(c, "7.0") && sj(a, "6.0");
				if (a.match(lj)) return !1
			}
			return !0
		}

		function uj(a)
		{
			if (a.classList) return a.classList;
			a = a.className;
			return p(a) && a.match(/\S+/g) || []
		}

		function vj(a, b)
		{
			return a.classList ? a.classList.contains(b) : Oa(uj(a), b)
		}

		function wj(a, b)
		{
			a.classList ? a.classList.add(b) : vj(a, b) || (a.className += 0 < a.className.length ? " " + b : b)
		}

		function xj(a, b)
		{
			a.classList ? a.classList.remove(b) :
				vj(a, b) && (a.className = Ja(uj(a), function (c)
				{
					return c != b
				}).join(" "))
		}

		function J(a)
		{
			var b = a.type;
			switch (p(b) && b.toLowerCase())
			{
			case "checkbox":
			case "radio":
				return a.checked ? a.value : null;
			case "select-one":
				return b = a.selectedIndex, 0 <= b ? a.options[b].value : null;
			case "select-multiple":
				b = [];
				for (var c, d = 0; c = a.options[d]; d++) c.selected && b.push(c.value);
				return b.length ? b : null;
			default:
				return null != a.value ? a.value : null
			}
		}

		function yj(a, b)
		{
			var c = a.type;
			switch (p(c) && c.toLowerCase())
			{
			case "checkbox":
			case "radio":
				a.checked =
					b;
				break;
			case "select-one":
				a.selectedIndex = -1;
				if (p(b))
					for (var d = 0; c = a.options[d]; d++)
						if (c.value == b)
						{
							c.selected = !0;
							break
						}
				break;
			case "select-multiple":
				p(b) && (b = [b]);
				for (d = 0; c = a.options[d]; d++)
					if (c.selected = !1, b)
						for (var e, f = 0; e = b[f]; f++) c.value == e && (c.selected = !0);
				break;
			default:
				a.value = null != b ? b : ""
			}
		}

		function zj(a)
		{
			if (a.altKey && !a.ctrlKey || a.metaKey || 112 <= a.keyCode && 123 >= a.keyCode) return !1;
			if (Aj(a.keyCode)) return !0;
			switch (a.keyCode)
			{
			case 18:
			case 20:
			case 93:
			case 17:
			case 40:
			case 35:
			case 27:
			case 36:
			case 45:
			case 37:
			case 224:
			case 91:
			case 144:
			case 12:
			case 34:
			case 33:
			case 19:
			case 255:
			case 44:
			case 39:
			case 145:
			case 16:
			case 38:
			case 252:
			case 224:
			case 92:
				return !1;
			case 0:
				return !ub;
			default:
				return 166 > a.keyCode || 183 < a.keyCode
			}
		}

		function Bj(a, b, c, d, e, f)
		{
			if (vb && !Db("525")) return !0;
			if (xb && e) return Aj(a);
			if (e && !d) return !1;
			if (!ub)
			{
				"number" == typeof b && (b = Cj(b));
				var g = 17 == b || 18 == b || xb && 91 == b;
				if ((!c || xb) && g || xb && 16 == b && (d || f)) return !1
			}
			if ((vb || sb) && d && c) switch (a)
			{
			case 220:
			case 219:
			case 221:
			case 192:
			case 186:
			case 189:
			case 187:
			case 188:
			case 190:
			case 191:
			case 192:
			case 222:
				return !1
			}
			if (v && d && b == a) return !1;
			switch (a)
			{
			case 13:
				return ub ? f || e ? !1 : !(c && d) : !0;
			case 27:
				return !(vb || sb ||
					ub)
			}
			return ub && (d || e || f) ? !1 : Aj(a)
		}

		function Aj(a)
		{
			if (48 <= a && 57 >= a || 96 <= a && 106 >= a || 65 <= a && 90 >= a || (vb || sb) && 0 == a) return !0;
			switch (a)
			{
			case 32:
			case 43:
			case 63:
			case 64:
			case 107:
			case 109:
			case 110:
			case 111:
			case 186:
			case 59:
			case 189:
			case 187:
			case 61:
			case 188:
			case 190:
			case 191:
			case 192:
			case 222:
			case 219:
			case 220:
			case 221:
			case 163:
				return !0;
			case 173:
				return ub;
			default:
				return !1
			}
		}

		function Cj(a)
		{
			if (ub) a = Dj(a);
			else if (xb && vb) switch (a)
			{
			case 93:
				a = 91
			}
			return a
		}

		function Dj(a)
		{
			switch (a)
			{
			case 61:
				return 187;
			case 59:
				return 186;
			case 173:
				return 189;
			case 224:
				return 91;
			case 0:
				return 224;
			default:
				return a
			}
		}

		function Ej(a)
		{
			F.call(this);
			this.a = a;
			Nf(a, "keydown", this.f, !1, this);
			Nf(a, "click", this.h, !1, this)
		}
		t(Ej, F);
		Ej.prototype.f = function (a)
		{
			(13 == a.keyCode || vb && 3 == a.keyCode) && Fj(this, a)
		};
		Ej.prototype.h = function (a)
		{
			Fj(this, a)
		};

		function Fj(a, b)
		{
			var c = new Gj(b);
			if (Yg(a, c))
			{
				c = new Hj(b);
				try
				{
					Yg(a, c)
				}
				finally
				{
					b.stopPropagation()
				}
			}
		}
		Ej.prototype.l = function ()
		{
			Ej.o.l.call(this);
			Vf(this.a, "keydown", this.f, !1, this);
			Vf(this.a, "click", this.h, !1, this);
			delete this.a
		};

		function Hj(a)
		{
			Bf.call(this, a.a);
			this.type = "action"
		}
		t(Hj, Bf);

		function Gj(a)
		{
			Bf.call(this, a.a);
			this.type = "beforeaction"
		}
		t(Gj, Bf);

		function Ij(a)
		{
			F.call(this);
			this.a = a;
			a = v ? "focusout" : "blur";
			this.f = Nf(this.a, v ? "focusin" : "focus", this, !v);
			this.h = Nf(this.a, a, this, !v)
		}
		t(Ij, F);
		Ij.prototype.handleEvent = function (a)
		{
			var b = new Bf(a.a);
			b.type = "focusin" == a.type || "focus" == a.type ? "focusin" : "focusout";
			Yg(this, b)
		};
		Ij.prototype.l = function ()
		{
			Ij.o.l.call(this);
			Wf(this.f);
			Wf(this.h);
			delete this.a
		};

		function Jj(a,
			b)
		{
			F.call(this);
			this.f = a || 1;
			this.a = b || n;
			this.h = q(this.Pb, this);
			this.j = za()
		}
		t(Jj, F);
		m = Jj.prototype;
		m.Ea = !1;
		m.Y = null;
		m.Pb = function ()
		{
			if (this.Ea)
			{
				var a = za() - this.j;
				0 < a && a < .8 * this.f ? this.Y = this.a.setTimeout(this.h, this.f - a) : (this.Y && (this.a.clearTimeout(this.Y), this.Y = null), Yg(this, "tick"), this.Ea && (Kj(this), this.start()))
			}
		};
		m.start = function ()
		{
			this.Ea = !0;
			this.Y || (this.Y = this.a.setTimeout(this.h, this.f), this.j = za())
		};

		function Kj(a)
		{
			a.Ea = !1;
			a.Y && (a.a.clearTimeout(a.Y), a.Y = null)
		}
		m.l = function ()
		{
			Jj.o.l.call(this);
			Kj(this);
			delete this.a
		};

		function Lj(a, b)
		{
			if (qa(a)) b && (a = q(a, b));
			else if (a && "function" == typeof a.handleEvent) a = q(a.handleEvent, a);
			else throw Error("Invalid listener argument");
			return 2147483647 < Number(0) ? -1 : n.setTimeout(a, 0)
		}

		function Mj(a)
		{
			vf.call(this);
			this.f = a;
			this.a = {}
		}
		t(Mj, vf);
		var Nj = [];

		function Oj(a, b, c, d)
		{
			oa(c) || (c && (Nj[0] = c.toString()), c = Nj);
			for (var e = 0; e < c.length; e++)
			{
				var f = Nf(b, c[e], d || a.handleEvent, !1, a.f || a);
				if (!f) break;
				a.a[f.key] = f
			}
		}

		function Pj(a)
		{
			ib(a.a, function (b, c)
			{
				this.a.hasOwnProperty(c) &&
					Wf(b)
			}, a);
			a.a = {}
		}
		Mj.prototype.l = function ()
		{
			Mj.o.l.call(this);
			Pj(this)
		};
		Mj.prototype.handleEvent = function ()
		{
			throw Error("EventHandler.handleEvent not implemented");
		};

		function Qj(a)
		{
			F.call(this);
			this.a = null;
			this.f = a;
			a = v || sb || vb && !Db("531") && "TEXTAREA" == a.tagName;
			this.h = new Mj(this);
			Oj(this.h, this.f, a ? ["keydown", "paste", "cut", "drop", "input"] : "input", this)
		}
		t(Qj, F);
		Qj.prototype.handleEvent = function (a)
		{
			if ("input" == a.type) v && Db(10) && 0 == a.keyCode && 0 == a.j || (Rj(this), Yg(this, Sj(a)));
			else if ("keydown" != a.type ||
				zj(a))
			{
				var b = "keydown" == a.type ? this.f.value : null;
				v && 229 == a.keyCode && (b = null);
				var c = Sj(a);
				Rj(this);
				this.a = Lj(function ()
				{
					this.a = null;
					this.f.value != b && Yg(this, c)
				}, this)
			}
		};

		function Rj(a)
		{
			null != a.a && (n.clearTimeout(a.a), a.a = null)
		}

		function Sj(a)
		{
			a = new Bf(a.a);
			a.type = "input";
			return a
		}
		Qj.prototype.l = function ()
		{
			Qj.o.l.call(this);
			this.h.m();
			Rj(this);
			delete this.f
		};

		function Tj(a, b)
		{
			F.call(this);
			a && (this.Ia && Uj(this), this.oa = a, this.Ha = Nf(this.oa, "keypress", this, b), this.Va = Nf(this.oa, "keydown", this.yb, b, this),
				this.Ia = Nf(this.oa, "keyup", this.Ab, b, this))
		}
		t(Tj, F);
		m = Tj.prototype;
		m.oa = null;
		m.Ha = null;
		m.Va = null;
		m.Ia = null;
		m.S = -1;
		m.W = -1;
		m.Pa = !1;
		var Vj = {
				3: 13,
				12: 144,
				63232: 38,
				63233: 40,
				63234: 37,
				63235: 39,
				63236: 112,
				63237: 113,
				63238: 114,
				63239: 115,
				63240: 116,
				63241: 117,
				63242: 118,
				63243: 119,
				63244: 120,
				63245: 121,
				63246: 122,
				63247: 123,
				63248: 44,
				63272: 46,
				63273: 36,
				63275: 35,
				63276: 33,
				63277: 34,
				63289: 144,
				63302: 45
			},
			Wj = {
				Up: 38,
				Down: 40,
				Left: 37,
				Right: 39,
				Enter: 13,
				F1: 112,
				F2: 113,
				F3: 114,
				F4: 115,
				F5: 116,
				F6: 117,
				F7: 118,
				F8: 119,
				F9: 120,
				F10: 121,
				F11: 122,
				F12: 123,
				"U+007F": 46,
				Home: 36,
				End: 35,
				PageUp: 33,
				PageDown: 34,
				Insert: 45
			},
			Xj = !vb || Db("525"),
			Yj = xb && ub;
		m = Tj.prototype;
		m.yb = function (a)
		{
			if (vb || sb)
				if (17 == this.S && !a.ctrlKey || 18 == this.S && !a.altKey || xb && 91 == this.S && !a.metaKey) this.W = this.S = -1; - 1 == this.S && (a.ctrlKey && 17 != a.keyCode ? this.S = 17 : a.altKey && 18 != a.keyCode ? this.S = 18 : a.metaKey && 91 != a.keyCode && (this.S = 91));
			Xj && !Bj(a.keyCode, this.S, a.shiftKey, a.ctrlKey, a.altKey, a.metaKey) ? this.handleEvent(a) : (this.W = Cj(a.keyCode), Yj && (this.Pa = a.altKey))
		};
		m.Ab = function (a)
		{
			this.W =
				this.S = -1;
			this.Pa = a.altKey
		};
		m.handleEvent = function (a)
		{
			var b = a.a,
				c = b.altKey;
			if (v && "keypress" == a.type)
			{
				var d = this.W;
				var e = 13 != d && 27 != d ? b.keyCode : 0
			}
			else(vb || sb) && "keypress" == a.type ? (d = this.W, e = 0 <= b.charCode && 63232 > b.charCode && Aj(d) ? b.charCode : 0) : rb && !vb ? (d = this.W, e = Aj(d) ? b.keyCode : 0) : ("keypress" == a.type ? (Yj && (c = this.Pa), b.keyCode == b.charCode ? 32 > b.keyCode ? (d = b.keyCode, e = 0) : (d = this.W, e = b.charCode) : (d = b.keyCode || this.W, e = b.charCode || 0)) : (d = b.keyCode || this.W, e = b.charCode || 0), xb && 63 == e && 224 == d && (d = 191));
			var f = d = Cj(d);
			d ? 63232 <= d && d in Vj ? f = Vj[d] : 25 == d && a.shiftKey && (f = 9) : b.keyIdentifier && b.keyIdentifier in Wj && (f = Wj[b.keyIdentifier]);
			ub && Xj && "keypress" == a.type && !Bj(f, this.S, a.shiftKey, a.ctrlKey, c, a.metaKey) || (a = f == this.S, this.S = f, b = new Zj(f, e, a, b), b.altKey = c, Yg(this, b))
		};
		m.N = function ()
		{
			return this.oa
		};

		function Uj(a)
		{
			a.Ha && (Wf(a.Ha), Wf(a.Va), Wf(a.Ia), a.Ha = null, a.Va = null, a.Ia = null);
			a.oa = null;
			a.S = -1;
			a.W = -1
		}
		m.l = function ()
		{
			Tj.o.l.call(this);
			Uj(this)
		};

		function Zj(a, b, c, d)
		{
			Bf.call(this, d);
			this.type = "key";
			this.keyCode = a;
			this.j = b;
			this.repeat = c
		}
		t(Zj, Bf);

		function ak(a, b, c, d)
		{
			this.top = a;
			this.right = b;
			this.bottom = c;
			this.left = d
		}
		ak.prototype.toString = function ()
		{
			return "(" + this.top + "t, " + this.right + "r, " + this.bottom + "b, " + this.left + "l)"
		};
		ak.prototype.ceil = function ()
		{
			this.top = Math.ceil(this.top);
			this.right = Math.ceil(this.right);
			this.bottom = Math.ceil(this.bottom);
			this.left = Math.ceil(this.left);
			return this
		};
		ak.prototype.floor = function ()
		{
			this.top = Math.floor(this.top);
			this.right = Math.floor(this.right);
			this.bottom =
				Math.floor(this.bottom);
			this.left = Math.floor(this.left);
			return this
		};
		ak.prototype.round = function ()
		{
			this.top = Math.round(this.top);
			this.right = Math.round(this.right);
			this.bottom = Math.round(this.bottom);
			this.left = Math.round(this.left);
			return this
		};

		function bk(a, b)
		{
			var c = hc(a);
			return c.defaultView && c.defaultView.getComputedStyle && (a = c.defaultView.getComputedStyle(a, null)) ? a[b] || a.getPropertyValue(b) || "" : ""
		}

		function ck(a)
		{
			try
			{
				var b = a.getBoundingClientRect()
			}
			catch (c)
			{
				return {
					left: 0,
					top: 0,
					right: 0,
					bottom: 0
				}
			}
			v &&
				a.ownerDocument.body && (a = a.ownerDocument, b.left -= a.documentElement.clientLeft + a.body.clientLeft, b.top -= a.documentElement.clientTop + a.body.clientTop);
			return b
		}

		function dk(a, b)
		{
			b = b || nc(document);
			var c = b || nc(document);
			var d = ek(a),
				e = ek(c);
			if (!v || 9 <= Number(Eb))
			{
				g = bk(c, "borderLeftWidth");
				var f = bk(c, "borderRightWidth");
				h = bk(c, "borderTopWidth");
				k = bk(c, "borderBottomWidth");
				f = new ak(parseFloat(h), parseFloat(f), parseFloat(k), parseFloat(g))
			}
			else
			{
				var g = fk(c, "borderLeft");
				f = fk(c, "borderRight");
				var h = fk(c, "borderTop"),
					k = fk(c, "borderBottom");
				f = new ak(h, f, k, g)
			}
			c == nc(document) ? (g = d.a - c.scrollLeft, d = d.f - c.scrollTop, !v || 10 <= Number(Eb) || (g += f.left, d += f.top)) : (g = d.a - e.a - f.left, d = d.f - e.f - f.top);
			e = a.offsetWidth;
			f = a.offsetHeight;
			h = vb && !e && !f;
			ha(e) && !h || !a.getBoundingClientRect ? a = new ec(e, f) : (a = ck(a), a = new ec(a.right - a.left, a.bottom - a.top));
			e = c.clientHeight - a.height;
			f = c.scrollLeft;
			h = c.scrollTop;
			f += Math.min(g, Math.max(g - (c.clientWidth - a.width), 0));
			h += Math.min(d, Math.max(d - e, 0));
			c = new dc(f, h);
			b.scrollLeft = c.a;
			b.scrollTop = c.f
		}

		function ek(a)
		{
			var b = hc(a),
				c = new dc(0, 0);
			var d = b ? hc(b) : document;
			d = !v || 9 <= Number(Eb) || "CSS1Compat" == fc(d).a.compatMode ? d.documentElement : d.body;
			if (a == d) return c;
			a = ck(a);
			d = fc(b).a;
			b = nc(d);
			d = d.parentWindow || d.defaultView;
			b = v && Db("10") && d.pageYOffset != b.scrollTop ? new dc(b.scrollLeft, b.scrollTop) : new dc(d.pageXOffset || b.scrollLeft, d.pageYOffset || b.scrollTop);
			c.a = a.left + b.a;
			c.f = a.top + b.f;
			return c
		}
		var gk = {
			thin: 2,
			medium: 4,
			thick: 6
		};

		function fk(a, b)
		{
			if ("none" == (a.currentStyle ? a.currentStyle[b + "Style"] : null)) return 0;
			var c = a.currentStyle ? a.currentStyle[b + "Width"] : null;
			if (c in gk) a = gk[c];
			else if (/^\d+px?$/.test(c)) a = parseInt(c, 10);
			else
			{
				b = a.style.left;
				var d = a.runtimeStyle.left;
				a.runtimeStyle.left = a.currentStyle.left;
				a.style.left = c;
				c = a.style.pixelLeft;
				a.style.left = b;
				a.runtimeStyle.left = d;
				a = +c
			}
			return a
		}

		function hk()
		{}
		la(hk);
		hk.prototype.a = 0;

		function ik(a)
		{
			F.call(this);
			this.w = a || fc();
			this.$a = null;
			this.na = !1;
			this.j = null;
			this.I = void 0;
			this.xa = this.za = this.$ = null
		}
		t(ik, F);
		m = ik.prototype;
		m.Cb = hk.Ua();
		m.N = function ()
		{
			return this.j
		};

		function K(a, b)
		{
			return a.j ? kc(b, a.j || a.w.a) : null
		}

		function jk(a)
		{
			a.I || (a.I = new Mj(a));
			return a.I
		}
		m.Wa = function (a)
		{
			if (this.$ && this.$ != a) throw Error("Method not supported");
			ik.o.Wa.call(this, a)
		};
		m.ib = function ()
		{
			this.j = this.w.a.createElement("DIV")
		};
		m.render = function (a)
		{
			if (this.na) throw Error("Component already rendered");
			this.j || this.ib();
			a ? a.insertBefore(this.j, null) : this.w.a.body.appendChild(this.j);
			this.$ && !this.$.na || this.u()
		};
		m.u = function ()
		{
			this.na = !0;
			kk(this, function (a)
			{
				!a.na && a.N() && a.u()
			})
		};
		m.ua = function ()
		{
			kk(this, function (a)
			{
				a.na && a.ua()
			});
			this.I && Pj(this.I);
			this.na = !1
		};
		m.l = function ()
		{
			this.na && this.ua();
			this.I && (this.I.m(), delete this.I);
			kk(this, function (a)
			{
				a.m()
			});
			this.j && oc(this.j);
			this.$ = this.j = this.xa = this.za = null;
			ik.o.l.call(this)
		};

		function kk(a, b)
		{
			a.za && Ha(a.za, b, void 0)
		}
		m.removeChild = function (a, b)
		{
			if (a)
			{
				var c = p(a) ? a : a.$a || (a.$a = ":" + (a.Cb.a++).toString(36));
				this.xa && c ? (a = this.xa, a = (null !== a && c in a ? a[c] : void 0) || null) : a = null;
				if (c && a)
				{
					var d = this.xa;
					c in d && delete d[c];
					Pa(this.za,
						a);
					b && (a.ua(), a.j && oc(a.j));
					b = a;
					if (null == b) throw Error("Unable to set parent component");
					b.$ = null;
					ik.o.Wa.call(b, null)
				}
			}
			if (!a) throw Error("Child is not in parent component");
			return a
		};

		function L(a, b)
		{
			var c = qc(a, "firebaseui-textfield");
			b ? (xj(a, "firebaseui-input-invalid"), wj(a, "firebaseui-input"), c && xj(c, "firebaseui-textfield-invalid")) : (xj(a, "firebaseui-input"), wj(a, "firebaseui-input-invalid"), c && wj(c, "firebaseui-textfield-invalid"))
		}

		function lk(a, b, c)
		{
			b = new Qj(b);
			yf(a, xa(zf, b));
			Oj(jk(a), b, "input",
				c)
		}

		function mk(a, b, c)
		{
			b = new Tj(b);
			yf(a, xa(zf, b));
			Oj(jk(a), b, "key", function (d)
			{
				13 == d.keyCode && (d.stopPropagation(), d.preventDefault(), c(d))
			})
		}

		function nk(a, b, c)
		{
			b = new Ij(b);
			yf(a, xa(zf, b));
			Oj(jk(a), b, "focusin", c)
		}

		function ok(a, b, c)
		{
			b = new Ij(b);
			yf(a, xa(zf, b));
			Oj(jk(a), b, "focusout", c)
		}

		function M(a, b, c)
		{
			b = new Ej(b);
			yf(a, xa(zf, b));
			Oj(jk(a), b, "action", function (d)
			{
				d.stopPropagation();
				d.preventDefault();
				c(d)
			})
		}

		function pk(a)
		{
			wj(a, "firebaseui-hidden")
		}

		function N(a, b)
		{
			b && pc(a, b);
			xj(a, "firebaseui-hidden")
		}

		function qk(a)
		{
			return !vj(a,
				"firebaseui-hidden") && "none" != a.style.display
		}

		function rk(a)
		{
			a = a ||
			{};
			var b = a.email,
				c = a.disabled,
				d = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="email">';
			d = a.dc ? d + "Enter new email address" : d + "Email";
			d += '</label><input type="email" name="email" autocomplete="username" class="mdl-textfield__input firebaseui-input firebaseui-id-email" value="' + qd(null != b ? b : "") + '"' + (c ? "disabled" : "") + '></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-email-error"></p></div>';
			return y(d)
		}

		function sk(a)
		{
			a = a ||
			{};
			a = a.label;
			var b = '<button type="submit" class="firebaseui-id-submit firebaseui-button mdl-button mdl-js-button mdl-button--raised mdl-button--colored">';
			b = a ? b + x(a) : b + "Next";
			return y(b + "</button>")
		}

		function tk()
		{
			var a = "" + sk(
			{
				label: A("Sign In")
			});
			return y(a)
		}

		function uk()
		{
			var a = "" + sk(
			{
				label: A("Save")
			});
			return y(a)
		}

		function vk()
		{
			var a = "" + sk(
			{
				label: A("Continue")
			});
			return y(a)
		}

		function wk(a)
		{
			a = a ||
			{};
			a = a.label;
			var b = '<div class="firebaseui-new-password-component"><div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="newPassword">';
			b = a ? b + x(a) : b + "Choose password";
			return y(b + '</label><input type="password" name="newPassword" autocomplete="new-password" class="mdl-textfield__input firebaseui-input firebaseui-id-new-password"></div><a href="javascript:void(0)" class="firebaseui-input-floating-button firebaseui-id-password-toggle firebaseui-input-toggle-on firebaseui-input-toggle-blur"></a><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-new-password-error"></p></div></div>')
		}

		function xk()
		{
			var a = {};
			var b = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="password">';
			b = a.current ? b + "Current password" : b + "Password";
			return y(b + '</label><input type="password" name="password" autocomplete="current-password" class="mdl-textfield__input firebaseui-input firebaseui-id-password"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-password-error"></p></div>')
		}

		function yk()
		{
			return y('<a class="firebaseui-link firebaseui-id-secondary-link" href="javascript:void(0)">Trouble signing in?</a>')
		}

		function zk(a)
		{
			a = a ||
			{};
			a = a.label;
			var b = '<button class="firebaseui-id-secondary-link firebaseui-button mdl-button mdl-js-button mdl-button--primary">';
			b = a ? b + x(a) : b + "Cancel";
			return y(b + "</button>")
		}

		function Ak(a)
		{
			var b = "";
			a.H && a.G && (b += '<ul class="firebaseui-tos-list firebaseui-tos"><li class="firebaseui-inline-list-item"><a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a></li><li class="firebaseui-inline-list-item"><a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a></li></ul>');
			return y(b)
		}

		function Bk(a)
		{
			var b = "";
			a.H && a.G && (b += '<p class="firebaseui-tos firebaseui-tospp-full-message">By continuing, you are indicating that you accept our <a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a> and <a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a>.</p>');
			return y(b)
		}

		function Ck(a)
		{
			a = '<div class="firebaseui-info-bar firebaseui-id-info-bar"><p class="firebaseui-info-bar-message">' +
				x(a.message) + '&nbsp;&nbsp;<a href="javascript:void(0)" class="firebaseui-link firebaseui-id-dismiss-info-bar">Dismiss</a></p></div>';
			return y(a)
		}
		Ck.B = "firebaseui.auth.soy2.element.infoBar";

		function Dk(a)
		{
			var b = a.content;
			a = a.tb;
			return y('<dialog class="mdl-dialog firebaseui-dialog firebaseui-id-dialog' + (a ? " " + qd(a) : "") + '">' + x(b) + "</dialog>")
		}

		function Ek(a)
		{
			var b = a.message;
			return y(Dk(
			{
				content: pd('<div class="firebaseui-dialog-icon-wrapper"><div class="' + qd(a.Ga) + ' firebaseui-dialog-icon"></div></div><div class="firebaseui-progress-dialog-message">' +
					x(b) + "</div>")
			}))
		}
		Ek.B = "firebaseui.auth.soy2.element.progressDialog";

		function Fk(a)
		{
			var b = '<div class="firebaseui-list-box-actions">';
			a = a.items;
			for (var c = a.length, d = 0; d < c; d++)
			{
				var e = a[d];
				b += '<button type="button" data-listboxid="' + qd(e.id) + '" class="mdl-button firebaseui-id-list-box-dialog-button firebaseui-list-box-dialog-button">' + (e.Ga ? '<div class="firebaseui-list-box-icon-wrapper"><div class="firebaseui-list-box-icon ' + qd(e.Ga) + '"></div></div>' : "") + '<div class="firebaseui-list-box-label-wrapper">' +
					x(e.label) + "</div></button>"
			}
			b = "" + Dk(
			{
				tb: A("firebaseui-list-box-dialog"),
				content: pd(b + "</div>")
			});
			return y(b)
		}
		Fk.B = "firebaseui.auth.soy2.element.listBoxDialog";

		function Gk(a)
		{
			a = a ||
			{};
			return y(a.Qb ? '<div class="mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>' : '<div class="mdl-progress mdl-js-progress mdl-progress__indeterminate firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>')
		}
		Gk.B = "firebaseui.auth.soy2.element.busyIndicator";

		function Hk(a, b)
		{
			a = a ||
			{};
			a = a.fa;
			return z(a.lb ? a.lb : b.fb[a.providerId] ? "" + b.fb[a.providerId] : "" + a.providerId)
		}

		function Ik(a)
		{
			Jk(a, "upgradeElement")
		}

		function Kk(a)
		{
			Jk(a, "downgradeElements")
		}
		var Lk = ["mdl-js-textfield", "mdl-js-progress", "mdl-js-spinner", "mdl-js-button"];

		function Jk(a, b)
		{
			a && window.componentHandler && window.componentHandler[b] && Ha(Lk, function (c)
			{
				if (vj(a, c)) window.componentHandler[b](a);
				Ha(ic(c, a), function (d)
				{
					window.componentHandler[b](d)
				})
			})
		}

		function Mk(a, b, c)
		{
			Nk.call(this);
			document.body.appendChild(a);
			a.showModal || window.dialogPolyfill.registerDialog(a);
			a.showModal();
			Ik(a);
			b && M(this, a, function (f)
			{
				var g = a.getBoundingClientRect();
				(f.clientX < g.left || g.left + g.width < f.clientX || f.clientY < g.top || g.top + g.height < f.clientY) && Nk.call(this)
			});
			if (!c)
			{
				var d = this.N().parentElement || this.N().parentNode;
				if (d)
				{
					var e = this;
					this.ca = function ()
					{
						if (a.open)
						{
							var f = a.getBoundingClientRect().height,
								g = d.getBoundingClientRect().height,
								h = d.getBoundingClientRect().top - document.body.getBoundingClientRect().top,
								k = d.getBoundingClientRect().left -
								document.body.getBoundingClientRect().left,
								l = a.getBoundingClientRect().width,
								w = d.getBoundingClientRect().width;
							a.style.top = (h + (g - f) / 2).toString() + "px";
							f = k + (w - l) / 2;
							a.style.left = f.toString() + "px";
							a.style.right = (document.body.getBoundingClientRect().width - f - l).toString() + "px"
						}
						else window.removeEventListener("resize", e.ca)
					};
					this.ca();
					window.addEventListener("resize", this.ca, !1)
				}
			}
		}

		function Nk()
		{
			var a = Ok.call(this);
			a && (Kk(a), a.open && a.close(), oc(a), this.ca && window.removeEventListener("resize", this.ca))
		}

		function Ok()
		{
			return kc("firebaseui-id-dialog")
		}

		function Pk()
		{
			oc(Qk.call(this))
		}

		function Qk()
		{
			return K(this, "firebaseui-id-info-bar")
		}

		function Rk()
		{
			return K(this, "firebaseui-id-dismiss-info-bar")
		}
		var Sk = {
			Ra:
			{
				"google.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
				"github.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg",
				"facebook.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg",
				"twitter.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg",
				password: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/mail.svg",
				phone: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/phone.svg",
				anonymous: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/anonymous.png",
				"microsoft.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/microsoft.svg",
				"yahoo.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/yahoo.svg",
				"apple.com": "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/apple.png"
			},
			Qa:
			{
				"google.com": "#ffffff",
				"github.com": "#333333",
				"facebook.com": "#3b5998",
				"twitter.com": "#55acee",
				password: "#db4437",
				phone: "#02bd7e",
				anonymous: "#f4b400",
				"microsoft.com": "#2F2F2F",
				"yahoo.com": "#720E9E",
				"apple.com": "#000000"
			},
			fb:
			{
				"google.com": "Google",
				"github.com": "GitHub",
				"facebook.com": "Facebook",
				"twitter.com": "Twitter",
				password: "Password",
				phone: "Phone",
				anonymous: "Guest",
				"microsoft.com": "Microsoft",
				"yahoo.com": "Yahoo",
				"apple.com": "Apple"
			}
		};

		function Tk(a, b, c)
		{
			Af.call(this, a, b);
			for (var d in c) this[d] = c[d]
		}
		t(Tk, Af);

		function O(a,
			b, c, d, e)
		{
			ik.call(this, c);
			this.bb = a;
			this.ab = b;
			this.Aa = !1;
			this.Ma = d || null;
			this.v = this.ga = null;
			this.aa = jb(Sk);
			lb(this.aa, e ||
			{})
		}
		t(O, ik);
		m = O.prototype;
		m.ib = function ()
		{
			var a = fd(this.bb, this.ab, this.aa, this.w);
			Ik(a);
			this.j = a
		};
		m.u = function ()
		{
			O.o.u.call(this);
			bh(P(this), new Tk("pageEnter", P(this),
			{
				pageId: this.Ma
			}));
			if (this.Za() && this.aa.H)
			{
				var a = this.aa.H;
				M(this, this.Za(), function ()
				{
					a()
				})
			}
			if (this.Ya() && this.aa.G)
			{
				var b = this.aa.G;
				M(this, this.Ya(), function ()
				{
					b()
				})
			}
		};
		m.ua = function ()
		{
			bh(P(this), new Tk("pageExit",
				P(this),
				{
					pageId: this.Ma
				}));
			O.o.ua.call(this)
		};
		m.l = function ()
		{
			window.clearTimeout(this.ga);
			this.ab = this.bb = this.ga = null;
			this.Aa = !1;
			this.v = null;
			Kk(this.N());
			O.o.l.call(this)
		};

		function Uk(a)
		{
			a.Aa = !0;
			var b = vj(a.N(), "firebaseui-use-spinner");
			a.ga = window.setTimeout(function ()
			{
				a.N() && null === a.v && (a.v = fd(Gk,
				{
					Qb: b
				}, null, a.w), a.N().appendChild(a.v), Ik(a.v))
			}, 500)
		}
		m.M = function (a, b, c, d)
		{
			function e()
			{
				if (f.O) return null;
				f.Aa = !1;
				window.clearTimeout(f.ga);
				f.ga = null;
				f.v && (Kk(f.v), oc(f.v), f.v = null)
			}
			var f = this;
			if (f.Aa) return null;
			Uk(f);
			return a.apply(null, b).then(c, d).then(e, e)
		};

		function P(a)
		{
			return a.N().parentElement || a.N().parentNode
		}

		function Vk(a, b, c)
		{
			mk(a, b, function ()
			{
				c.focus()
			})
		}

		function Wk(a, b, c)
		{
			mk(a, b, function ()
			{
				c()
			})
		}
		r(O.prototype,
		{
			f: function (a)
			{
				Pk.call(this);
				var b = fd(Ck,
				{
					message: a
				}, null, this.w);
				this.N().appendChild(b);
				M(this, Rk.call(this), function ()
				{
					oc(b)
				})
			},
			fc: Pk,
			ic: Qk,
			hc: Rk,
			X: function (a, b)
			{
				a = fd(Ek,
				{
					Ga: a,
					message: b
				}, null, this.w);
				Mk.call(this, a)
			},
			h: Nk,
			sb: Ok,
			kc: function ()
			{
				return K(this, "firebaseui-tos")
			},
			Za: function ()
			{
				return K(this,
					"firebaseui-tos-link")
			},
			Ya: function ()
			{
				return K(this, "firebaseui-pp-link")
			},
			lc: function ()
			{
				return K(this, "firebaseui-tos-list")
			}
		});

		function Xk(a, b, c)
		{
			a = a ||
			{};
			b = a.Sa;
			var d = a.ia;
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-sign-in"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in with email</h1></div><div class="firebaseui-card-content"><div class="firebaseui-relative-wrapper">' + rk(a) + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
				(b ? zk(null) : "") + sk(null) + '</div></div><div class="firebaseui-card-footer">' + (d ? Bk(c) : Ak(c)) + "</div></form></div>";
			return y(a)
		}
		Xk.B = "firebaseui.auth.soy2.page.signIn";

		function Yk(a, b, c)
		{
			a = a ||
			{};
			b = a.ia;
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-sign-in"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content">' + rk(a) + xk() + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' +
				yk() + '</div><div class="firebaseui-form-actions">' + tk() + '</div></div><div class="firebaseui-card-footer">' + (b ? Bk(c) : Ak(c)) + "</div></form></div>";
			return y(a)
		}
		Yk.B = "firebaseui.auth.soy2.page.passwordSignIn";

		function Zk(a, b, c)
		{
			a = a ||
			{};
			var d = a.Gb;
			b = a.Oa;
			var e = a.ia,
				f = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-sign-up"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Create account</h1></div><div class="firebaseui-card-content">' +
				rk(a);
			d ? (a = a ||
				{}, a = a.name, a = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="name">First &amp; last name</label><input type="text" name="name" autocomplete="name" class="mdl-textfield__input firebaseui-input firebaseui-id-name" value="' + qd(null != a ? a : "") + '"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-name-error"></p></div>',
				a = y(a)) : a = "";
			c = f + a + wk(null) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? zk(null) : "") + uk() + '</div></div><div class="firebaseui-card-footer">' + (e ? Bk(c) : Ak(c)) + "</div></form></div>";
			return y(c)
		}
		Zk.B = "firebaseui.auth.soy2.page.passwordSignUp";

		function $k(a, b, c)
		{
			a = a ||
			{};
			b = a.Oa;
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Recover password</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Get instructions sent to this email that explain how to reset your password</p>' +
				rk(a) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? zk(null) : "") + sk(
				{
					label: A("Send")
				}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(a)
		}
		$k.B = "firebaseui.auth.soy2.page.passwordRecovery";

		function al(a, b, c)
		{
			b = a.T;
			var d = "";
			a = "Follow the instructions sent to <strong>" + (x(a.email) + "</strong> to recover your password");
			d += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery-email-sent"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Check your email</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
				a + '</p></div><div class="firebaseui-card-actions">';
			b && (d += '<div class="firebaseui-form-actions">' + sk(
			{
				label: A("Done")
			}) + "</div>");
			d += '</div><div class="firebaseui-card-footer">' + Ak(c) + "</div></div>";
			return y(d)
		}
		al.B = "firebaseui.auth.soy2.page.passwordRecoveryEmailSent";

		function bl(a, b, c)
		{
			return y('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-callback"><div class="firebaseui-callback-indicator-container">' + Gk(null, null, c) + "</div></div>")
		}
		bl.B = "firebaseui.auth.soy2.page.callback";

		function cl()
		{
			return y('<div class="firebaseui-container firebaseui-id-page-blank firebaseui-use-spinner"></div>')
		}
		cl.B = "firebaseui.auth.soy2.page.blank";

		function dl(a, b, c)
		{
			b = "";
			a = "A sign-in email with additional instructions was sent to <strong>" + (x(a.email) + "</strong>. Check your email to complete sign-in.");
			var d = y('<a class="firebaseui-link firebaseui-id-trouble-getting-email-link" href="javascript:void(0)">Trouble getting email?</a>');
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-sent"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign-in email sent</h1></div><div class="firebaseui-card-content"><div class="firebaseui-email-sent"></div><p class="firebaseui-text">' +
				a + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' + d + '</div><div class="firebaseui-form-actions">' + zk(
				{
					label: A("Back")
				}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		dl.B = "firebaseui.auth.soy2.page.emailLinkSignInSent";

		function el(a, b, c)
		{
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-not-received"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Trouble getting email?</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Try these common fixes:<ul><li>Check if the email was marked as spam or filtered.</li><li>Check your internet connection.</li><li>Check that you did not misspell your email.</li><li>Check that your inbox space is not running out or other inbox settings related issues.</li></ul></p><p class="firebaseui-text">If the steps above didn\'t work, you can resend the email. Note that this will deactivate the link in the older email.</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' +
				y('<a class="firebaseui-link firebaseui-id-resend-email-link" href="javascript:void(0)">Resend</a>') + '</div><div class="firebaseui-form-actions">' + zk(
				{
					label: A("Back")
				}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(a)
		}
		el.B = "firebaseui.auth.soy2.page.emailNotReceived";

		function fl(a, b, c)
		{
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-confirmation"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Confirm email</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Confirm your email to complete sign in</p><div class="firebaseui-relative-wrapper">' +
				rk(a) + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + zk(null) + sk(null) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(a)
		}
		fl.B = "firebaseui.auth.soy2.page.emailLinkSignInConfirmation";

		function gl()
		{
			var a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-different-device-error"><div class="firebaseui-card-header"><h1 class="firebaseui-title">New device or browser detected</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Try opening the link using the same device or browser where you started the sign-in process.</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
				zk(
				{
					label: A("Dismiss")
				}) + "</div></div></div>";
			return y(a)
		}
		gl.B = "firebaseui.auth.soy2.page.differentDeviceError";

		function hl()
		{
			var a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-anonymous-user-mismatch"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Session ended</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">The session associated with this sign-in request has either expired or was cleared.</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
				zk(
				{
					label: A("Dismiss")
				}) + "</div></div></div>";
			return y(a)
		}
		hl.B = "firebaseui.auth.soy2.page.anonymousUserMismatch";

		function il(a, b, c)
		{
			b = "";
			a = "You’ve already used <strong>" + (x(a.email) + "</strong> to sign in. Enter your password for that account.");
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text">' +
				a + "</p>" + xk() + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' + yk() + '</div><div class="firebaseui-form-actions">' + tk() + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		il.B = "firebaseui.auth.soy2.page.passwordLinking";

		function jl(a, b, c)
		{
			var d = a.email;
			b = "";
			a = "" + Hk(a, c);
			a = A(a);
			d = "You’ve already used <strong>" + (x(d) + ("</strong>. You can connect your <strong>" + (x(a) + ("</strong> account with <strong>" + (x(d) + "</strong> by signing in with email link below.")))));
			a = "For this flow to successfully connect your " + (x(a) + " account with this email, you have to open the link on the same device or browser.");
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text firebaseui-text-justify">' +
				d + '<p class="firebaseui-text firebaseui-text-justify">' + a + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + tk() + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		jl.B = "firebaseui.auth.soy2.page.emailLinkSignInLinking";

		function kl(a, b, c)
		{
			b = "";
			var d = "" + Hk(a, c);
			d = A(d);
			a = "You originally intended to connect <strong>" + (x(d) + "</strong> to your email account but have opened the link on a different device where you are not signed in.");
			d = "If you still want to connect your <strong>" + (x(d) + "</strong> account, open the link on the same device where you started sign-in. Otherwise, tap Continue to sign-in on this device.");
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-linking-different-device"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text firebaseui-text-justify">' +
				a + '</p><p class="firebaseui-text firebaseui-text-justify">' + d + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + vk() + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		kl.B = "firebaseui.auth.soy2.page.emailLinkSignInLinkingDifferentDevice";

		function ll(a, b, c)
		{
			var d = a.email;
			b = "";
			a = "" + Hk(a, c);
			a = A(a);
			d = "You’ve already used <strong>" + (x(d) + ("</strong>. Sign in with " + (x(a) + " to continue.")));
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-federated-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text">' +
				d + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + sk(
				{
					label: A("Sign in with " + a)
				}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		ll.B = "firebaseui.auth.soy2.page.federatedLinking";

		function ml(a, b, c)
		{
			b = "";
			a = "To continue sign in with <strong>" + (x(a.email) + "</strong> on this device, you have to recover the password.");
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-unsupported-provider"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
				a + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + zk(null) + sk(
				{
					label: A("Recover password")
				}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		ml.B = "firebaseui.auth.soy2.page.unsupportedProvider";

		function nl(a)
		{
			var b = "",
				c = '<p class="firebaseui-text">for <strong>' + (x(a.email) + "</strong></p>");
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Reset your password</h1></div><div class="firebaseui-card-content">' +
				c + wk(od(a)) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + uk() + "</div></div></form></div>";
			return y(b)
		}
		nl.B = "firebaseui.auth.soy2.page.passwordReset";

		function ol(a)
		{
			a = a ||
			{};
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Password changed</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new password</p></div><div class="firebaseui-card-actions">' +
				(a.T ? '<div class="firebaseui-form-actions">' + vk() + "</div>" : "") + "</div></div>";
			return y(a)
		}
		ol.B = "firebaseui.auth.soy2.page.passwordResetSuccess";

		function pl(a)
		{
			a = a ||
			{};
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try resetting your password again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to reset your password has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' +
				(a.T ? '<div class="firebaseui-form-actions">' + sk(null) + "</div>" : "") + "</div></div>";
			return y(a)
		}
		pl.B = "firebaseui.auth.soy2.page.passwordResetFailure";

		function ql(a)
		{
			var b = a.T,
				c = "";
			a = "Your sign-in email address has been changed back to <strong>" + (x(a.email) + "</strong>.");
			c += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-success"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Updated email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
				a + '</p><p class="firebaseui-text">If you didn’t ask to change your sign-in email, it’s possible someone is trying to access your account and you should <a class="firebaseui-link firebaseui-id-reset-password-link" href="javascript:void(0)">change your password right away</a>.</p></div><div class="firebaseui-card-actions">' + (b ? '<div class="firebaseui-form-actions">' + sk(null) + "</div>" : "") + "</div></form></div>";
			return y(c)
		}
		ql.B = "firebaseui.auth.soy2.page.emailChangeRevokeSuccess";

		function rl(a)
		{
			a =
				a ||
				{};
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Unable to update your email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">There was a problem changing your sign-in email back.</p><p class="firebaseui-text">If you try again and still can’t reset your email, try asking your administrator for help.</p></div><div class="firebaseui-card-actions">' +
				(a.T ? '<div class="firebaseui-form-actions">' + sk(null) + "</div>" : "") + "</div></div>";
			return y(a)
		}
		rl.B = "firebaseui.auth.soy2.page.emailChangeRevokeFailure";

		function sl(a)
		{
			a = a ||
			{};
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Your email has been verified</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new account</p></div><div class="firebaseui-card-actions">' +
				(a.T ? '<div class="firebaseui-form-actions">' + vk() + "</div>" : "") + "</div></div>";
			return y(a)
		}
		sl.B = "firebaseui.auth.soy2.page.emailVerificationSuccess";

		function tl(a)
		{
			a = a ||
			{};
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try verifying your email again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to verify your email has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' +
				(a.T ? '<div class="firebaseui-form-actions">' + sk(null) + "</div>" : "") + "</div></div>";
			return y(a)
		}
		tl.B = "firebaseui.auth.soy2.page.emailVerificationFailure";

		function ul(a)
		{
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-unrecoverable-error"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Error encountered</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' + x(a.errorMessage) + "</p></div></div>";
			return y(a)
		}
		ul.B = "firebaseui.auth.soy2.page.unrecoverableError";

		function vl(a, b, c)
		{
			var d = a.Eb;
			b = "";
			a = "Continue with " + (x(a.Rb) + "?");
			d = "You originally wanted to sign in with " + x(d);
			b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-mismatch"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">' + a + '</h2><p class="firebaseui-text">' + d + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
				zk(null) + sk(
				{
					label: A("Continue")
				}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form></div>";
			return y(b)
		}
		vl.B = "firebaseui.auth.soy2.page.emailMismatch";

		function wl(a, b, c)
		{
			var d = '<div class="firebaseui-container firebaseui-page-provider-sign-in firebaseui-id-page-provider-sign-in firebaseui-use-spinner style="width:auto"><div class="firebaseui-card-content"><form onsubmit="return false;" style="text-align:center"><ul class="firebaseui-idp-list">';
			a = a.Fb;
			b = a.length;
			for (var e = 0; e < b; e++)
			{
				var f = {
					fa: a[e]
				};
				var g = c;
				f = f ||
				{};
				var h =
					f.fa,
					k = f;
				k = k ||
				{};
				var l = "";
				switch (k.fa.providerId)
				{
				case "google.com":
					l += "firebaseui-idp-google";
					break;
				case "github.com":
					l += "firebaseui-idp-github";
					break;
				case "facebook.com":
					l += "firebaseui-idp-facebook";
					break;
				case "twitter.com":
					l += "firebaseui-idp-twitter";
					break;
				case "phone":
					l += "firebaseui-idp-phone";
					break;
				case "anonymous":
					l += "firebaseui-idp-anonymous";
					break;
				case "password":
					l += "firebaseui-idp-password";
					break;
				default:
					l += "firebaseui-idp-generic"
				}
				k = '<button class="firebaseui-idp-button mdl-button mdl-js-button mdl-button--raised' +
					qd(z(l)) + ' firebaseui-id-idp-button" data-provider-id="' + qd(h.providerId) + '" style="background-color:';
				l = (l = f) ||
				{};
				l = l.fa;
				l = z(l.cb ? l.cb : g.Qa[l.providerId] ? "" + g.Qa[l.providerId] : "" + g.Qa.password);
				null != l && l.ea === cd ? l = l.content : null == l ? l = "" : l instanceof Vb ? l instanceof Vb && l.constructor === Vb && l.f === Wb ? l = l.a : (Fa("expected object of type SafeStyle, got '" + l + "' of type " + ma(l)), l = "type_error:SafeStyle") : (l = String(l), Cd.test(l) || (Fa("Bad value `%s` for |filterCssValue", [l]), l = "zSoyz"));
				k = k + qd(l) + '"><span class="firebaseui-idp-icon-wrapper"><img class="firebaseui-idp-icon" alt="" src="';
				var w = f;
				l = g;
				w = w ||
				{};
				w = w.fa;
				l = nd(w.jb ? wd(w.jb) : l.Ra[w.providerId] ? wd(l.Ra[w.providerId]) : wd(l.Ra.password));
				k = k + qd(wd(l)) + '"></span>';
					"anonymous" == h.providerId ? k += '<span class="firebaseui-idp-text firebaseui-idp-text-short">Guest</span>' : (h =  x(Hk(f, g)), k += '<span class="firebaseui-idp-text firebaseui-idp-text-short">' + x(Hk(f, g)) + "</span>");
				f = y(k + "</button>");
				d += '<li class="firebaseui-list-item col-4">' + f + "</li>"
			}
			d += '</ul></form></div><div class="firebaseui-card-footer firebaseui-provider-sign-in-footer">' +
				Bk(c) + "</div></div>";
			return y(d)
		}
		wl.B = "firebaseui.auth.soy2.page.providerSignIn";

		function xl(a, b, c)
		{
			a = a ||
			{};
			var d = a.vb,
				e = a.Sa;
			b = a.ia;
			a = a ||
			{};
			a = a.va;
			a = '<div class="firebaseui-phone-number"><button class="firebaseui-id-country-selector firebaseui-country-selector mdl-button mdl-js-button"><span class="firebaseui-flag firebaseui-country-selector-flag firebaseui-id-country-selector-flag"></span><span class="firebaseui-id-country-selector-code"></span></button><div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label firebaseui-textfield firebaseui-phone-input-wrapper"><label class="mdl-textfield__label firebaseui-label" for="phoneNumber">Phone number</label><input type="tel" name="phoneNumber" class="mdl-textfield__input firebaseui-input firebaseui-id-phone-number" value="' +
				qd(null != a ? a : "") + '"></div></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-phone-number-error firebaseui-id-phone-number-error"></p></div>';
			a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-phone-sign-in-start"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Enter your phone number</h1></div><div class="firebaseui-card-content"><div class="firebaseui-relative-wrapper">' +
				y(a);
			var f;
			d ? f = y('<div class="firebaseui-recaptcha-wrapper"><div class="firebaseui-recaptcha-container"></div><div class="firebaseui-error-wrapper firebaseui-recaptcha-error-wrapper"><p class="firebaseui-error firebaseui-hidden firebaseui-id-recaptcha-error"></p></div></div>') : f = "";
			f = a + f + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (e ? zk(null) : "") + sk(
			{
				label: A("Verify")
			}) + '</div></div><div class="firebaseui-card-footer">';
			b ? (b = '<p class="firebaseui-tos firebaseui-phone-tos">',
					b = c.H && c.G ? b + 'By tapping Verify, you are indicating that you accept our <a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a> and <a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a>. An SMS may be sent. Message &amp; data rates may apply.' : b + "By tapping Verify, an SMS may be sent. Message &amp; data rates may apply.", c = y(b + "</p>")) : c = y('<p class="firebaseui-tos firebaseui-phone-sms-notice">By tapping Verify, an SMS may be sent. Message &amp; data rates may apply.</p>') +
				Ak(c);
			return y(f + c + "</div></form></div>")
		}
		xl.B = "firebaseui.auth.soy2.page.phoneSignInStart";

		function yl(a, b, c)
		{
			a = a ||
			{};
			b = a.phoneNumber;
			var d = "";
			a = 'Enter the 6-digit code we sent to <a class="firebaseui-link firebaseui-change-phone-number-link firebaseui-id-change-phone-number-link" href="javascript:void(0)">&lrm;' + (x(b) + "</a>");
			x(b);
			b = d;
			d = y('<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="phoneConfirmationCode">6-digit code</label><input type="number" name="phoneConfirmationCode" class="mdl-textfield__input firebaseui-input firebaseui-id-phone-confirmation-code"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-phone-confirmation-code-error"></p></div>');
			c = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-phone-sign-in-finish"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Verify your phone number</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' + a + "</p>" + d + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + zk(null) + sk(
			{
				label: A("Continue")
			}) + '</div></div><div class="firebaseui-card-footer">' + Ak(c) + "</div></form>";
			a = y('<div class="firebaseui-resend-container"><span class="firebaseui-id-resend-countdown"></span><a href="javascript:void(0)" class="firebaseui-id-resend-link firebaseui-hidden firebaseui-link">Resend</a></div>');
			return y(b + (c + a + "</div>"))
		}
		yl.B = "firebaseui.auth.soy2.page.phoneSignInFinish";

		function zl()
		{
			return K(this, "firebaseui-id-submit")
		}

		function Q()
		{
			return K(this, "firebaseui-id-secondary-link")
		}

		function Al(a, b)
		{
			M(this, zl.call(this), function (d)
			{
				a(d)
			});
			var c = Q.call(this);
			c && b && M(this, c, function (d)
			{
				b(d)
			})
		}

		function Bl()
		{
			return K(this, "firebaseui-id-password")
		}

		function Cl()
		{
			return K(this, "firebaseui-id-password-error")
		}

		function Dl()
		{
			var a = Bl.call(this),
				b = Cl.call(this);
			lk(this, a, function ()
			{
				qk(b) && (L(a, !0), pk(b))
			})
		}

		function El()
		{
			var a = Bl.call(this);
			var b = Cl.call(this);
			J(a) ? (L(a, !0), pk(b), b = !0) : (L(a, !1), N(b, z("Enter your password").toString()), b = !1);
			return b ? J(a) : null
		}

		function Fl(a, b, c, d, e, f)
		{
			O.call(this, il,
			{
				email: a
			}, f, "passwordLinking",
			{
				H: d,
				G: e
			});
			this.a = b;
			this.L = c
		}
		t(Fl, O);
		Fl.prototype.u = function ()
		{
			this.R();
			this.P(this.a, this.L);
			Wk(this, this.i(), this.a);
			this.i().focus();
			Fl.o.u.call(this)
		};
		Fl.prototype.l = function ()
		{
			this.a = null;
			Fl.o.l.call(this)
		};
		Fl.prototype.J = function ()
		{
			return J(K(this, "firebaseui-id-email"))
		};
		r(Fl.prototype,
		{
			i: Bl,
			D: Cl,
			R: Dl,
			A: El,
			ba: zl,
			da: Q,
			P: Al
		});
		var Gl = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;

		function Hl()
		{
			return K(this, "firebaseui-id-email")
		}

		function Il()
		{
			return K(this, "firebaseui-id-email-error")
		}

		function Jl(a)
		{
			var b = Hl.call(this),
				c = Il.call(this);
			lk(this, b, function ()
			{
				qk(c) && (L(b, !0), pk(c))
			});
			a && mk(this, b, function ()
			{
				a()
			})
		}

		function Kl()
		{
			return Xa(J(Hl.call(this)) || "")
		}

		function Ll()
		{
			var a = Hl.call(this);
			var b = Il.call(this);
			var c = J(a) || "";
			c ? Gl.test(c) ? (L(a, !0), pk(b), b = !0) : (L(a, !1), N(b, z("That email address isn't correct").toString()), b = !1) : (L(a, !1), N(b, z("Enter your email address to continue").toString()), b = !1);
			return b ? Xa(J(a)) : null
		}

		function Ml(a, b, c, d, e, f, g)
		{
			O.call(this, Yk,
			{
				email: c,
				ia: !!f
			}, g, "passwordSignIn",
			{
				H: d,
				G: e
			});
			this.a = a;
			this.L = b
		}
		t(Ml,
			O);
		Ml.prototype.u = function ()
		{
			this.R();
			this.ba();
			this.da(this.a, this.L);
			Vk(this, this.s(), this.i());
			Wk(this, this.i(), this.a);
			J(this.s()) ? this.i().focus() : this.s().focus();
			Ml.o.u.call(this)
		};
		Ml.prototype.l = function ()
		{
			this.L = this.a = null;
			Ml.o.l.call(this)
		};
		r(Ml.prototype,
		{
			s: Hl,
			U: Il,
			R: Jl,
			P: Kl,
			J: Ll,
			i: Bl,
			D: Cl,
			ba: Dl,
			A: El,
			sa: zl,
			ra: Q,
			da: Al
		});

		function R(a, b, c, d, e, f)
		{
			O.call(this, a, b, d, e || "notice", f);
			this.a = c || null
		}
		t(R, O);
		R.prototype.u = function ()
		{
			this.a && (this.s(this.a), this.i().focus());
			R.o.u.call(this)
		};
		R.prototype.l =
			function ()
			{
				this.a = null;
				R.o.l.call(this)
			};
		r(R.prototype,
		{
			i: zl,
			A: Q,
			s: Al
		});

		function Nl(a, b, c, d, e)
		{
			R.call(this, al,
			{
				email: a,
				T: !!b
			}, b, e, "passwordRecoveryEmailSent",
			{
				H: c,
				G: d
			})
		}
		t(Nl, R);

		function Ol(a, b)
		{
			R.call(this, sl,
			{
				T: !!a
			}, a, b, "emailVerificationSuccess")
		}
		t(Ol, R);

		function Pl(a, b)
		{
			R.call(this, tl,
			{
				T: !!a
			}, a, b, "emailVerificationFailure")
		}
		t(Pl, R);

		function Ql(a, b)
		{
			R.call(this, ol,
			{
				T: !!a
			}, a, b, "passwordResetSuccess")
		}
		t(Ql, R);

		function Rl(a, b)
		{
			R.call(this, pl,
			{
				T: !!a
			}, a, b, "passwordResetFailure")
		}
		t(Rl, R);

		function Sl(a,
			b)
		{
			R.call(this, rl,
			{
				T: !!a
			}, a, b, "emailChangeRevokeFailure")
		}
		t(Sl, R);

		function Tl(a, b)
		{
			R.call(this, ul,
			{
				errorMessage: a
			}, void 0, b, "unrecoverableError")
		}
		t(Tl, R);
		var Ul = !1,
			Vl = null;

		function Wl(a, b)
		{
			Ul = !!b;
			Vl || ("undefined" == typeof accountchooser && tj() ? (b = Nb(Jb(new Gb(Hb, "//www.gstatic.com/accountchooser/client.js"))), Vl = hf(B(qh(b)), function () {})) : Vl = B());
			Vl.then(a, a)
		}

		function Xl(a, b)
		{
			a = S(a);
			(a = Qg(a).accountChooserInvoked || null) ? a(b): b()
		}

		function Yl(a, b, c)
		{
			a = S(a);
			(a = Qg(a).accountChooserResult || null) ? a(b, c):
				c()
		}

		function Zl(a, b, c, d, e)
		{
			d ? (I("callback", a, b), Ul && c()) : Xl(a, function ()
			{
				Si(new Kh(a.a.tenantId || null), T(a));
				aj(function (f)
				{
					G(Bi, T(a));
					Yl(a, f ? "empty" : "unavailable", function ()
					{
						I("signIn", a, b);
						(f || Ul) && c()
					})
				}, Mi(T(a)), e)
			})
		}

		function $l(a, b, c, d)
		{
			function e(f)
			{
				f = U(f);
				V(b, c, void 0, f);
				d()
			}
			Yl(b, "accountSelected", function ()
			{
				Li(!1, T(b));
				var f = am(b);
				W(b, X(b).fetchSignInMethodsForEmail(a.a).then(function (g)
				{
					bm(b, c, g, a.a, a.h || void 0, void 0, f);
					d()
				}, e))
			})
		}

		function cm(a, b, c, d)
		{
			Yl(b, a ? "addAccount" : "unavailable", function ()
			{
				I("signIn",
					b, c);
				(a || Ul) && d()
			})
		}

		function dm(a, b, c, d)
		{
			function e()
			{
				var f = a();
				f && (f = Pg(S(f))) && f()
			}
			Yi(function ()
			{
				var f = a();
				f && Zl(f, b, e, c, d)
			}, function (f)
			{
				var g = a();
				g && $l(f, g, b, e)
			}, function (f)
			{
				var g = a();
				g && cm(f, g, b, e)
			}, a() && lg(S(a())))
		}

		function em(a, b, c, d)
		{
			function e(g)
			{
				if (!g.name || "cancel" != g.name)
				{
					a:
					{
						var h = g.message;
						try
						{
							var k = ((JSON.parse(h).error ||
							{}).message || "").toLowerCase().match(/invalid.+(access|id)_token/);
							if (k && k.length)
							{
								var l = !0;
								break a
							}
						}
						catch (w)
						{}
						l = !1
					}
					if (l) g = P(b),
					b.m(),
					V(a, g, void 0, z("Your sign-in session has expired. Please try again.").toString());
					else
					{
						l = g && g.message || "";
						if (g.code)
						{
							if ("auth/email-already-in-use" == g.code || "auth/credential-already-in-use" == g.code) return;
							l = U(g)
						}
						b.f(l)
					}
				}
			}
			fm(a);
			if (d) return gm(a, c), B();
			if (!c.credential) throw Error("No credential found!");
			d = X(a).currentUser || c.user;
			if (!d) throw Error("User not logged in.");
			d = new Bh(d.email, d.displayName, d.photoURL, "password" == c.credential.providerId ? null : c.credential.providerId);
			null != Hi(Di, T(a)) && !Hi(Di, T(a)) || Ni(d, T(a));
			G(Di, T(a));
			try
			{
				var f = hm(a, c)
			}
			catch (g)
			{
				return Be(g.code || g.message,
					g), b.f(g.code || g.message), B()
			}
			c = f.then(function (g)
			{
				gm(a, g)
			}, e).then(void 0, e);
			W(a, f);
			return B(c)
		}

		function gm(a, b)
		{
			if (!b.user) throw Error("No user found");
			var c = Sg(S(a));
			Rg(S(a)) && c && Ge("Both signInSuccess and signInSuccessWithAuthResult callbacks are provided. Only signInSuccessWithAuthResult callback will be invoked.");
			if (c)
			{
				c = Sg(S(a));
				var d = Ji(T(a)) || void 0;
				G(Ci, T(a));
				var e = !1;
				if (bg())
				{
					if (!c || c(b, d)) e = !0, window.opener.location.assign(Qb(Tb(im(a, d))));
					c || window.close()
				}
				else if (!c || c(b, d)) e = !0, ag(im(a,
					d));
				e || a.reset()
			}
			else
			{
				c = b.user;
				b = b.credential;
				d = Rg(S(a));
				e = Ji(T(a)) || void 0;
				G(Ci, T(a));
				var f = !1;
				if (bg())
				{
					if (!d || d(c, b, e)) f = !0, window.opener.location.assign(Qb(Tb(im(a, e))));
					d || window.close()
				}
				else if (!d || d(c, b, e)) f = !0, ag(im(a, e));
				f || a.reset()
			}
		}

		function im(a, b)
		{
			a = b || S(a).a.get("signInSuccessUrl");
			if (!a) throw Error("No redirect URL has been found. You must either specify a signInSuccessUrl in the configuration, pass in a redirect URL to the widget URL, or return false from the callback.");
			return a
		}

		function U(a)
		{
			var b =
				"";
			switch (a.code)
			{
			case "auth/email-already-in-use":
				b += "The email address is already used by another account";
				break;
			case "auth/requires-recent-login":
				b += Gd();
				break;
			case "auth/too-many-requests":
				b += "You have entered an incorrect password too many times. Please try again in a few minutes.";
				break;
			case "auth/user-cancelled":
				b += "Please authorize the required permissions to sign in to the application";
				break;
			case "auth/user-not-found":
				b += "That email address doesn't match an existing account";
				break;
			case "auth/user-token-expired":
				b +=
					Gd();
				break;
			case "auth/weak-password":
				b += "Strong passwords have at least 6 characters and a mix of letters and numbers";
				break;
			case "auth/wrong-password":
				b += "The email and password you entered don't match";
				break;
			case "auth/network-request-failed":
				b += "A network error has occurred";
				break;
			case "auth/invalid-phone-number":
				b += Dd();
				break;
			case "auth/invalid-verification-code":
				b += z("Wrong code. Try again.");
				break;
			case "auth/code-expired":
				b += "This code is no longer valid";
				break;
			case "auth/expired-action-code":
				b +=
					"This code has expired.";
				break;
			case "auth/invalid-action-code":
				b += "The action code is invalid. This can happen if the code is malformed, expired, or has already been used."
			}
			if (b = z(b).toString()) return b;
			try
			{
				return JSON.parse(a.message), Be("Internal error: " + a.message, void 0), Ed().toString()
			}
			catch (c)
			{
				return a.message
			}
		}

		function jm(a, b, c)
		{
			var d = de[b] && firebase.auth[de[b]] ? new firebase.auth[de[b]] : 0 == b.indexOf("saml.") ? new firebase.auth.SAMLAuthProvider(b) : new firebase.auth.OAuthProvider(b);
			if (!d) throw Error("Invalid Firebase Auth provider!");
			var e = Eg(S(a), b);
			if (d.addScope)
				for (var f = 0; f < e.length; f++) d.addScope(e[f]);
			e = Fg(S(a), b) ||
			{};
			c && (b == firebase.auth.GoogleAuthProvider.PROVIDER_ID ? a = "login_hint" : b == firebase.auth.GithubAuthProvider.PROVIDER_ID ? a = "login" : a = (a = yg(S(a), b)) && a.Db, a && (e[a] = c));
			d.setCustomParameters && d.setCustomParameters(e);
			return d
		}

		function km(a, b, c, d)
		{
			function e()
			{
				Si(new Kh(a.a.tenantId || null), T(a));
				W(a, b.M(q(a.Ob, a), [k], function ()
				{
					if ("file:" === (window.location && window.location.protocol)) return W(a, lm(a).then(function (l)
					{
						b.m();
						G(Bi, T(a));
						I("callback", a, h, B(l))
					}, f))
				}, g))
			}

			function f(l)
			{
				G(Bi, T(a));
				if (!l.name || "cancel" != l.name) switch (l.code)
				{
				case "auth/popup-blocked":
					e();
					break;
				case "auth/popup-closed-by-user":
				case "auth/cancelled-popup-request":
					break;
				case "auth/credential-already-in-use":
					break;
				case "auth/network-request-failed":
				case "auth/too-many-requests":
				case "auth/user-cancelled":
					b.f(U(l));
					break;
				default:
					b.m(), I("callback", a, h, ff(l))
				}
			}

			function g(l)
			{
				G(Bi, T(a));
				l.name && "cancel" == l.name || (Be("signInWithRedirect: " + l.code, void 0),
					l = U(l), "blank" == b.Ma && Ng(S(a)) ? (b.m(), I("providerSignIn", a, h, l)) : b.f(l))
			}
			var h = P(b),
				k = jm(a, c, d);
			"redirect" == Og(S(a)) ? e() : W(a, mm(a, k).then(function (l)
			{
				b.m();
				I("callback", a, h, B(l))
			}, f))
		}

		function nm(a, b)
		{
			W(a, b.M(q(a.Kb, a), [], function (c)
			{
				b.m();
				return em(a, b, c, !0)
			}, function (c)
			{
				c.name && "cancel" == c.name || (Be("ContinueAsGuest: " + c.code, void 0), c = U(c), b.f(c))
			}))
		}

		function om(a, b, c)
		{
			function d(f)
			{
				var g = !1;
				f = b.M(q(a.Lb, a), [f], function (h)
				{
					var k = P(b);
					b.m();
					I("callback", a, k, B(h));
					g = !0
				}, function (h)
				{
					if (!h.name || "cancel" !=
						h.name)
						if (!h || "auth/credential-already-in-use" != h.code)
							if (h && "auth/email-already-in-use" == h.code && h.email && h.credential)
							{
								var k = P(b);
								b.m();
								I("callback", a, k, ff(h))
							}
					else h = U(h), b.f(h)
				});
				W(a, f);
				return f.then(function ()
				{
					return g
				}, function ()
				{
					return !1
				})
			}
			var e = Cg(S(a), c && c.authMethod || null);
			if (c && c.idToken && e === firebase.auth.GoogleAuthProvider.PROVIDER_ID) return Eg(S(a), firebase.auth.GoogleAuthProvider.PROVIDER_ID).length ? (km(a, b, e, c.id), c = B(!0)) : c = d(firebase.auth.GoogleAuthProvider.credential(c.idToken)),
				c;
			c && b.f(z("The selected credential for the authentication provider is not supported!").toString());
			return B(!1)
		}

		function pm(a, b)
		{
			var c = b.J(),
				d = b.A();
			if (c)
				if (d)
				{
					var e = firebase.auth.EmailAuthProvider.credential(c, d);
					W(a, b.M(q(a.Mb, a), [c, d], function (f)
					{
						return em(a, b,
						{
							user: f.user,
							credential: e,
							operationType: f.operationType,
							additionalUserInfo: f.additionalUserInfo
						})
					}, function (f)
					{
						if (!f.name || "cancel" != f.name) switch (f.code)
						{
						case "auth/email-already-in-use":
							break;
						case "auth/email-exists":
							L(b.s(), !1);
							N(b.U(),
								U(f));
							break;
						case "auth/too-many-requests":
						case "auth/wrong-password":
							L(b.i(), !1);
							N(b.D(), U(f));
							break;
						default:
							Be("verifyPassword: " + f.message, void 0), b.f(U(f))
						}
					}))
				}
			else b.i().focus();
			else b.s().focus()
		}

		function am(a)
		{
			a = xg(S(a));
			return 1 == a.length && a[0] == firebase.auth.EmailAuthProvider.PROVIDER_ID
		}

		function qm(a)
		{
			a = xg(S(a));
			return 1 == a.length && a[0] == firebase.auth.PhoneAuthProvider.PROVIDER_ID
		}

		function V(a, b, c, d)
		{
			am(a) ? d ? I("signIn", a, b, c, d) : rm(a, b, c) : a && qm(a) && !d ? I("phoneSignInStart", a, b) : a && Ng(S(a)) &&
				!d ? I("federatedRedirect", a, b) : I("providerSignIn", a, b, d)
		}

		function sm(a, b, c, d)
		{
			var e = P(b);
			W(a, b.M(q(X(a).fetchSignInMethodsForEmail, X(a)), [c], function (f)
			{
				Li(Bg(S(a)) == ig, T(a));
				b.m();
				bm(a, e, f, c, void 0, d)
			}, function (f)
			{
				f = U(f);
				b.f(f)
			}))
		}

		function bm(a, b, c, d, e, f, g)
		{
			c.length || Kg(S(a)) ? !c.length && Kg(S(a)) ? I("sendEmailLinkForSignIn", a, b, d, function ()
				{
					I("signIn", a, b)
				}) : Oa(c, firebase.auth.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD) ? I("passwordSignIn", a, b, d, g) : 1 == c.length && c[0] === firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD ?
				I("sendEmailLinkForSignIn", a, b, d, function ()
				{
					I("signIn", a, b)
				}) : (c = be(c, xg(S(a)))) ? (Qi(new Ih(d), T(a)), I("federatedSignIn", a, b, d, c, f)) : I("unsupportedProvider", a, b, d) : I("passwordSignUp", a, b, d, e, void 0, g)
		}

		function tm(a, b, c, d, e, f)
		{
			var g = P(b);
			W(a, b.M(q(a.xb, a), [c, f], function ()
			{
				b.m();
				I("emailLinkSignInSent", a, g, c, d, f)
			}, e))
		}

		function rm(a, b, c)
		{
			Bg(S(a)) == ig ? Wl(function ()
			{
				Wi ? Xl(a, function ()
				{
					Si(new Kh(a.a.tenantId || null), T(a));
					aj(function (d)
						{
							G(Bi, T(a));
							Yl(a, d ? "empty" : "unavailable", function ()
							{
								I("signIn", a, b, c)
							})
						},
						Mi(T(a)), qg(S(a)))
				}) : (Y(a), dm(um, b, !1, qg(S(a))))
			}, !1) : (Ul = !1, Xl(a, function ()
			{
				Yl(a, "unavailable", function ()
				{
					I("signIn", a, b, c)
				})
			}))
		}

		function vm(a)
		{
			var b = eg();
			a = sg(S(a));
			b = Ec(b, a) || "";
			for (var c in mg)
				if (mg[c].toLowerCase() == b.toLowerCase()) return mg[c];
			return "callback"
		}

		function wm(a)
		{
			var b = eg();
			a = Md(S(a).a, "queryParameterForSignInSuccessUrl");
			return (b = Ec(b, a)) ? Qb(Tb(b)) : null
		}

		function xm()
		{
			return Ec(eg(), "oobCode")
		}

		function ym()
		{
			var a = Ec(eg(), "continueUrl");
			return a ? function ()
			{
				ag(a)
			} : null
		}

		function zm(a,
			b)
		{
			var c = dg(b);
			switch (vm(a))
			{
			case "callback":
				(b = wm(a)) && Ki(b, T(a));
				a.kb() ? I("callback", a, c) : V(a, c);
				break;
			case "resetPassword":
				I("passwordReset", a, c, xm(), ym());
				break;
			case "recoverEmail":
				I("emailChangeRevocation", a, c, xm());
				break;
			case "verifyEmail":
				I("emailVerification", a, c, xm(), ym());
				break;
			case "signIn":
				I("emailLinkSignInCallback", a, c, eg());
				Am();
				break;
			case "select":
				if ((b = wm(a)) && Ki(b, T(a)), Wi)
				{
					V(a, c);
					break
				}
				else
				{
					Wl(function ()
					{
						Y(a);
						dm(um, c, !0)
					}, !0);
					return
				}
			default:
				throw Error("Unhandled widget operation.");
			}(b = Pg(S(a))) && b()
		}

		function Bm(a, b)
		{
			O.call(this, hl, void 0, b, "anonymousUserMismatch");
			this.a = a
		}
		t(Bm, O);
		Bm.prototype.u = function ()
		{
			var a = this;
			M(this, this.i(), function ()
			{
				a.a()
			});
			this.i().focus();
			Bm.o.u.call(this)
		};
		Bm.prototype.l = function ()
		{
			this.a = null;
			Bm.o.l.call(this)
		};
		r(Bm.prototype,
		{
			i: Q
		});
		H.anonymousUserMismatch = function (a, b)
		{
			var c = new Bm(function ()
			{
				c.m();
				V(a, b)
			});
			c.render(b);
			Z(a, c)
		};

		function Cm(a)
		{
			O.call(this, bl, void 0, a, "callback")
		}
		t(Cm, O);
		Cm.prototype.M = function (a, b, c, d)
		{
			return a.apply(null, b).then(c,
				d)
		};

		function Dm(a, b, c)
		{
			if (c.user)
			{
				var d = {
						user: c.user,
						credential: c.credential,
						operationType: c.operationType,
						additionalUserInfo: c.additionalUserInfo
					},
					e = Oi(T(a)),
					f = e && e.f;
				if (f && !Em(c.user, f)) Fm(a, b, d);
				else
				{
					var g = e && e.a;
					g ? W(a, c.user.linkWithCredential(g).then(function (h)
					{
						d = {
							user: h.user,
							credential: g,
							operationType: h.operationType,
							additionalUserInfo: h.additionalUserInfo
						};
						Gm(a, b, d)
					}, function (h)
					{
						Hm(a, b, h)
					})) : Gm(a, b, d)
				}
			}
			else c = P(b), b.m(), Pi(T(a)), V(a, c)
		}

		function Gm(a, b, c)
		{
			Pi(T(a));
			em(a, b, c)
		}

		function Hm(a, b,
			c)
		{
			var d = P(b);
			Pi(T(a));
			c = U(c);
			b.m();
			V(a, d, void 0, c)
		}

		function Im(a, b, c, d)
		{
			var e = P(b);
			W(a, X(a).fetchSignInMethodsForEmail(c).then(function (f)
				{
					b.m();
					f.length ? Oa(f, firebase.auth.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD) ? I("passwordLinking", a, e, c) : 1 == f.length && f[0] === firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD ? I("emailLinkSignInLinking", a, e, c) : (f = be(f, xg(S(a)))) ? I("federatedLinking", a, e, c, f, d) : (Pi(T(a)), I("unsupportedProvider", a, e, c)) : (Pi(T(a)), I("passwordRecovery", a, e, c, !1, Fd().toString()))
				},
				function (f)
				{
					Hm(a, b, f)
				}))
		}

		function Fm(a, b, c)
		{
			var d = P(b);
			W(a, Jm(a).then(function ()
			{
				b.m();
				I("emailMismatch", a, d, c)
			}, function (e)
			{
				e.name && "cancel" == e.name || (e = U(e.code), b.f(e))
			}))
		}

		function Em(a, b)
		{
			if (b == a.email) return !0;
			if (a.providerData)
				for (var c = 0; c < a.providerData.length; c++)
					if (b == a.providerData[c].email) return !0;
			return !1
		}
		H.callback = function (a, b, c)
		{
			var d = new Cm;
			d.render(b);
			Z(a, d);
			b = c || lm(a);
			W(a, b.then(function (e)
			{
				Dm(a, d, e)
			}, function (e)
			{
				if (e && ("auth/account-exists-with-different-credential" == e.code ||
						"auth/email-already-in-use" == e.code) && e.email && e.credential) Qi(new Ih(e.email, e.credential), T(a)), Im(a, d, e.email);
				else if (e && "auth/user-cancelled" == e.code)
				{
					var f = Oi(T(a)),
						g = U(e);
					f && f.a ? Im(a, d, f.f, g) : f ? sm(a, d, f.f, g) : Hm(a, d, e)
				}
				else e && "auth/credential-already-in-use" == e.code || (e && "auth/operation-not-supported-in-this-environment" == e.code && am(a) ? Dm(a, d,
				{
					user: null,
					credential: null
				}) : Hm(a, d, e))
			}))
		};

		function Km(a, b)
		{
			O.call(this, gl, void 0, b, "differentDeviceError");
			this.a = a
		}
		t(Km, O);
		Km.prototype.u = function ()
		{
			var a =
				this;
			M(this, this.i(), function ()
			{
				a.a()
			});
			this.i().focus();
			Km.o.u.call(this)
		};
		Km.prototype.l = function ()
		{
			this.a = null;
			Km.o.l.call(this)
		};
		r(Km.prototype,
		{
			i: Q
		});
		H.differentDeviceError = function (a, b)
		{
			var c = new Km(function ()
			{
				c.m();
				V(a, b)
			});
			c.render(b);
			Z(a, c)
		};

		function Lm(a, b, c, d)
		{
			O.call(this, ql,
			{
				email: a,
				T: !!c
			}, d, "emailChangeRevoke");
			this.i = b;
			this.a = c || null
		}
		t(Lm, O);
		Lm.prototype.u = function ()
		{
			var a = this;
			M(this, K(this, "firebaseui-id-reset-password-link"), function ()
			{
				a.i()
			});
			this.a && (this.A(this.a), this.s().focus());
			Lm.o.u.call(this)
		};
		Lm.prototype.l = function ()
		{
			this.i = this.a = null;
			Lm.o.l.call(this)
		};
		r(Lm.prototype,
		{
			s: zl,
			D: Q,
			A: Al
		});

		function Mm()
		{
			return K(this, "firebaseui-id-new-password")
		}

		function Nm()
		{
			return K(this, "firebaseui-id-password-toggle")
		}

		function Om()
		{
			this.La = !this.La;
			var a = Nm.call(this),
				b = Mm.call(this);
			this.La ? (b.type = "text", wj(a, "firebaseui-input-toggle-off"), xj(a, "firebaseui-input-toggle-on")) : (b.type = "password", wj(a, "firebaseui-input-toggle-on"), xj(a, "firebaseui-input-toggle-off"));
			b.focus()
		}

		function Pm()
		{
			return K(this,
				"firebaseui-id-new-password-error")
		}

		function Qm()
		{
			this.La = !1;
			var a = Mm.call(this);
			a.type = "password";
			var b = Pm.call(this);
			lk(this, a, function ()
			{
				qk(b) && (L(a, !0), pk(b))
			});
			var c = Nm.call(this);
			wj(c, "firebaseui-input-toggle-on");
			xj(c, "firebaseui-input-toggle-off");
			nk(this, a, function ()
			{
				wj(c, "firebaseui-input-toggle-focus");
				xj(c, "firebaseui-input-toggle-blur")
			});
			ok(this, a, function ()
			{
				wj(c, "firebaseui-input-toggle-blur");
				xj(c, "firebaseui-input-toggle-focus")
			});
			M(this, c, q(Om, this))
		}

		function Rm()
		{
			var a = Mm.call(this);
			var b = Pm.call(this);
			J(a) ? (L(a, !0), pk(b), b = !0) : (L(a, !1), N(b, z("Enter your password").toString()), b = !1);
			return b ? J(a) : null
		}

		function Sm(a, b, c)
		{
			O.call(this, nl,
			{
				email: a
			}, c, "passwordReset");
			this.a = b
		}
		t(Sm, O);
		Sm.prototype.u = function ()
		{
			this.J();
			this.D(this.a);
			Wk(this, this.i(), this.a);
			this.i().focus();
			Sm.o.u.call(this)
		};
		Sm.prototype.l = function ()
		{
			this.a = null;
			Sm.o.l.call(this)
		};
		r(Sm.prototype,
		{
			i: Mm,
			A: Pm,
			L: Nm,
			J: Qm,
			s: Rm,
			R: zl,
			P: Q,
			D: Al
		});

		function Tm(a, b, c, d, e)
		{
			var f = c.s();
			f && W(a, c.M(q(X(a).confirmPasswordReset, X(a)), [d, f], function ()
			{
				c.m();
				var g = new Ql(e);
				g.render(b);
				Z(a, g)
			}, function (g)
			{
				Um(a, b, c, g)
			}))
		}

		function Um(a, b, c, d)
		{
			"auth/weak-password" == (d && d.code) ? (a = U(d), L(c.i(), !1), N(c.A(), a), c.i().focus()) : (c && c.m(), c = new Rl, c.render(b), Z(a, c))
		}

		function Vm(a, b, c)
		{
			var d = new Lm(c, function ()
			{
				W(a, d.M(q(X(a).sendPasswordResetEmail, X(a)), [c], function ()
				{
					d.m();
					d = new Nl(c, void 0, C(S(a)), D(S(a)));
					d.render(b);
					Z(a, d)
				}, function ()
				{
					d.f(z("Unable to send password reset code to specified email").toString())
				}))
			});
			d.render(b);
			Z(a, d)
		}
		H.passwordReset = function (a, b, c, d)
		{
			W(a, X(a).verifyPasswordResetCode(c).then(function (e)
			{
				var f = new Sm(e, function ()
				{
					Tm(a, b, f, c, d)
				});
				f.render(b);
				Z(a, f)
			}, function ()
			{
				Um(a, b)
			}))
		};
		H.emailChangeRevocation = function (a, b, c)
		{
			var d = null;
			W(a, X(a).checkActionCode(c).then(function (e)
			{
				d = e.data.email;
				return X(a).applyActionCode(c)
			}).then(function ()
			{
				Vm(a, b, d)
			}, function ()
			{
				var e = new Sl;
				e.render(b);
				Z(a, e)
			}))
		};
		H.emailVerification = function (a, b, c, d)
		{
			W(a, X(a).applyActionCode(c).then(function ()
			{
				var e = new Ol(d);
				e.render(b);
				Z(a,
					e)
			}, function ()
			{
				var e = new Pl;
				e.render(b);
				Z(a, e)
			}))
		};

		function Wm(a, b)
		{
			try
			{
				var c = "number" == typeof a.selectionStart
			}
			catch (d)
			{
				c = !1
			}
			c ? (a.selectionStart = b, a.selectionEnd = b) : v && !Db("9") && ("textarea" == a.type && (b = a.value.substring(0, b).replace(/(\r\n|\r|\n)/g, "\n").length), a = a.createTextRange(), a.collapse(!0), a.move("character", b), a.select())
		}

		function Xm(a, b, c, d, e, f)
		{
			O.call(this, fl,
			{
				email: c
			}, f, "emailLinkSignInConfirmation",
			{
				H: d,
				G: e
			});
			this.i = a;
			this.s = b
		}
		t(Xm, O);
		Xm.prototype.u = function ()
		{
			this.D(this.i);
			this.J(this.i,
				this.s);
			this.a().focus();
			Wm(this.a(), (this.a().value || "").length);
			Xm.o.u.call(this)
		};
		Xm.prototype.l = function ()
		{
			this.s = this.i = null;
			Xm.o.l.call(this)
		};
		r(Xm.prototype,
		{
			a: Hl,
			P: Il,
			D: Jl,
			L: Kl,
			A: Ll,
			U: zl,
			R: Q,
			J: Al
		});
		H.emailLinkConfirmation = function (a, b, c, d, e, f)
		{
			var g = new Xm(function ()
			{
				var h = g.A();
				h ? (g.m(), d(a, b, h, c)) : g.a().focus()
			}, function ()
			{
				g.m();
				V(a, b, e || void 0)
			}, e || void 0, C(S(a)), D(S(a)));
			g.render(b);
			Z(a, g);
			f && g.f(f)
		};

		function Ym(a, b, c, d, e)
		{
			O.call(this, kl,
			{
				fa: a
			}, e, "emailLinkSignInLinkingDifferentDevice",
			{
				H: c,
				G: d
			});
			this.a = b
		}
		t(Ym, O);
		Ym.prototype.u = function ()
		{
			this.s(this.a);
			this.i().focus();
			Ym.o.u.call(this)
		};
		Ym.prototype.l = function ()
		{
			this.a = null;
			Ym.o.l.call(this)
		};
		r(Ym.prototype,
		{
			i: zl,
			s: Al
		});
		H.emailLinkNewDeviceLinking = function (a, b, c, d)
		{
			var e = new Tg(c);
			c = e.a.a.get(E.PROVIDER_ID) || null;
			Xg(e, null);
			if (c)
			{
				var f = new Ym(yg(S(a), c), function ()
				{
					f.m();
					d(a, b, e.toString())
				}, C(S(a)), D(S(a)));
				f.render(b);
				Z(a, f)
			}
			else V(a, b)
		};

		function Zm(a)
		{
			O.call(this, cl, void 0, a, "blank")
		}
		t(Zm, O);

		function $m(a, b, c, d, e)
		{
			var f = new Zm,
				g = new Tg(c),
				h = g.a.a.get(E.Xa) || "",
				k = g.a.a.get(E.Na) || "",
				l = "1" === g.a.a.get(E.Ka),
				w = Wg(g),
				ya = g.a.a.get(E.PROVIDER_ID) || null;
			g = g.a.a.get(E.qb) || null;
			an(a, g);
			var sa = !Hi(Fi, T(a)),
				Da = d || Ti(k, T(a)),
				Ka = (d = Ui(k, T(a))) && d.a;
			ya && Ka && Ka.providerId !== ya && (Ka = null);
			f.render(b);
			Z(a, f);
			W(a, f.M(function ()
			{
				var ba = B(null);
				ba = w && sa || sa && l ? ff(Error("anonymous-user-not-found")) : bn(a, c).then(function (ng)
				{
					if (ya && !Ka) throw Error("pending-credential-not-found");
					return ng
				});
				var td = null;
				return ba.then(function (ng)
				{
					td = ng;
					return e ?
						null : X(a).checkActionCode(h)
				}).then(function ()
				{
					return td
				})
			}, [], function (ba)
			{
				Da ? cn(a, f, Da, c, Ka, ba) : l ? (f.m(), I("differentDeviceError", a, b)) : (f.m(), I("emailLinkConfirmation", a, b, c, dn))
			}, function (ba)
			{
				var td = void 0;
				if (!ba || !ba.name || "cancel" != ba.name) switch (f.m(), ba && ba.message)
				{
				case "anonymous-user-not-found":
					I("differentDeviceError", a, b);
					break;
				case "anonymous-user-mismatch":
					I("anonymousUserMismatch", a, b);
					break;
				case "pending-credential-not-found":
					I("emailLinkNewDeviceLinking", a, b, c, en);
					break;
				default:
					ba &&
						(td = U(ba)), V(a, b, void 0, td)
				}
			}))
		}

		function dn(a, b, c, d)
		{
			$m(a, b, d, c, !0)
		}

		function en(a, b, c)
		{
			$m(a, b, c)
		}

		function cn(a, b, c, d, e, f)
		{
			var g = P(b);
			b.X("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", z("Signing in...").toString());
			var h = null;
			e = (f ? fn(a, f, c, d, e) : gn(a, c, d, e)).then(function (k)
				{
					G(Gi, T(a));
					G(Fi, T(a));
					b.h();
					b.X("firebaseui-icon-done", z("Signed in!").toString());
					h = setTimeout(function ()
					{
						b.h();
						em(a, b, k, !0)
					}, 1E3);
					W(a, function ()
					{
						b && (b.h(), b.m());
						clearTimeout(h)
					})
				},
				function (k)
				{
					b.h();
					b.m();
					if (!k.name || "cancel" != k.name)
					{
						var l = U(k);
						"auth/email-already-in-use" == k.code || "auth/credential-already-in-use" == k.code ? (G(Gi, T(a)), G(Fi, T(a))) : "auth/invalid-email" == k.code ? (l = z("The email provided does not match the current sign-in session.").toString(), I("emailLinkConfirmation", a, g, d, dn, null, l)) : V(a, g, c, l)
					}
				});
			W(a, e)
		}
		H.emailLinkSignInCallback = $m;

		function hn(a, b, c, d, e, f)
		{
			O.call(this, jl,
			{
				email: a,
				fa: b
			}, f, "emailLinkSignInLinking",
			{
				H: d,
				G: e
			});
			this.a = c
		}
		t(hn, O);
		hn.prototype.u = function ()
		{
			this.s(this.a);
			this.i().focus();
			hn.o.u.call(this)
		};
		hn.prototype.l = function ()
		{
			this.a = null;
			hn.o.l.call(this)
		};
		r(hn.prototype,
		{
			i: zl,
			s: Al
		});

		function jn(a, b, c, d)
		{
			var e = P(b);
			tm(a, b, c, function ()
			{
				V(a, e, c)
			}, function (f)
			{
				if (!f.name || "cancel" != f.name)
				{
					var g = U(f);
					f && "auth/network-request-failed" == f.code ? b.f(g) : (b.m(), V(a, e, c, g))
				}
			}, d)
		}
		H.emailLinkSignInLinking = function (a, b, c)
		{
			var d = Oi(T(a));
			Pi(T(a));
			if (d)
			{
				var e = d.a.providerId,
					f = new hn(c, yg(S(a), e), function ()
					{
						jn(a, f, c, d)
					}, C(S(a)), D(S(a)));
				f.render(b);
				Z(a, f)
			}
			else V(a, b)
		};

		function kn(a,
			b, c, d, e, f)
		{
			O.call(this, dl,
			{
				email: a
			}, f, "emailLinkSignInSent",
			{
				H: d,
				G: e
			});
			this.s = b;
			this.a = c
		}
		t(kn, O);
		kn.prototype.u = function ()
		{
			var a = this;
			M(this, this.i(), function ()
			{
				a.a()
			});
			M(this, K(this, "firebaseui-id-trouble-getting-email-link"), function ()
			{
				a.s()
			});
			this.i().focus();
			kn.o.u.call(this)
		};
		kn.prototype.l = function ()
		{
			this.a = this.s = null;
			kn.o.l.call(this)
		};
		r(kn.prototype,
		{
			i: Q
		});
		H.emailLinkSignInSent = function (a, b, c, d, e)
		{
			var f = new kn(c, function ()
				{
					f.m();
					I("emailNotReceived", a, b, c, d, e)
				}, function ()
				{
					f.m();
					d()
				}, C(S(a)),
				D(S(a)));
			f.render(b);
			Z(a, f)
		};

		function ln(a, b, c, d, e, f, g)
		{
			O.call(this, vl,
			{
				Rb: a,
				Eb: b
			}, g, "emailMismatch",
			{
				H: e,
				G: f
			});
			this.s = c;
			this.i = d
		}
		t(ln, O);
		ln.prototype.u = function ()
		{
			this.D(this.s, this.i);
			this.A().focus();
			ln.o.u.call(this)
		};
		ln.prototype.l = function ()
		{
			this.i = this.a = null;
			ln.o.l.call(this)
		};
		r(ln.prototype,
		{
			A: zl,
			J: Q,
			D: Al
		});
		H.emailMismatch = function (a, b, c)
		{
			var d = Oi(T(a));
			if (d)
			{
				var e = new ln(c.user.email, d.f, function ()
				{
					var f = e;
					Pi(T(a));
					em(a, f, c)
				}, function ()
				{
					var f = c.credential.providerId,
						g = P(e);
					e.m();
					d.a ? I("federatedLinking",
						a, g, d.f, f) : I("federatedSignIn", a, g, d.f, f)
				}, C(S(a)), D(S(a)));
				e.render(b);
				Z(a, e)
			}
			else V(a, b)
		};

		function mn(a, b, c, d, e)
		{
			O.call(this, el, void 0, e, "emailNotReceived",
			{
				H: c,
				G: d
			});
			this.i = a;
			this.a = b
		}
		t(mn, O);
		mn.prototype.u = function ()
		{
			var a = this;
			M(this, this.s(), function ()
			{
				a.a()
			});
			M(this, this.ya(), function ()
			{
				a.i()
			});
			this.s().focus();
			mn.o.u.call(this)
		};
		mn.prototype.ya = function ()
		{
			return K(this, "firebaseui-id-resend-email-link")
		};
		mn.prototype.l = function ()
		{
			this.a = this.i = null;
			mn.o.l.call(this)
		};
		r(mn.prototype,
		{
			s: Q
		});
		H.emailNotReceived = function (a, b, c, d, e)
		{
			var f = new mn(function ()
			{
				tm(a, f, c, d, function (g)
				{
					g = U(g);
					f.f(g)
				}, e)
			}, function ()
			{
				f.m();
				V(a, b, c)
			}, C(S(a)), D(S(a)));
			f.render(b);
			Z(a, f)
		};

		function nn(a, b, c, d, e, f)
		{
			O.call(this, ll,
			{
				email: a,
				fa: b
			}, f, "federatedLinking",
			{
				H: d,
				G: e
			});
			this.a = c
		}
		t(nn, O);
		nn.prototype.u = function ()
		{
			this.s(this.a);
			this.i().focus();
			nn.o.u.call(this)
		};
		nn.prototype.l = function ()
		{
			this.a = null;
			nn.o.l.call(this)
		};
		r(nn.prototype,
		{
			i: zl,
			s: Al
		});
		H.federatedLinking = function (a, b, c, d, e)
		{
			var f = Oi(T(a));
			if (f && f.a)
			{
				var g =
					new nn(c, yg(S(a), d), function ()
					{
						km(a, g, d, c)
					}, C(S(a)), D(S(a)));
				g.render(b);
				Z(a, g);
				e && g.f(e)
			}
			else V(a, b)
		};
		H.federatedRedirect = function (a, b)
		{
			var c = new Zm;
			c.render(b);
			Z(a, c);
			b = xg(S(a))[0];
			km(a, c, b)
		};
		H.federatedSignIn = function (a, b, c, d, e)
		{
			var f = new nn(c, yg(S(a), d), function ()
			{
				km(a, f, d, c)
			}, C(S(a)), D(S(a)));
			f.render(b);
			Z(a, f);
			e && f.f(e)
		};

		function on(a, b, c, d)
		{
			var e = b.A();
			e ? W(a, b.M(q(a.Ib, a), [c, e], function (f)
			{
				f = f.user.linkWithCredential(d).then(function (g)
				{
					return em(a, b,
					{
						user: g.user,
						credential: d,
						operationType: g.operationType,
						additionalUserInfo: g.additionalUserInfo
					})
				});
				W(a, f);
				return f
			}, function (f)
			{
				if (!f.name || "cancel" != f.name) switch (f.code)
				{
				case "auth/wrong-password":
					L(b.i(), !1);
					N(b.D(), U(f));
					break;
				case "auth/too-many-requests":
					b.f(U(f));
					break;
				default:
					Be("signInWithEmailAndPassword: " + f.message, void 0), b.f(U(f))
				}
			})) : b.i().focus()
		}
		H.passwordLinking = function (a, b, c)
		{
			var d = Oi(T(a));
			Pi(T(a));
			var e = d && d.a;
			if (e)
			{
				var f = new Fl(c, function ()
				{
					on(a, f, c, e)
				}, function ()
				{
					f.m();
					I("passwordRecovery", a, b, c)
				}, C(S(a)), D(S(a)));
				f.render(b);
				Z(a, f)
			}
			else V(a, b)
		};

		function pn(a, b, c, d, e, f)
		{
			O.call(this, $k,
			{
				email: c,
				Oa: !!b
			}, f, "passwordRecovery",
			{
				H: d,
				G: e
			});
			this.a = a;
			this.s = b
		}
		t(pn, O);
		pn.prototype.u = function ()
		{
			this.J();
			this.L(this.a, this.s);
			J(this.i()) || this.i().focus();
			Wk(this, this.i(), this.a);
			pn.o.u.call(this)
		};
		pn.prototype.l = function ()
		{
			this.s = this.a = null;
			pn.o.l.call(this)
		};
		r(pn.prototype,
		{
			i: Hl,
			D: Il,
			J: Jl,
			P: Kl,
			A: Ll,
			U: zl,
			R: Q,
			L: Al
		});

		function qn(a, b)
		{
			var c = b.A();
			if (c)
			{
				var d = P(b);
				W(a, b.M(q(X(a).sendPasswordResetEmail, X(a)), [c], function ()
				{
					b.m();
					var e =
						new Nl(c, function ()
						{
							e.m();
							V(a, d)
						}, C(S(a)), D(S(a)));
					e.render(d);
					Z(a, e)
				}, function (e)
				{
					L(b.i(), !1);
					N(b.D(), U(e))
				}))
			}
			else b.i().focus()
		}
		H.passwordRecovery = function (a, b, c, d, e)
		{
			var f = new pn(function ()
			{
				qn(a, f)
			}, d ? void 0 : function ()
			{
				f.m();
				V(a, b)
			}, c, C(S(a)), D(S(a)));
			f.render(b);
			Z(a, f);
			e && f.f(e)
		};
		H.passwordSignIn = function (a, b, c, d)
		{
			var e = new Ml(function ()
			{
				pm(a, e)
			}, function ()
			{
				var f = e.P();
				e.m();
				I("passwordRecovery", a, b, f)
			}, c, C(S(a)), D(S(a)), d);
			e.render(b);
			Z(a, e)
		};

		function rn()
		{
			return K(this, "firebaseui-id-name")
		}

		function sn()
		{
			return K(this, "firebaseui-id-name-error")
		}

		function tn(a, b, c, d, e, f, g, h, k)
		{
			O.call(this, Zk,
			{
				email: d,
				Gb: a,
				name: e,
				Oa: !!c,
				ia: !!h
			}, k, "passwordSignUp",
			{
				H: f,
				G: g
			});
			this.a = b;
			this.J = c;
			this.D = a
		}
		t(tn, O);
		tn.prototype.u = function ()
		{
			this.ba();
			this.D && this.Ta();
			this.sa();
			this.ra(this.a, this.J);
			this.D ? (Vk(this, this.i(), this.A()), Vk(this, this.A(), this.s())) : Vk(this, this.i(), this.s());
			this.a && Wk(this, this.s(), this.a);
			J(this.i()) ? this.D && !J(this.A()) ? this.A().focus() : this.s().focus() : this.i().focus();
			tn.o.u.call(this)
		};
		tn.prototype.l = function ()
		{
			this.J = this.a = null;
			tn.o.l.call(this)
		};
		r(tn.prototype,
		{
			i: Hl,
			U: Il,
			ba: Jl,
			gb: Kl,
			P: Ll,
			A: rn,
			jc: sn,
			Ta: function ()
			{
				var a = rn.call(this),
					b = sn.call(this);
				lk(this, a, function ()
				{
					qk(b) && (L(a, !0), pk(b))
				})
			},
			L: function ()
			{
				var a = rn.call(this);
				var b = sn.call(this);
				var c = J(a);
				c = !/^[\s\xa0]*$/.test(null == c ? "" : String(c));
				L(a, c);
				c ? (pk(b), b = !0) : (N(b, z("Enter your account name").toString()), b = !1);
				return b ? Xa(J(a)) : null
			},
			s: Mm,
			da: Pm,
			zb: Nm,
			sa: Qm,
			R: Rm,
			gc: zl,
			Bb: Q,
			ra: Al
		});

		function un(a, b)
		{
			var c = Jg(S(a)),
				d =
				b.P(),
				e = null;
			c && (e = b.L());
			var f = b.R();
			if (d)
			{
				if (c)
					if (e) e = nb(e);
					else
					{
						b.A().focus();
						return
					}
				if (f)
				{
					var g = firebase.auth.EmailAuthProvider.credential(d, f);
					W(a, b.M(q(a.Jb, a), [d, f], function (h)
					{
						var k = {
							user: h.user,
							credential: g,
							operationType: h.operationType,
							additionalUserInfo: h.additionalUserInfo
						};
						return c ? (h = h.user.updateProfile(
						{
							displayName: e
						}).then(function ()
						{
							return em(a, b, k)
						}), W(a, h), h) : em(a, b, k)
					}, function (h)
					{
						if (!h.name || "cancel" != h.name)
						{
							var k = U(h);
							switch (h.code)
							{
							case "auth/email-already-in-use":
								return vn(a,
									b, d, h);
							case "auth/too-many-requests":
								k = z("Too many account requests are coming from your IP address. Try again in a few minutes.").toString();
							case "auth/operation-not-allowed":
							case "auth/weak-password":
								L(b.s(), !1);
								N(b.da(), k);
								break;
							default:
								h = "setAccountInfo: " + hi(h), Be(h, void 0), b.f(k)
							}
						}
					}))
				}
				else b.s().focus()
			}
			else b.i().focus()
		}

		function vn(a, b, c, d)
		{
			function e()
			{
				var g = U(d);
				L(b.i(), !1);
				N(b.U(), g);
				b.i().focus()
			}
			var f = X(a).fetchSignInMethodsForEmail(c).then(function (g)
			{
				g.length ? e() : (g = P(b), b.m(), I("passwordRecovery",
					a, g, c, !1, Fd().toString()))
			}, function ()
			{
				e()
			});
			W(a, f);
			return f
		}
		H.passwordSignUp = function (a, b, c, d, e, f)
		{
			function g()
			{
				h.m();
				V(a, b)
			}
			var h = new tn(Jg(S(a)), function ()
			{
				un(a, h)
			}, e ? void 0 : g, c, d, C(S(a)), D(S(a)), f);
			h.render(b);
			Z(a, h)
		};

		function wn()
		{
			return K(this, "firebaseui-id-phone-confirmation-code")
		}

		function xn()
		{
			return K(this, "firebaseui-id-phone-confirmation-code-error")
		}

		function yn()
		{
			return K(this, "firebaseui-id-resend-countdown")
		}

		function zn(a, b, c, d, e, f, g, h, k)
		{
			O.call(this, yl,
			{
				phoneNumber: e
			}, k, "phoneSignInFinish",
			{
				H: g,
				G: h
			});
			this.Ta = f;
			this.i = new Jj(1E3);
			this.D = f;
			this.P = a;
			this.a = b;
			this.J = c;
			this.L = d
		}
		t(zn, O);
		zn.prototype.u = function ()
		{
			var a = this;
			this.R(this.Ta);
			Nf(this.i, "tick", this.A, !1, this);
			this.i.start();
			M(this, K(this, "firebaseui-id-change-phone-number-link"), function ()
			{
				a.P()
			});
			M(this, this.ya(), function ()
			{
				a.L()
			});
			this.sa(this.a);
			this.da(this.a, this.J);
			this.s().focus();
			zn.o.u.call(this)
		};
		zn.prototype.l = function ()
		{
			this.L = this.J = this.a = this.P = null;
			Kj(this.i);
			Vf(this.i, "tick", this.A);
			this.i = null;
			zn.o.l.call(this)
		};
		zn.prototype.A = function ()
		{
			--this.D;
			0 < this.D ? this.R(this.D) : (Kj(this.i), Vf(this.i, "tick", this.A), this.ra(), this.gb())
		};
		r(zn.prototype,
		{
			s: wn,
			ba: xn,
			sa: function (a)
			{
				var b = wn.call(this),
					c = xn.call(this);
				lk(this, b, function ()
				{
					qk(c) && (L(b, !0), pk(c))
				});
				a && mk(this, b, function ()
				{
					a()
				})
			},
			U: function ()
			{
				var a = Xa(J(wn.call(this)) || "");
				return /^\d{6}$/.test(a) ? a : null
			},
			ub: yn,
			R: function (a)
			{
				pc(yn.call(this), z("Resend code in " + ((9 < a ? "0:" : "0:0") + a)).toString())
			},
			ra: function ()
			{
				pk(this.ub())
			},
			ya: function ()
			{
				return K(this, "firebaseui-id-resend-link")
			},
			gb: function ()
			{
				N(this.ya())
			},
			Bb: zl,
			zb: Q,
			da: Al
		});

		function An(a, b, c, d)
		{
			function e(g)
			{
				b.s().focus();
				L(b.s(), !1);
				N(b.ba(), g)
			}
			var f = b.U();
			f ? (b.X("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", z("Verifying...").toString()), W(a, b.M(q(d.confirm, d), [f], function (g)
			{
				b.h();
				b.X("firebaseui-icon-done", z("Verified!").toString());
				var h = setTimeout(function ()
				{
					b.h();
					b.m();
					var k = {
						user: Bn(a).currentUser,
						credential: null,
						operationType: g.operationType,
						additionalUserInfo: g.additionalUserInfo
					};
					em(a, b, k, !0)
				}, 1E3);
				W(a, function ()
				{
					b && b.h();
					clearTimeout(h)
				})
			}, function (g)
			{
				if (g.name && "cancel" == g.name) b.h();
				else
				{
					var h = U(g);
					switch (g.code)
					{
					case "auth/credential-already-in-use":
						b.h();
						break;
					case "auth/code-expired":
						g = P(b);
						b.h();
						b.m();
						I("phoneSignInStart", a, g, c, h);
						break;
					case "auth/missing-verification-code":
					case "auth/invalid-verification-code":
						b.h();
						e(h);
						break;
					default:
						b.h(), b.f(h)
					}
				}
			}))) : e(z("Wrong code. Try again.").toString())
		}
		H.phoneSignInFinish = function (a, b, c, d, e, f)
		{
			var g = new zn(function ()
			{
				g.m();
				I("phoneSignInStart", a, b, c)
			}, function ()
			{
				An(a, g, c, e)
			}, function ()
			{
				g.m();
				V(a, b)
			}, function ()
			{
				g.m();
				I("phoneSignInStart", a, b, c)
			}, ae(c), d, C(S(a)), D(S(a)));
			g.render(b);
			Z(a, g);
			f && g.f(f)
		};
		var Cn = !v && !(u("Safari") && !(mb() || u("Coast") || u("Opera") || u("Edge") || u("Firefox") || u("FxiOS") || u("Silk") || u("Android")));

		function Dn(a, b)
		{
			if (/-[a-z]/.test(b)) return null;
			if (Cn && a.dataset)
			{
				if (!(!u("Android") || mb() || u("Firefox") || u("FxiOS") || u("Opera") || u("Silk") || b in a.dataset)) return null;
				a = a.dataset[b];
				return void 0 ===
					a ? null : a
			}
			return a.getAttribute("data-" + String(b).replace(/([A-Z])/g, "-$1").toLowerCase())
		}

		function En(a, b, c)
		{
			var d = this;
			a = fd(Fk,
			{
				items: a
			}, null, this.w);
			Mk.call(this, a, !0, !0);
			c && (c = Fn(a, c)) && (c.focus(), dk(c, a));
			M(this, a, function (e)
			{
				if (e = (e = qc(e.target, "firebaseui-id-list-box-dialog-button")) && Dn(e, "listboxid")) Nk.call(d), b(e)
			})
		}

		function Fn(a, b)
		{
			a = (a || document).getElementsByTagName("BUTTON");
			for (var c = 0; c < a.length; c++)
				if (Dn(a[c], "listboxid") === b) return a[c];
			return null
		}

		function Gn()
		{
			return K(this, "firebaseui-id-phone-number")
		}

		function Hn()
		{
			return K(this, "firebaseui-id-country-selector")
		}

		function In()
		{
			return K(this, "firebaseui-id-phone-number-error")
		}

		function Jn(a, b)
		{
			var c = a.a,
				d = Kn("1-US-0", c),
				e = null;
			b && Kn(b, c) ? e = b : d ? e = "1-US-0" : e = 0 < c.length ? c[0].c : null;
			if (!e) throw Error("No available default country");
			Ln.call(this, e, a)
		}

		function Kn(a, b)
		{
			a = Td(a);
			return !(!a || !Oa(b, a))
		}

		function Mn(a)
		{
			return La(a, function (b)
			{
				return {
					id: b.c,
					Ga: "firebaseui-flag " + Nn(b),
					label: b.name + " " + ("‎+" + b.b)
				}
			})
		}

		function Nn(a)
		{
			return "firebaseui-flag-" +
				a.g
		}

		function On(a)
		{
			var b = this;
			En.call(this, Mn(a.a), function (c)
			{
				Ln.call(b, c, a, !0);
				b.K().focus()
			}, this.wa)
		}

		function Ln(a, b, c)
		{
			var d = Td(a);
			d && (c && (c = Xa(J(Gn.call(this)) || ""), b = Sd(b, c), b.length && b[0].b != d.b && (c = "+" + d.b + c.substr(b[0].b.length + 1), yj(Gn.call(this), c))), b = Td(this.wa), this.wa = a, a = K(this, "firebaseui-id-country-selector-flag"), b && xj(a, Nn(b)), wj(a, Nn(d)), pc(K(this, "firebaseui-id-country-selector-code"), "‎+" + d.b))
		}

		function Pn(a, b, c, d, e, f, g, h, k, l)
		{
			O.call(this, xl,
				{
					vb: b,
					va: k || null,
					Sa: !!c,
					ia: !!f
				},
				l, "phoneSignInStart",
				{
					H: d,
					G: e
				});
			this.J = h || null;
			this.L = b;
			this.a = a;
			this.A = c || null;
			this.ba = g || null
		}
		t(Pn, O);
		Pn.prototype.u = function ()
		{
			this.da(this.ba, this.J);
			this.P(this.a, this.A || void 0);
			this.L || Vk(this, this.K(), this.i());
			Wk(this, this.i(), this.a);
			this.K().focus();
			Wm(this.K(), (this.K().value || "").length);
			Pn.o.u.call(this)
		};
		Pn.prototype.l = function ()
		{
			this.A = this.a = null;
			Pn.o.l.call(this)
		};
		r(Pn.prototype,
		{
			sb: Ok,
			K: Gn,
			D: In,
			da: function (a, b, c)
			{
				var d = this,
					e = Gn.call(this),
					f = Hn.call(this),
					g = In.call(this),
					h = a || Yd,
					k = h.a;
				if (0 == k.length) throw Error("No available countries provided.");
				Jn.call(d, h, b);
				M(this, f, function ()
				{
					On.call(d, h)
				});
				lk(this, e, function ()
				{
					qk(g) && (L(e, !0), pk(g));
					var l = Xa(J(e) || ""),
						w = Td(this.wa),
						ya = Sd(h, l);
					l = Kn("1-US-0", k);
					ya.length && ya[0].b != w.b && (w = ya[0], Ln.call(d, "1" == w.b && l ? "1-US-0" : w.c, h))
				});
				c && mk(this, e, function ()
				{
					c()
				})
			},
			R: function (a)
			{
				var b = Xa(J(Gn.call(this)) || "");
				a = a || Yd;
				var c = a.a,
					d = Sd(Yd, b);
				if (d.length && !Oa(c, d[0])) throw yj(Gn.call(this)), Gn.call(this).focus(), N(In.call(this), z("The country code provided is not supported.").toString()),
					Error("The country code provided is not supported.");
				c = Td(this.wa);
				d.length && d[0].b != c.b && Ln.call(this, d[0].c, a);
				d.length && (b = b.substr(d[0].b.length + 1));
				return b ? new Zd(this.wa, b) : null
			},
			sa: Hn,
			U: function ()
			{
				return K(this, "firebaseui-recaptcha-container")
			},
			s: function ()
			{
				return K(this, "firebaseui-id-recaptcha-error")
			},
			i: zl,
			ra: Q,
			P: Al
		});

		function Qn(a, b, c, d)
		{
			try
			{
				var e = b.R(ej)
			}
			catch (f)
			{
				return
			}
			e ? cj ? (b.X("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon",
				z("Verifying...").toString()), W(a, b.M(q(a.Nb, a), [ae(e), c], function (f)
			{
				var g = P(b);
				b.X("firebaseui-icon-done", z("Code sent!").toString());
				var h = setTimeout(function ()
				{
					b.h();
					b.m();
					I("phoneSignInFinish", a, g, e, 15, f)
				}, 1E3);
				W(a, function ()
				{
					b && b.h();
					clearTimeout(h)
				})
			}, function (f)
			{
				b.h();
				if (!f.name || "cancel" != f.name)
				{
					grecaptcha.reset(fj);
					cj = null;
					var g = f && f.message || "";
					if (f.code) switch (f.code)
					{
					case "auth/too-many-requests":
						g = z("This phone number has been used too many times").toString();
						break;
					case "auth/invalid-phone-number":
					case "auth/missing-phone-number":
						b.K().focus();
						N(b.D(), Dd().toString());
						return;
					default:
						g = U(f)
					}
					b.f(g)
				}
			}))) : dj ? N(b.s(), z("Solve the reCAPTCHA").toString()) : !dj && d && b.i().click() : (b.K().focus(), N(b.D(), Dd().toString()))
		}
		H.phoneSignInStart = function (a, b, c, d)
		{
			var e = Dg(S(a)) ||
			{};
			cj = null;
			dj = !(e && "invisible" === e.size);
			var f = qm(a),
				g = Hg(S(a)),
				h = f ? Gg(S(a)) : null;
			g = c && c.a || g && g.c || null;
			c = c && c.va || h;
			(h = Ig(S(a))) && Xd(h);
			ej = h ? new Rd(Ig(S(a))) : Yd;
			var k = new Pn(function (w)
				{
					Qn(a, k, l, !(!w || !w.keyCode))
				}, dj, f ? null : function ()
				{
					l.clear();
					k.m();
					V(a, b)
				}, C(S(a)), D(S(a)),
				f, ej, g, c);
			k.render(b);
			Z(a, k);
			d && k.f(d);
			e.callback = function (w)
			{
				k.s() && pk(k.s());
				cj = w;
				dj || Qn(a, k, l)
			};
			e["expired-callback"] = function ()
			{
				cj = null
			};
			var l = new firebase.auth.RecaptchaVerifier(dj ? k.U() : k.i(), e, Bn(a).app);
			W(a, k.M(q(l.render, l), [], function (w)
			{
				fj = w
			}, function (w)
			{
				w.name && "cancel" == w.name || (w = U(w), k.m(), V(a, b, void 0, w))
			}))
		};

		function Rn(a, b, c, d, e)
		{
			O.call(this, wl,
			{
				Fb: b
			}, e, "providerSignIn",
			{
				H: c,
				G: d
			});
			this.a = a
		}
		t(Rn, O);
		Rn.prototype.u = function ()
		{
			this.i(this.a);
			Rn.o.u.call(this)
		};
		Rn.prototype.l = function ()
		{
			this.a =
				null;
			Rn.o.l.call(this)
		};
		r(Rn.prototype,
		{
			i: function (a)
			{
				function b(g)
				{
					a(g)
				}
				for (var c = this.j ? ic("firebaseui-id-idp-button", this.j || this.w.a) : [], d = 0; d < c.length; d++)
				{
					var e = c[d],
						f = Dn(e, "providerId");
					M(this, e, xa(b, f))
				}
			}
		});
		H.providerSignIn = function (a, b, c)
		{
			var d = new Rn(function (e)
			{
				e == firebase.auth.EmailAuthProvider.PROVIDER_ID ? (d.m(), rm(a, b)) : e == firebase.auth.PhoneAuthProvider.PROVIDER_ID ? (d.m(), I("phoneSignInStart", a, b)) : "anonymous" == e ? nm(a, d) : km(a, d, e);
				Y(a);
				a.O.cancel()
			}, zg(S(a)), C(S(a)), D(S(a)));
			d.render(b);
			Z(a, d);
			c && d.f(c);
			Sn(a)
		};
		H.sendEmailLinkForSignIn = function (a, b, c, d)
		{
			var e = new Cm;
			e.render(b);
			Z(a, e);
			tm(a, e, c, d, function (f)
			{
				e.m();
				f = U(f);
				I("signIn", a, b, c, f)
			})
		};

		function Tn(a, b, c, d, e, f, g)
		{
			O.call(this, Xk,
			{
				email: c,
				Sa: !!b,
				ia: !!f
			}, g, "signIn",
			{
				H: d,
				G: e
			});
			this.a = a;
			this.s = b
		}
		t(Tn, O);
		Tn.prototype.u = function ()
		{
			this.D(this.a);
			this.J(this.a, this.s || void 0);
			this.i().focus();
			Wm(this.i(), (this.i().value || "").length);
			Tn.o.u.call(this)
		};
		Tn.prototype.l = function ()
		{
			this.s = this.a = null;
			Tn.o.l.call(this)
		};
		r(Tn.prototype,
		{
			i: Hl,
			P: Il,
			D: Jl,
			L: Kl,
			A: Ll,
			U: zl,
			R: Q,
			J: Al
		});
		H.signIn = function (a, b, c, d)
		{
			var e = am(a),
				f = e && Bg(S(a)) != ig,
				g = new Tn(function ()
				{
					var h = g,
						k = h.A() || "";
					k && sm(a, h, k)
				}, f ? null : function ()
				{
					g.m();
					V(a, b, c)
				}, c, C(S(a)), D(S(a)), e);
			g.render(b);
			Z(a, g);
			d && g.f(d)
		};

		function Un(a, b, c, d, e, f)
		{
			O.call(this, ml,
			{
				email: a
			}, f, "unsupportedProvider",
			{
				H: d,
				G: e
			});
			this.a = b;
			this.i = c
		}
		t(Un, O);
		Un.prototype.u = function ()
		{
			this.A(this.a, this.i);
			this.s().focus();
			Un.o.u.call(this)
		};
		Un.prototype.l = function ()
		{
			this.i = this.a = null;
			Un.o.l.call(this)
		};
		r(Un.prototype,
		{
			s: zl,
			D: Q,
			A: Al
		});
		H.unsupportedProvider = function (a, b, c)
		{
			var d = new Un(c, function ()
			{
				d.m();
				I("passwordRecovery", a, b, c)
			}, function ()
			{
				d.m();
				V(a, b, c)
			}, C(S(a)), D(S(a)));
			d.render(b);
			Z(a, d)
		};

		function Vn(a, b)
		{
			this.aa = !1;
			var c = Wn(b);
			if (Xn[c]) throw Error('An AuthUI instance already exists for the key "' + c + '"');
			Xn[c] = this;
			this.f = a;
			this.A = null;
			this.s = !1;
			Yn(this.f);
			this.a = firebase.initializeApp(
			{
				apiKey: a.app.options.apiKey,
				authDomain: a.app.options.authDomain
			}, a.app.name + "-firebaseui-temp").auth();
			Yn(this.a);
			this.a.setPersistence &&
				this.a.setPersistence(firebase.auth.Auth.Persistence.SESSION);
			this.ga = b;
			this.X = new hg;
			this.h = this.K = this.v = this.F = null;
			this.i = [];
			this.$ = !1;
			this.O = wh.Ua();
			this.j = this.C = null;
			this.ca = this.w = !1
		}

		function Yn(a)
		{
			a && a.INTERNAL && a.INTERNAL.logFramework && a.INTERNAL.logFramework("FirebaseUI-web")
		}
		var Xn = {};

		function Wn(a)
		{
			return a || "[DEFAULT]"
		}

		function lm(a)
		{
			Y(a);
			a.v || (a.v = Zn(a, function (b)
			{
				return b && !Oi(T(a)) ? B(Bn(a).getRedirectResult().then(function (c)
				{
					return c
				}, function (c)
				{
					if (c && "auth/email-already-in-use" ==
						c.code && c.email && c.credential) throw c;
					return $n(a, c)
				})) : B(X(a).getRedirectResult().then(function (c)
				{
					return tg(S(a)) && !c.user && a.j && !a.j.isAnonymous ? Bn(a).getRedirectResult() : c
				}))
			}));
			return a.v
		}

		function Z(a, b)
		{
			Y(a);
			a.h = b
		}
		var ao = null;

		function um()
		{
			return ao
		}

		function X(a)
		{
			Y(a);
			return a.a
		}

		function Bn(a)
		{
			Y(a);
			return a.f
		}

		function T(a)
		{
			Y(a);
			return a.ga
		}
		m = Vn.prototype;
		m.kb = function ()
		{
			Y(this);
			return !!Ri(T(this)) || bo(eg())
		};

		function bo(a)
		{
			a = new Tg(a);
			return "signIn" === (a.a.a.get(E.pb) || null) && !!a.a.a.get(E.Xa)
		}
		m.start = function (a, b)
		{
			Y(this);
			var c = this;
			"undefined" !== typeof this.f.languageCode && (this.A = this.f.languageCode);
			var d = "en".replace(/_/g, "-");
			this.f.languageCode = d;
			this.a.languageCode = d;
			this.s = !0;
			"undefined" !== typeof this.f.tenantId && (this.a.tenantId = this.f.tenantId);
			this.hb(b);
			var e = n.document;
			this.C ? this.C.then(function ()
			{
				"complete" == e.readyState ? co(c, a) : Of(window, "load", function ()
				{
					co(c, a)
				})
			}) : "complete" == e.readyState ? co(c, a) : Of(window, "load", function ()
			{
				co(c, a)
			})
		};

		function co(a, b)
		{
			var c = dg(b);
			c.setAttribute("lang",
				"en".replace(/_/g, "-"));
			if (ao)
			{
				var d = ao;
				Y(d);
				Oi(T(d)) && Ge("UI Widget is already rendered on the page and is pending some user interaction. Only one widget instance can be rendered per page. The previous instance has been automatically reset.");
				ao.reset()
			}
			ao = a;
			a.K = c;
			eo(a, c);
			qi(new ri) && qi(new si) ? zm(a, b) : (b = dg(b), c = new Tl(z("The browser you are using does not support Web Storage. Please try again in a different browser.").toString()), c.render(b), Z(a, c));
			Ri(T(a)) && (b = Ri(T(a)), an(a, b.a), G(Bi, T(a)))
		}

		function Zn(a, b)
		{
			if (a.w) return b(fo(a));
			W(a, function ()
			{
				a.w = !1
			});
			if (tg(S(a)))
			{
				var c = new Xe(function (d)
				{
					W(a, a.f.onAuthStateChanged(function (e)
					{
						a.j = e;
						a.w || (a.w = !0, d(b(fo(a))))
					}))
				});
				W(a, c);
				return c
			}
			a.w = !0;
			return b(null)
		}

		function fo(a)
		{
			Y(a);
			return tg(S(a)) && a.j && a.j.isAnonymous ? a.j : null
		}

		function W(a, b)
		{
			Y(a);
			if (b)
			{
				a.i.push(b);
				var c = function ()
				{
					Sa(a.i, function (d)
					{
						return d == b
					})
				};
				"function" != typeof b && b.then(c, c)
			}
		}
		m.disableAutoSignIn = function ()
		{
			Y(this);
			this.$ = !0
		};

		function go(a)
		{
			Y(a);
			var b;
			(b = a.$) || (a = S(a),
				a = Fg(a, firebase.auth.GoogleAuthProvider.PROVIDER_ID), b = !(!a || "select_account" !== a.prompt));
			return b
		}

		function fm(a)
		{
			"undefined" !== typeof a.f.languageCode && a.s && (a.s = !1, a.f.languageCode = a.A)
		}

		function an(a, b)
		{
			a.f.tenantId = b;
			a.a.tenantId = b
		}
		m.reset = function ()
		{
			Y(this);
			var a = this;
			this.K && this.K.removeAttribute("lang");
			this.F && dh(this.F);
			fm(this);
			Am();
			G(Bi, T(this));
			Y(this);
			this.O.cancel();
			this.v = B(
			{
				user: null,
				credential: null
			});
			ao == this && (ao = null);
			this.K = null;
			for (var b = 0; b < this.i.length; b++)
				if ("function" ==
					typeof this.i[b]) this.i[b]();
				else this.i[b].cancel && this.i[b].cancel();
			this.i = [];
			Pi(T(this));
			this.h && (this.h.m(), this.h = null);
			this.I = null;
			this.a && (this.C = Jm(this).then(function ()
			{
				a.C = null
			}, function ()
			{
				a.C = null
			}))
		};

		function eo(a, b)
		{
			a.I = null;
			a.F = new eh(b);
			a.F.register();
			Nf(a.F, "pageEnter", function (c)
			{
				c = c && c.pageId;
				if (a.I != c)
				{
					var d = S(a);
					(d = Qg(d).uiChanged || null) && d(a.I, c);
					a.I = c
				}
			})
		}
		m.hb = function (a)
		{
			Y(this);
			var b = this.X,
				c;
			for (c in a) try
			{
				Ld(b.a, c, a[c])
			}
			catch (d)
			{
				Be('Invalid config: "' + c + '"', void 0)
			}
			wb && Ld(b.a,
				"popupMode", !1);
			Ig(b);
			!this.ca && Rg(S(this)) && (Ge("signInSuccess callback is deprecated. Please use signInSuccessWithAuthResult callback instead."), this.ca = !0)
		};

		function S(a)
		{
			Y(a);
			return a.X
		}
		m.Hb = function ()
		{
			Y(this);
			var a = S(this),
				b = Md(a.a, "widgetUrl");
			var c = rg(a, b);
			S(this).a.get("popupMode") ? (a = (window.screen.availHeight - 600) / 2, b = (window.screen.availWidth - 500) / 2, c = c || "about:blank", a = {
					width: 500,
					height: 600,
					top: 0 < a ? a : 0,
					left: 0 < b ? b : 0,
					location: !0,
					resizable: !0,
					statusbar: !0,
					toolbar: !1
				}, a.target = a.target || c.target ||
				"google_popup", a.width = a.width || 690, a.height = a.height || 500, (a = $f(c, a)) && a.focus()) : ag(c)
		};

		function Y(a)
		{
			if (a.aa) throw Error("AuthUI instance is deleted!");
		}
		m.wb = function ()
		{
			var a = this;
			Y(this);
			return this.a.app.delete().then(function ()
			{
				var b = Wn(T(a));
				delete Xn[b];
				a.reset();
				a.aa = !0
			})
		};

		function Sn(a)
		{
			Y(a);
			try
			{
				yh(a.O, Ag(S(a)), go(a)).then(function (b)
				{
					return a.h ? om(a, a.h, b) : !1
				})
			}
			catch (b)
			{}
		}
		m.xb = function (a, b)
		{
			Y(this);
			var c = this,
				d = gg();
			if (!Kg(S(this))) throw Error("Email link sign-in should be enabled to trigger email sending.");
			var e = Mg(S(this)),
				f = new Tg(e.url);
			Ug(f, d);
			b && b.a && (Vi(d, b, T(this)), Xg(f, b.a.providerId));
			Vg(f, Lg(S(this)));
			return Zn(this, function (g)
			{
				g && ((g = g.uid) ? f.a.a.set(E.Ja, g) : Zc(f.a.a, E.Ja));
				e.url = f.toString();
				return X(c).sendSignInLinkToEmail(a, e)
			}).then(function ()
			{
				var g = T(c),
					h = {};
				h.email = a;
				Ii(Fi, ei(d, JSON.stringify(h)), g)
			}, function (g)
			{
				G(Gi, T(c));
				G(Fi, T(c));
				throw g;
			})
		};

		function bn(a, b)
		{
			var c = Wg(new Tg(b));
			if (!c) return B(null);
			b = new Xe(function (d, e)
			{
				var f = Bn(a).onAuthStateChanged(function (g)
				{
					f();
					g && g.isAnonymous &&
						g.uid === c ? d(g) : g && g.isAnonymous && g.uid !== c ? e(Error("anonymous-user-mismatch")) : e(Error("anonymous-user-not-found"))
				});
				W(a, f)
			});
			W(a, b);
			return b
		}

		function fn(a, b, c, d, e)
		{
			Y(a);
			var f = e || null,
				g = firebase.auth.EmailAuthProvider.credentialWithLink(c, d);
			c = f ? X(a).signInWithEmailLink(c, d).then(function (h)
			{
				return h.user.linkWithCredential(f)
			}).then(function ()
			{
				return Jm(a)
			}).then(function ()
			{
				return $n(a,
				{
					code: "auth/email-already-in-use"
				}, f)
			}) : X(a).fetchSignInMethodsForEmail(c).then(function (h)
			{
				return h.length ? $n(a,
				{
					code: "auth/email-already-in-use"
				}, g) : b.linkWithCredential(g)
			});
			W(a, c);
			return c
		}

		function gn(a, b, c, d)
		{
			Y(a);
			var e = d || null,
				f;
			b = X(a).signInWithEmailLink(b, c).then(function (g)
			{
				f = {
					user: g.user,
					credential: null,
					operationType: g.operationType,
					additionalUserInfo: g.additionalUserInfo
				};
				if (e) return g.user.linkWithCredential(e).then(function (h)
				{
					f = {
						user: h.user,
						credential: e,
						operationType: f.operationType,
						additionalUserInfo: h.additionalUserInfo
					}
				})
			}).then(function ()
			{
				Jm(a)
			}).then(function ()
			{
				return Bn(a).updateCurrentUser(f.user)
			}).then(function ()
			{
				f.user =
					Bn(a).currentUser;
				return f
			});
			W(a, b);
			return b
		}

		function Am()
		{
			var a = eg();
			if (bo(a))
			{
				a = new Tg(a);
				for (var b in E) E.hasOwnProperty(b) && Zc(a.a.a, E[b]);
				b = {
					state: "signIn",
					mode: "emailLink",
					operation: "clear"
				};
				var c = n.document.title;
				n.history && n.history.replaceState && n.history.replaceState(b, c, a.toString())
			}
		}
		m.Mb = function (a, b)
		{
			Y(this);
			var c = this;
			return X(this).signInWithEmailAndPassword(a, b).then(function (d)
			{
				return Zn(c, function (e)
				{
					return e ? Jm(c).then(function ()
					{
						return $n(c,
							{
								code: "auth/email-already-in-use"
							},
							firebase.auth.EmailAuthProvider.credential(a, b))
					}) : d
				})
			})
		};
		m.Jb = function (a, b)
		{
			Y(this);
			var c = this;
			return Zn(this, function (d)
			{
				if (d)
				{
					var e = firebase.auth.EmailAuthProvider.credential(a, b);
					return d.linkWithCredential(e)
				}
				return X(c).createUserWithEmailAndPassword(a, b)
			})
		};
		m.Lb = function (a)
		{
			Y(this);
			var b = this;
			return Zn(this, function (c)
			{
				return c ? c.linkWithCredential(a).then(function (d)
				{
					return d
				}, function (d)
				{
					if (d && "auth/email-already-in-use" == d.code && d.email && d.credential) throw d;
					return $n(b, d, a)
				}) : X(b).signInWithCredential(a)
			})
		};

		function mm(a, b)
		{
			Y(a);
			return Zn(a, function (c)
			{
				return c && !Oi(T(a)) ? c.linkWithPopup(b).then(function (d)
				{
					return d
				}, function (d)
				{
					if (d && "auth/email-already-in-use" == d.code && d.email && d.credential) throw d;
					return $n(a, d)
				}) : X(a).signInWithPopup(b)
			})
		}
		m.Ob = function (a)
		{
			Y(this);
			var b = this,
				c = this.v;
			this.v = null;
			return Zn(this, function (d)
			{
				return d && !Oi(T(b)) ? d.linkWithRedirect(a) : X(b).signInWithRedirect(a)
			}).then(function () {}, function (d)
			{
				b.v = c;
				throw d;
			})
		};
		m.Nb = function (a, b)
		{
			Y(this);
			var c = this;
			return Zn(this, function (d)
			{
				return d ?
					d.linkWithPhoneNumber(a, b).then(function (e)
					{
						return new Ah(e, function (f)
						{
							if ("auth/credential-already-in-use" == f.code) return $n(c, f);
							throw f;
						})
					}) : Bn(c).signInWithPhoneNumber(a, b).then(function (e)
					{
						return new Ah(e)
					})
			})
		};
		m.Kb = function ()
		{
			Y(this);
			return Bn(this).signInAnonymously()
		};

		function hm(a, b)
		{
			Y(a);
			return Zn(a, function (c)
			{
				if (a.j && !a.j.isAnonymous && tg(S(a)) && !X(a).currentUser) return Jm(a).then(function ()
				{
					"password" == b.credential.providerId && (b.credential = null);
					return b
				});
				if (c) return Jm(a).then(function ()
				{
					return c.linkWithCredential(b.credential)
				}).then(function (d)
				{
					b.user =
						d.user;
					b.credential = d.credential;
					b.operationType = d.operationType;
					b.additionalUserInfo = d.additionalUserInfo;
					return b
				}, function (d)
				{
					if (d && "auth/email-already-in-use" == d.code && d.email && d.credential) throw d;
					return $n(a, d, b.credential)
				});
				if (!b.user) throw Error('Internal error: An incompatible or outdated version of "firebase.js" may be used.');
				return Jm(a).then(function ()
				{
					return Bn(a).updateCurrentUser(b.user)
				}).then(function ()
				{
					b.user = Bn(a).currentUser;
					b.operationType = "signIn";
					b.credential && b.credential.providerId &&
						"password" == b.credential.providerId && (b.credential = null);
					return b
				})
			})
		}
		m.Ib = function (a, b)
		{
			Y(this);
			return X(this).signInWithEmailAndPassword(a, b)
		};

		function Jm(a)
		{
			Y(a);
			return X(a).signOut()
		}

		function $n(a, b, c)
		{
			Y(a);
			if (b && b.code && ("auth/email-already-in-use" == b.code || "auth/credential-already-in-use" == b.code))
			{
				var d = ug(S(a));
				return B().then(function ()
				{
					return d(new Hd("anonymous-upgrade-merge-conflict", null, c || b.credential))
				}).then(function ()
				{
					a.h && (a.h.m(), a.h = null);
					throw b;
				})
			}
			return ff(b)
		}
		Aa("firebaseui.auth.AuthUI",
			Vn);
		Aa("firebaseui.auth.AuthUI.getInstance", function (a)
		{
			a = Wn(a);
			return Xn[a] ? Xn[a] : null
		});
		Aa("firebaseui.auth.AuthUI.prototype.disableAutoSignIn", Vn.prototype.disableAutoSignIn);
		Aa("firebaseui.auth.AuthUI.prototype.start", Vn.prototype.start);
		Aa("firebaseui.auth.AuthUI.prototype.setConfig", Vn.prototype.hb);
		Aa("firebaseui.auth.AuthUI.prototype.signIn", Vn.prototype.Hb);
		Aa("firebaseui.auth.AuthUI.prototype.reset", Vn.prototype.reset);
		Aa("firebaseui.auth.AuthUI.prototype.delete", Vn.prototype.wb);
		Aa("firebaseui.auth.AuthUI.prototype.isPendingRedirect",
			Vn.prototype.kb);
		Aa("firebaseui.auth.AuthUIError", Hd);
		Aa("firebaseui.auth.AuthUIError.prototype.toJSON", Hd.prototype.toJSON);
		Aa("firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM", ig);
		Aa("firebaseui.auth.CredentialHelper.GOOGLE_YOLO", "googleyolo");
		Aa("firebaseui.auth.CredentialHelper.NONE", "none");
		Aa("firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID", "anonymous")
	}).apply(typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : window);
}).apply(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : window);