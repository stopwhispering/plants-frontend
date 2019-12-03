// // todo maybe implement later, currently implemented in master controller

// sap.ui.define([
// 	"sap/ui/base/Object",
// 	"sap/ui/model/Filter",
// 	"sap/ui/model/FilterOperator",
// 	"sap/ui/model/FilterType"
// ], function(Object, Filter, FilterOperator, FilterType) {
//   "use strict";
  
//   return Object.extend("plants.tagger.ui.customClasses.SearchFilter", {
// 	oNameFilter: undefined,
// 	oActiveFilter: undefined,
		
//     constructor: function(oTable) {
//     	// this.oBinding = todo
//     },
    
//     setNameFilter: function(sName) {
//   		// create new filters for plant_name and botanical_name (linked with OR)
// 		var aNestedFilters = [new Filter("plant_name", FilterOperator.Contains, sName),
// 							  new Filter("botanical_name", FilterOperator.Contains, sName)];
// 		var oFilterOr = new Filter({filters: aNestedFilters,
// 									and: false});
// 		this.oNameFilter = oFilterOr;
//     }
    
//   });
// });