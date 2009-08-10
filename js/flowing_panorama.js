var FlowingPanorama = Class.create({
    initialize: function(flowContainer, panoramaContainer, selector, flowOptions, panoramaOptions) {
        panoramaOptions = panoramaOptions || {};
        
        this.panoramaContainer = $(panoramaContainer);
        this.flowContainer = $(flowContainer);
        
        if (this.panoramaContainer == null || this.flowContainer == null) return;
        
        // if auto play is off, make sure panorama doesn't change
        if (!panoramaOptions.autoPlay) {
            panoramaOptions.scrollSpeed = 0;
            panoramaOptions.showPauseIndicator = false;
        }
        
        // disable autoscroll in flowing panorama if panorama has auto play already
        if (panoramaOptions.autoPlay) {
            flowOptions.autoScroll = false;
        }
        
        // sets auto play delay
        if (panoramaOptions.autoPlayDelay) {
            panoramaOptions.minDelay = panoramaOptions.autoPlayDelay;
        }
        
        this.anchors = $$(selector);
        
        if (this.anchors.length == 0) return;
        if (this.anchors.length <= 1) panoramaOptions.showPauseIndicator = false;

        // Need to turn focus on load off as panorama deals with that already
        flowOptions.focusOnLoad = false;

        this.flow = new Flow(this.flowContainer, selector, Object.extend(flowOptions || {}, {
            onFocus: function(element) {
                if (this.panorama != null) {
                    this.panorama.set(this.flow.elements.index(element), true);   
                }
            }.bind(this),
            autoScroll: false
        }));
                
        this.panorama = new Panorama(this.panoramaContainer, this.createImages(), Object.extend(panoramaOptions || {},{
            onChange: function(element) {
                if (element.parent && !this.flow.isScrolling()) {
                    this.flow.scrollToIndex(element.parent.currentIndex(), true);
                }
            }.bind(this)
        }));
    },
    
    createImages: function() {
        this.images = [];
        
        this.anchors.each(function(anchor) {
            var image = $(new Image());
            image.src = anchor.href;
            image.id = anchor.id + "__image";
            
            this.images.push(image);
        }.bind(this));
        
        return this.images;
    },
        
    addFocusEvent: function(func) {
        this.flow.addFocusEvent(func);
    }
});