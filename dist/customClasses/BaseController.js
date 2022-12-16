sap.ui.define(["sap/ui/core/mvc/Controller","sap/m/MessageBox","plants/tagger/ui/customClasses/MessageUtil","plants/tagger/ui/customClasses/Util","sap/m/MessageToast","plants/tagger/ui/model/ModelsHelper","sap/ui/core/Fragment","plants/tagger/ui/customClasses/Navigation"],function(e,t,a,n,i,s,r,o){"use strict";return e.extend("plants.tagger.ui.controller.BaseController",{ModelsHelper:s,onInit:function(e){},_getFragment:function(e){return this.getView().byId(e)},applyToFragment:function(e,t,a=undefined){var n={settingsDialogFilter:"plants.tagger.ui.view.fragments.master.MasterFilter",dialogNewPlant:"plants.tagger.ui.view.fragments.master.MasterNewPlant",dialogSort:"plants.tagger.ui.view.fragments.master.MasterSort",popoverPopupImage:"plants.tagger.ui.view.fragments.master.MasterImagePopover",dialogEvent:"plants.tagger.ui.view.fragments.AddEvent",dialogAddTag:"plants.tagger.ui.view.fragments.DetailTagAdd",dialogRenamePlant:"plants.tagger.ui.view.fragments.DetailRename",dialogClonePlant:"plants.tagger.ui.view.fragments.DetailClone",dialogCreateDescendant:"plants.tagger.ui.view.fragments.DetailCreateDescendant",dialogAssignEventToImage:"plants.tagger.ui.view.fragments.DetailAssignEvent",dialogFindSpecies:"plants.tagger.ui.view.fragments.FindSpecies",menuDeleteTag:"plants.tagger.ui.view.fragments.DetailTagDelete",dialogEditTrait:"plants.tagger.ui.view.fragments.DetailTraitEdit",dialogUploadPhotos:"plants.tagger.ui.view.fragments.UploadPhotos",MessagePopover:"plants.tagger.ui.view.fragments.MessagePopover",menuShellBarMenu:"plants.tagger.ui.view.fragments.ShellBarMenu",dialogNewPropertyName:"plants.tagger.ui.view.fragments.properties.NewPropertyName",dialogAddProperties:"plants.tagger.ui.view.fragments.properties.AvailableProperties",dialogEditPropertyValue:"plants.tagger.ui.view.fragments.properties.EditPropertyValue",dialogLeafletMap:"plants.tagger.ui.view.fragments.taxonomy.DetailTaxonomyMap",dialogCancellation:"plants.tagger.ui.view.fragments.DetailCancellation",dialogEditSoil:"plants.tagger.ui.view.fragments.events.EditSoil"};var i=this.getView();if(i.byId(e)){t(i.byId(e))}else{r.load({name:n[e],id:i.getId(),controller:this}).then(function(e){i.addDependent(e);if(a){a(e)}t(e)})}},getModifiedPlants:function(){var e=this.getView().getModel("plants");var t=e.getData();var a=[];var i=this.getOwnerComponent().oPlantsDataClone["PlantsCollection"];for(var s=0;s<t["PlantsCollection"].length;s++){if(!n.dictsAreEqual(t["PlantsCollection"][s],i[s])){var r=n.getClonedObject(t["PlantsCollection"][s]);if(!!r.parent_plant&&!r.parent_plant.id){r.parent_plant=null}if(!!r.parent_plant_pollen&&!r.parent_plant_pollen.id){r.parent_plant_pollen=null}if(!n.dictsAreEqual(r,i[s])){a.push(t["PlantsCollection"][s])}}}return a},getModifiedTaxa:function(){var e=this.getView().getModel("taxon");var t=e.getData().TaxaDict;var a=this.getOwnerComponent().oTaxonDataClone["TaxaDict"];var i=Object.keys(a);var s=[];i.forEach(function(e){if(!n.dictsAreEqual(a[e],t[e])){s.push(t[e])}},this);return s},_getModifiedEvents:function(){var e=this.getView().getModel("events");var t=e.getData().PlantsEventsDict;var a=this.getOwnerComponent().oEventsDataClone;var i={};var s=Object.keys(a);s.forEach(function(e){if(!n.objectsEqualManually(a[e],t[e])){i[e]=t[e]}},this);var r=Object.keys(t);r.forEach(function(e){if(!a[e]){i[e]=t[e]}},this);return i},_getPropertiesSansTaxa:function(e){var t=n.getClonedObject(e);for(var a=0;a<Object.keys(t).length;a++){var i=t[Object.keys(t)[a]];for(var s=0;s<i.categories.length;s++){var r=i.categories[s];for(var o=r.properties.length-1;o>=0;o--){var g=r.properties[o];var l=g.property_values.find(e=>e["type"]==="taxon");if(l){var p=g.property_values.indexOf(l);g.property_values.splice(p,1)}var c=g.property_values.find(e=>e["type"]==="plant");if(!c)r.properties.splice(o,1)}}}return t},getModifiedPropertiesPlants:function(){var e=this.getView().getModel("properties");var t=e.getData().propertiesPlants;t=this._getPropertiesSansTaxa(t);var a=this.getOwnerComponent().oPropertiesDataClone;var i={};var s=Object.keys(a);s.forEach(function(e){if(!n.objectsEqualManually(a[e],t[e])){i[e]=t[e]}},this);return i},getModifiedPropertiesTaxa:function(){var e=this.getView().getModel("propertiesTaxa");var t=e.getData().propertiesTaxon;var a=this.getOwnerComponent().oPropertiesTaxonDataClone;if(!a){return{}}var i={};var s=Object.keys(a);s.forEach(function(e){if(!n.objectsEqualManually(a[e],t[e])){i[e]=t[e]}},this);return i},getModifiedImages:function(){var e=this.getOwnerComponent().imagesRegistry;var t=this.getOwnerComponent().imagesRegistryClone;var a=[];Object.keys(e).forEach(i=>{if(!(i in t)||!n.dictsAreEqual(e[i],t[i])){a.push(e[i])}});return a},savePlantsAndImages:function(){n.startBusyDialog("Saving...","Plants and Images");this.savingPlants=false;this.savingImages=false;this.savingTaxa=false;this.savingEvents=false;this.savingProperties=false;var e=this.getModifiedPlants();var t=this.getModifiedImages();var a=this.getModifiedTaxa();var r=this._getModifiedEvents();var o=this.getModifiedPropertiesPlants();var g=this.getModifiedPropertiesTaxa();if(e.length===0&&t.length===0&&a.length===0&&Object.keys(r).length===0&&Object.keys(o).length===0&&Object.keys(g).length===0){i.show("Nothing to save.");n.stopBusyDialog();return}if(e.length>0){this.savingPlants=true;var l={PlantsCollection:e};$.ajax({url:n.getServiceUrl("plants/"),type:"POST",contentType:"application/json",data:JSON.stringify(l),context:this}).done(this._onAjaxSuccessSave).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"Plant (POST)"))}if(t.length>0){this.savingImages=true;var p={ImagesCollection:t};$.ajax({url:n.getServiceUrl("images/"),type:"PUT",contentType:"application/json",data:JSON.stringify(p),context:this}).done(this._onAjaxSuccessSave).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"Image (PUT)"))}if(a.length>0){this.savingTaxa=true;var c=n.getClonedObject(a);c=c.map(e=>{delete e.occurrenceImages;return e});var d={ModifiedTaxaCollection:c};$.ajax({url:n.getServiceUrl("taxa/"),type:"PUT",contentType:"application/json",data:JSON.stringify(d),context:this}).done(this._onAjaxSuccessSave).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"Taxon (POST)"))}if(Object.keys(r).length>0){this.savingEvents=true;var u={plants_to_events:r};$.ajax({url:n.getServiceUrl("events/"),type:"POST",contentType:"application/json",data:JSON.stringify(u),context:this}).done(this._onAjaxSuccessSave).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"Event (POST)"))}if(Object.keys(o).length>0){this.savingProperties=true;var v={modifiedPropertiesPlants:o};$.ajax({url:n.getServiceUrl("plant_properties/"),type:"POST",contentType:"application/json",data:JSON.stringify(v),context:this}).done(this._onAjaxSuccessSave).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"plant_properties (POST)"))}if(Object.keys(g).length>0||Object.keys(g).length>0){this.savingPropertiesTaxa=true;var f={modifiedPropertiesTaxa:g};$.ajax({url:n.getServiceUrl("taxon_properties/"),type:"POST",contentType:"application/json",data:JSON.stringify(f),context:this}).done(this._onAjaxSuccessSave).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"taxon_properties (POST)"))}},saveNewPlant:function(e){var t={PlantsCollection:[e]};n.startBusyDialog("Creating...","new plant "+e.plant_name);$.ajax({url:n.getServiceUrl("plants/"),type:"POST",contentType:"application/json",data:JSON.stringify(t),context:this}).done(function(e,t,a){var s=e.plants[0];var r=this.getOwnerComponent().getModel("plants").getProperty("/PlantsCollection");var g=r.push(s);this.getOwnerComponent().getModel("plants").updateBindings();var l=n.getClonedObject(s);this.getOwnerComponent().oPlantsDataClone.PlantsCollection.push(l);i.show("Created plant ID "+s.id+" ("+s.plant_name+")");o.navToPlantDetails.call(this,s.id)}).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"Plant (POST)")).always(function(){n.stopBusyDialog()})},isPlantNameInPlantsModel:function(e){var t=this.getOwnerComponent().getModel("plants").getProperty("/PlantsCollection");return t.find(t=>t.plant_name===e)!==undefined},getPlantId:function(e){var t=this.getOwnerComponent().getModel("plants").getProperty("/PlantsCollection");var a=t.find(t=>t.plant_name===e);if(a===undefined){throw"Plant not found"}else{return a.id}},getPlantById:function(e){var t=parseInt(e);var a=this.getOwnerComponent().getModel("plants").getProperty("/PlantsCollection");var n=a.find(e=>e.id===t);if(n===undefined){throw"Plant not found"}else{return n}},getPlantByName:function(e){var t=this.getOwnerComponent().getModel("plants").getProperty("/PlantsCollection");var a=t.find(t=>t.plant_name===e);if(a===undefined){throw"Plant not found: "+e}else{return a}},getRouter:function(){return sap.ui.core.UIComponent.getRouterFor(this)},onAjaxSimpleSuccess:function(e,t,n){i.show(e.message.message);a.getInstance().addMessageFromBackend(e.message)},_onAjaxSuccessSave:function(e,t,i){if(e.resource==="PlantResource"){this.savingPlants=false;var s=this.getView().getModel("plants");var r=s.getData();this.getOwnerComponent().oPlantsDataClone=n.getClonedObject(r)}else if(e.resource==="ImageResource"){this.savingImages=false;var o=this.getOwnerComponent().imagesRegistry;this.getOwnerComponent().imagesRegistryClone=n.getClonedObject(o)}else if(e.resource==="TaxonResource"){this.savingTaxa=false;var g=this.getView().getModel("taxon");var l=g.getData();this.getOwnerComponent().oTaxonDataClone=n.getClonedObject(l)}else if(e.resource==="EventResource"){this.savingEvents=false;var p=this.getView().getModel("events");var c=p.getData();this.getOwnerComponent().oEventsDataClone=n.getClonedObject(c.PlantsEventsDict);a.getInstance().addMessageFromBackend(e.message)}else if(e.resource==="PropertyResource"){this.savingProperties=false;var d=this.getView().getModel("properties");var u=d.getData();var v=this._getPropertiesSansTaxa(u.propertiesPlants);this.getOwnerComponent().oPropertiesDataClone=n.getClonedObject(v);a.getInstance().addMessageFromBackend(e.message)}else if(e.resource==="PropertyTaxaResource"){this.savingPropertiesTaxa=false;var f=this.getView().getModel("propertiesTaxa");var h=f.getData();this.getOwnerComponent().oPropertiesTaxonDataClone=n.getClonedObject(h.propertiesTaxon);a.getInstance().addMessageFromBackend(e.message)}if(!this.savingPlants&&!this.savingImages&&!this.savingTaxa&&!this.savingEvents&&!this.savingProperties){n.stopBusyDialog()}},updateTableHeaderPlantsCount:function(){var e=this.getView().byId("plantsTable").getBinding("items").getLength();var t="Plants ("+e+")";this.getView().byId("pageHeadingTitle").setText(t)},handleErrorMessageBox:function(e){var a=!!this.getView().$().closest(".sapUiSizeCompact").length;t.error(e,{styleClass:a?"sapUiSizeCompact":""})},onIconPressDeleteImage:function(e){var a=e.getSource().data("sModel");var n=e.getSource().getParent().getBindingContext(a);var i=n.getProperty();var s=!!this.getView().$().closest(".sapUiSizeCompact").length;t.confirm("Delete this image?",{icon:t.Icon.WARNING,title:"Delete",stretch:false,onClose:this._confirmDeleteImage.bind(this,i,n),actions:["Delete","Cancel"],styleClass:s?"sapUiSizeCompact":""})},onCancelDialog:function(e){this.applyToFragment(e,e=>e.close())},_confirmDeleteImage:function(e,t,a){if(a!=="Delete"){return}$.ajax({url:n.getServiceUrl("images/"),type:"DELETE",contentType:"application/json",data:JSON.stringify(e),data:JSON.stringify({images:[e]}),context:this}).done(function(t,a,n){this._onAjaxDeletedImagesSuccess(t,a,n,[e])}).fail(s.getInstance().onReceiveErrorGeneric.bind(this,"Image (DELETE)"))},_onAjaxDeletedImagesSuccess:function(e,t,a,n,i){this.onAjaxSimpleSuccess(e,t,a);var s=this.getView().getModel("images").getData().ImagesCollection;var r=this.getView().getModel("untaggedImages").getData().ImagesCollection;var o=this;n.forEach(function(e){var t=s.indexOf(e);if(t>=0){s.splice(t,1)}var t=r.indexOf(e);if(t>=0){r.splice(t,1)}delete o.getOwnerComponent().imagesRegistry[e.path_original];delete o.getOwnerComponent().imagesRegistryClone[e.path_original]});this.getView().getModel("images").refresh();this.getView().getModel("untaggedImages").refresh();if(!!i){i()}},onInputImageNewKeywordSubmit:function(e){var t=e.getSource().data("sModel");var a=e.getParameter("value").trim();if(!a){e.getSource().setValue("");return}var n=e.getSource().getParent().getBindingContext(t).getObject().keywords;if(n.find(e=>e.keyword===a)){i.show("Keyword already in list");e.getSource().setValue("");return}n.push({keyword:a});e.getSource().setValue("");this.getOwnerComponent().getModel(t).updateBindings()},onTokenizerTokenChange:function(e){if(e.getParameter("type")==="removed"){var t=e.getParameter("token").getProperty("key");var a=e.getSource().data("type");var n=!!e.getSource().getParent().getBindingContext("images")?"images":"untaggedImages";var s=e.getSource().getParent().getBindingContext(n).getObject();var r=a==="plant"?s.plants:s.keywords;var o=r.findIndex(e=>a==="keyword"?e.keyword===t:e.key===t);if(o===undefined){i.show("Technical error: "+t+" not found.");return}r.splice(o,1);this.getOwnerComponent().getModel(n).updateBindings()}},addPhotosToRegistry:function(e){e.forEach(e=>{if(!(e.path_original in this.getOwnerComponent().imagesRegistry)){this.getOwnerComponent().imagesRegistry[e.path_original]=e;this.getOwnerComponent().imagesRegistryClone[e.path_original]=n.getClonedObject(e)}})},handleTypeMissmatch:function(e){var t=x=e.getSource().getFileType().map(e=>"*."+e);var a=t.join(", ");i.show("The file type *."+e.getParameter("fileType")+" is not supported. Choose one of the following types: "+a)},resetImagesCurrentPlant:function(e){var t=Object.entries(this.getOwnerComponent().imagesRegistry).filter(t=>t[1].plants.filter(t=>t.plant_id===e).length==1);var t=t.map(e=>e[1]);this.getOwnerComponent().getModel("images").setProperty("/ImagesCollection",t);n.stopBusyDialog()},getSuggestionItem:function(e,t){var a=this.getOwnerComponent().getModel("suggestions").getProperty("/"+e);var n=a.find(e=>e["key"]===t);if(!n){throw"Suggestion Key not found: "+t}return n}})});