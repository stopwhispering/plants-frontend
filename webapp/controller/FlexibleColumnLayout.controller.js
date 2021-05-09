sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
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
], function (BaseController, ModelsHelper, MessageUtil, formatter, 
			MessageToast, MessageBox, Util, Token, Filter, FilterOperator, Navigation) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.FlexibleColumnLayout", {
		formatter: formatter,
		onInit: function () {
			this._oRouter = this.getOwnerComponent().getRouter();
			this._oRouter.attachBeforeRouteMatched(this._onBeforeRouteMatched, this);
			this._oRouter.attachRouteMatched(this._onRouteMatched, this);
			this._oSearchField = this.byId("searchField");
			this._currentPlantId = null;
		},

		_onBeforeRouteMatched: function(oEvent) {
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

		_onRouteMatched: function (oEvent) {
			var sRouteName = oEvent.getParameter("name"),
				oArguments = oEvent.getParameter("arguments");

			this._updateUIElements();

			// Save the current route name
			this.currentRouteName = sRouteName;
			// this.currentPlant = oArguments.product;
			this._currentPlantId = oArguments.plant_id;
		},

		onStateChanged: function (oEvent) {
			var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow"),
				sLayout = oEvent.getParameter("layout");

			this._updateUIElements();

			// Replace the URL with the new layout if a navigation arrow was used
			if (bIsNavigationArrow) {
				this._oRouter.navTo(this.currentRouteName, {layout: sLayout, plant_id: this._currentPlantId}, true);
			}
		},

		_updateUIElements: function () {
			// Update the close/fullscreen buttons visibility
			var oModel = this.getOwnerComponent().getModel();
			var oUIState = this.getOwnerComponent().getHelper().getCurrentUIState();
			if(oModel){
				oModel.setData(oUIState);	
			}
			
		},

		onExit: function () {
			this._oRouter.detachRouteMatched(this._onRouteMatched, this);
			this._oRouter.detachBeforeRouteMatched(this._onBeforeRouteMatched, this);
		},
		
		onShellBarMenuButtonPressed: function(evt){
			var oSource = evt.getSource();
			this.applyToFragment('menuShellBarMenu', (o)=>{
				o.openBy(oSource);
			});
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
				Util.startBusyDialog('Loading...', 'Loading plants, taxa, and images');
				
				var oModelsHelper = ModelsHelper.getInstance();
				oModelsHelper.reloadPlantsFromBackend();
				// oModelsHelper.reloadImagesFromBackend();
				oModelsHelper.resetImagesRegistry();
				// todo: reload current plant's images
				oModelsHelper.reloadTaxaFromBackend();
			}
		},
		
		onOpenFragmentUploadPhotos: function(oEvent){
			this.applyToFragment('dialogUploadPhotos', 
				(o)=>o.open(),
				(o)=>{
				// executed only once
				var oMultiInputKeywords = this.byId('multiInputUploadImageKeywords');
				oMultiInputKeywords.addValidator(function(args){
					var text = args.text;
					return new Token({key: text, text: text});
				});	
			});
		},
		
		uploadPhotosToServer: function(evt){
			//triggered by upload-button in fragment after selecting files
			var oFileUploader = this.byId("idPhotoUpload");
			if (!oFileUploader.getValue()) {
				MessageToast.show("Choose a file first");
				return;
			}
			Util.startBusyDialog('Uploading...', 'Image File(s)');
			var sUrl = Util.getServiceUrl('/plants_tagger/backend/images/');
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
		
		handleUploadComplete: function(evt){
			// handle message, show error if required
			var oResponse = JSON.parse(evt.getParameter('responseRaw'));
			if(!oResponse){
				sMsg = "Upload complete, but can't determine status.";
				MessageUtil.getInstance().addMessage('Warning', sMsg, undefined, undefined);
			}
			MessageUtil.getInstance().addMessageFromBackend(oResponse.message);
			
			// add to images registry and refresh current plant's images
			if(oResponse.images.length > 0){
				ModelsHelper.getInstance().addToImagesRegistry(oResponse.images);
				
				// plant's images model and untagged images model might need to be refreshed
				this.resetImagesCurrentPlant(this.currentPlantId);
				this.getOwnerComponent().getModel('images').updateBindings();
				
				this.resetUntaggedPhotos();
				this.getOwnerComponent().getModel('untaggedImages').updateBindings();
			}
			
			Util.stopBusyDialog();
			MessageToast.show(oResponse.message.message);
			this.applyToFragment('dialogUploadPhotos', (o)=>o.close());
		},

		onIconPressAssignDetailsPlant: function(evt){
			// triggered by assign-to-current-plant button in image upload dialog
			// add current plant to plants multicombobox
			var oModel = this.getOwnerComponent().getModel('plants');
			if (!this._currentPlantId){
				return;
			}
			var sPlantName = oModel.getProperty('/PlantsCollection')[this.currentPlant].plant_name;
			
			// add to multicombobox if not a duplicate
			var oControl = this.byId('multiInputUploadImagePlants'); 
			if (!oControl.getTokens().find(ele=>ele.getProperty('key') == sPlantName)){
				var oPlantToken = new Token({key: sPlantName, text: sPlantName});
				oControl.addToken(oPlantToken);
			}
		},
		
		onRefreshImageMetadata: function(evt){
			$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/functions/refresh_photo_directory'),
					  type: 'POST',
					  contentType: "application/json",
					  context: this
					})
					.done(this.onAjaxSimpleSuccess)
					.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'functions/refresh_photo_directory (POST)'));
		},

		onShowUntagged: function(evt){
			//we need the currently selected plant as untagged requires a middle column
			//(button triggering this is only visible if middle column is visible)
			//ex. detail/146/TwoColumnsMidExpanded" --> 146
			//ex. detail/160 --> 160
			// var sCurrentHash = this.getOwnerComponent().getRouter().oHashChanger.getHash();
			// var aHashItems = sCurrentHash.split('/');
			// if(!([2,3].includes(aHashItems.length)) || aHashItems[0] !== 'detail' ){
			// 	MessageToast.show('Technical issue with browser hash. Refresh website.');
			// 	return;
			// }
			// var iPlantIndex = aHashItems[1];

			var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2);
			// this._oRouter.navTo("untagged", {layout: oNextUIState.layout, 
			// 								product: iPlantIndex});
											
			this._oRouter.navTo("untagged", {layout: oNextUIState.layout, 
											plant_id: this._currentPlantId});
		},
		
		onShellBarSearch: function(oEvent){
			// navigate to selected plant
			var plantId = oEvent.getParameter('suggestionItem').getBindingContext('plants').getObject().id;
			Navigation.navToPlantDetails.call(this, plantId);
		},
		
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
				
				var oOrFilter = new Filter({filters: aFilters,
											and: false});
				// connect via <<and>>
				oFilter = new Filter({filters: [oFilter, oOrFilter],
												and: true});
			}

			this._oSearchField.getBinding("suggestionItems").filter(oFilter);
			this._oSearchField.suggest();
		},
		
		onShellBarNotificationsPressed: function(evt){
			// open messages popover fragment, called by shellbar button in footer
			var oSource = evt.getSource();
			this.applyToFragment('MessagePopover', (o)=>{
				o.isOpen() ?  o.close() : o.openBy(oSource);
			});
		} ,

		onClearMessages: function(evt){
			//clear messages in message popover fragment
			MessageUtil.getInstance().removeAllMessages();
		},
		
		onHomeIconPressed: function(evt){
			// go to home site, i.e. master view in single column layout
			var oHelper = this.getOwnerComponent().getHelper();
			var sNextLayoutType = oHelper.getDefaultLayouts().defaultLayoutType;
			this._oRouter.navTo("master", {layout: sNextLayoutType});
		}
		
	});
}, true);