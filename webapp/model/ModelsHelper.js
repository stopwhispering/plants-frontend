sap.ui.define(
	["sap/ui/base/Object",
	"sap/ui/model/json/JSONModel",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast"], 
	
	// factory function
	function(Object,JSONModel, MessageUtil, Util,MessageToast){
		"use strict";
		
		var _instance;

		var services = Object.extend("plants.tagger.ui.model.ModelsHelper",{
			
			constructor: function(component){
				this._component = component;
				//we need to add the event handlers to the jsonmodel here as this is executed only
				//once; if we attach them before calling, they're adding up to one more each time
				this._component.getModel('plants').attachRequestCompleted(this._onReceivingPlantsFromBackend.bind(this));
				this._component.getModel('plants').attachRequestFailed(this.onReceiveErrorGeneric.bind(this,'Plants Model'));
				
				this._component.getModel('taxon').attachRequestCompleted(this._onReceivingTaxaFromBackend.bind(this));
				this._component.getModel('taxon').attachRequestFailed(this.onReceiveErrorGeneric.bind(this,'Taxon Model'));
			  },
			  
			onReceiveErrorGeneric: function(sCaller, error, result, statusText){
				//trying to catch all kinds of error callback returns
				//always declare similar to: .fail(this.ModelsHelper.getInstance()._onReceiveErrorGeneric.bind(thisOrOtherContext,'EventsResource'));
				Util.stopBusyDialog();

				try{
					//fastapi manually thrown exceptions (default)
					MessageUtil.getInstance().addMessageFromBackend(error.responseJSON.detail);
					MessageToast.show(error.responseJSON.detail.type + error.responseJSON.detail.message);
					return;
				} catch (_) {};

				//errors thrown by throw_exception method via flask's abort-method
				if(error && error.hasOwnProperty('responseJSON') && error.responseJSON.hasOwnProperty('message') && typeof(error.responseJSON.message) === "object"){
					MessageUtil.getInstance().addMessageFromBackend(error.responseJSON.message);
					MessageToast.show('Error: ' + error.status + ' ' + error.responseJSON.message.message);
					return;
				}

				// general http error handler			
				//tested for ..
				if (error && error.hasOwnProperty('responseJSON') && typeof(error.responseJSON) === 'string'){
					var sMsg = 'Error: ' + error.status + ' ' + error.responseJSON;
				}
				
				//     - reloadImagesFromBackend (ajax; manually raised)
				else if (error && error.hasOwnProperty('responseJSON') && error.responseJSON && 'error' in error.responseJSON){
					sMsg = 'Error: ' + error.status + ' ' + error.responseJSON['error'];	
	
				//     - reloadPlantsFromBackend(jsonmodel; manually raised)
				} else if (error && error.getParameter && (!!error.getParameter('responseText')) && typeof(JSON.parse(error.getParameter('responseText'))) === 'object'){
					var oParams = error.getParameters();
					sMsg = 'Error: ' + oParams.statusCode + ' ' + JSON.parse(oParams.responseText).error;
				
				// fallback solution for ajax calls (e.g. server stopped working) 
				} else if (!!error.status && !!error.statusText){
					sMsg = 'Error at: ' + sCaller + ' - Status: ' + error.status + ' ' + error.statusText;
				
				// fallback solution for jsonmodel calls (e.g. server stopped working) 
				} else {
					sMsg = 'Error at: ' + sCaller + ' - '+ error.getId();
				}
				
				MessageToast.show(sMsg);
				MessageUtil.getInstance().addMessage('Error', sMsg, undefined, undefined);
			},			  

			_onReceivingPlantsFromBackend: function(oRequestInfo){
				// create new clone objects to track changes
				this._component.oPlantsDataClone = Util.getClonedObject(oRequestInfo.getSource().getData());
				
				//create message
				var sresource = Util.parse_resource_from_url(oRequestInfo.getParameter('url'));
				MessageUtil.getInstance().addMessage('Information', 'Loaded Plants from backend', undefined, 
													 'Resource: ' + sresource);
			},
			
			_onReceivingTaxaFromBackend: function(oRequestInfo){
				// create new clone objects to track changes
				this._component.oTaxonDataClone = Util.getClonedObject(oRequestInfo.getSource().getData());
				
				//create message
				var sresource = Util.parse_resource_from_url(oRequestInfo.getParameter('url'));
				MessageUtil.getInstance().addMessage('Information', 'Loaded Taxa from backend', undefined, 
													 'Resource: ' + sresource);
			},
	
			// _onReceivingImagesFromBackend: function(data, _, infos){
			// 	// create new clone objects to track changes
			// 	this._component.oImagesDataClone = Util.getClonedObject(data);
			// 	this._component.getModel('images').setData(data);
				
			// 	MessageUtil.getInstance().addMessageFromBackend(data.message);
				
			// 	Util.stopBusyDialog();
			// },
		
			reloadPlantsFromBackend: function(){
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/plants/');
				this._component.getModel('plants').loadData(sUrl);
				Util.stopBusyDialog();  // todo: should be stopped only when everything has been reloaded, not only plants
			},

			resetImagesRegistry: function(){
				this._component.imagesRegistry = {};
				this._component.imagesRegistryClone = {};
				this._component.imagesPlantsLoaded = new Set();
				this._component.getModel('images').updateBindings();  //todo required?
				this._component.getModel('untaggedImages').updateBindings();
			},

			addToImagesRegistry: function(aImages){
				// after uploading new images, add them to the  registry
				aImages.forEach(oImage=>{
					var sKey = oImage['path_original'];
					if (!(sKey in this._component.imagesRegistry)){
						this._component.imagesRegistry[sKey] = oImage;
					}
					this._component.imagesRegistryClone[sKey] = Util.getClonedObject(oImage);
				});
			},
			
			// reloadImagesFromBackend: function(){
				//reload images data
				// $.ajax({
				// 	url: Util.getServiceUrl('/plants_tagger/backend/images/'),
				// 	data: {},
				// 	context: this,
				// 	async: true
				// })
				// .done(this._onReceivingImagesFromBackend)
				// .fail(this.onReceiveErrorGeneric.bind(this,'Image (GET)'));
			// },
			
			reloadTaxaFromBackend: function(){
				//reload taxon data
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/taxa/');
				this._component.getModel('taxon').loadData(sUrl);
			},
			
			reloadKeywordProposalsFromBackend: function(){
				// get keywords collection from backend proposals resource
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/proposals/KeywordProposals');
				if (!this._component.getModel('keywords')){
					this._component.setModel(new JSONModel(sUrl), 'keywords');
				} else {
					this._component.getModel('keywords').loadData(sUrl);
				}
			},
			
			reloadTraitCategoryProposalsFromBackend: function(){
				// get trait categories collection from backend proposals resource
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/proposals/TraitCategoryProposals');
				if (!this._component.getModel('trait_categories')){
					this._component.setModel(new JSONModel(sUrl), 'trait_categories');
				} else {
					this._component.getModel('trait_categories').loadData(sUrl);
				}
			},
			
			reloadNurserySourceProposalsFromBackend: function(){
				// get trait categories collection from backend proposals resource
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/proposals/NurserySourceProposals');
				if (!this._component.getModel('nurseries_sources')){
					var oModel = new JSONModel(sUrl);
					oModel.setSizeLimit(50);
					this._component.setModel(oModel, 'nurseries_sources');
				} else {
					this._component.getModel('nurseries_sources').loadData(sUrl);
				}
			},
			
			reloadPropertyNamesFromBackend: function(){
				// get property names with their categories from backend
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/property_names/');
				if (!this._component.getModel('propertyNames')){
					var oModel = new JSONModel(sUrl);
					oModel.setSizeLimit(300);
					this._component.setModel(oModel, 'propertyNames');
				} else {
					this._component.getModel('propertyNames').loadData(sUrl);
				}				
			}
		});
		
	return {
	  	//singleton pattern
	    getInstance: function (component) {
	        if (!_instance) {
	            _instance = new services(component);
	        }
	        return _instance;
	    }
	};
});