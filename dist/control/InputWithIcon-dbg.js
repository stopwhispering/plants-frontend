sap.ui.define([
  "sap/m/InputBase",
  "sap/m/Input",
	"sap/ui/core/IconPool",
  "sap/m/InputBaseRenderer",
], function(InputBase, Input, IconPool) {
  "use strict";

  return Input.extend("plants.tagger.ui.control.InputWithIcon", {
  	
    metadata: {
      //events: {
      //  endButtonPress: {}
      //},
    },

    init: function() {
      Input.prototype.init.apply(this, arguments);
      var icon = this.addEndIcon({
        id: this.getId() + "-IconBtn",
        src: IconPool.getIconURI('cancel'),
        noTabStop: true,
        tooltip: "Set unknown",
        press: [this.onEndButtonPress, this],
      }); // See sap.ui.core.Icon/properties for more settings
      // icon.addStyleClass(...); if even more customization required..
    },

    onBeforeRendering: function() {
      Input.prototype.onBeforeRendering.apply(this, arguments);
      var endIcons = this.getAggregation("_endIcon");
      var isEditable = this.getEditable();
      if (Array.isArray(endIcons)) {
        endIcons.map(icon => icon.setProperty("visible", isEditable, true));
      }
    },

    onEndButtonPress: function() {
      if (this.getEnabled() && this.getEditable()) {
        // this.fireEndButtonPress({});
        this.setValue('-');
      }
    },

    renderer: "sap.m.InputRenderer",
  });
});