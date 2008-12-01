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

        this.flow = new Flow(this.flowContainer, selector, Object.extend(flowOptions || {}, {
            onFocus: function(element) {
                this.panorama.set(this.flow.elements.index(element));
            }.bind(this),
            autoScroll: false
        }));
                
        this.panorama = new Panorama(this.panoramaContainer, this.createImages(), Object.extend(panoramaOptions || {},{
            onChange: function() {
                if (this.panorama && !this.flow.isScrolling()) {
                    this.flow.scrollToIndex(this.panorama.currentIndex(), true);
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
    }
});