sap.ui.define([
  "sap/ui/base/Object",
  "sap/ui/core/message/Message",
  "sap/ui/core/MessageType"

], function(Object, Message, MessageType) {
	  "use strict";
	  
	var _instance;
	var _oMessageManager;
	// var services= Object.extend("plants.tagger.ui.customClasses.MessageUtil",{
	var services= Object.extend("Flask2Ui5Py.MessageUtil",{
		  
		constructor: function(oContext){
			// name the MessageManager's model so we can use it in the MessagePopover fragment
			// attach the model to supplied context (component to make it available everywhere)
			_oMessageManager = sap.ui.getCore().getMessageManager();
			oContext.setModel(_oMessageManager.getMessageModel(), "messages");
		  },
		  
		addMessageFromBackend: function(dictMessage){
			// wrapper with only one parameter, just adding a message from frontend as is into 
			// message model; exception: debug messages are not inserted
			if(dictMessage.type !== 'Debug'){
				var oMessage = new Message({
			        type: dictMessage.type,
			        message: dictMessage.message,
			        additionalText: dictMessage.additionalText,
			        description: dictMessage.description
				});
				_oMessageManager.addMessages(oMessage);
			}

			// sap.base.Log is unusable as the default lib spams the console with ui5 debug entries
			// Log.debug(dictMessage.message);
			console.log(dictMessage.message);
		},
		  
		addMessage: function(sType, sMessage, sAdditionalText, sDescription){
			if(sType === 'Error'){
				sType = MessageType.Error;
			}
			var oMessage = new Message({
		        type: sType,
		        message: sMessage,
		        additionalText: sAdditionalText,
		        description: sDescription
			});
			_oMessageManager.addMessages(oMessage);
		},
		
		removeAllMessages: function(){
    		_oMessageManager.removeAllMessages();
		}
		
	});
	  
	  
	return {
	  	// generate or return singleton
	    getInstance: function () {
	        if (!_instance) {
	            _instance = new services(this);
	        }
	        return _instance;
	    }
	};
});