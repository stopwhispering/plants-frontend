sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	'plants/tagger/ui/model/formatter',
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label",
	"sap/m/Input",
	"plants/tagger/ui/customClasses/MessageUtil",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, 
Sorter, MessageBox, formatter, Button, Dialog, Label, Input, MessageUtil, MessageToast) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.Master", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			this.createAddDialog(); //todo: lazy loading
		},

		onAfterRendering: function(){
			// we need to update the plants display counter in table title 
			// (when data was loaded, the view was not existing, yet)
			var oTable = this.byId('productsTable');
			oTable.attachUpdateFinished(this.updateTableHeaderPlantsCount.bind(this));
		},
		
		onListItemPress: function (oEvent) {
			// if untagged photos layout is open (third column in 3-col-layout), don't change the layout,
			// otherwise switch to 2-col-layout
			if (this.getOwnerComponent().getHelper().getCurrentUIState().layout !== "OneColumn"){
				var oNextUIState = this.getOwnerComponent().getHelper().getCurrentUIState();	
			} else {
				oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1);
			}
			
			// get selected plant
			var	sPlantPath = oEvent.getSource().getBindingContext("plants").getPath();
			// "/PlantsCollection/71" --> "71"
			var	product = sPlantPath.split("/").slice(-1).pop();
			
			// use detail (mid-col) route
			this.oRouter.navTo("detail", {layout: oNextUIState.layout, product: product});
		},
		
		onSearch: function (oEvent) {
			var sQuery = oEvent.getParameter("query");
			
			//check for  filter on active plants
			var oTableFilterState = [];
			var aActiveFilters = this.getView().byId("productsTable").getBindingInfo('items').binding.aApplicationFilters;
			
			//find out whether we already have a filter on active plants
			for (var i = 0; i < aActiveFilters.length; i++) {
			    if (aActiveFilters[i]['sPath'] === "active")
			    	//remember to delete current active-filter
			    	var oFilterActive = aActiveFilters[i];
			}
			
			if(oFilterActive){
				//add filter on active plants
				oTableFilterState.push(oFilterActive);
			}

			//add (new) plant_name filter
			oTableFilterState.push(new Filter("plant_name", FilterOperator.Contains, sQuery));

			//update the aggregation binding's filter
			this.getView().byId("productsTable").getBinding("items").filter(oTableFilterState, "Application");

			// update count in table header
			this.updateTableHeaderPlantsCount();
		},
		
		onFilterActive: function(evt){
			var oTableFilterState = [];
			var aActiveFilters = this.getView().byId("productsTable").getBindingInfo('items').binding.aApplicationFilters;
			
			//find out whether we already have a filter on active or on plant_name
			for (var i = 0; i < aActiveFilters.length; i++) {
			    if(aActiveFilters[i]['sPath'] === "plant_name"){
			    	//remember plant_name filter
			    	var oFilterPlantName = aActiveFilters[i];
			    } else if (aActiveFilters[i]['sPath'] === "active")
			    	//remember to delete current active-filter
			    	var oFilterActive = aActiveFilters[i];
			}
			
			if(oFilterActive === undefined){
				//add filter on active plants
				oTableFilterState.push(new Filter("active", FilterOperator.EQ, true));
				this.getView().byId('btnToggleHideInactive').setType('Transparent');
			} else {
				this.getView().byId('btnToggleHideInactive').setType('Emphasized');
			}

			if(oFilterPlantName){
				oTableFilterState.push(oFilterPlantName);
			}

			//update the aggregation binding's filter
			this.getView().byId("productsTable").getBinding("items").filter(oTableFilterState, "Application");
			
			// update count in table header
			this.updateTableHeaderPlantsCount();
		},

		onAdd: function (oEvent) {
			//show the add dialog created during init
			sap.ui.getCore().byId("dialogAdd").open();
		},
		
		createAddDialog: function(){
			// todo: lazy load
			//creates (not shows) add dialog
			//(called by init)
			//(will later be identified by id)
			var oButtonSave = new Button({
			                    text: "Save",
			                   press: [ this.onAddSaveButton, this ]
			             });
             var oButtonCancel = new Button({
                    text: "Cancel",
                    press: [ this.onAddCancelButton, this ]
             });

			var _ = new Dialog("dialogAdd",{
                    title:"Details of New Entry",
                    // modal: true,
                    contentWidth:"1em",
                    buttons: [ oButtonSave, oButtonCancel ],
            		content: [
                      new Label({text:"Plant Name",
                      				   labelFor:"inputCreateNewPlantName"
                      }),
                      new Input({
	                    maxLength: 40,
	                    id: "inputCreateNewPlantName"
                      })
                      ]
             });	
		},
		
		onAddCancelButton: function(evt){
			sap.ui.getCore().byId('dialogAdd').close();
		},
		
		onAddSaveButton: function(evt){
			var sPlantName = sap.ui.getCore().byId("inputCreateNewPlantName").getValue();
			sap.ui.getCore().byId('dialogAdd').close();
			
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