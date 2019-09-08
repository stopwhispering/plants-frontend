sap.ui.define([], function() {
	"use strict";
	return {
		activeInactive: function(active) {
			switch (active) {
				case true:
					return '';
				case false:
					return 'Status: inactive';
				case null:
					return 'Status: unknown';
				default:
					return active;
			}
		},
		
		countPlants: function(plants){
			if(plants!==undefined){
				return plants.length.toString();
			} else {
				//pass
			}
		},
		
		timestampToDateHour: function(ts){
			if (!(ts === null) && ts.length > 15){
				return ts.substr(0,10) + ' ' + ts.substr(11,5);  // "2018-11-10 00:35"
			} else {
				return ts;
			}
		},
		
		timestampToDate: function(ts){
			if (ts === '1900-01-01'){
				// dummy date if no image at all; required for correct sorting
				return '';
			} else if (ts !== undefined && ts !== null && ts.length > 15){
				return ts.substr(0,10);  // "2018-11-10"
			} else {
				return ts;
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
		},
		
		messageCount: function(aMessages){
			if(aMessages){
				return aMessages.length;
			} else {
				return 0;
			}
		},
		
		btnEnabledUntagged: function(midColumnVisible, endColumnVisible){
			return (midColumnVisible && !endColumnVisible);
		},
		
		hasArrayItemsOrEditable: function(aData, bEditable){
		// expects array as input; returns true if at least oneo item is not null;
		// if bEditable, then return true
			if(bEditable){
				return true;
			} else if (aData === undefined || aData === null || aData.length === 0){
				return false;
			} else {

				for (var i = 0; i < aData.length; i++){
					if (aData[i].text !== undefined && aData[i].text !== null && aData[i].text !== ''){
						return true;
					}
				}
				return false;
			}
		},
		
		zeroIfCardHidden: function(aData, bEditable, iColumns){
			if(this.formatter.hasArrayItemsOrEditable(aData, bEditable)){
				return iColumns;
			} else {
				return 0;
			}
		},
		
		hasValue: function(sValue){
			if(sValue){
				return true;
			} else {
				return false;
			}
		},
		
		hasValueOrEditable: function(sValue, bEditable){
			//like hasValue but always returns true if bEditable
			if(bEditable || sValue){
				return true;
			} else {
				return false;
			}	
		},
		
		stateByBotany: function(dBotany){
			//returns 'Warning' if no botany data availabe, otherwise "Information"
			if (dBotany !== undefined && dBotany !== null && dBotany !== {}){
				return 'Information';
			} else {
				return 'Warning';
			}
		}

	};
});