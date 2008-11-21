var FixedPanorama = Class.create({
    initialize: function(container, panoramaContainer, selector, options) {
        // set default options
        this.options = Object.extend(Object.extend({}, FixedPanorama.DefaultOptions), options || {});
        
        // if auto play is off, make sure panorama doesn't change
        if (!this.options.autoPlay) {
            this.options.scrollSpeed = 0;
            this.options.showPauseIndicator = false;
        }
        
        // sets auto play delay
        if (this.options.autoPlayDelay) {
            this.options.minDelay = this.options.autoPlayDelay;
        }
        
        // setup important elements
        this.container = $(container);
        this.panoramaContainer = $(panoramaContainer);
        this.anchors = $$(selector);        
        
        if (this.anchors.length <= 1) this.options.showPauseIndicator = false;
        
        // die gracefully for any of these conditions
        if (this.container == null ||
            this.panoramaContainer == null ||
            this.anchors.length == 0) return;
            
        // set up panorama with images found by the selector
        this.createImages();
        this.setupPanorama();
        
        // left/right key presses
        $(document).observe("keydown", this.keyScroll.bindAsEventListener(this));
        
        // make sure first item is focused
        this.focusOn(0);
    },
    
    clampIndex: function(index) {
        if (index < 0) index = this.anchors.length - 1;
        if (index >= this.anchors.length) index = 0;
        
        return index;
    },
        
    keyScroll: function(event) {
        switch (event.keyCode) {
            case FixedPanorama.Keys.ScrollUp:
                var index = this.clampIndex(this.currentIndex - 1);
                this.setPanoramaBasedOnAnchor(this.anchors[index]);
                break;
            case FixedPanorama.Keys.ScrollDown:
                var index = this.clampIndex(this.currentIndex + 1);
                this.setPanoramaBasedOnAnchor(this.anchors[index]);
                break;
        }
    },
    
    focusOn: function(index) {
        // make sure we clear all focus elements
        this.anchors.each(function(anchor) {
            anchor.classNames().remove(this.options.focusedClass);
        }.bind(this));
        
        // then focus on the new one
        this.anchors[index].classNames().add(this.options.focusedClass);
        
        // save current index
        this.currentIndex = index;
    },
    
    setPanoramaBasedOnAnchor: function(anchor) {
        this.panorama.set(this.anchors.indexOf(anchor));
    },
    
    setupPanorama: function() {
        this.panorama = new Panorama(this.panoramaContainer, this.images, Object.extend({
            // on panorama change then make sure the focus element is set
            onChange: function() {
                if (this.panorama) this.focusOn(this.panorama.currentIndex());
            }.bind(this)
        }, this.options));
    },
    
    createImages: function() {
        this.images = [];
        
        // loop through anchors and create images out of their href
        this.anchors.each(function(anchor) {
            var image = $(new Image());
            image.src = anchor.href;
            
            this.images.push(image);
            
            // setup anchor link
            anchor.observe('click', function(event, anchor) {
                this.setPanoramaBasedOnAnchor(anchor);
                event.stop();
            }.bindAsEventListener(this, anchor));
        }.bind(this));
        
        return this.images;
    }
});

FixedPanorama.DefaultOptions = {
    autoPlayDelay: 5000,
    autoPlay: true,
    focusedClass: "focused"
};

// Keys for key scroll
FixedPanorama.Keys = {
    ScrollUp: 37,
    ScrollDown: 39
};