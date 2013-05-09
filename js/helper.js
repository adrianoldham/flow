// precheck if IE (depricated)
var isIE = Prototype.Browser.IE && (/MSIE (5\.5|6\.)/.test(navigator.userAgent) && navigator.platform == "Win32");

// browsers that don't support PNG Alpha and require iePNGFix
var hasNoAlphaSupport = Prototype.Browser.IE && (/MSIE (5\.5|6\.)/.test(navigator.userAgent) && navigator.platform == "Win32");

// browsers that don't properly support opacity animation for PNG Alpha 
var hasNoAlphaAnimationSupport = Prototype.Browser.IE && (/MSIE (5\.5|6\.|7\.|8\.)/.test(navigator.userAgent) && navigator.platform == "Win32");

// iePNGFix Alpha PNG images for IE 5.5 - 6.x
var PNG_FORMAT = /^.+\.((png))$/;

Element.addMethods({ 
    iePNGFix: function(element, blankPixel, sizingMethod) {
        if (!hasNoAlphaSupport) return;
        
        element = $(element);
        
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
            
            // Calculate padding to remove
            var horizontalPadding = parseInt(element.getStyle('paddingLeft')) + parseInt(element.getStyle('paddingRight'));
            var verticalPadding = parseInt(element.getStyle('paddingTop')) +  parseInt(element.getStyle('paddingBottom'));  
            
            if (isNaN(horizontalPadding)) horizontalPadding = 0;
            if (isNaN(verticalPadding)) verticalPadding = 0;

            // Remove the padding twice, since image includes it, and microsoft alpha load scales image into it
            element.style.width = (element.width - horizontalPadding) + "px";       
            element.style.height = (element.height - verticalPadding) + "px";
            
            element.src = blankPixel || "/images/blank.gif";
        } else {
            var src = $(element).getStyle("backgroundImage");
            var startIndex = src.indexOf("(\"") + 2;
            var length = src.indexOf("\")");
            
            src = src.substring(startIndex, length);
            if (!PNG_FORMAT.test(src.toLowerCase())) return;

            var sizingMethod = sizingMethod || "scale";
            element.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src + "',sizingMethod='"+ sizingMethod + "')";
            element.setStyle({ background: "none" });
        }
    },

   // Adds a closest-method (equivalent to the jQuery method) to all extended Prototype DOM elements
   closest: function closest (element, cssRule) {
      var $element = $(element);
      // Return if we don't find an element to work with.
      if (!$element) {
         return;
      }
      return $element.match(cssRule) ? $element : $element.up(cssRule);
   }

});

Array.prototype.index = function(val) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] == val) return i;
    }

    return null;
};

// specific IE browser version detection
Prototype.Browser.IE6 = Prototype.Browser.IE && (/MSIE (6\.)/.test(navigator.userAgent));

Prototype.Browser.IE7 = Prototype.Browser.IE && (/MSIE (7\.)/.test(navigator.userAgent));

Prototype.Browser.IE8 = Prototype.Browser.IE && (/MSIE (8\.)/.test(navigator.userAgent));
