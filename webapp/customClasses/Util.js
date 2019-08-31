//static utility functions

sap.ui.define([], function() {
   "use strict";

   return {
      parse_resource_from_url: function(sUrl) {
         var aItems = sUrl.split('/');
         var iIndex = aItems.indexOf('backend');
         var aResource = aItems.slice(iIndex+1);
         return aResource.join('/');
      }
   };
});