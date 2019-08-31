sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	'plants/tagger/ui/model/formatter',
	"plants/tagger/ui/model/ModelsHelper",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label",
	"sap/m/Input",
	"plants/tagger/ui/customClasses/MessageUtil"
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, 
Sorter, MessageBox, formatter, ModelsHelper, Button, Dialog, Label, Input, MessageUtil) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.Master", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			this.createAddDialog();
			
			// this.onAddMessage(sap.ui.core.MessageType.Success);  //todo remove
			// this.onAddMessage(sap.ui.core.MessageType.Error);  //todo remove
		},


		// onAddMessage: function(sType){  //todo remove
		//     var oMessage = new sap.ui.core.message.Message({
		//         message: "My new message",
		//         type: sType,
		//         description: 'Some details (optional)',
		//         activeTitle: false
		//     });
		//     sap.ui.getCore().getMessageManager().addMessages(oMessage);
		// },
		
		onAfterRendering: function(){
			// we need to update the plants display counter in table title 
			// (when data was loaded, the view was not existing, yet)
			var oTable = this.byId('productsTable');
			//todo: vermutlich macht das alle anderen calls von updateTa... unnötig
			oTable.attachUpdateFinished(this.updateTableHeaderPlantsCount.bind(this));
		},
		
		// onPressButtonSave: function(){
		// 	this.savePlantsAndImages();
		// },
		
		// onPressButtonRefreshData: function(){
		// 	//refresh data from backend
			
		// 	// check if there are any unsaved changes
		// 	var aModifiedPlants = this.getModifiedPlants();
		// 	var aModifiedImages = this.getModifiedImages();
			
		// 	// if modified data exists, ask for confirmation if all changes should be undone
		// 	if((aModifiedPlants.length !== 0)||(aModifiedImages.length !== 0)){			
		// 		var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
		// 		sap.m.MessageBox.confirm(
		// 			"Revert all changes?", {
		// 				onClose: this.onCloseRefreshConfirmationMessageBox.bind(this),
		// 				styleClass: bCompact ? "sapUiSizeCompact" : ""
		// 			}
		// 		);
		// 	} else {
		// 		//no modified data, therefore call handler directly with 'OK'
		// 		this.onCloseRefreshConfirmationMessageBox(sap.m.MessageBox.Action.OK);
		// 	}	
		// },
		
		// onCloseRefreshConfirmationMessageBox: function(oAction){
		// 	//callback for onPressButtonUndo's confirmation dialog
		// 	//revert all changes and return to data since last save or loading of site
		// 	if(oAction===sap.m.MessageBox.Action.OK){
		// 		this.startBusyDialog('Loading...', 'Loading plants and images data');
				
		// 		//instantiating helper with both component and master view
		// 		//the helper therefore updates the plants counter as well
		// 		var oModelsHelper = new ModelsHelper(this.getOwnerComponent(), this.getView());
		// 		oModelsHelper.reloadPlantsFromBackend();
		// 		oModelsHelper.reloadImagesFromBackend();
		// 		// this.reloadPlantsFromBackend();
		// 		// this.reloadImagesFromBackend();
		// 	}
		// },
		
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
			// var oActiveFilterInfo = this.getView().byId("productsTable").getBinding("items").getFilterInfo();
			var aActiveFilters = this.getView().byId("productsTable").getBindingInfo('items').binding.aApplicationFilters;
			
			//if(aActiveFilters.length && oActiveFilters[0]["sPath"] === "plant_name")
				//add active-filter to plant_name-filter

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
			//var oActiveFilterInfo = this.getView().byId("productsTable").getBinding("items").getFilterInfo();
			var aActiveFilters = this.getView().byId("productsTable").getBindingInfo('items').binding.aApplicationFilters;
			
			//if(aActiveFilters.length && oActiveFilters[0]["sPath"] === "plant_name")
				//add active-filter to plant_name-filter

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
			//creates (not shows) add dialog
			//(called by init)
			//(will later be identified by id)
			var oButtonSave = new Button("Save", {
			                    text: "Save",
			                   press: [ this.onAddSaveButton, this ]
			             });
             var oButtonCancel = new Button("Cancel", {
                    text: "Cancel",
                    press: [ this.onAddCancelButton, this ]
             });

			var oDialog = new Dialog("dialogAdd",{
                    title:"Details of New Entry",
                    // modal: true,
                    contentWidth:"1em",
                    buttons: [ oButtonSave, oButtonCancel ],
             content:[
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
			var sPlantName = sap.ui.getCore().byId("inputNewPlantName").getValue();
			sap.ui.getCore().byId('dialogAdd').close();
			
			//check and not empty
			if (sPlantName === ''){
				sap.m.MessageToast.show('Empty not allowed.');
				return;
			}
			
			//check if new
			if(this.isPlantNameInPlantsModel(sPlantName)){
				sap.m.MessageToast.show('Plant Name already exists.');
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

		onSort: function (oEvent) {
			// this._bDescendingSort = !this._bDescendingSort;
			// var oView = this.getView(),
			// 	oTable = oView.byId("productsTable"),
			// 	oBinding = oTable.getBinding("items"),
			// 	oSorter = new Sorter("Name", this._bDescendingSort);

			// oBinding.sort(oSorter);
			
			MessageBox.show("This functionality is not ready yet.", {
				icon: MessageBox.Icon.INFORMATION,
				title: "Aw, Snap!",
				actions: [MessageBox.Action.OK]
			});
		}
	});
}, true);