sap.ui.define([
    "sap/ui/base/Object",
	"sap/m/MessageToast",
  
  ], function(Object, MessageToast) {
        "use strict";
        
    var _instance;
    var services= Object.extend("plants.tagger.ui.customClasses.ImageUtil",{
    
        constructor: function(){
            console.log('todo remove me ImageUtil contructor ');
        },
		
		onIconPressAssignImageToEvent: function(evt){
			// triggered by icon beside image; assign that image to one of the plant's events
			// generate dialog from fragment if not already instantiated

			var oSource = evt.getSource();
			var sPathCurrentImage = evt.getSource().getBindingContext("images").getPath();
			this._applyToFragment('dialogAssignEventToImage',(o)=>{
				// bind the selected image's path in images model to the popover dialog
				o.bindElement({ path: sPathCurrentImage,
					   		  	model: "images" });	
				o.openBy(oSource);	
			});	
		},
		
		onAssignEventToImage: function(evt){
            // triggered upon selection of event in event selection dialog for an image
			// get selected event
			var sPathSelectedEvent = evt.getSource().getBindingContextPath('events');
			
			// get image
			var oImage = evt.getSource().getBindingContext('images').getObject();
			var oImageAssignment = {url_small:    oImage.url_small,
									url_original: oImage.url_original};
			
			// check if already assigned
			// var oEvent = this.getView().getModel('events').getProperty(aSelectedEventPaths[0]);
			var oEvent = this.getView().getModel('events').getProperty(sPathSelectedEvent);
			if(!!oEvent.images && oEvent.images.length > 0){
				var found = oEvent.images.find(function(image) {
				  return image.url_original === oImageAssignment.url_original;
				});
				if(found){
					MessageToast.show('Event already assigned to image.');
					return;					
				}
			}
			
			// assign
			if(!oEvent.images){
				oEvent.images = [oImageAssignment];
			} else {
				oEvent.images.push(oImageAssignment);
			}
			
			MessageToast.show('Assigned.');
			this.getView().getModel('events').updateBindings();
			this._applyToFragment('eventsForAssignmentList',(o)=>o.close());
			
		},
		
		onIconPressUnassignImageFromEvent: function(evt){
            // triggered by unassign control next to an image in the events list
			var sPath = evt.getParameter('listItem').getBindingContextPath('events');
			var oImage = evt.getSource().getModel('events').getProperty(sPath);
			
			var sEventImages = sPath.substring(0,sPath.lastIndexOf('/'));
			var aEventImages = this.getOwnerComponent().getModel('events').getProperty(sEventImages);
			
			var iPosition = aEventImages.indexOf(oImage);
			if(iPosition===-1){
				MessageToast.show("Can't find image.");
				return;
			}
			
			aEventImages.splice(iPosition, 1);
			this.getOwnerComponent().getModel('events').refresh();  //same like updateBindings()			
		},
		
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