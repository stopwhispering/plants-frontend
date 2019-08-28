sap.ui.define([], function() {
	"use strict";
	return {
		activeInactive: function(active) {
			// var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
			switch (active) {
				case true:
					// return resourceBundle.getText("invoiceStatusA");
					return 'active';
				case false:
					// return resourceBundle.getText("invoiceStatusB");
					return 'inactive';
				case null:
					// return resourceBundle.getText("invoiceStatusC");
					return 'unknown';
				default:
					return active;
			}
		},
		
		countPlants: function(plants){
			if(plants!==undefined){
				return plants.length.toString();
			} else {
				// console.log("no plants, yet. can't count");
			}
		},
		
		tokenFormat: function(key, plant_name){
			if(key===plant_name){
				return true;
			} else {
				return false;
			}
		},
		
		formatPot: function(pot_width_above, pot_circular, pot_height, pot_material){
			if(pot_circular&&pot_width_above){
				var sWidth = 'Ø: '+(pot_width_above/10)+'cm';
			} else if (pot_width_above){
				sWidth = 'W: '+(pot_width_above/10)+'cm';
			} else {
				sWidth = '';
			}
			
			if(pot_height){
				var sHeight = 'H: '+(pot_height/10)+'cm';
			} else {
				sHeight = '';
			}
			
			if(sWidth&&sHeight){
				var sPot = sWidth+' / '+sHeight;
			} else if(sWidth) {
				sPot = sWidth;
			} else if(sHeight) {
				sPot = sHeight;
			} else {
				sPot = '';
			}
			
			if(pot_circular){
				sPot = sPot + ' (circular)';
			} else {
				sPot = sPot + ' (quadr.)';
			} 
			
			if (pot_material){
				sPot = sPot + ', '+pot_material;
			}
				
			return sPot;
		},
		
		formatMeasurement: function(stem_max_diameter, stem_outset_diameter, height){
			var s = '';
			if(stem_max_diameter){
				s = "Stem/Caudex diameter at maximum: " +  stem_max_diameter + "mm";
			}
			if(stem_outset_diameter){
				if (s){
					s = s + '\n\n';
				}
				s = s + "Stem/Caudex diameter at outset: " +  stem_outset_diameter + "mm";
			}
			if(height){
				if (s){
					s = s + '\n\n';
				}
				s = s + "Height: " +  height + "mm";
			}
			return s;
		}
		
		// isFooterVisible: function(aMessages){
		// 	//display footer only if there are messages and only in the largest column 
			
		// 	// or insert directly in view: visible="{= ${messages>/}.length > 0 }"
		// 	if(!aMessages || aMessages.length === 0){
		// 		return false;
		// 	}
			
			//doesn't work as upon state changes the formatter is not triggered (not in a model prividing an event)
		// 	if (this.getView().getViewName().endsWith('Master') 
		// 		&& this.getOwnerComponent().getHelper().getCurrentUIState().columnsVisibility.beginColumn
		// 		&& this.getOwnerComponent().getHelper().getCurrentUIState().columnsSizes.beginColumn >= 50){
		// 			return true;
		// 		}
		// 	else if(this.getView().getViewName().endsWith('Detail') 
		// 		&& this.getOwnerComponent().getHelper().getCurrentUIState().columnsVisibility.midColumn
		// 		&& this.getOwnerComponent().getHelper().getCurrentUIState().columnsSizes.midColumn >= 50){
		// 			return true;
		// 		}
		// 	else if(this.getView().getViewName().endsWith('Untagged') 
		// 		&& this.getOwnerComponent().getHelper().getCurrentUIState().columnsVisibility.endColumn
		// 		&& this.getOwnerComponent().getHelper().getCurrentUIState().columnsSizes.endColumn >= 50){
		// 			return true;
		// 		}
			
		// 	return false;

		// }
		
	};
});