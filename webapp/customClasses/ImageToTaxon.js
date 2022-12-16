//static utility functions

sap.ui.define([
	"sap/m/MessageToast"
], 
	
	function(MessageToast) {
   "use strict";

    return {

		onIconPressMoveImageToTaxon: function(evt){
			// triggered by clicking icon next to image in images list; moves the image to the taxon box
			
			// get image
			var oImage = evt.getSource().getBindingContext('images').getObject();
			var oImageAssignment = {filename:      oImage.filename,
									description:  oImage.description  // default description is image description, but may be altered later
			};
									
			// get current plant's taxon
			var oTaxon = evt.getSource().getBindingContext('taxon').getObject();

			// check if already assigned
			if(!!oTaxon.images && oTaxon.images.length > 0){
				var found = oTaxon.images.find(function(image) {
				  return image.filename === oImageAssignment.filename;
				});
				if(found){
					MessageToast.show('Taxon already assigned to image.');
					return;
				}
			}
			
			// assign
			if(!oTaxon.images){
				oTaxon.images = [oImageAssignment];
			} else {
				oTaxon.images.push(oImageAssignment);
			}
			
			MessageToast.show('Assigned to taxon '+oTaxon.name);
			this.getView().getModel('taxon').updateBindings();
		},
		
		onIconPressUnassignImageFromTaxon: function(evt){
			// triggered by clicking delete icon next to image in taxon box
			// unassigns the image from the taxon (without deleting any image)
			var oImageAssignment = evt.getSource().getBindingContext('taxon').getObject();
			var sPathImageAssignment = evt.getSource().getBindingContext('taxon').getPath();
			var sPathImages = sPathImageAssignment.substr(0, sPathImageAssignment.lastIndexOf('/'));
			
			var aImageAssignments = this.getView().getModel('taxon').getProperty(sPathImages);
			var iPosition = aImageAssignments.indexOf(oImageAssignment);
			if(iPosition===-1){
				MessageToast.show("Can't find image.");
				return;
			}
			
			aImageAssignments.splice(iPosition, 1);
			this.getOwnerComponent().getModel('taxon').refresh();  //same like updateBindings()
		}
		
   };
});