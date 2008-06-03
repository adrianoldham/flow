var Flow = Class.create({
    initialize: function(container, selector, options) {
        this.container = $(container);
        this.options = Object.extend(Object.extend({}, Flow.DefaultOptions), options || {});
        
        this.offset = this.options.maxScrollVelocity;
        
        var temp = this.container.cumulativeOffset();
        this.position = { x: temp[0], y: temp[1] };
        
        this.setup();
        this.setupElements($$(selector));
        this.setupScrollBar();
        
        this.target = this.focalPoint = this.actualSize.x / 2;
        this.scrollBar.setPosition(this.target);
        this.target = this.scrollBar.actualPosition();
        
        new PeriodicalExecuter(this.update.bind(this), 0.01);
        
        this.autoScroller = new PeriodicalExecuter(this.autoScroll.bind(this), this.options.autoScrollDelay);
        if (!this.options.autoScrollAtStart) this.autoScroller.stop();
    },
    
    setup: function() {        
        this.container.setStyle({
            position: "relative",
            overflow: "hidden"
        });
        
        this.size = { x: this.container.getWidth(), y: this.container.getHeight() };
        this.focalPoint = 0;
        
        this.mouseMoveIt(this.container);
        
        this.container.observe("mouseover", this.mouseEnter.bind(this)(this.containerEnter.bindAsEventListener(this)));
        this.container.observe("mouseout", this.mouseEnter.bind(this)(this.containerLeave.bindAsEventListener(this)));
    },
    
    mouseEnter: function(handler) {
        return function(event) {
            var relatedTarget = event.relatedTarget;
            if (relatedTarget == null) return;

            if (this === relatedTarget || relatedTarget.descendantOf(this)) return;
            handler.call(this, event);
        }
    },
    
    toggleScrollBar: function(show) {
        if (this.scrollBarEffect) this.scrollBarEffect.cancel();
        var effect = show ? Effect.Appear : Effect.Fade;
        this.scrollBarEffect = new effect(this.scrollBar.scrollBar, { duration: 0.25 });   
    },
    
    containerEnter: function(event) {
        if (this.options.autoHideScrollBar) this.toggleScrollBar(true);
    },
    
    containerLeave: function(event) {
        if (event.relatedTarget == this.scrollBar.scrollBar || 
            event.relatedTarget.descendantOf(this.scrollBar.scrollBar)) return;
        if (this.options.autoHideScrollBar) this.toggleScrollBar(false);
    },
    
    mouseMoveIt: function(element) {
        element.childElements().each(function(child) {
            child.observe("mousemove", function() {
                $(child.parentNode).fire("mousemove");
            });
            this.mouseMoveIt(child);
        }.bind(this));
    },
    
    update: function() {
        this.focalPoint += (this.target - this.focalPoint) / this.options.scrollCatchUp;
        this.container.scrollLeft = this.focalPoint + this.offset;
        
        if (this.focalPoint > this.actualSize.x) {
            this.target = this.actualSize.x;
        }
        
        this.scrollBar.update();
        
        /*this.elements.each(function(flowElement) {
            flowElement.update();
        });*/
    },
    
    setupElements: function(elements) {
        if (this.options.centerFocus) {
            this.excess = { left: this.size.x / 2, right: this.size.x / 2 };
        } else {
            var size = elements.first().getWidth() / 2;
            this.excess = { left: size, right: this.size.x - size };
        }
        
        this.wrapper = new Element("div");
        this.wrapper.setStyle({
            position: "relative",
            height: this.size.y + "px"
        });
        
        this.elements = [];
        
        var previous;
        
        elements.each(function(element) {
            var flowElement = new Flow.Element(element)
            
            flowElement.parent = this;
            flowElement.previous = previous;
            if (previous) previous.next = flowElement;
            
            flowElement.setCenter();
            flowElement.update();
            
            this.elements.push(flowElement);
            this.wrapper.appendChild(element);
            
            previous = flowElement;
        }.bind(this));
        
        var lastElement = this.elements.last();
        this.wrapper.setStyle({
            width: (lastElement.center.x + lastElement.size.x / 2 + this.offset) + "px"
        });
        
        this.container.appendChild(this.wrapper);
        this.actualSize = { x: (this.elements.last().center.x - this.excess.right - this.offset), y: this.container.getHeight() };
    },
    
    setupScrollBar: function() {
        this.scrollBar = new Flow.ScrollBar($(this.options.scrollBar), this.options);
        this.scrollBar.parent = this;
        this.scrollBar.setup();
    },
    
    autoScroll: function() {
        this.target += this.elements.first().size.x;
        this.clampTarget();
        
        this.scrollBar.setPosition(this.target);       
    },
    
    clampTarget: function() {
        if (this.target < 0) this.target = 0;
        
        if (this.target > this.actualSize.x) {
            this.target = this.actualSize.x;     
            this.autoScroller.stop();
        }
    },
    
    setPage: function(page) {
        this.target = this.size.x * (page - 1);
    },
    
    previousPage: function() {
        this.target -= this.size.x;
        this.clampTarget();
        this.scrollBar.setPosition(this.target);
    },
    
    nextPage: function() {
        this.target += this.size.x;
        this.clampTarget();
        this.scrollBar.setPosition(this.target);
    }
});

Flow.ScrollBar = Class.create({
    initialize: function(scrollBar, options) {
        this.scrollBar = $(scrollBar);
        this.options = options;
        
        if (this.scrollBar.style.display == "none") {
            this.scrollBar.setOpacity(0);
            this.scrollBar.style.display = "block";
        }
        
        this.scrollWidget = this.scrollBar.getElementsBySelector("." + this.options.scrollWidgetClass).first();
        
        this.size = { x: this.scrollBar.getWidth() - this.scrollWidget.getWidth() };
        this.widgetSize = { x: this.scrollWidget.getWidth() };
        
        var temp = this.scrollBar.cumulativeOffset();
        this.position = { x: temp[0], y: temp[1] };
        this.scrollPosition = 0;
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
            
            if (Math.abs(this.velocity) < 0.1) {
                this.velocity = null;
            }
        }
        
        this.scrollWidget.setStyle({
            left: this.clampedScrollPosition() + "px"
        });
    },
    
    positionFromMouse: function(event) {
        return event.pageX - this.dragOffset - this.position.x - this.widgetSize.x / 2;        
    },
    
    setup: function() {
        this.scrollBar.observe("click", function(event) {
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
        this.dragOffset = 0;
            
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
        return Math.round(position / this.parent.elements.first().size.x) * this.parent.elements.first().size.x;
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
        
        this.size = { x: this.element.getWidth(), y: this.element.getHeight() };
    },
    
    update: function() {
        var focalPoint = this.parent.focalPoint + (this.parent.size.x / 2);
        var distance = focalPoint - this.center.x ;

        var temp = (Math.abs(distance) / this.size.x) + 1;
        temp *= 0.5;
        
        if (temp == 0) temp = 1;
        temp = 1;
        
        this.drawDistance = distance / temp;
        var drawPosition = { x: focalPoint - this.drawDistance, y: this.center.y };
        
        drawPosition.x -= this.size.x / 2;
        drawPosition.y -= this.size.y / 2;
        
        this.element.setStyle({
            left: drawPosition.x + "px",
            top: drawPosition.y + "px",
            zIndex: 30000 - parseInt(Math.abs(this.drawDistance))
        });
    },
    
    setCenter: function() {            
        if (!this.previous) {
            this.center = { x: this.parent.excess.left + this.parent.offset, y: this.parent.size.y / 2 };
            return;
        }
        
        this.center = {
            x: this.previous.center.x + this.previous.size.x / 2 + this.size.x / 2,
            y: this.previous.center.y
        };
    }
});

Flow.DefaultOptions = {
    scrollCatchUp: 20, 
    scrollBar: "scrollBar",
    scrollWidgetClass: "scroll-widget",
    scrollSnap: true,
    scrollBarFriction: 0.9,
    maxScrollVelocity: 150,
    centerFocus: false,
    autoScrollAtStart: false,
    autoScrollDelay: 2,
    autoHideScrollBar: true,
    centerAtStart: true
};

/*
Has mac bounce when reaches ends
Has inertia (customised with friction and max velocity)
Has snapping so elements aren't clipped (while scrolling like coverflow)
Can make focal pointer at center
Has scroll bar (scroll bar can be styled and code uses the style to configure scroll bar) (fully functional)
 - click anywhere on scroll bar
 - move scroll widget
 - all moves organically
 - can throw scroll widget
Has auto scroll at start
Has organic slow down
Has next/prev page
Has snap on mouse up function
*/