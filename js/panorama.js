var Panorama = Class.create({
    initialize: function(container, images, options) {
        this.container = $(container);
        
        if (this.container == null) return;
        
        this.options = Object.extend(Object.extend({}, Panorama.DefaultOptions), options || {});
        
        if (typeof(images) == "string") images = $$(images);
        this.images = images || [];
        
        if (this.images.length == 0) return;
        
        if (this.options.random) {
            this.startIndex = parseInt(Math.random() * this.images.length);
        } else {
            this.startIndex = 0;
        }
        
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
        this.elements[this.startIndex].show(true);
    },
    
    set: function(index, dontCallOnChange) {
        var element = this.elements[index];
        
        if (element != this.currentElement) {        
            this.previousElement = this.currentElement;
            this.currentElement.checkOverflow = true;
            this.currentElement.hide(element, dontCallOnChange);

            if (this.paused) {
                this.mouseEnter();
            }
        }
    },
    
    setupContainer: function() {
        this.container.setStyle({
            position: "relative",
            overflow: this.options.overflow
        });
        
        this.size = { x: this.container.getWidth(), y: this.container.getHeight() };
        
        var temp = this.container.cumulativeOffset();
        this.position = { x: temp[0], y: temp[1] };
        
        if (this.options.useMouseStop) {
            this.container.observe("mouseover", this.mouseEnter.bind(this));       
            this.container.observe("mouseout", this.mouseLeave.bind(this)); 
            
            // add pause notifier only if mouse stop is on        
            if (this.options.showPauseIndicator) {
                this.pauseDiv = new Element("div", { 'class': this.options.pausedClass }).update(this.options.pausedText);
                this.container.appendChild(this.pauseDiv);
                this.pauseDiv.hide();
            }
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
        if (this.outsidePause) return;
        
        if (this.currentElement == null) return;
        
        this.currentElement.startTime = (new Date()).getTime();
        this.currentElement.checkOverflow = true;

        if (this.pauseDiv) this.pauseDiv.hide();
        this.paused = false;
    },
    
    mouseEnter: function() {
        if (this.currentElement == null) return;
        
        if (this.currentElement.hideDelay) {
            clearTimeout(this.currentElement.hider);
            this.currentElement.hideDelay = false;
            this.currentElement.checkOverflow = true;
        }
        
        if (this.pauseDiv) this.pauseDiv.show();
        this.paused = true;
    },
    
    // external pause
    pause: function() {
        this.outsidePause = true;
        this.mouseEnter();
    },
    
    // external unpause
    unPause: function() {
        this.outsidePause = false;
        this.mouseLeave();
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
        this.element = $(element);
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
        
        this.element.setOpacity(this.parent.elements.length == this.parent.startIndex ? 1 : 0);
        
        if (this.element.parentNode == null) this.parent.container.appendChild(this.element);
        this.size = { x: this.element.getWidth(), y: this.element.getHeight() };        
        
        this.direction =
            (this.size.x - this.parent.size.x) < (this.size.y - this.parent.size.y)
            ? Panorama.VERTICAL : Panorama.HORIZONTAL;

        this.parent.container.observe("mousemove", this.mouseScroll.bind(this));
        this.parent.container.observe("mouseout", this.mouseLeave.bind(this));
        
        this.scrollAmount = this.parent.options.scrollSpeed;
    },
    
    show: function(showFirst, dontCallOnChange) {
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

                // do on show AFTER fading is done
                if (this.parent.options.callOnShowAfterFade) this.doOnShow();
            }.bind(this),
            duration: this.parent.options.transitionSpeed
        });
        
        if (!dontCallOnChange) {
            this.parent.options.onChange(this);   
        }
        
        if (!this.parent.options.callOnShowAfterFade) this.doOnShow();
        
        if (this.scroller) this.scroller.stop();
        
        if (this.parent.elements.size() <= 1) return false;
        
        this.scroller = new PeriodicalExecuter(this.update.bind(this), this.parent.options.updateDelay);
        
        this.startTime = (new Date()).getTime();

        this.hideDelay = false;
    },
    
    doOnShow: function() {  
      if (!this.parent.currentElement.element.complete) {
          this.parent.currentElement.element.observe('load', 
              function() { this.parent.options.onShow(); }.bind(this)
          );
      } else {
          this.parent.options.onShow();
      }
    },
    
    update: function() {
        if (this.hideDelay) return;
        
        if (this.parent.paused) {
            this.scrollAmount = 0;
            this.target = this.scrollPosition;
        }
        
        this.scrollPosition += (this.target - this.scrollPosition) / this.parent.options.scrollCatchUp;        
        this.target -= this.scrollAmount;
        
        if (this.target > 0) this.target = 0;
        
        if (this.checkOverflow && !this.parent.paused) {
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
                    this.hideDelay = true;
                } else {
                    this.hide();    
                }
                
                return;
            }
        }
        
        this.element.style[this.direction] = this.scrollPosition + "px";
    },
    
    hide: function(elementToShow, dontCallOnChange) {
        this.parent.options.onHide();
        
        this.parent.elements.each(function(sibling) {
            sibling.element.setStyle({ zIndex: this.parent.options.zIndex - 2 });
        }.bind(this));
        
        this.element.setStyle({ zIndex: this.parent.options.zIndex - 1 });
        
        var element;
        if (this.parent.options.random && elementToShow == null) {
            while (true) {
                var index = parseInt(Math.random() * this.parent.elements.length);
                element = this.parent.elements[index];   
                
                if (element != this) break;
            }
        } else {
            element = elementToShow || this.next;
            if (element == this) return;
        }
        
        element.show(false, dontCallOnChange);
        
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
    random: false,
    minDelay: 5000,
    maxMouseScrollSpeed: 3,
    useMouseScroll: false,
    useMouseStop: false,
    zIndex: 100,
    overflow: "hidden",
    scrollSpeed: 1,
    updateDelay: 0.05,
    mouseScrollDeadZoneSize: 100,
    mouseScrollSensitivity: 0.04,
    transitionSpeed: 1,
    scrollCatchUp: 20,
    pausedClass: 'paused',
    pausedText: 'Paused',
    showPauseIndicator: true,
    callOnShowAfterFade: true,
    onHide: function() {},
    onChange: function() {},
    onShow: function() {}
};