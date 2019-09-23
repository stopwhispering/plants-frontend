sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	'plants/tagger/ui/model/formatter',
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label",
	"sap/m/Input",
	"plants/tagger/ui/customClasses/MessageUtil",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util",
	"plants/tagger/ui/customClasses/Navigation"
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, FilterType,
Sorter, MessageBox, formatter, Button, Dialog, Label, Input, MessageUtil, MessageToast, Util, Navigation) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.Master", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
		},

		onAfterRendering: function(){
			// we need to update the plants display counter in table title 
			// (when data was loaded, the view was not existing, yet)
			var oTable = this.byId('productsTable');
			oTable.attachUpdateFinished(this.updateTableHeaderPlantsCount.bind(this));
		},
		
		onListItemPress: function (oEvent) {
			// get selected plant
			var	sPlantPath = oEvent.getSource().getBindingContext("plants").getPath();
			// "/PlantsCollection/71" --> "71"
			var	iPlant = sPlantPath.split("/").slice(-1).pop();
			Navigation.navToPlantDetails.call(this, iPlant);
		},
		
		onSearch: function (oEvent) {
			// filter logic: active AND (plant_name OR botanical_name)
			// therefore, we are going to nest the filters:
			// AND( filter_active, OR( filter_plant_name, filter_botanical_name))
			var sQuery = oEvent.getParameter("query");
			
			//check for  filter on active plants
			var aNewFilters = [];
			var aActiveFilters = this.getView().byId("productsTable").getBinding('items').aApplicationFilters;
			
			//modify filters only on fields plant_name and botanical_name
			//leave active state filter (and possible others) as is
			//therefore collect other filters
			for (var i = 0; i < aActiveFilters.length; i++){
				if (!['plant_name', 'botanical_name', undefined].includes(aActiveFilters[i]['sPath'])){
					aNewFilters.push(aActiveFilters[i]);  //and	
				}
			}
			
			// create new filters for plant_name and botanical_name (linked with OR)
			var aNestedFilters = [new Filter("plant_name", FilterOperator.Contains, sQuery),
								  new Filter("botanical_name", FilterOperator.Contains, sQuery)];
			var oFilterOr = new Filter({filters: aNestedFilters,
										and: false});
			aNewFilters.push(oFilterOr);
			
			//create the final filter (linked with AND) and attach to binding
			// var oFilter = new Filter({filters: aNewFilters,
			// 						  and: true});
			this.getView().byId("productsTable").getBinding("items").filter(aNewFilters, FilterType.Application);
			
			
			// //find out whether we already have a filter on active plants
			// for (var i = 0; i < aActiveFilters.length; i++) {
			//     if (aActiveFilters[i]['sPath'] === "active")
			//     	//remember to delete current active-filter
			//     	var oFilterActive = aActiveFilters[i];
			// }
			
			// if(oFilterActive){
			// 	//add filter on active plants
			// 	oTableFilterState.push(oFilterActive);
			// }

			// //add (new) plant_name filter
			// oTableFilterState.push(new Filter("plant_name", FilterOperator.Contains, sQuery));

			//update the aggregation binding's filter
			// this.getView().byId("productsTable").getBinding("items").filter(aNewFilters, "Application");

			// update count in table header
			this.updateTableHeaderPlantsCount();
		},
		
		onFilterActive: function(evt){
			// filter on plant_name and botanical_name is a multi-filter (linked with or)
			// we need to keep this as is if it exists
			var aFiltersNew = [];
			var aActiveFilters = this.getView().byId("productsTable").getBinding('items').aApplicationFilters;
			
			//find out whether we already have a multifilter on plant_name and botanical_name
			for (var i = 0; i < aActiveFilters.length; i++) {
			    if(aActiveFilters[i]['sPath'] === undefined){
			    	//remember plant_name filter
			    	var oFilterName = aActiveFilters[i];
			    } else if (aActiveFilters[i]['sPath'] === "active")
			    	//remember to delete current active-filter
			    	var oFilterActive = aActiveFilters[i];
			}
			
			if(oFilterActive === undefined){
				//add filter on active plants
				aFiltersNew.push(new Filter("active", FilterOperator.EQ, true));
				this.getView().byId('btnToggleHideInactive').setType('Transparent');
			} else {
				this.getView().byId('btnToggleHideInactive').setType('Emphasized');
			}

			if(oFilterName){
				aFiltersNew.push(oFilterName);
			}

			//update the aggregation binding's filter
			this.getView().byId("productsTable").getBinding("items").filter(aFiltersNew, "Application");
			
			// update count in table header
			this.updateTableHeaderPlantsCount();
		},

		onAdd: function (oEvent) {
			//show the add dialog
			this._getDialogNewPlant().open();
		},
		
		_getDialogNewPlant : function() {
			var oView = this.getView();
			var oDialog = oView.byId('dialogNewPlant');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.MasterNewPlant", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
        },

		onAddCancelButton: function(evt){
			this._getDialogNewPlant().close();
		},
		
		onAddSaveButton: function(evt){
			var sPlantName = this.byId("inputCreateNewPlantName").getValue();
			this._getDialogNewPlant().close();
			//check and not empty
			if (sPlantName === ''){
				MessageToast.show('Empty not allowed.');
				return;
			}
			
			//check if new
			if(this.isPlantNameInPlantsModel(sPlantName)){
				MessageToast.show('Plant Name already exists.');
				return;
			}
			
			var oModel = this.getOwnerComponent().getModel('plants');
			var aPlants = oModel.getProperty('/PlantsCollection');
			var oNewPlant = {'plant_name': sPlantName,
							 'active': true
			};
			aPlants.push(oNewPlant);  // append at end to preserve change tracking with clone 
			oModel.setProperty('/PlantsCollection', aPlants);
			// activate changes in controls
			oModel.updateBindings();
		},

		onShowSortDialog: function(evt){
			var oSortDialog = this._getFragmentSort();
			oSortDialog.open();
		},
		
		_getFragmentSort: function() {
			// shellbar menu as singleton
			if(!this._oSortDialog){
				this._oSortDialog = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.fragments.MasterSort", this);
				this.getView().addDependent(this._oSortDialog);
			}
			return this._oSortDialog;
		},

		handleSortDialogConfirm: function (evt) {
			var oTable = this.byId("productsTable");
			var	mParams = evt.getParameters();
			var	oBinding = oTable.getBinding("items");
			var	sPath;
			var	bDescending;
			var	aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));

			// apply the selected sort and group settings
			oBinding.sort(aSorters);
		}
	});
}, true);