var Flow = Class.create({
    initialize: function(wrapper, selector, options) {
        this.wrapper = $(wrapper);
        this.options = Object.extend(Object.extend({}, Flow.DefaultOptions), options || {});
        
        // override the selector if found in options
        if (this.options.overrideSelector) selector = this.options.overrideSelector;
        
        this.offset = this.options.maxScrollVelocity;
        this.container = this.wrapper.getElementsBySelector("." + this.options.containerClass).first();
        
        this.getPosition();
        
        this.setupContainer();
        this.setupElements($$(selector));
        this.setupPageButtons();
        this.setupScrollBar();
        this.setupStartingPosition();
        this.setupUpdater();        
        this.setupAutoScroll();
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
    
    setupAutoScroll: function() {
        this.autoScroller = new PeriodicalExecuter(this.autoScroll.bind(this), this.options.autoScrollDelay);
        
        switch (this.options.autoScrollType) {
            case "per-page":
                this.autoScrollAmount = this.size.x;
                break;
            case "per-item":
                this.autoScrollAmount = this.biggestElement.original.size.x;
                break;
        }
        
        if (!this.options.autoScroll) this.autoScroller.stop();
    },    
    
    setupUpdater: function() {
        this.updater = new PeriodicalExecuter(this.update.bind(this), 0.01);  
    },
    
    setupElements: function(elements) {
        if (this.options.centerFocus) {
            this.excess = { left: this.size.x / 2, right: this.size.x / 2 };
        } else {
            var size = elements.first().getWidth() / 2;
            this.excess = { left: size, right: this.size.x - size };
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
            var flowElement = new Flow.Element(element)
            
            flowElement.parent = this;
            flowElement.previous = previous;
            if (previous) previous.next = flowElement;
            
            flowElement.original.center = flowElement.getCenter();
            flowElement.center = flowElement.getCenter();
            //flowElement.update();
            
            if (this.options.focusOnClick) {
                element.observe("click", function(event) {
                    this.options.onFocus(flowElement);
                    this.scrollToElement(flowElement);                
                    event.stop();
                }.bind(this));
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
        this.holder.setStyle({
            width: (lastElement.original.center.x + lastElement.original.size.x / 2 + offset) + "px"
        });
        
        this.container.insertBefore(this.holder, this.container.childElements().first());
        this.actualSize = { x: (this.elements.last().original.center.x - this.excess.right - this.offset), y: this.container.getHeight() };
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
        
        this.previousPageButton.style.zIndex = this.options.zIndex.last() + 1;
            
        this.previousPageButton.iePNGFix();
        this.previousPageButton.observe("click", previousFunction);
        this.previousPageButton.observe("mouseover", this.previousPageButton.iePNGFix.bind(this.previousPageButton));
        
        this.nextPageButton.style.zIndex = this.options.zIndex.last() + 1;
        
        this.nextPageButton.iePNGFix();
        this.nextPageButton.observe("click", nextFunction);
        this.nextPageButton.observe("mouseover", this.nextPageButton.iePNGFix.bind(this.nextPageButton));
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
    },
    
    autoScroll: function() {
        this.setPosition(this.target + this.autoScrollAmount);        
        if (this.target == 0 || this.target == this.actualSize.x) {
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
        }
        
        switch (event.keyCode) {
            case 37:
                leftFunction();
                if (this.autoScroller) this.autoScroller.stop();
                break;
            case 39:
                rightFunction();
                if (this.autoScroller) this.autoScroller.stop();
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
            if (this.autoScroller) this.autoScroller.stop();
        }

        if (event.preventDefault) event.preventDefault();

        event.returnValue = false;
    },
    
    mouseScroll: function(event) {
        if (!this.options.useMouseScroll) return;
        
        if (this.scrollBar && this.scrollBar.dragging) {
            this.mouseScrollAmount = 0;
        } else {
            if (this.autoScroller) this.autoScroller.stop();
            
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
        
        if (this.options.autoHideScrollBar) this.toggleScrollBar(false);
    },
    
    toggleScrollBar: function(show) {
        if (!this.options.useScrollBar) return;
        
        if (this.scrollBarEffect) this.scrollBarEffect.cancel();
        var effect = show ? Effect.Appear : Effect.Fade;
        this.scrollBarEffect = new effect(this.scrollBar.scrollBar, { duration: 0.25 });   
    },
    
    update: function() {        
        this.getPosition();
        
        this.focalPoint += (this.target - this.focalPoint) / this.options.scrollCatchUp;
        this.container.scrollLeft = this.focalPoint + this.offset;
        
        if (this.options.autoScroll && this.isScrolling()) {
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
            if (this.previousPageButton) {
                this.previousPageButton.classNames().add(this.options.pagingDisabledClass);
            }
            this.target = 0;   
        } else {
            if (this.previousPageButton) {
                this.previousPageButton.classNames().remove(this.options.pagingDisabledClass);
            }
        }
        
        if (this.target >= this.actualSize.x) {
            if (this.nextPageButton) {
                this.nextPageButton.classNames().add(this.options.pagingDisabledClass);
            }
            
            this.target = this.actualSize.x;
        } else {
            if (this.nextPageButton) {
                this.nextPageButton.classNames().remove(this.options.pagingDisabledClass);
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
        this.scrollWidget.iePNGFix();
        
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
            this.parent.target = this.actualPosition();

            if (this.parent.focalPoint < 0 && this.velocity <= 0) {
                this.parent.target = this.velocity;
            }
            
            if (this.parent.focalPoint > this.parent.actualSize.x && this.velocity >= 0) {
                this.parent.target = this.parent.actualSize.x + this.velocity;
            }
            
            if (Math.abs(this.velocity) < 0.01) this.velocity = null;
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
        }.bind(this));
        
        $(document).observe("mousemove", function(event) {
            this.mouseDelta = { x: 0, y: 0 };
            
            if (!this.dragging) return;
            this.scrollPosition = this.positionFromMouse(event);
            this.parent.target = this.actualPosition();
            
            if (this.mouse)
                this.mouseDelta = { x: event.pageX - this.mouse.x, y: event.pageY - this.mouse.y };
            
            this.mouse = { x: event.pageX, y: event.pageY };            
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
        
        $(document.body).onselectstart = function () { return false; }
        $(document.body).onmousedown   = function () { return false; }
        
        this.dragging = true;
    },
    
    stopDrag: function(event) {            
        if (this.mouseDelta) this.velocity = this.mouseDelta.x;
        
        if (Math.abs(this.velocity) > this.options.maxScrollVelocity) 
            this.velocity = this.options.maxScrollVelocity * (this.velocity / Math.abs(this.velocity));
        
        $(document.body).onselectstart = function () { return true; }
        $(document.body).onmousedown   = function () { return true; }
        
        this.dragging = false;
    },
    
    actualPosition: function() {
        if (this.parent.autoScroller) this.parent.autoScroller.stop()
        
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
        this.element.setStyle({
            zIndex: parseInt((1 - Math.abs(distance) / (this.parent.size.x / 2)) * zIndexRange) + this.parent.options.zIndex.first(),
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
        
        var temp = ((Math.abs(distance) / size) + 1) / 2;
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
        var scale = (element.original.size.x / Math.abs(distance)) / 1;
        scale *= 0.9;
        if (scale > 1) scale = 1;
        
        return scale;
    }
};

Flow.DefaultOptions = {
    zIndex: [100, 500],                     // range of the zIndex value for the images (the bigger the range, the more accurate the layering)
    stacker: Flow.Stackers.normal,
    scaler: Flow.Scalers.normal,
    verticalAlignment: "bottom",
    focusedClass: "focused",
    containerClass: "container",
    scrollBarClass: "scroll-bar",
    scrollWidgetClass: "scroll-widget",
    nextPageClass: "next-page",
    previousPageClass: "previous-page",
    pagingDisabledClass: "disabled",
    useMouseWheel: true,
    useScrollBar: true,
    useMouseScroll: true,
    scrollCatchUp: 20, 
    scrollSnap: true,
    scrollBarFriction: 0.9,
    maxScrollVelocity: 150,
    centerFocus: false,
    focusOnClick: true,
    autoScroll: true,
    autoScrollDelay: 2,
    autoHideScrollBar: true,
    centerAtStart: false,
    mouseScrollSensitivity: 0.04,
    mouseScrollDeadZoneSize: 500,
    autoScrollFinishAction: "rewind", // reverse or rewind
    autoScrollType: "per-item", // per-page or per-item
    pagingType: "per-item",     // per-page or per-item
    keyScrollType: "per-item",  // per-page or per-item
    onFocus: function() {}
};