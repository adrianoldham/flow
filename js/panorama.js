var Panorama = Class.create({
    initialize: function(container, images, options) {
        this.container = $(container);
        
        if (this.container == null) return;
        
        this.options = Object.extend(Object.extend({}, Panorama.DefaultOptions), options || {});
        
        if (typeof(images) == "string") images = $$(images);
        this.images = images;
        
        if (this.images.length == 0) return;
        
        this.setupContainer();        
        this.preloadImages();
    },
    
    preloadImages: function() {
        var complete = false;
        this.images.each(function(image) {
            complete = complete || image.complete;
        });
        
        if (complete) {
            this.setupElements(this.images);
            this.start();
        } else {
            setTimeout(this.preloadImages.bind(this), 100);
        }
    },
    
    start: function() {
        this.elements.first().show(true);
    },
    
    set: function(index) {
        var element = this.elements[index];
        if (element != this.currentElement) {
            this.previousElement = this.currentElement;
            this.currentElement.checkOverflow = true;
            this.currentElement.hide(element);
        }
    },
    
    setupContainer: function() {
        this.container.setStyle({
            position: "relative",
            overflow: "hidden"
        });
        
        this.size = { x: this.container.getWidth(), y: this.container.getHeight() };
        
        var temp = this.container.cumulativeOffset();
        this.position = { x: temp[0], y: temp[1] };
        
        if (this.options.useMouseStop) {
            this.container.observe("mouseover", this.mouseEnter.bind(this));       
            this.container.observe("mouseout", this.mouseLeave.bind(this)); 
        }
    },
    
    setupElements: function(elements) {
        this.elements = [];
        
        var temp;
        elements.each(function(element) {
            var panoramaElement = new Panorama.Element(element, this);
            if (temp) temp.next = panoramaElement;
            
            this.elements.push(panoramaElement);
            
            temp = panoramaElement;
        }.bind(this));
        
        temp.next = this.elements.first();
    },
    
    currentIndex: function() {
        return this.elements.index(this.currentElement);
    },
    
    mouseLeave: function() {
        if (this.currentElement.hideDelay) {
            this.currentElement.hider = setTimeout(this.currentElement.hide.bind(this.currentElement, null), this.options.minDelay);
        
            this.currentElement.checkOverflow = false;    
            this.currentElement.hideDelay = true;
        }
    },
    
    mouseEnter: function() {
        this.currentElement.scrollAmount = 0;
        this.currentElement.target = this.currentElement.scrollPosition;
        
        clearTimeout(this.currentElement.hider)
        this.currentElement.checkOverflow = true;
    }
});

// Enumerations
Object.extend(Panorama, {
    HORIZONTAL: "left",
    VERTICAL: "top",
    ATTRIBUTE: { left: "x", top: "y" }
});

Panorama.Element = Class.create({
    initialize: function(element, parent) {
        this.element = element;
        this.parent = parent;
        
        this.setup();
    },
    
    setup: function() {
        this.element.setStyle({
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: this.parent.options.zIndex - 1
        });
        
        this.element.setOpacity(this.parent.elements.length == 0 ? 1 : 0);
        
        if (this.element.parentNode == null) this.parent.container.appendChild(this.element);
        this.size = { x: this.element.getWidth(), y: this.element.getHeight() };        
        
        this.direction =
            (this.size.x - this.parent.size.x) < (this.size.y - this.parent.size.y)
            ? Panorama.VERTICAL : Panorama.HORIZONTAL;

        this.parent.container.observe("mousemove", this.mouseScroll.bind(this));
        this.parent.container.observe("mouseout", this.mouseLeave.bind(this));
        
        this.scrollAmount = this.parent.options.scrollSpeed;
    },
    
    show: function(showFirst) {
        if (this.parent.currentElement) clearTimeout(this.parent.currentElement.hider);
        this.parent.currentElement = this;
        
        this.checkOverflow = true;
        
        this.target = 0;
        this.scrollPosition = 0;
        this.element.setStyle({ 
            zIndex: this.parent.options.zIndex,
            left: 0,
            top: 0
        });
        
        if (!showFirst) this.element.setOpacity(0);
        
        if (this.effect) this.effect.cancel();
        this.effect = new Effect.Appear(this.element, { afterFinish: function() {
            if (this.parent.previousElement && this.parent.previousElement.scroller) this.parent.previousElement.scroller.stop();
            this.parent.previousElement = this;
             }.bind(this),
            duration: this.parent.options.transitionSpeed
        });
        
        this.parent.options.onChange();
        
        if (this.scroller) this.scroller.stop();
        this.scroller = new PeriodicalExecuter(this.update.bind(this), this.parent.options.updateDelay);
        
        this.startTime = (new Date()).getTime();

        this.hideDelay = false;
    },
    
    update: function() {        
        this.scrollPosition += (this.target - this.scrollPosition) / this.parent.options.scrollCatchUp;        
        this.target -= this.scrollAmount;
        
        if (this.target > 0) this.target = 0;
        
        if (this.checkOverflow) {
            this.pixelsPerSecond = (1 / this.parent.options.updateDelay) * this.scrollAmount;
            if (this.scrollPosition < -this.size[Panorama.ATTRIBUTE[this.direction]] +
                this.parent.size[Panorama.ATTRIBUTE[this.direction]] +
                this.pixelsPerSecond) {
                    
                this.endTime = (new Date()).getTime();
                this.timeUsed = this.endTime - this.startTime;
                this.timeLeft = this.parent.options.minDelay - this.timeUsed;
                
                if (this.timeLeft > 0) {
                    this.hider = setTimeout(this.hide.bind(this, null), this.timeLeft);
                    this.checkOverflow = false;
                    this.scroller.stop();
                    
                    this.hideDelay = true;
                } else {
                    this.hide();    
                }
                
                return;
            }
        }
        
        this.element.style[this.direction] = this.scrollPosition + "px";
    },
    
    hide: function(elementToShow) {
        this.parent.elements.each(function(sibling) {
            sibling.element.setStyle({ zIndex: this.parent.options.zIndex - 2 });
        }.bind(this));
        
        this.element.setStyle({ zIndex: this.parent.options.zIndex - 1 });
        element = elementToShow || this.next;
        
        if (element == this) return;
        
        element.show();
        
        this.checkOverflow = false;
    },
    
    mouseScroll: function(event) {
        if (!this.parent.options.useMouseScroll) return;
        
        var sign = 0;
        var temp = ((event["page" + Panorama.ATTRIBUTE[this.direction].toUpperCase()] - this.parent.position[Panorama.ATTRIBUTE[this.direction]]) - this.parent.size[Panorama.ATTRIBUTE[this.direction]] / 2);
        if (temp != 0) sign = temp / (Math.abs(temp));
            
        temp = Math.abs(temp);
        temp -= this.parent.options.mouseScrollDeadZoneSize / 2;
            
        if (temp < 0) temp = 0;
            
        this.scrollAmount = temp * sign * this.parent.options.mouseScrollSensitivity;
        if (this.scrollAmount > this.parent.options.maxMouseScrollSpeed) this.scrollAmount = this.parent.options.maxMouseScrollSpeed;
    },
    
    mouseLeave: function() {
        this.scrollAmount = this.parent.options.scrollSpeed;
    }
});

Panorama.DefaultOptions = {
    minDelay: 5000,
    maxMouseScrollSpeed: 3,
    useMouseScroll: true,
    useMouseStop: true,
    zIndex: 100,
    scrollSpeed: 1,
    updateDelay: 0.05,
    mouseScrollDeadZoneSize: 100,
    mouseScrollSensitivity: 0.04,
    transitionSpeed: 1,
    scrollCatchUp: 20,
    onChange: function() {}
};