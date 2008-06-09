var Panorama = Class.create({
    initialize: function(container, images, options) {
        this.container = $(container);
        this.options = Object.extend(Object.extend({}, Panorama.DefaultOptions), options || {});
        
        if (typeof(images) == "string") images = $$(images);
        this.images = images;
        
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
        
        this.direction = this.size.x < this.size.y ? Panorama.VERTICAL : Panorama.HORIZONTAL;
    },
    
    show: function(showFirst) {
        this.parent.currentElement = this;
        this.checkOverflow = true;
        
        this.element.setStyle({ 
            zIndex: this.parent.options.zIndex,
            left: 0,
            top: 0
        });
        
        if (!showFirst) this.element.setOpacity(0);
        
        if (this.effect) this.effect.cancel();
        this.effect = new Effect.Appear(this.element, { afterFinish: function() {
            if (this.parent.previousElement) this.parent.previousElement.scroller.stop();
            this.parent.previousElement = this;
            this.parent.options.onChange();
        }.bind(this)});
        
        if (this.scroller) this.scroller.stop();
        this.scroller = new PeriodicalExecuter(this.update.bind(this), this.parent.options.updateDelay);
    },
    
    update: function() {
        var position = parseInt(this.element.getStyle(this.direction) || 0);
        this.element.style[this.direction] = (position - this.parent.options.scrollSpeed) + "px";
        
        if (this.checkOverflow) {
            this.pixelsPerSecond = (1 / this.parent.options.updateDelay) * this.parent.options.scrollSpeed;
            if (position < -this.size[Panorama.ATTRIBUTE[this.direction]] +
                            this.parent.size[Panorama.ATTRIBUTE[this.direction]] +
                            this.pixelsPerSecond) this.hide();
        }
    },
    
    hide: function(elementToShow) {
        this.parent.elements.each(function(sibling) {
            sibling.element.setStyle({ zIndex: this.parent.options.zIndex - 2 });
        }.bind(this));
        
        this.element.setStyle({ zIndex: this.parent.options.zIndex - 1 });
        element = elementToShow || this.next;
        element.show();
        
        this.checkOverflow = false;
    }
});

Panorama.DefaultOptions = {
    zIndex: 100,
    scrollSpeed: 1,
    updateDelay: 0.05,
    mouseScrollDeadZoneSize: 100,
    mouseScrollSensitivity: 0.04,
    onChange: function() {}
};