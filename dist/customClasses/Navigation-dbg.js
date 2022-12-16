// helper class for navigation/route-specific methods used applied in multiple controllers

sap.ui.define([ 
	"sap/ui/core/routing/History"], function(History) {
   "use strict";

    return {

		navToPlantDetails: function(iPlant){
			// todo refactored... adjust comments etc
			// requires the plant index in plants model
			// open requested plants detail view in the mid column; either via...
			// - detail route (two-columns, default)
			// - untagged route (three-colums, only if untagged route already active)
			if (this.getOwnerComponent().getHelper().getCurrentUIState().layout !== "OneColumn"){
				var oNextUIState = this.getOwnerComponent().getHelper().getCurrentUIState();	
			} else {
				oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1);
			}
			
			// use detail (two-col) route or untagged(three-col) route
			var aHash = this.getOwnerComponent().getRouter().getHashChanger().getHash().split('/');
			var sLastItem = aHash.pop();
			if(sLastItem === 'untagged'){
				this.getOwnerComponent().getRouter().navTo("untagged", {layout: oNextUIState.layout, plant_id: iPlant});
			} else {
				this.getOwnerComponent().getRouter().navTo("detail", {layout: oNextUIState.layout, plant_id: iPlant});	
			}
		},
	
		// [not used in this project]	
		// todo use or remove
//		check if there is a previous hash value in the app history. if so, redirect 
//		to the previous hash via browser's native history api. otherwise navigate to our home view
		onNavBack: function(oEvent){
			var oHistory, sPreviousHash;
			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getOwnerComponent().getRouter().navTo("home", {}, true /*no history*/);
			}
		}

   };
});