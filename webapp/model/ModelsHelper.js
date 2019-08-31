sap.ui.define(
	
	// requirements
	["sap/ui/model/json/JSONModel",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/customClasses/Util"], 
	
	// factory function
	function(JSONModel, MessageUtil, Util){
		"use strict";
	
		// create new class and constructor
		var ModelsHelper = function(component, view) {
			//instantiated in component w/o a view and in view with both
			   this.oComponent = component;
			   this.oView = view;
			};
		
		//todo: remove busy dialog function either here or in base controller if possible
		var _startBusyDialog = function(title, text){
			// console.log("Starting: "+title+" / " + text);
			var busyDialog4 = (sap.ui.getCore().byId("busy4")) ? sap.ui.getCore().byId("busy4") : new sap.m.BusyDialog('busy4',{text:text, title: title});
			busyDialog4.setBusyIndicatorDelay(0);
			busyDialog4.open();
		};
		
		var _stopBusyDialog = function(){
			var busyDialog4 = sap.ui.getCore().byId("busy4");
			if (busyDialog4){
				busyDialog4.close();
			}
		};
		
		var _getServiceUrl = function(sUrl){
				if ((window.location.hostname === "localhost") || (window.location.hostname === "127.0.0.1")){
					return "http://localhost:5000"+sUrl;  // no proxy servlet in web ide
					// return "proxy" + sUrl;
				} else {
					return sUrl;
				}
			};
			
		var _onReceiveError = function(error, result, statusText){
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
			
			sap.m.MessageToast.show(sMsg);
			MessageUtil.getInstance().addMessage('Error', sMsg, undefined, undefined);
		};
		
		var _onReceivingPlantsFromBackend = function(oRequestInfo){
			// create new clone objects to track changes
			this.oComponent.oPlantsDataClone = this.oComponent.getClonedObject(oRequestInfo.getSource().getData());
			
			//create message
			var sresource = Util.parse_resource_from_url(oRequestInfo.getParameter('url'));
			MessageUtil.getInstance().addMessage('Information', 'Loaded Plants from backend', undefined, 
												 'Resource: ' + sresource);
		};

		var _onReceivingImagesFromBackend = function(data, _, infos){
			// create new clone objects to track changes
			this.oComponent.oImagesDataClone = this.oComponent.getClonedObject(data);
			this.oComponent.getModel('images').setData(data);
			
			MessageUtil.getInstance().addMessageFromBackend(data.message);
			
			_stopBusyDialog();  //todo: only stop when plants are loaded too
		};
		
		ModelsHelper.prototype.reloadPlantsFromBackend = function(){
			var sUrl = _getServiceUrl('/plants_tagger/backend/Plant');
			this.oComponent.getModel('plants').loadData(sUrl);
			this.oComponent.getModel('plants').attachRequestCompleted(_onReceivingPlantsFromBackend.bind(this));
			this.oComponent.getModel('plants').attachRequestFailed(_onReceiveError);  //ajax params okay? 
		};
		
		ModelsHelper.prototype.reloadImagesFromBackend = function(){
			//reload images data
			$.ajax({
				url: _getServiceUrl('/plants_tagger/backend/Image2'),
				data: {},
				context: this,
				async: true
			})
			.done(_onReceivingImagesFromBackend)
			.fail(_onReceiveError);		
		};		
		

		return ModelsHelper;		
	
});