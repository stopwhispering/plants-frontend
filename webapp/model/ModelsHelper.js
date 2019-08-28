sap.ui.define(
	
	// requirements
	["sap/ui/model/json/JSONModel"], 
	
	// factory function
	function(JSONModel){
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
			
		var _onReceiveError = function(error){
		// general http error handler			
			if (error && error.hasOwnProperty('responseJSON') && typeof(error.responseJSON) === 'string'){
				sap.m.MessageToast.show('Error: ' + error.status + ' ' + error.responseJSON);	
			}
			else if (error && error.hasOwnProperty('responseJSON') && error.responseJSON && 'error' in error.responseJSON){
				sap.m.MessageToast.show('Error: ' + error.status + ' ' + error.responseJSON['error']);	
			} else {
				sap.m.MessageToast.show('Error: ' + error.status + ' ' + error.statusText);
			}	
		};
		
		//todo either remove here or from basecontrollre or move to new utility class
		var _updateTableHeaderPlantsCount = function(oView){
			//may only be called if helper class was instantiated with a view, not only component
			// update count in table header
			var iPlants = oView.byId("productsTable").getBinding("items").getLength();
			var sTitle = "Plants (" + iPlants + ")";
			oView.byId("pageHeadingTitle").setText(sTitle);
		};

		var _onReceivingPlantsFromBackend = function(data){
			// create new clone objects to track changes
			// this.oComponent.oPlantsDataClone = this.oComponent.getClonedObject(data);
			this.oComponent.oPlantsDataClone = this.oComponent.getClonedObject(data.getSource().getData());
			// this.oComponent.getModel('plants').setData(data);
			
			// update plants count (only if called from view, ie. reload button; not when called from component)
			if(this.oView !== undefined){
				_updateTableHeaderPlantsCount(this.oView);
			}
		};

		var _onReceivingImagesFromBackend = function(data){
			// create new clone objects to track changes
			this.oComponent.oImagesDataClone = this.oComponent.getClonedObject(data);
			this.oComponent.getModel('images').setData(data);
			
			_stopBusyDialog();  //todo: only stop when plants are loaded too
		};
		
		// add methods to the prototype (--> this is our api)
		ModelsHelper.prototype.reloadPlantsFromBackend = function(){
			//reload plants
			// $.ajax({
			// 	url: _getServiceUrl('/plants_tagger/backend/Plant'),
			// 	data: {},
			// 	context: this,
			// 	async: true
			// })
			// .done(_onReceivingPlantsFromBackend)
			// .fail(_onReceiveError);			
			var sUrl = _getServiceUrl('/plants_tagger/backend/Plant');
			var oPromisePlants = this.oComponent.getModel('plants').loadData(sUrl);
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