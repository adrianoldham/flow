// precheck if IE
var isIE = (/MSIE (5\.5|6\.|7\.)/.test(navigator.userAgent) && navigator.platform == "Win32");

var PNG_FORMAT = /^.+\.((png))$/;

Element.addMethods({ 
    iePNGFix: function(element, blankPixel) {
        if (!isIE) return;
        
        if (element.complete != null) {
            if (element.src == blankPixel) return;        
            if (!PNG_FORMAT.test(element.src.toLowerCase())) return;
            
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
            if (!PNG_FORMAT.test(src.toLowerCase())) return;

            element.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src + "',sizingMethod='scale')";
            element.setStyle({ background: "none" });
        }
    }
});

Array.prototype.index = function(val) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] == val) return i;
    }

    return null;
};