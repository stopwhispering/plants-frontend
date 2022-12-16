sap.ui.define(["sap/ui/base/Object","sap/m/MessageToast","plants/tagger/ui/customClasses/Util","plants/tagger/ui/customClasses/Navigation","plants/tagger/ui/model/ModelsHelper"],function(e,t,n,a,s){"use strict";var i;var g=e.extend("plants.tagger.ui.customClasses.ImageUtil",{constructor:function(){},onInputImageNewPlantNameSubmit:function(e){var n=e.getSource().data("sModel");if(e.getId()==="suggestionItemSelected"){var a=e.getParameter("selectedRow").getBindingContext("plants").getObject().plant_name}else{a=e.getParameter("value").trim()}if(!this.isPlantNameInPlantsModel(a)||!a){t.show("Plant Name does not exist.");return}var s=e.getSource().getParent().getBindingContext(n);var i=this.getPlantId(a);this.ImageUtil._addPlantNameToImage(a,i,s);e.getSource().setValue("")},onIconPressTagDetailsPlant:function(e){var t=this.getPlantById(this._currentPlantId);var n=e.getSource().getParent().getBindingContext("untaggedImages");this.ImageUtil._addPlantNameToImage(t.plant_name,t.id,n);this.resetImagesCurrentPlant(this._currentPlantId)},_addPlantNameToImage:function(e,a,s){var i=s.getObject().plants;var g={key:e,text:e,plant_id:a};if(n.isDictKeyInArray(g,i)){t.show("Plant Name already assigned. ");return false}else{i.push(g);console.log("Assigned plant to image: "+e+" ("+s.getPath()+")");s.getModel().updateBindings();return true}},onPressImagePlantToken:function(e,t){var n=t.getSource().getBindingContext(e).getObject().plant_id;if(n>=0){a.navToPlantDetails.call(this,n)}else{this.handleErrorMessageBox("Can't find selected Plant")}},onIconPressAssignImageToEvent:function(e){var t=e.getSource();var n=e.getSource().getBindingContext("images").getPath();this.applyToFragment("dialogAssignEventToImage",e=>{e.bindElement({path:n,model:"images"});e.openBy(t)})},onAssignEventToImage:function(e){var n=e.getSource().getBindingContextPath("events");var a=e.getSource().getBindingContext("images").getObject();var s={path_thumb:a.path_thumb,path_original:a.path_original};var i=this.getView().getModel("events").getProperty(n);if(!!i.images&&i.images.length>0){var g=i.images.find(function(e){return e.path_original===s.path_original});if(g){t.show("Event already assigned to image.");this._getFragment("dialogAssignEventToImage").close();return}}if(!i.images){i.images=[s]}else{i.images.push(s)}t.show("Assigned.");this.getView().getModel("events").updateBindings();this._getFragment("dialogAssignEventToImage").close()},onIconPressUnassignImageFromEvent:function(e){var n=e.getParameter("listItem").getBindingContextPath("events");var a=e.getSource().getModel("events").getProperty(n);var s=n.substring(0,n.lastIndexOf("/"));var i=this.getOwnerComponent().getModel("events").getProperty(s);var g=i.indexOf(a);if(g===-1){t.show("Can't find image.");return}i.splice(g,1);this.getOwnerComponent().getModel("events").refresh()}});return{getInstance:function(){if(!i){i=new g(this)}return i}}});