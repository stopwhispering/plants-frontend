// helper class for navigation/route-specific methods used applied in multiple controllers

sap.ui.define(["sap/m/BusyDialog"], function(BusyDialog) {
   "use strict";

    return {

		navToPlantDetails: function(iPlant){
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
				this.oRouter.navTo("untagged", {layout: oNextUIState.layout, product: iPlant});
			} else {
				this.oRouter.navTo("detail", {layout: oNextUIState.layout, product: iPlant});	
			}
		}		

   };
});