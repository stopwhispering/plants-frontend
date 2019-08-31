sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/MessageUtil"
], function (BaseController, JSONModel, Controller, ModelsHelper, MessageUtil) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.FlexibleColumnLayout", {
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.attachRouteMatched(this.onRouteMatched, this);
			this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
		},

		onBeforeRouteMatched: function(oEvent) {

			var oModel = this.getOwnerComponent().getModel();
			var sLayout = oEvent.getParameters().arguments.layout;

			// If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
			if (!sLayout) {
				var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(0);
				sLayout = oNextUIState.layout;
			}

			// Update the layout of the FlexibleColumnLayout
			if (sLayout) {
				oModel.setProperty("/layout", sLayout);
			}
		},

		onRouteMatched: function (oEvent) {
			var sRouteName = oEvent.getParameter("name"),
				oArguments = oEvent.getParameter("arguments");

			this._updateUIElements();

			// Save the current route name
			this.currentRouteName = sRouteName;
			this.currentProduct = oArguments.product;
			this.currentSupplier = oArguments.supplier;
		},

		onStateChanged: function (oEvent) {
			var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow"),
				sLayout = oEvent.getParameter("layout");

			this._updateUIElements();

			// Replace the URL with the new layout if a navigation arrow was used
			if (bIsNavigationArrow) {
				this.oRouter.navTo(this.currentRouteName, {layout: sLayout, product: this.currentProduct, supplier: this.currentSupplier}, true);
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
			this.savePlantsAndImages();
		},
		
		onPressButtonRefreshData: function(){
			//refresh data from backend
			
			// check if there are any unsaved changes
			var aModifiedPlants = this.getModifiedPlants();
			var aModifiedImages = this.getModifiedImages();
			
			// if modified data exists, ask for confirmation if all changes should be undone
			if((aModifiedPlants.length !== 0)||(aModifiedImages.length !== 0)){			
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				sap.m.MessageBox.confirm(
					"Revert all changes?", {
						onClose: this.onCloseRefreshConfirmationMessageBox.bind(this),
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
			} else {
				//no modified data, therefore call handler directly with 'OK'
				this.onCloseRefreshConfirmationMessageBox(sap.m.MessageBox.Action.OK);
			}	
		},
		
		onCloseRefreshConfirmationMessageBox: function(oAction){
			//callback for onPressButtonUndo's confirmation dialog
			//revert all changes and return to data since last save or loading of site
			if(oAction===sap.m.MessageBox.Action.OK){
				this.startBusyDialog('Loading...', 'Loading plants and images data');
				
				//instantiating helper with both component and master view
				//the helper therefore updates the plants counter as well
				var oModelsHelper = new ModelsHelper(this.getOwnerComponent(), this.getView());
				oModelsHelper.reloadPlantsFromBackend();
				oModelsHelper.reloadImagesFromBackend();
				// this.reloadPlantsFromBackend();
				// this.reloadImagesFromBackend();
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
			// todo: check files selected
			
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
		
		handleUploadComplete: function(oEvent, a, b){
			var sResponse = oEvent.getParameter("response");
			var sMsg;
			if (sResponse) {
				var iBegin = sResponse.indexOf("\{");
				var iEnd = sResponse.indexOf("\}")+1;
				if (iBegin >= 0 && iEnd >= 0){
					var sResponseText = sResponse.slice(iBegin, iEnd);
					var dResponse = JSON.parse(sResponseText);	
					
					MessageUtil.getInstance().addMessageFromBackend(dResponse.message);
					sMsg = dResponse.message.message;
					// if (dResponse.hasOwnProperty('error')){
					// 	sMsg = dResponse.error;
					// } else if (dResponse.hasOwnProperty('success')){
					// 	sMsg = dResponse.success;
					// } else {
					// 	sMsg = sResponse;
					// }
					
					}
				// else {
				// 	sMsg = sResponse;
				// }

			} else {
				// on localhost it seems above doesn't work
				sMsg = "Upload complete, but can't determine status.";
				MessageUtil.getInstance().addMessage('Warning', sMsg, undefined, undefined);
			}
			
			this.stopBusyDialog();
			sap.m.MessageToast.show(sMsg);
			this._getDialogUploadPhotos().close();
		},
		
		_getDialogUploadPhotos : function() {
			var oView = this.getView();
			// var oDialog = this.getView().byId('dialogUploadPhotosCollection');
			var oDialog = this.getView().byId('dialogUploadPhotos');
			if(!oDialog){
				// oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.UploadPhotosCollection", this);
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.UploadPhotos", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
		},
		
		onRefreshImageMetadata: function(evt){
			$.ajax({
					  url: this.getServiceUrl('/plants_tagger/backend/RefreshPhotoDirectory'),
					  type: 'POST',
					  contentType: "application/json",
					  //data: JSON.stringify(data),
					  context: this
					})
					.done(this.onAjaxSimpleSuccessToast)
					.fail(this.onAjaxFailed);
		},

		onShowUntagged: function(evt){
			//we need the currently selected plant as untagged requires a middle column
			//(button triggering this is only visible if middle column is visible)
			//ex. detail/146/TwoColumnsMidExpanded" --> 146
			//ex. detail/160 --> 160
			var sCurrentHash = this.getOwnerComponent().getRouter().oHashChanger.getHash();
			var aHashItems = sCurrentHash.split('/');
			if(!([2,3].includes(aHashItems.length)) || aHashItems[0] !== 'detail' ){
				sap.m.MessageToast.show('Technical issue with browser hash. Refresh website.');
				return;
			}
			var iPlantIndex = aHashItems[1];

			var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2);
			this.oRouter.navTo("untagged", {layout: oNextUIState.layout, 
											product: iPlantIndex});
		},
		
		onShellBarSearch: function(){
			sap.m.MessageToast.show('Function not implemented, yet.');
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
		
		//todo: button herefore	
		onClearMessages: function(evt){
			//clear messages in message popover fragment
			MessageUtil.getInstance().removeAllMessages();
		}		
		

	});
}, true);