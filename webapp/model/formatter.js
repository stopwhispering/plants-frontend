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
		
	};
});