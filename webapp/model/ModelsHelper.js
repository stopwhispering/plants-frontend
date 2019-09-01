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
				this._component.getModel('plants').attachRequestFailed(this._onReceiveError);  //ajax params okay? 
			  },			

			_onReceiveError: function(error, result, statusText){
				// general http error handler			
				//tested for ..
				if (error && error.hasOwnProperty('responseJSON') && typeof(error.responseJSON) === 'string'){
					var sMsg = 'Error: ' + error.status + ' ' + error.responseJSON;
				}
				
				//     - reloadImagesFromBackend (ajax; manually raised)
				else if (error && error.hasOwnProperty('responseJSON') && error.responseJSON && 'error' in error.responseJSON){
					sMsg = 'Error: ' + error.status + ' ' + error.responseJSON['error'];	
	
				//     - reloadPlantsFromBackend(jsonmodel; manually raised)
				} else if (error && error.getParameter && typeof(JSON.parse(error.getParameter('responseText'))) === 'object'){
					var oParams = error.getParameters();
					sMsg = 'Error: ' + oParams.statusCode + ' ' + JSON.parse(oParams.responseText).error;
				
				} else {
					sMsg = 'Error: ' + error.status + ' ' + error.statusText;
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
	
			_onReceivingImagesFromBackend: function(data, _, infos){
				// create new clone objects to track changes
				this._component.oImagesDataClone = Util.getClonedObject(data);
				this._component.getModel('images').setData(data);
				
				MessageUtil.getInstance().addMessageFromBackend(data.message);
				
				Util.stopBusyDialog();  //todo: only stop when plants are loaded too; maybe with a promise obj
			},
		
			reloadPlantsFromBackend: function(){
				var sUrl = Util.getServiceUrl('/plants_tagger/backend/Plant');
				this._component.getModel('plants').loadData(sUrl);
			},
			
			reloadImagesFromBackend: function(){
				//reload images data
				$.ajax({
					url: Util.getServiceUrl('/plants_tagger/backend/Image2'),
					data: {},
					context: this,
					async: true
				})
				.done(this._onReceivingImagesFromBackend)
				.fail(this._onReceiveError);		
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