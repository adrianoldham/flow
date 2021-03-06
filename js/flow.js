var Flow = Class.create({
    initialize: function(wrapper, selector, options) {
        this.wrapper = $(wrapper);
        
        if (this.wrapper == null) return;
        
        this.options = Object.extend(Object.extend({}, Flow.DefaultOptions), options || {});
        
        // override the selector if found in options
        if (this.options.overrideSelector) selector = this.options.overrideSelector;
        
        if ($$(selector).length == 0) return;
        
        this.focusEvents = [];
        this.addFocusEvent(this.options.onFocus);
        
        this.offset = this.options.maxScrollVelocity;
        this.container = this.wrapper.getElementsBySelector("." + this.options.containerClass).first();
        
        this.getPosition();
        
        // setup the lazy load, only works if sequence is created on dom:loaded
        // use lazy loader to load images only if specified in the options
        this.setupLazyLoader();
        
        this.setupContainer();
        this.setupElements($$(selector));
        this.setupPageButtons();
        this.setupScrollBar();
        this.setupStartingPosition();
        this.setupUpdater();        
        this.setupAutoScroll();
        
        // show any images that are visible on load
        this.setLazyLoaderThreshold();

        // If option says to focus on load, then we load the first element
        if (this.options.focusOnLoad) {
            var firstElement = this.elements.first();
            if (firstElement != null) {
              this.scrollToElement(firstElement); 
            }
        }
    },
    
    setLazyLoaderThreshold: function() {
        if (this.lazyLoader && this.lazyLoader.container != null) {        
            var threshold;
        
            // find the threshold in pixels based on lazy load type
            switch (this.options.lazyLoadType) {
                case "page":
                    threshold = this.options.lazyLoadThreshold * this.size.x;
                    break;
                case "item":
                    threshold = this.options.lazyLoadThreshold * this.biggestElement.original.size.x;
                    break;
            }
        
            this.lazyLoader.setThreshold(threshold);
        }
    },
    
    updateLazyLoader: function() {
        if (this.lazyLoader && this.lazyLoader.container != null) {
            this.lazyLoader.update();

        }
    },
    
    setupLazyLoader: function() {
        if (this.options.lazyLoader) {
            this.lazyLoader = this.options.lazyLoader;
        }
    },
    
    getPosition: function() {
        var temp = this.container.cumulativeOffset();
        this.position = { x: temp[0], y: temp[1] };
    },
    
    setupContainer: function() {        
        this.container.setStyle({
            position: "relative",
            overflow: "hidden"
        });
        
        this.size = { x: this.container.getWidth(), y: this.container.getHeight() };
        this.mouseScrollAmount = 0;
        
        if (this.options.useMouseWheel) {
            this.container.observe("mousewheel", this.mouseWheel.bind(this));
            this.container.observe("DOMMouseScroll", this.mouseWheel.bind(this));    
        }
        
        this.container.observe("mousemove", this.mouseScroll.bind(this));
        this.container.observe("mouseover", this.mouseEnter.bind(this)(this.containerEnter.bindAsEventListener(this)));
        this.container.observe("mouseout", this.mouseEnter.bind(this)(this.containerLeave.bindAsEventListener(this)));
        
        document.observe("keydown", this.keyScroll.bindAsEventListener(this));
    },
    
    setupStartingPosition: function() {
        this.target = 0;
        if (this.options.centerAtStart) this.target = this.actualSize.x / 2;
        
        this.setPosition(this.target);
        this.focalPoint = this.target;
    },
    
    stopAutoScroll: function() {
        this.autoScrollStopped = true;
        this.autoScroller.stop();
    },
        
    setupAutoScroll: function() {
        //if (this.autoScroller) this.stopAutoScroll();
        
        this.autoScrollStopped = false;
        this.autoScroller = new PeriodicalExecuter(this.autoScroll.bind(this), this.options.autoScrollDelay);
        
        switch (this.options.autoScrollType) {
            case "per-page":
                this.autoScrollAmount = this.size.x;
                break;
            case "per-item":
                this.autoScrollAmount = this.biggestElement.original.size.x;
                break;
        }
        
        if (!this.options.autoScroll) this.stopAutoScroll();
    },    
    
    setupUpdater: function() {
//        this.updater = new PeriodicalExecuter(this.update.bind(this), 0.01);  
        this.restartUpdater();
    },
    
    setupElements: function(elements) {
        if (this.options.centerFocus) {
            this.excess = { left: this.size.x / 2, right: this.size.x / 2 };
        } else {
            var size = elements.first().getWidth() / 2;
            var lastSize = elements.last().getWidth() / 2;
            this.excess = { left: size, right: this.size.x - lastSize  };
        }
        
        this.holder = new Element("div");
        this.holder.setStyle({
            position: "relative",
            height: this.size.y + "px"
        });
        
        this.elements = [];
        
        var previous;
        
        this.focalPoint = 0;
        
        elements.each(function(element) {
            var flowElement = new Flow.Element(element);
            
            flowElement.parent = this;
            flowElement.previous = previous;
            if (previous) previous.next = flowElement;
            
            flowElement.original.center = flowElement.getCenter();
            flowElement.center = flowElement.getCenter();
            //flowElement.update();
            
            if (this.options.focusOnClick) {
                element.observe("click", function(event, flowElement) {
                    // Call any focus callbacks                    

                    /*if (this.focusEvents) {
                      this.focusEvents.each(function(func) {
                          func(this);
                      }.bind(flowElement));
                    }*/                    
                    
                    this.scrollToElement(flowElement);

                    if (!this.options.enableClickEvents) {
                        event.stop();
                        return false;
                    }
                    
                    return true;
                }.bindAsEventListener(this, flowElement));
            }
            
            this.elements.push(flowElement);
            //this.holder.appendChild(element);
            
            previous = flowElement;
            
            if (this.biggestElement == null || flowElement.original.size.x > this.biggestElement.original.size.x) {
                this.biggestElement = flowElement;
            }
        }.bind(this));
        
        var offset = this.offset;
        if (this.options.centerFocus) offset += this.size.x / 2;
        
        var lastElement = this.elements.last();
        var holderWidth = (lastElement.original.center.x + elements.last().getWidth() / 2 + offset);

        if (holderWidth - offset * 2 <= this.size.x) {
            holderWidth = this.size.x + offset;
            this.options.useScrollBar = false;
            this.noScroll = true;
        }
        
        this.holder.setStyle({
            width: holderWidth + "px"
        });
        
        var actualSize = (this.elements.last().original.center.x - this.excess.right - this.offset);
        
        // adjust for right margins
        var centerIndex = parseInt(this.elements.length / 2);
        //actualSize -= (this.elements[centerIndex].original.size.x - lastElement.original.size.x);
        
        if (this.noScroll) actualSize = 0;
                
        this.container.insertBefore(this.holder, this.container.childElements().first());
        this.actualSize = { x: actualSize, y: this.container.getHeight() };
    },
    
    setupScrollBar: function() {
        if (!this.options.useScrollBar) return;

        var scrollBar = this.wrapper.getElementsBySelector("." + this.options.scrollBarClass).first();
        
        if (scrollBar == null) {
            var scrollWidget = new Element("div");
            scrollWidget.classNames().add(this.options.scrollWidgetClass);
            
            scrollBar = new Element("div");
            scrollBar.classNames().add(this.options.scrollBarClass);
            
            scrollBar.appendChild(scrollWidget);
            this.wrapper.appendChild(scrollBar);
        }
        
        scrollBar.style.zIndex = this.options.zIndex.last() + 1;
        this.scrollBar = new Flow.ScrollBar(scrollBar, this.options, this);
        
        // make sure scroll bar activates container leave too
        scrollBar.observe("mouseout", this.mouseEnter.bind(this)(this.containerLeave.bindAsEventListener(this)));
        
        if (this.options.autoHideScrollBar) {
            scrollBar.hide();
        }
    },
    
    setupPageButtons: function() {
        this.previousPageButton = this.wrapper.getElementsBySelector("." + this.options.previousPageClass).first();
        this.nextPageButton = this.wrapper.getElementsBySelector("." + this.options.nextPageClass).first();
        
        var previousFunction, nextFunction;
        switch (this.options.pagingType){
            case "per-page":
                previousFunction = this.previousPage.bind(this);
                nextFunction = this.nextPage.bind(this);
                break;
            case "per-item":
                previousFunction = this.previousItem.bind(this);
                nextFunction = this.nextItem.bind(this);                
                break;
        }
        
        if (this.previousPageButton == null) {
            this.previousPageButton = new Element("div");
            this.previousPageButton.classNames().add(this.options.previousPageClass);
            this.wrapper.appendChild(this.previousPageButton);
        }
        
        if (this.nextPageButton == null) {
            this.nextPageButton = new Element("div");
            this.nextPageButton.classNames().add(this.options.nextPageClass);
            this.wrapper.appendChild(this.nextPageButton);
        }
        
        if (hasNoAlphaSupport && this.options.iePNGFix) {
            this.previousDisableButton = new Element("div");
            //this.previousDisableButton.classNames().add(this.options.previousPageClass);
            this.previousDisableButton.classNames().add(this.options.previousDisabledClass);   
            
            this.previousDisableButton.style.zIndex = this.options.zIndex.last() + 1;
            this.previousDisableButton.style.display = "none";
            
            this.previousPageButton.insert({ after: this.previousDisableButton });
            this.previousDisableButton.iePNGFix(this.options.iePNGFixBlankPixel,this.options.iePNGFixSizingMethod);
            
            this.nextDisableButton = new Element("div");
            //this.nextDisableButton.classNames().add(this.options.nextPageClass);
            this.nextDisableButton.classNames().add(this.options.nextDisabledClass);
            
            this.nextDisableButton.style.zIndex = this.options.zIndex.last() + 1;
            this.nextDisableButton.style.display = "none";

            this.nextPageButton.insert({ after: this.nextDisableButton });
            this.nextDisableButton.iePNGFix(this.options.iePNGFixBlankPixel,this.options.iePNGFixSizingMethod);
        }
        
        if (this.noScroll) {
            if (this.nextDisableButton) {
                this.nextPageButton.style.display = "none";
                this.nextDisableButton.style.display = "block";
            }
            else {
                this.nextPageButton.classNames().add(this.options.pagingDisabledClass);                
            }
            
            if (this.previousDisableButton) {
                this.previousPageButton.style.display = "none";
                this.previousDisableButton.style.display = "block";
            }
            else {
                this.previousPageButton.classNames().add(this.options.pagingDisabledClass);
            }
        }
        
        this.previousPageButton.style.zIndex = this.options.zIndex.last() + 1;
            
        this.previousPageButton.iePNGFix(this.options.iePNGFixBlankPixel,this.options.iePNGFixSizingMethod);
        this.previousPageButton.observe("click", previousFunction);
        
        this.nextPageButton.style.zIndex = this.options.zIndex.last() + 1;
        
        this.nextPageButton.iePNGFix(this.options.iePNGFixBlankPixel,this.options.iePNGFixSizingMethod);
        this.nextPageButton.observe("click", nextFunction);
    },
     
    scrollToIndex: function(index, centerIt) {
        this.scrollToElement(this.elements[index]);
    },
    
    scrollToElement: function(flowElement) {
        flowElement = this.findFlowElement(flowElement);
        this.setPosition(flowElement.original.center.x - this.size.x / 2 - this.offset);
        
        this.elements.each(function(element) {
            element.element.classNames().remove(this.options.focusedClass);            
            element.update();
        }.bind(this));
        
        flowElement.element.classNames().add(this.options.focusedClass);
        flowElement.update();
        
        // Call any focus callbacks
        if (this.focusEvents) {
            this.focusEvents.each(function(func, flowElement) {
                func(flowElement);
            }.bindAsEventListener(this, flowElement));    
        }
    },
    
    autoScroll: function() {
        var reachedEnd = this.target == this.actualSize.x;
        
        this.setPosition(this.target + this.autoScrollAmount);        
        
        if (this.target == 0 || reachedEnd) {
            switch (this.options.autoScrollFinishAction) {
                case "rewind":
                    this.target = 0;
                    this.setPosition(this.target);
                    break;
                case "reverse":
                    this.autoScrollAmount = -this.autoScrollAmount;
                    break;
            }
        }
    },
    
    setPosition: function(target, snap) {
        this.velocity = null;
        this.target = target;
        this.clampTarget();
        
        if (snap == null) snap = this.options.scrollSnap;
        
        if (this.options.useScrollBar) {
            if (snap) this.target = this.scrollBar.snap(this.target);
            this.scrollBar.setPosition(this.target);
        }
        
        this.restartUpdater();
    }, 
    
    restartUpdater: function() {
        if (this.updater == null) {
            this.updater = new PeriodicalExecuter(this.update.bind(this), 0.01);
        }
    },
    
    focusOnElement: function(element) {    
        this.scrollToElement(element);
    },
    
    addFocusEvent: function(func) {    
        if (this.focusEvents) {
            this.focusEvents.push(func);            
        }
    },
    
    focusOnPreviousElement: function() {
        var focused = this.focusedElement();
        var index = 0;
        if (focused != null) {
            index = this.elements.indexOf(focused) - 1;
            if (index < 0) {
                index = this.options.keyScrollLoop ? this.elements.length - 1 : 0;   
            }
        }
        this.focusOnElement(this.elements[index]);
    },
    
    focusOnNextElement: function() {
        var focused = this.focusedElement();
        var index = 0;
        if (focused != null) {
            index = this.elements.indexOf(focused) + 1;
            if (index >= this.elements.length) {
                index = this.options.keyScrollLoop ? 0 : this.elements.length - 1;
            }
        }
        this.focusOnElement(this.elements[index]);
    },
    
    focusedElement: function() {
        var focused;
        
        this.elements.each(function(element) {
            if (element.element.hasClassName(this.options.focusedClass)) {
                focused = element;
            }
        }.bind(this));
        
        return focused;
    },
    
    keyScroll: function(event) {
        var leftFunction, rightFunction;
        switch (this.options.keyScrollType){
            case "per-page":
                leftFunction = this.previousPage.bind(this);
                rightFunction = this.nextPage.bind(this);
                break;
            case "per-item":
                leftFunction = this.previousItem.bind(this);
                rightFunction = this.nextItem.bind(this);                
                break;
            case "per-item-and-focus":
                leftFunction = this.focusOnPreviousElement.bind(this);
                rightFunction = this.focusOnNextElement.bind(this);
                break;
        }
        
        switch (event.keyCode) {
            case 37:
                leftFunction();
                if (this.autoScroller) this.stopAutoScroll();
                break;
            case 39:
                rightFunction();
                if (this.autoScroller) this.stopAutoScroll();
                break;
        }
    },
    
    mouseWheel: function (event) {
        var delta = 0;
        if (!event) event = window.event;
        if (event.wheelDelta) {
            delta = event.wheelDelta / 120;
            if (window.opera) delta = -delta;
        } else if (event.detail) {
            delta = -event.detail / 3;
        }

        if (delta) {
            this.setPosition(this.target - (delta * this.biggestElement.original.size.x));
            if (this.autoScroller) this.stopAutoScroll();
        }

        if (event.preventDefault) event.preventDefault();

        event.returnValue = false;
    },
    
    mouseScroll: function(event) {
        if (!this.options.useMouseScroll) return;
        
        if (this.scrollBar && this.scrollBar.dragging) {
            this.mouseScrollAmount = 0;
        } else {
            if (this.autoScroller) this.stopAutoScroll();
            
            var sign = 0;
            var temp = ((event.pageX - this.position.x) - this.size.x / 2);
            if (temp != 0) sign = temp / (Math.abs(temp));
            
            temp = Math.abs(temp);
            temp -= this.options.mouseScrollDeadZoneSize / 2;
            
            if (temp < 0) {
                temp = 0;
                this.setPosition(this.target);
            }
            
            this.mouseScrollAmount = temp * sign * this.options.mouseScrollSensitivity;
        }
        
        this.restartUpdater();
    },
    
    mouseEnter: function(handler) {
        return function(event) {
            var relatedTarget = event.relatedTarget;
            if (relatedTarget == null) return;
            if (!relatedTarget.descendantOf) return;

            if (this === relatedTarget || relatedTarget.descendantOf(this)) return;
            handler.call(this, event);
        }
    },
    
    containerEnter: function(event) {
        if (this.options.autoHideScrollBar) this.toggleScrollBar(true);
        
        this.leftContainer = false;
    },
    
    containerLeave: function(event) {
        if (this.mouseScrollAmount != 0) this.setPosition(this.target);
        this.mouseScrollAmount = 0;
        
        this.setPosition(this.target);
        if (!this.options.useScrollBar) return;
        
        if (this.scrollBar) {
            if (event.relatedTarget == this.scrollBar.scrollBar || 
                event.relatedTarget.descendantOf(this.scrollBar.scrollBar)) return;
        }
        
        if (this.options.autoHideScrollBar && !this.scrollBar.dragging) this.toggleScrollBar(false);
        
        this.leftContainer = true;
    },
    
    toggleScrollBar: function(show) {
        var duration = 0;
        if (show == false) duration = this.options.hideScrollbarDelay;
        
        if (this.scrollBarTimer) clearTimeout(this.scrollBarTimer);
        
        this.scrollBarTimer = setTimeout(function() {
            if (!this.options.useScrollBar) return;
        
            if (this.scrollBarEffect) this.scrollBarEffect.cancel();
            var effect = show ? Effect.Appear : Effect.Fade;
            this.scrollBarEffect = new effect(this.scrollBar.scrollBar, { duration: 0.25 });   
        }.bind(this), duration);
    },
    
    update: function() {        
        this.getPosition();
        
        this.focalPoint += (this.target - this.focalPoint) / this.options.scrollCatchUp;
        this.container.scrollLeft = this.focalPoint + this.offset;
        
        if (this.options.autoScroll && this.isScrolling() && this.autoScrollStopped) {
            clearTimeout(this.autoScrollRestarter);
            this.autoScrollRestarter = setTimeout(this.setupAutoScroll.bind(this), 2000);
        }
        
        if (this.mouseScrollAmount != 0 && (!this.scrollBar || this.scrollBar.velocity == null)) {
            this.setPosition(this.target + this.mouseScrollAmount, false);
        }
        
        if (this.options.useScrollBar) this.scrollBar.update();
        
        this.elements.each(function(flowElement) {
            flowElement.update();
        });
        
        if (!this.isScrolling()) {
            if (this.updater) {this.updater.stop();}
            this.updater = null;
            this.updateLazyLoader();
        }
    },
    
    isScrolling: function() {
        return Math.abs(this.target - this.focalPoint) > 0.01;
    },
    
    findFlowElement: function(element) {
        var elementFound;
        
        this.elements.each(function(flowElement) {
            if (flowElement.element == element || flowElement == element) elementFound = flowElement;
        });
        
        return elementFound;
    },
    
    clampTarget: function() {    
        if (this.target <= 0) {
            if (this.previousPageButton && !this.noScroll) {
                if (this.previousDisableButton) {
                    this.previousPageButton.style.display = "none";
                    this.previousDisableButton.style.display = "block";
                } else {
                    this.previousPageButton.classNames().add(this.options.previousDisabledClass);
                }
            }
            this.target = 0;   
        } else {
            if (this.previousPageButton && !this.noScroll) {
                if (this.previousDisableButton) {
                    this.previousDisableButton.style.display = "none";
                    this.previousPageButton.style.display = "block";
                } else {
                    this.previousPageButton.classNames().remove(this.options.previousDisabledClass);
                }
            }
        }
        
        if (this.target >= this.actualSize.x) {
            if (this.nextPageButton && !this.noScroll) {
                if (this.nextDisableButton) {
                    this.nextPageButton.style.display = "none";
                    this.nextDisableButton.style.display = "block";
                } else {
                    this.nextPageButton.classNames().add(this.options.nextDisabledClass);
                }
            }
            
            this.target = this.actualSize.x;
        } else {
            if (this.nextPageButton && !this.noScroll) {
                if (this.nextDisableButton) {
                    this.nextPageButton.style.display = "block";
                    this.nextDisableButton.style.display = "none";
                } else {
                    this.nextPageButton.classNames().remove(this.options.nextDisabledClass);
                }
            }
        }
    },
    
    setPage: function(page) {
        this.setPosition(this.size.x * (page - 1));
    },
    
    previousPage: function() {
        this.setPosition(this.target - this.size.x);
    },
    
    nextPage: function() {
        this.setPosition(this.target + this.size.x);
    },
    
    previousItem: function() {
        this.setPosition(this.target - this.biggestElement.original.size.x);
    },
    
    nextItem: function() {
        this.setPosition(this.target + this.biggestElement.original.size.x);
    },
    
    clampScrollTarget: function() {
        if (!this.options.useIphoneOverflow) {
            if (this.target < 0) this.target = 0;
            if (this.target >= this.actualSize.x) this.target = this.actualSize.x;
        }
    }
});

Flow.ScrollBar = Class.create({
    initialize: function(scrollBar, options, parent) {
        this.scrollBar = $(scrollBar);
        this.parent = parent;
        
        this.options = options;
        
        if (this.scrollBar.style.display == "none") {
            this.scrollBar.setOpacity(0);
            this.scrollBar.style.display = "block";
        }
        
        this.scrollWidget = this.scrollBar.getElementsBySelector("." + this.options.scrollWidgetClass).first();
        this.scrollWidget.iePNGFix(this.options.iePNGFixBlankPixel,this.options.iePNGFixSizingMethod);
        
        this.size = { x: this.scrollBar.getWidth() - this.scrollWidget.getWidth() };
        this.widgetSize = { x: this.scrollWidget.getWidth() };
        
        var temp = this.scrollBar.cumulativeOffset();
        this.position = { x: temp[0], y: temp[1] };
        this.scrollPosition = 0;
        
        this.setup();
        this.scrollBar.observe("mousewheel", this.parent.mouseWheel.bind(this.parent));
    },
    
    setPosition: function(position) {
        this.scrollPosition = (position / this.parent.actualSize.x) * this.size.x;
    },
    
    update: function() {
        if (this.velocity != null) {
            this.velocity *= this.options.scrollBarFriction;
            this.scrollPosition += this.velocity;
            
            var position = this.actualPosition();
            if (position) this.parent.target = position;

            if (this.parent.focalPoint < 0 && this.velocity <= 0) {
                this.parent.target = this.velocity;
            }
            
            if (this.parent.focalPoint > this.parent.actualSize.x && this.velocity >= 0) {
                this.parent.target = this.parent.actualSize.x + this.velocity;
            }

            this.parent.clampTarget();            
            this.parent.clampScrollTarget();
            
            if (Math.abs(this.velocity) < 0.01) this.velocity = null;

            this.parent.restartUpdater();
        }
        
        var position = this.clampedScrollPosition();
        this.scrollWidget.setStyle({ left: position + "px" });  
    },
    
    positionFromMouse: function(event) {
        return event.pageX - this.dragOffset - this.position.x - this.widgetSize.x / 2;        
    },
    
    setup: function() {
        this.scrollBar.observe("click", function(event) {
            if (event.target != this.scrollWidget) this.dragOffset = 0;
            this.scrollPosition = this.positionFromMouse(event);
            this.parent.target = this.actualPosition();
            this.parent.clampScrollTarget();
            
            this.parent.restartUpdater();
        }.bind(this));
        
        $(document).observe("mousemove", function(event) {
            this.mouseDelta = { x: 0, y: 0 };
            
            if (!this.dragging) return;
            this.scrollPosition = this.positionFromMouse(event);
            this.parent.target = this.actualPosition();
            this.parent.clampScrollTarget();

            if (this.mouse)
                this.mouseDelta = { x: event.pageX - this.mouse.x, y: event.pageY - this.mouse.y };
            
            this.mouse = { x: event.pageX, y: event.pageY };      
            
            this.parent.restartUpdater();                  
        }.bind(this));
        
        this.scrollWidget.observe("mousedown", this.startDrag.bindAsEventListener(this));
        $(document).observe("mouseup", this.stopDrag.bindAsEventListener(this));
        
        this.setPosition(this.parent.target);
        this.parent.target = this.actualPosition();
    },
    
    clampedScrollPosition: function() {
        var scrollPosition = this.scrollPosition;
        if (scrollPosition < 0) scrollPosition = 0;
        if (scrollPosition >= this.size.x) scrollPosition = this.size.x;
        
        return scrollPosition;
    },
    
    startDrag: function(event) {
        this.dragOffset = 0;
        this.dragOffset = this.positionFromMouse(event) - this.clampedScrollPosition();
        
        $(document.body).onselectstart = function () { return false; };
        $(document.body).onmousedown   = function () { return false; };
        
        this.dragging = true;
        
        this.parent.restartUpdater();
    },
    
    stopDrag: function(event) {            
        if (this.mouseDelta) this.velocity = this.mouseDelta.x;
        
        if (Math.abs(this.velocity) > this.options.maxScrollVelocity) 
            this.velocity = this.options.maxScrollVelocity * (this.velocity / Math.abs(this.velocity));
        
        $(document.body).onselectstart = function () { return true; };
        $(document.body).onmousedown   = function () { return true; };
        
        this.dragging = false;
        
        if (this.parent.leftContainer && this.options.autoHideScrollBar) this.parent.toggleScrollBar(false);
    },
    
    actualPosition: function() {
        if (this.parent.autoScroller) this.parent.stopAutoScroll();
        
        var position = (this.scrollPosition / this.size.x) * this.parent.actualSize.x;
        
        if (this.options.scrollSnap) position = this.snap(position);
        
        return position;
    },
    
    snap: function(position) {
        return Math.round(position / this.parent.biggestElement.original.size.x) * this.parent.biggestElement.original.size.x;
    }
});

Flow.Element = Class.create({
    initialize: function(element) {
        this.element = element;
        
        this.setup();
    },
    
    setup: function() {
        this.element.setStyle({
            position: "absolute"
        });
        
        this.original = {};
        this.original.size = { x: this.element.getWidth(), y: this.element.getHeight() };
        
        this.getSize();
    },
    
    getSize: function() {
        this.size = { x: this.element.getWidth(), y: this.element.getHeight() };
    },
    
    update: function() {
        this.getSize();
        this.center = this.getCenter();
        
        var focalPoint = this.parent.focalPoint + (this.parent.size.x / 2) + this.parent.offset;
        var distance = this.parent.options.stacker(this, focalPoint - this.original.center.x);
        var scale = this.parent.options.scaler(this, distance);
        
        var zIndexRange = this.parent.options.zIndex.last() - this.parent.options.zIndex.first();
        var zIndex = parseInt((1 - Math.abs(distance) / (this.parent.size.x / 2)) * zIndexRange) + this.parent.options.zIndex.first();
        if (zIndex < this.parent.options.zIndex.first()) zIndex = this.parent.options.zIndex.first();
        
        this.element.setStyle({
            zIndex: zIndex,
            width: Math.ceil(this.original.size.x * scale) + "px",
            height: Math.ceil(this.original.size.y * scale) + "px"
        });
        
        this.getSize();
        this.center = this.getCenter();
        
        var drawPosition = { x: focalPoint - distance, y: this.center.y };
        
        drawPosition.x -= this.size.x / 2;
        drawPosition.y -= this.size.y / 2;
        
        this.element.setStyle({
            left: Math.ceil(drawPosition.x) + "px",
            top: Math.ceil(drawPosition.y) + "px"
        });
    },
    
    getCenter: function() {
        var center = {};  
        
        switch (this.parent.options.verticalAlignment) {
            case "top":
                center.y = this.size.y / 2;
                break;
            case "bottom": 
                center.y = this.parent.size.y - this.size.y + (this.size.y / 2);
                break;
            case "middle":
                center.y = this.parent.size.y / 2;
                break;
        }
        
        if (!this.previous) {
            center.x = this.parent.excess.left + this.parent.offset;
        } else {
            center.x = this.previous.center.x + this.previous.size.x / 2 + this.size.x / 2;   
        }

        return center;
    }
});

Flow.Stackers = {
    normal: function(element, distance) {
        return distance;
    },
    
    grouped: function(element, distance) {
        var size = element.original.size.x;
        
        var temp = ((Math.abs(distance) / size) + 1) / 2.25;
        if (temp == 0) temp = 1;
        
        return distance / temp;
    },
    
    coverflow: function(element, distance) {
        var x = distance;
        
        var size = element.original.size.x;
        
        var newX;
        
        var maxTemp = 1;
        var maxX = ((2 * maxTemp * size) - size) * (x / Math.abs(x));
        
        if (Math.abs(x) > Math.abs(maxX)) {
            newX = (((x - maxX) / 2) + maxX) / maxTemp;
        } else {
            var temp = ((Math.abs(x) / size) + 1) / 2;
            if (temp == 0) temp = 1;
            
            newX = x / temp;
        }
        
        return newX;
    }
};

Flow.Scalers = {
    normal: function(element, distance) {
        return 1;
    },
    
    coverflow: function(element, distance) {
        var tweakyValue = 35;
        
        var scale = -Math.pow(Math.abs(distance / tweakyValue), 0.25) + 2;
        
        if (scale > 1) scale = 1;
        if (scale < 0) scale = 0.1;
        
        return scale;
    },
    
    fisheye: function(element, distance) {
        var scale = 1 / ((Math.pow(element.original.size.x, 4) / Math.pow(distance, 4)) * 25);
        scale = 1 - scale;
        if (scale > 1) scale = 1;
        if (scale < 0) scale = 0;
        
        return scale;
    }
};

Flow.DefaultOptions = {
    focusOnLoad: true,
    useIphoneOverflow: false,
    zIndex: [100, 500],                     // range of the zIndex value for the images (the bigger the range, the more accurate the layering)
    stacker: Flow.Stackers.normal,
    scaler: Flow.Scalers.normal,
    verticalAlignment: "middle",
    focusedClass: "focused",
    containerClass: "container",
    scrollBarClass: "scroll-bar",
    scrollWidgetClass: "scroll-widget",
    nextPageClass: "next-page",
    previousPageClass: "previous-page",
    nextDisabledClass: "next-disabled",
    previousDisabledClass: "previous-disabled",
    useMouseWheel: true,
    useScrollBar: true,
    useMouseScroll: true,
    scrollCatchUp: 20, 
    scrollSnap: true,
    scrollBarFriction: 0.8,
    maxScrollVelocity: 100,
    centerFocus: false,
    focusOnClick: true,
    autoScroll: true,
    autoScrollDelay: 5,
    autoHideScrollBar: true,
    centerAtStart: false,
    mouseScrollSensitivity: 0.04,
    mouseScrollDeadZoneSize: 500,
    autoScrollFinishAction: "rewind", // reverse or rewind
    autoScrollType: "per-item", // per-page or per-item
    pagingType: "per-item",     // per-page or per-item
    keyScrollType: "per-item",  // per-page or per-item or per-item-and-focus
    keyScrollLoop: true,        // scrolling via keys is wrapped if true
    hideScrollbarDelay: 1000,
    enableClickEvents: false,
    onFocus: function() {},
    iePNGFix: true,
    iePNGFixBlankPixel: null,                       // Null, uses iePNGFix default of "/images/blank.gif"
    iePNGFixSizingMethod: null,                     // Null, uses iePNGFix default of "scaled"

    
    // Lazy Loader options
    
    lazyLoader: null,
    lazyLoadType: "item",                           // page or item
    lazyLoadThreshold: 1                            // the amount of look ahead based on the above type
};