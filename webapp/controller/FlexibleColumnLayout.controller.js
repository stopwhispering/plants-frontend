sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/MessageUtil",
	'plants/tagger/ui/model/formatter',
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/Token",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"plants/tagger/ui/customClasses/Navigation"
], function (BaseController, JSONModel, Controller, ModelsHelper, MessageUtil, formatter, 
			MessageToast, MessageBox, Util, Token, Filter, FilterOperator, Navigation) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.FlexibleColumnLayout", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
			this.oRouter.attachRouteMatched(this.onRouteMatched, this);
			this.oSearchField = this.byId("searchField");
		},

		onBeforeRouteMatched: function(oEvent) {
			// called each time any route is triggered, i.e. each time one of the views change
			// updates the layout model: inserts the new layout into it
			var oLayoutModel = this.getOwnerComponent().getModel();
			var sLayout = oEvent.getParameters().arguments.layout;

			// If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
			if (!sLayout) {
				var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(0);
				sLayout = oNextUIState.layout;
			}

			// Update the layout of the FlexibleColumnLayout
			if (sLayout) {
				oLayoutModel.setProperty("/layout", sLayout);
			}
		},

		onRouteMatched: function (oEvent) {
			var sRouteName = oEvent.getParameter("name"),
				oArguments = oEvent.getParameter("arguments");

			this._updateUIElements();

			// Save the current route name
			this.currentRouteName = sRouteName;
			this.currentPlant = oArguments.product;
		},

		onStateChanged: function (oEvent) {
			var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow"),
				sLayout = oEvent.getParameter("layout");

			this._updateUIElements();

			// Replace the URL with the new layout if a navigation arrow was used
			if (bIsNavigationArrow) {
				this.oRouter.navTo(this.currentRouteName, {layout: sLayout, product: this.currentPlant}, true);
			}
		},

		// Update the close/fullscreen buttons visibility
		_updateUIElements: function () {
			var oModel = this.getOwnerComponent().getModel();
			var oUIState = this.getOwnerComponent().getHelper().getCurrentUIState();
			if(oModel){
				oModel.setData(oUIState);	
			}
			
		},

		onExit: function () {
			this.oRouter.detachRouteMatched(this.onRouteMatched, this);
			this.oRouter.detachBeforeRouteMatched(this.onBeforeRouteMatched, this);
		},
		
		onShellBarMenuButtonPressed: function(evt){
			var oMenuDialog = this._getFragmentShellBarMenu();
			oMenuDialog.openBy(evt.getSource());
		},
		
		_getFragmentShellBarMenu: function() {
			// shellbar menu as singleton
			if(!this._oMenuDialog){
				this._oMenuDialog = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.fragments.ShellBarMenu", this);
				this.getView().addDependent(this._oMenuDialog);
			}
			return this._oMenuDialog;
		},
		
		onPressButtonSave: function(){
			this.savePlantsAndImages();  // implemented in BaseController
		},
		
		onPressButtonRefreshData: function(){
			//refresh data from backend
			
			// check if there are any unsaved changes
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			var aModifiedTaxa = this.getModifiedTaxa();
			
			// if modified data exists, ask for confirmation if all changes should be undone
			if((aModifiedPlants.length !== 0)||(aModifiedImages.length !== 0)||(aModifiedTaxa.length !== 0)){			
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.confirm(
					"Revert all changes?", {
						onClose: this.onCloseRefreshConfirmationMessageBox.bind(this),
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			} else {
				//no modified data, therefore call handler directly with 'OK'
				this.onCloseRefreshConfirmationMessageBox(MessageBox.Action.OK);
			}	
		},
		
		onCloseRefreshConfirmationMessageBox: function(oAction){
			//callback for onPressButtonUndo's confirmation dialog
			//revert all changes and return to data since last save or loading of site
			if(oAction===MessageBox.Action.OK){
				Util.startBusyDialog('Loading...', 'Loading plants and images data');
				
				var oModelsHelper = ModelsHelper.getInstance();
				oModelsHelper.reloadPlantsFromBackend();
				oModelsHelper.reloadImagesFromBackend();
				oModelsHelper.reloadTaxaFromBackend();
			}
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
			var oFileUploader = this.byId("idPhotoUpload");
			if (!oFileUploader.getValue()) {
				MessageToast.show("Choose a file first");
				return;
			}
			Util.startBusyDialog('Uploading...', 'Image File(s)');
			var sUrl = Util.getServiceUrl('/plants_tagger/backend/Image');
			oFileUploader.setUploadUrl(sUrl);
			
			// the images may be tagged with plants already upon uploading
			var aSelectedTokens = this.byId('multiInputUploadImagePlants').getTokens();
			var aSelectedPlants = [];
			if(aSelectedTokens.length > 0){
				for (var i = 0; i < aSelectedTokens.length; i++) { 
						aSelectedPlants.push(aSelectedTokens[i].getProperty('key'));
					}
			} else {
				// oFileUploader.setAdditionalData(); //from earlier uploads
			}
			
			// same applies to tagging with keywords
			var aSelectedKeywordTokens = this.byId('multiInputUploadImageKeywords').getTokens();
			var aSelectedKeywords = [];
			if(aSelectedKeywordTokens.length > 0){
				for (i = 0; i < aSelectedKeywordTokens.length; i++) { 
						aSelectedKeywords.push(aSelectedKeywordTokens[i].getProperty('key'));
					}
			} else {
				// oFileUploader.setAdditionalData(); //from earlier uploads
			}
			
			var dictAdditionalData = {'plants': aSelectedPlants,
								      'keywords': aSelectedKeywords};
			// set even if empty (may be filled from earlier run)
			//the file uploader control can only send strings
			oFileUploader.setAdditionalData(JSON.stringify(dictAdditionalData));

			oFileUploader.upload();
		},
		
		handleTypeMissmatch: function(oEvent) {
			var aFileTypes = oEvent.getSource().getFileType();
			jQuery.each(aFileTypes, function(key, value) {aFileTypes[key] = "*." +  value;});
			var sSupportedFileTypes = aFileTypes.join(", ");
			MessageToast.show("The file type *." + oEvent.getParameter("fileType") +
									" is not supported. Choose one of the following types: " +
									sSupportedFileTypes);
		},
		
		handleUploadComplete: function(oEvent, a, b){
			var sResponse = oEvent.getParameter("response");
			var sMsg;
			if (sResponse) {
				var iBegin = sResponse.indexOf("\{");
				var iEnd = sResponse.lastIndexOf("\}")+1;
				if (iBegin >= 0 && iEnd >= 0){
					var sResponseText = sResponse.slice(iBegin, iEnd);
					var dResponse = JSON.parse(sResponseText);	
					
					MessageUtil.getInstance().addMessageFromBackend(dResponse.message);
					sMsg = dResponse.message.message;
				}
			}
			
			if(!sMsg){
				// on localhost it seems above doesn't work
				sMsg = "Upload complete, but can't determine status.";
				MessageUtil.getInstance().addMessage('Warning', sMsg, undefined, undefined);
			}
			
			Util.stopBusyDialog();
			MessageToast.show(sMsg);
			this._getDialogUploadPhotos().close();
		},
		
		_getDialogUploadPhotos : function() {
			var oView = this.getView();
			var oDialog = this.getView().byId('dialogUploadPhotos');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.UploadPhotos", this);
				oView.addDependent(oDialog);
				var oMultiInputKeywords = this.byId('multiInputUploadImageKeywords');
				oMultiInputKeywords.addValidator(function(args){
					var text = args.text;
					return new Token({key: text, text: text});
				});
			}
			return oDialog;
		},
		
		onRefreshImageMetadata: function(evt){
			$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/RefreshPhotoDirectory'),
					  type: 'POST',
					  contentType: "application/json",
					  context: this
					})
					.done(this.onAjaxSimpleSuccess)
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'RefreshPhotoDirectory (POST)'));
		},

		onShowUntagged: function(evt){
			//we need the currently selected plant as untagged requires a middle column
			//(button triggering this is only visible if middle column is visible)
			//ex. detail/146/TwoColumnsMidExpanded" --> 146
			//ex. detail/160 --> 160
			var sCurrentHash = this.getOwnerComponent().getRouter().oHashChanger.getHash();
			var aHashItems = sCurrentHash.split('/');
			if(!([2,3].includes(aHashItems.length)) || aHashItems[0] !== 'detail' ){
				MessageToast.show('Technical issue with browser hash. Refresh website.');
				return;
			}
			var iPlantIndex = aHashItems[1];

			var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2);
			this.oRouter.navTo("untagged", {layout: oNextUIState.layout, 
											product: iPlantIndex});
		},
		
		onShellBarSearch: function(oEvent){
			// get selected plant (position in our model which is not equal to the plant id)
			var	sPlantPath = oEvent.getParameter('suggestionItem').getBindingContext('plants').getPath();
			var	iPlant = sPlantPath.split("/").slice(-1).pop();
			Navigation.navToPlantDetails.call(this, iPlant);
		},
		
		// onShellBarLiveChange: function(oEvent){
		// 	// pass
		// },
		
		onShellBarSuggest: function(oEvent){
			var sValue = oEvent.getParameter("suggestValue"),
				aFilters = [];
			
			// we always filter on only active plants for search field
			var oFilter = new Filter("active", FilterOperator.EQ, true);
			
			// create or-connected filter for multiple fields based on query value
			if (sValue) {
				aFilters = [
					new Filter([
						new Filter("plant_name", function (sText) {
							return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
						}),
						new Filter("botanical_name", function (sText) {
							return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
						}),
						new Filter("id", FilterOperator.EQ, sValue)
					])
				];
				
				// // id is an integer, the query value a string, thus we can use neither regular EQ filter nor the function from above
				// var iNumber = parseInt(sValue);
				// if(!isNaN(iNumber)){
				// 	aFilters.push()
				// }
				
				var oOrFilter = new Filter({filters: aFilters,
											and: false});
				// connect via <<and>>
				oFilter = new Filter({filters: [oFilter, oOrFilter],
												and: true});
			}

			this.oSearchField.getBinding("suggestionItems").filter(oFilter);
			this.oSearchField.suggest();
		},
		
		onShellBarNotificationsPressed: function(evt){
			// open messages popover fragment, called by shellbar button in footer
		    var oFragment = this._getMessagePopover(); 
	    	if(!oFragment.isOpen()){
	    		oFragment.openBy(evt.getSource());	
	    	} else {
	    		oFragment.close();
	    	}
		} ,
		
		_getMessagePopover: function(){
		    //create popover lazily (singleton)
		    if (!this._oMessagePopover){
		        this._oMessagePopover = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.fragments.MessagePopover", this);
		        this.getView().addDependent(this._oMessagePopover); 
		    }
		    return this._oMessagePopover;
		},
		
		onClearMessages: function(evt){
			//clear messages in message popover fragment
			MessageUtil.getInstance().removeAllMessages();
		},
		
		onHomeIconPressed: function(evt){
			// go to home site, i.e. master view in single column layout
			var oHelper = this.getOwnerComponent().getHelper();
			var sNextLayoutType = oHelper.getDefaultLayouts().defaultLayoutType;
			this.oRouter.navTo("master", {layout: sNextLayoutType});
		}
		
	});
}, true);