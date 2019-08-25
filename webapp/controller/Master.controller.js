sap.ui.define([
	"plants/tagger/ui/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	'plants/tagger/ui/model/formatter'
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, Sorter, MessageBox, formatter) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.Master", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			this.createAddDialog();
		},
		
		onAfterRendering: function(){
			// set number of displayed plants in table title
			this.updateTableHeaderPlantsCount();	
		},
		
		onPressButtonSave: function(){
			this.savePlantsAndImages();
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
			}

			if(oFilterPlantName){
				oTableFilterState.push(oFilterPlantName);
			}

			//update the aggregation binding's filter
			this.getView().byId("productsTable").getBinding("items").filter(oTableFilterState, "Application");
			
			// update count in table header
			this.updateTableHeaderPlantsCount();
		},

		updateTableHeaderPlantsCount: function(){
			// update count in table header
			var iPlants = this.getView().byId("productsTable").getBinding("items").getLength();
			var sTitle = "Plants (" + iPlants + ")";
			this.getView().byId("pageHeadingTitle").setText(sTitle);
		},
		
		onOpenFragmentUploadPhotos: function(oEvent){
			var oDialog = this._getDialogUploadPhotos();
			oDialog.open();
		},
		
		closeDialogUploadPhotos: function() {
            this._getDialogUploadPhotos().close();
		},
		
		uploadPhotosToServer: function(evt){
			//triggered by upload-button in fragment after selecting files
			
			// todo: check files selected
			var a = 1;
			
			var oFileUploader = this.byId("idPhotoUpload");
			if (!oFileUploader.getValue()) {
				sap.m.MessageToast.show("Choose a file first");
				return;
			}
			this.startBusyDialog('Uploading...', 'Image File(s)');
			// set upload url here and not statically to use be able to use service url
			// todo: implement service url function
			// var sUrl = this.getServiceUrl("/guys/backend/Photo");
			var sUrl = this.getServiceUrl('/plants_tagger/backend/Image');
			// var sUrl = 'http://127.0.0.1:5000/plants_tagger/backend/Image';  //automatically POST
			oFileUploader.setUploadUrl(sUrl);			
			oFileUploader.upload();
		},
		
		handleTypeMissmatch: function(oEvent) {
			var aFileTypes = oEvent.getSource().getFileType();
			jQuery.each(aFileTypes, function(key, value) {aFileTypes[key] = "*." +  value;});
			var sSupportedFileTypes = aFileTypes.join(", ");
			sap.m.MessageToast.show("The file type *." + oEvent.getParameter("fileType") +
									" is not supported. Choose one of the following types: " +
									sSupportedFileTypes);
		},
		
		handleUploadComplete: function(oEvent){
			var sResponse = oEvent.getParameter("response");
			var sMsg;
			if (sResponse) {
				var iBegin = sResponse.indexOf("\{");
				var iEnd = sResponse.indexOf("\}")+1;
				if (iBegin >= 0 && iEnd >= 0){
					var sResponseText = sResponse.slice(iBegin, iEnd);
					var dResponse = JSON.parse(sResponseText);	
					if (dResponse.hasOwnProperty('error')){
						sMsg = dResponse.error;
					} else if (dResponse.hasOwnProperty('success')){
						sMsg = dResponse.success;
					} else {
						sMsg = sResponse;
					}
					}
				else {
					sMsg = sResponse;
				}

			} else {
				// on localhost it seems above doesn't work
				this.stopBusyDialog();
				sMsg = "Upload complete, but can't determine status.";
			}
			
			this.stopBusyDialog();
			sap.m.MessageToast.show(sMsg);
			this._getDialogUploadPhotos().close();
		},
		
		_getDialogUploadPhotos : function() {
			var oView = this.getView();
			var oDialog = this.getView().byId('dialogUploadPhotos');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.UploadPhotos", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
		},

		onAdd: function (oEvent) {
			//show the add dialog created during init
			sap.ui.getCore().byId("dialogAdd").open();
		},
		
		createAddDialog: function(){
			//creates (not shows) add dialog
			//(called by init)
			//(will later be identified by id)
			var oButtonSave = new sap.m.Button("Save", {
			                    text: "Save",
			                   tap: [ this.onAddSaveButton, this ]
			             });
             var oButtonCancel = new sap.m.Button("Cancel", {
                    text: "Cancel",
                    tap: [ this.onAddCancelButton, this ]
             });

			var oDialog = new sap.m.Dialog("dialogAdd",{
                    title:"Details of New Entry",
                    // modal: true,
                    contentWidth:"1em",
                    buttons: [ oButtonSave, oButtonCancel ],
             content:[
                      new sap.m.Label({text:"Plant Name"}),
                      new sap.m.Input({
	                    maxLength: 40,
	                    id: "inputNewPlantName"
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