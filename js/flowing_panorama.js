var FlowingPanorama = Class.create({
    initialize: function(flowContainer, panoramaContainer, selector) {
        this.panoramaContainer = $(panoramaContainer);
        this.flowContainer = $(flowContainer);
        
        this.anchors = $$(selector);

        this.flow = new Flow(this.flowContainer, selector, {
            onFocus: function(element) {
                this.panorama.set(this.flow.elements.index(element));
            }.bind(this),
            autoScroll: false,
            centerFocus: true
        });
                
        this.panorama = new Panorama(this.panoramaContainer, this.createImages(), {
            onChange: function() {
                if (this.panorama && !this.flow.isScrolling()) {
                    this.flow.scrollToIndex(this.panorama.currentIndex());
                }
            }.bind(this)
        });
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
})