// precheck if IE
var isIE = (/MSIE (5\.5|6\.)/.test(navigator.userAgent) && navigator.platform == "Win32");

Element.addMethods({ 
    iePNGFix: function(element, blankPixel) {
        if (!isIE) return;
        
        if (element.complete != null) {
            if (element.src == blankPixel) return;        
            if (!element.src.toLowerCase().indexOf(".png")) return;
            
            // wait till image is preloaded
            if (!element.complete) {
                setTimeout(function(_element, _blankPixel) {
                    _element.iePNGFix(_blankPixel);
                }.bind(this, element, blankPixel), 100);

                return;
            }

            element.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + element.src + "',sizingMethod='scale')";
            element.style.width = element.width + "px";
            element.style.height = element.height + "px";
            element.src = blankPixel || "/images/blank.gif";
        } else {
            var src = $(element).getStyle("backgroundImage");
            var startIndex = src.indexOf("(\"") + 2;
            var length = src.indexOf("\")");
            
            src = src.substring(startIndex, length);
            if (!src.toLowerCase().indexOf(".png")) return;

            element.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src + "',sizingMethod='scale')";
            element.setStyle({ background: "none" });
            
            alert(element.getStyle('background'))
        }
    }
});

Array.prototype.index = function(val) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] == val) return i;
    }

    return null;
};