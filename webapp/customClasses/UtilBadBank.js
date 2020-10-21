//UI5 Web Ide hates arrow functions. So we put them here...

sap.ui.define([
	], function() {
   "use strict";

    return {
    	
    	_hasPropertyValueFor: function(type, aPropertyValues){
    		var found = aPropertyValues.find(element => element.type === type);
    		if (found)
    		    return true;
    		else
    		    return false;
    	},

		comparePropertiesLists: function(aPropertiesAvailable, aPropertiesUsed){
			var aList = [];
			if (aPropertiesAvailable === undefined){
				aPropertiesAvailable = [];
			}
			var _hasPropertyValueFor = this._hasPropertyValueFor;  // to make available in closure
			aPropertiesAvailable.forEach(function(entry) {
				var sName = entry.property_name;
				var found = aPropertiesUsed.find(element => element.property_name === sName);
				
				// set whether plant and/or taxon property value is already used (thus blocked)
				var oItem = {'property_name': sName, 'property_name_id': entry.property_name_id}
				if(found && _hasPropertyValueFor('plant', found.property_values)){
					oItem['selected_plant'] = true;
					oItem['blocked_plant'] = true; }
				else {
					oItem['selected_plant'] = false;
					oItem['blocked_plant'] = false;
				}
				
				if(found && _hasPropertyValueFor('taxon', found.property_values)){
					oItem['selected_taxon'] = true;
					oItem['blocked_taxon'] = true; }
				else {
					oItem['selected_taxon'] = false;
					oItem['blocked_taxon'] = false;
				}
				
				aList.push(oItem);
			});
			return aList; 
		},
		
		find_: function(arr, property, value){
			// just a wrapper for the find arrow function that sap web ide hates so much...
			return arr.find(element => element[property] === value);
		},
		
		filter_: function(arr, property, value){
			// just a wrapper for the find arrow function that sap web ide hates so much...
			return arr.filter(element => element[property] === value);
		},
		
		getFiltersForEach: function(arr, field, op){
			return arr.map(ele => new sap.ui.model.Filter(field, op, ele));	
		},
		
		// filterByLevel: function(aSelectedTaxa, iDeepestLevel){
		// // need multiple params, so can't use generic variant above
		// 	return aSelectedTaxa.filter(ele => ele.level === iDeepestLevel && ele.selected);
		// },
		
		add_list_items_to_list(arr, arr_new){
			// wrapper for the spread operator that sap web ide hates as well...
			arr.push(...arr_new);
			return arr;
		}
   };
});