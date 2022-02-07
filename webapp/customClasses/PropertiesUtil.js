sap.ui.define([
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast",
	"plants/tagger/ui/model/ModelsHelper",
	"plants/tagger/ui/customClasses/MessageUtil",
	"sap/ui/model/json/JSONModel",
],	function(Util, MessageToast, ModelsHelper, MessageUtil, JSONModel) {
   "use strict";

    return {
    	// ModelsHelper: ModelsHelper,
    	// MessageUtil: MessageUtil,
		
		onEditPropertyValueDelete: function(evt){
			// delete a property value, either for current plant or it's taxon
			var oModelProperties = this.getOwnerComponent().getModel('properties');
			var sPathPropertyValue = evt.getSource().getBindingContext('properties').getPath();
			var oPropertyValue = evt.getSource().getBindingContext('properties').getObject(); 
            
			// if it's a taxon's property value, we need to remove it from the original taxon properties model as well
			if(oPropertyValue.type === 'taxon'){
				// get property name id
				var oModelPropertiesTaxa = this.getOwnerComponent().getModel('propertiesTaxa');
				var sPathPropertyValues = sPathPropertyValue.substr(0, sPathPropertyValue.lastIndexOf('/'));
				var sPathPropertyName = sPathPropertyValues.substr(0, sPathPropertyValues.lastIndexOf('/'));
				var iPropertyNameId = oModelProperties.getProperty(sPathPropertyName).property_name_id;

				// get category id
                var sPath_1 = sPathPropertyName.substr(0, sPathPropertyName.lastIndexOf('/'));
                var sPathCategory = sPath_1.substr(0, sPath_1.lastIndexOf('/'));
                var iCategoryId = oModelProperties.getProperty(sPathCategory).category_id;

				var iTaxonId = evt.getSource().getBindingContext('plants').getObject().taxon_id;
                
                // now we can find the respective node in the taxon properties model
				// find path in taxon properties model
                var sPath = '/propertiesTaxon/'+iTaxonId+'/'+iCategoryId+'/properties';
                var aPropertyNames = oModelPropertiesTaxa.getProperty(sPath);
                var foundPropertyName = aPropertyNames.find(ele => ele['property_name_id'] == iPropertyNameId);
                var foundPropertyValue = foundPropertyName.property_values.find(ele => ele['type'] == 'taxon');
				
                // delete
                var iIndexTaxonPropertyValue = foundPropertyName.property_values.indexOf(foundPropertyValue);
                foundPropertyName.property_values.splice(iIndexTaxonPropertyValue, 1);
                
                // finally delete the property name node if there's no property value left (currently always the case)
                if(foundPropertyName.property_values.length === 0){
                	var iIndexPropertyName = aPropertyNames.indexOf(foundPropertyName);
                	aPropertyNames.splice(iIndexPropertyName, 1);
                }
			}

            //delete from (plants) properties model
            sPathPropertyValues = sPathPropertyValue.substr(0, sPathPropertyValue.lastIndexOf('/'));
            var aPathPropertyValues = oModelProperties.getProperty(sPathPropertyValues);
            var iIndex = aPathPropertyValues.indexOf(oPropertyValue);
            aPathPropertyValues.splice(iIndex, 1);

			this.getView().getModel('properties').refresh();
		},
		
		
		_getTemporaryAvailablePropertiesModel: function(oCategory, oModelPropertyNames){
			var sPathPropertiesAvailable = '/propertiesAvailablePerCategory/'+oCategory.category_name;
			var aPropertiesAvailable = oModelPropertyNames.getProperty(sPathPropertiesAvailable);
			
			// check which properties are already used for this plant
			var aCompared = this.comparePropertiesLists(aPropertiesAvailable, oCategory.properties);
			return new JSONModel(aCompared);
		},

		comparePropertiesLists: function(aPropertiesAvailable, aPropertiesUsed){

			var aList = [];
			if (aPropertiesAvailable === undefined){
				aPropertiesAvailable = [];
			}
			aPropertiesAvailable.forEach(function(entry) {
				var sName = entry.property_name;
				var found = aPropertiesUsed.find(element => element.property_name === sName);
				
				// set whether plant and/or taxon property value is already used (thus blocked)
				var oItem = {'property_name': sName, 'property_name_id': entry.property_name_id}
				if(found && found.property_values.find(ele => ele.type === 'plant')){
					oItem['selected_plant'] = true;
					oItem['blocked_plant'] = true; }
				else {
					oItem['selected_plant'] = false;
					oItem['blocked_plant'] = false;
				}
				
				if(found && found.property_values.find(ele => ele.type === 'taxon')){
					oItem['selected_taxon'] = true;
					oItem['blocked_taxon'] = true; }
				else {
					oItem['selected_taxon'] = false;
					oItem['blocked_taxon'] = false;
				}
				
				aList.push(oItem);
			});
			return aList; 
		},		
		
		onOpenDialogNewProperty: function(evt){
			if (!this.getView().getBindingContext('plants').getObject().taxon_id){
				MessageToast.show('Function available after setting botanical name.');
				return;
			}

			var oBtn = evt.getSource();
			// bind current category in properties model to fragment
			var sPathProperties = oBtn.getBindingContext('properties').getPath();
			
			this.applyToFragment('dialogNewPropertyName', (o)=>{
				o.bindElement({ path: sPathProperties,
								model: "properties" });
				o.openBy(oBtn);
			});
			
			this._btnNew = evt.getSource();
			this._btnNew.setType('Emphasized');
		},

		onNewPropertyNameCreate: function(evt){
			var sPropertyName = this.byId('inpPropertyName').getValue();
			if (!sPropertyName){
				MessageToast.show('Enter Property Name.');
				return;
			}
			//check if already exists in property names model
			var sCategoryName = evt.getSource().getBindingContext('properties').getObject().category_name;
			var oModelPropertyNames = evt.getSource().getModel('propertyNames');	
			var aPropertyNames = oModelPropertyNames.getProperty('/propertiesAvailablePerCategory/'+sCategoryName);
			var foundPropertyName = aPropertyNames.find(ele => ele['property_name'] == sPropertyName);
            if(foundPropertyName){
				MessageToast.show('Property Name already exists.');
				return;
            }
				
			// add to property names model
			aPropertyNames.push({
				countPlants: 0,
				property_name: sPropertyName,
				// property_name_id: undefined
			});
				
			
			var bAddToPlant = this.byId("chkNewPropertyNameAddToPlant").getSelected();
			var bAddToTaxon = this.byId("chkNewPropertyNameAddToTaxon").getSelected();
			
			// add property name to plants properties model
			if(bAddToPlant || bAddToTaxon){
				var oPropertyName = {
					'property_name': sPropertyName,
					// 'property_name_id': undefined,
					'property_values': []
				};
        		evt.getSource().getBindingContext('properties').getObject().properties.push(oPropertyName);  
			}
			
			// add empty property value item for plant if selected
			if(bAddToPlant){
				oPropertyName.property_values.push({'type': 'plant', 'property_value': ''});  //, 'property_value_id': undefined
			}
			
			// add empty property value item for taxon if selected
			if(bAddToTaxon){
				// will be inserted into both models to keep the same/updated!
				var oItem_ = {'type': 'taxon', 'property_value': ''};
				oPropertyName.property_values.push(oItem_);
				
				//properties taxon model
				var oEntry = {'property_name': sPropertyName, 'property_name_id': undefined};
				var iCategoryId = evt.getSource().getBindingContext('properties').getObject().category_id;
        		var iTaxonId = evt.getSource().getBindingContext('plants').getObject().taxon_id;
        		this.PropertiesUtil._insertPropertyIntoPropertyTaxaModel(oItem_, iCategoryId, iTaxonId, oEntry, this.getOwnerComponent());
			}
			
			this.getView().getModel('properties').refresh();
			this._getFragment('dialogNewPropertyName').close();
			// this._oNewPropertyNameFragment.close();
			this._btnNew.setType('Transparent');
		},
		
		onCloseNewPropertyNameDialog: function(evt){
			this._btnNew.setType('Transparent');
		},
		
		onOpenDialogAddProperty: function(evt){
			if (!this.getView().getBindingContext('plants').getObject().taxon_id){
				MessageToast.show('Function available after setting botanical name.');
				return;
			}

			var oCategoryControl = evt.getSource();  // for closure
			var oCategory = oCategoryControl.getBindingContext('properties').getObject(); 
			// var oModelProperties = evt.getSource().getModel('properties');
			var oModelPropertyNames = evt.getSource().getModel('propertyNames');
			var sPathProperties = oCategoryControl.getBindingContext('properties').getPath();
		
			if (this._getFragment('dialogAddProperties')){
				this._getFragment('dialogAddProperties').destroy();
			}

			this.applyToFragment('dialogAddProperties', (o)=>{
				var oModelTemp = this.PropertiesUtil._getTemporaryAvailablePropertiesModel(oCategory, oModelPropertyNames);
				o.setModel(oModelTemp, 'propertiesCompare');
				o.bindElement({ path: sPathProperties,
								model: "properties" });	
				o.openBy(oCategoryControl);
			});

			evt.getSource().setType('Emphasized');
			
			//remember category's button to later retype it
			this._btnAdd = evt.getSource();
		},
		
		onCloseAddPropertiesDialog: function(evt){
			evt.getParameter('openBy').setType('Transparent');
			evt.getSource().destroy();
		},
		
		onAddProperty: function(evt){
			// add selected properties to the plant's properties
			// var aModelProperties = this.getView().getModel('properties');
			var aPropertiesFromDialog = evt.getSource().getModel('propertiesCompare').getData();
			// var iCountBefore = evt.getSource().getBindingContext('properties').getObject().properties.length;
			var aProperties = evt.getSource().getBindingContext('properties').getObject().properties;
			var iCategoryId = evt.getSource().getBindingContext('properties').getObject().category_id;
			var iTaxonId = evt.getSource().getBindingContext('plants').getObject().taxon_id;
			// aPropertiesFromDialog.forEach(function(entry) {
			for (var i = 0; i < aPropertiesFromDialog.length; i++) {
				var entry = aPropertiesFromDialog[i];
				if ((entry.selected_plant && !entry.blocked_plant) || (entry.selected_taxon && !entry.blocked_taxon)){
                    // find out if we already have that proprety name node for taxon or if we need to create it
					var found = aProperties.find(ele => ele.property_name_id == entry.property_name_id);
					if (found) {
						// insert plant value for plant and/or taxon into existing propery values list of the property name node
						if(entry.selected_plant && !entry.blocked_plant){
						    found.property_values.push({
										'type': 'plant',
										'property_value': ''
										// 'property_value_id': undefined
										});
						}
						if(entry.selected_taxon && !entry.blocked_taxon){
						    var oItem = {'type': 'taxon', 'property_value': ''};  // 'property_value_id': undefined
						    found.property_values.push(oItem);
                    		this.PropertiesUtil._insertPropertyIntoPropertyTaxaModel(oItem, iCategoryId, iTaxonId, entry, this.getOwnerComponent());
							}
						}
                    else {
                    	// creat property name node and insert property value for plant and/or taxon
                    	var aPropertyValues = [];
                    	if(entry.selected_plant && !entry.blocked_plant){
                    		aPropertyValues.push({'type': 'plant', 'property_value': ''});  //, 'property_value_id': undefined 
                    	}
                    	if(entry.selected_taxon && !entry.blocked_taxon){
                    		var oItem_ = {'type': 'taxon', 'property_value': ''};  //, 'property_value_id': undefined 
                    		aPropertyValues.push(oItem_);
                    		this.PropertiesUtil._insertPropertyIntoPropertyTaxaModel(oItem_, iCategoryId, iTaxonId, entry, this.getOwnerComponent());
                    	}
						evt.getSource().getBindingContext('properties').getObject().properties.push(
							{
								'property_name': entry.property_name,
								'property_name_id': entry.property_name_id,
								'property_values': aPropertyValues
							});
                    }
				}
			}
			// if (evt.getSource().getBindingContext('properties').getObject().properties.length !== iCountBefore){
			this.getView().getModel('properties').refresh();
			this._btnAdd.setType('Transparent');
			this._getFragment('dialogAddProperties').close();
			this._getFragment('dialogAddProperties').destroy();
		},
		
		_insertPropertyIntoPropertyTaxaModel: function(oPropertyValue, iCategoryId, iTaxonId, entry, oOwnerComponent){
			// add a property value to taxon properties model
			var oModelPropertiesTaxa = oOwnerComponent.getModel('propertiesTaxa');
			var aCurrentPropertyNames = oModelPropertiesTaxa.getData().propertiesTaxon[iTaxonId][iCategoryId].properties;
			
			// create property name node if not exists (if we have two new property names, we need to go by name not (undefined) id)
			if(entry.property_name_id){
				var found = aCurrentPropertyNames.find(ele => ele.property_name_id == entry.property_name_id);
			} else {
				found = aCurrentPropertyNames.find(ele => ele.property_name == entry.property_name);
			}
			if (!found){
				aCurrentPropertyNames.push(
							{
								'property_name': entry.property_name,
								'property_name_id': entry.property_name_id,
								'property_values': [oPropertyValue]
							});
			} else {
				// otherwise just insert the property value
				found.property_values.push(oPropertyValue);
			}
		},
		
		_taxon_properties_already_loaded: function(oOwnerComponent, taxon_id){
            if(oOwnerComponent.getModel('propertiesTaxa').getProperty('/propertiesTaxon/'+taxon_id))
                return true;
             else
                 return false;
		},
		
		loadPropertiesForCurrentPlant: function(oPlant, oOwnerComponent){
			// request data from backend
			// data is added to local properties model and bound to current view upon receivement
			var sId = encodeURIComponent(oPlant.id);
			var uri = '/plants_tagger/backend/plant_properties/'+sId;
			
			// if plant's taxon's properties have not been already loaded, load them as well
			if (oPlant.taxon_id && !this._taxon_properties_already_loaded(oOwnerComponent, oPlant.taxon_id))
				var oPayload = {taxon_id: oPlant.taxon_id};
			else
				oPayload = {};
			
			$.ajax({
				url: Util.getServiceUrl(uri),
				data: oPayload,
				context: this,
				async: true
			})
			.done(this._onReceivingPropertiesForPlant.bind(this, oPlant, oOwnerComponent))
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'Property (GET)'));	
		},
		
		_onReceivingPropertiesForPlant: function(oPlant, oOwnerComponent, oData, sStatus, oReturnData){
			//insert (overwrite!) properties data for current plant with data received from backend
			var oPropertiesModel = oOwnerComponent.getModel('properties');
			oPropertiesModel.setProperty('/propertiesPlants/'+oPlant.id+'/', oData.propertyCollections);
			
			//for tracking changes, save a clone
			if (!oOwnerComponent.oPropertiesDataClone){
				oOwnerComponent.oPropertiesDataClone = {};
			}
			oOwnerComponent.oPropertiesDataClone[oPlant.id] = Util.getClonedObject(oData.propertyCollections);
			
			// update taxon properties model
            if (Object.keys(oData.propertyCollectionsTaxon.categories).length > 0){
            	oOwnerComponent.getModel('propertiesTaxa').setProperty('/propertiesTaxon/'+oPlant.taxon_id+'/', oData.propertyCollectionsTaxon.categories);
				if (!oOwnerComponent.oPropertiesTaxonDataClone){
					oOwnerComponent.oPropertiesTaxonDataClone = {};
				}
				oOwnerComponent.oPropertiesTaxonDataClone[oPlant.taxon_id] = Util.getClonedObject(oData.propertyCollectionsTaxon.categories);
            }
            
            // ... and redundantly insert the taxon data into the plant's properties array (only for display)
			this.appendTaxonPropertiesToPlantProperties(oOwnerComponent, oPlant);

			MessageUtil.getInstance().addMessageFromBackend(oData.message);
			
			// somehow UI5 requires a forced refresh here in case of no plant properties data but appended taxon properties to the plant properties; maybe a bug
			oPropertiesModel.refresh(true);
		},
		
		appendTaxonPropertiesToPlantProperties: function(oOwnerComponent, oPlant){
			// called after loading plant properties or instead of loading plant properties if these have been loaded already
			if (!oPlant.taxon_id){
				return;
			}

			var oModelPropertiesTaxon = oOwnerComponent.getModel('propertiesTaxa');
			var oModelPropertiesPlant = oOwnerComponent.getModel('properties');
			var oCategoriesTaxon = oModelPropertiesTaxon.getProperty('/propertiesTaxon/'+oPlant.taxon_id+'/');
			var aCategoriesPlant = oModelPropertiesPlant.getProperty('/propertiesPlants/'+oPlant.id+'/categories/');

        	for (var i = 0; i < Object.keys(oCategoriesTaxon).length; i++) {
        		var category = oCategoriesTaxon[Object.keys(oCategoriesTaxon)[i]];
				var category_id = category.category_id;
				var plant_category = aCategoriesPlant.find(ele => ele.category_id == category_id);
				
				for (var j = 0; j < category.properties.length; j++) {
					var property_name = category.properties[j];
					var plant_property_name = plant_category.properties.find(ele => ele.property_name_id == property_name.property_name_id);
					if (plant_property_name){
						plant_property_name.property_values.push(...property_name.property_values);
					} else {
						plant_category.properties.push(property_name);
					}
				}
			}	
		},
		
		onCloseDialogEditPropertyValue: function(evt){
			this._getFragment('dialogEditPropertyValue').close();
			// if(this._oEditPropertyValueFragment){
			// 	this._oEditPropertyValueFragment.close();
			// }
		},
		
		onEditPropertyValueTag: function(evt){
			// show fragment to edit or delete property value
			var oPropertyValueTag = evt.getSource();  // for closure
			var sPathPropertyValue = oPropertyValueTag.getBindingContext('properties').getPath();
			var oModelSoils = this._getFragment('dialogEvent').getModel('soils');

			this.applyToFragment('dialogEditPropertyValue', (o)=>{
				o.setModel(oModelSoils, 'soils');
				o.bindElement({ path: sPathPropertyValue,
								model: "properties" });	
				o.openBy(oPropertyValueTag);
			});
		}
		
   };
});