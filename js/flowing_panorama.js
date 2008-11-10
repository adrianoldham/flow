var FlowingPanorama = Class.create({
    initialize: function(flowContainer, panoramaContainer, selector, flowOptions, panoramaOptions) {
        this.panoramaContainer = $(panoramaContainer);
        this.flowContainer = $(flowContainer);
        
        if (this.panoramaContainer == null || this.flowContainer == null) return;
        
        this.anchors = $$(selector);
        
        if (this.anchors.length == 0) return;

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
            
            this.images.push(image);
        }.bind(this));
        
        return this.images;
    }
});