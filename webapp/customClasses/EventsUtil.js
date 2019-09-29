//static utility functions

sap.ui.define(["sap/m/BusyDialog",
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast"], function(BusyDialog, Util, MessageToast) {
   "use strict";

    return {

		activateRadioButton: function(oRadioButton) {
			oRadioButton.setSelected(true);
		},
		
		onSoilMixSelect: function(evt){
			// get selected data from proposal model
			var sPath = evt.getSource().getSelectedContexts()[0].sPath;
			var oSelectedData = this._getDialogAddMeasurement().getModel('soils').getProperty(sPath);
			var oModelNewEvent = this._getDialogAddMeasurement().getModel("new");
			
			var oSelectedDataNew = Util.getClonedObject(oSelectedData); 
			oModelNewEvent.setProperty('/soil', oSelectedDataNew);
		},
		
		onChangeNewSoilMixName: function(evt){
			// on all changes to the mix, deselect the chosen item (if any) from the soil mixes list
			this.byId('soilList').removeSelections();
			
		},
		
		onPressAddComponentToSoilMix: function(evt){
			// add entry to new soil mix components list or update existing one
			var sNewComponentName = this.byId('cbNewMixComponent').getValue().trim();
			var iPortion = this.byId('stepComponentPortion').getValue();
			var oModelNewEvent = this._getDialogAddMeasurement().getModel("new");
			var sSoilName = this.byId('inpSoilName').getValue().trim();
			
			if(sNewComponentName.length===0){
				MessageToast.show('Enter new or choose existing soil component first.');
				return;
			}
			
			//update soil mix name
			oModelNewEvent.setProperty('/soil/soil_name', sSoilName);
			
			//insert the component or update portion if already in components list
			var aComponents = oModelNewEvent.getProperty('/soil/components');
			var iIndex = aComponents.findIndex(function(element) {
																return element.component_name === sNewComponentName;
																});
			if(iIndex === -1){
				aComponents.push({'component_name': sNewComponentName,
								  'portion': iPortion});
			} else {
				aComponents[iIndex].portion = iPortion;
			}
			
			oModelNewEvent.updateBindings();
			
			// on all changes to the mix, deselect the chosen item (if any) from the soil mixes list
			this.byId('soilList').removeSelections();
		},
		
		onPressDeleteComponentFromSoilMix: function(evt){
			var sPath = evt.getParameter('listItem').getBindingContextPath();
			var oModelNewEvent = this._getDialogAddMeasurement().getModel("new");
			var oDeletedData = oModelNewEvent.getProperty(sPath);
			var aSoilComponents = oModelNewEvent.getData().soil.components;
			
			// remove from new event model
			var iIndex = aSoilComponents.indexOf(oDeletedData);
			if (iIndex >= 0){
				aSoilComponents.splice(iIndex, 1);
			}
			
			oModelNewEvent.updateBindings();
			
			// on all changes to the mix, deselect the chosen item (if any) from the soil mixes list
			this.byId('soilList').removeSelections();
		},
		
		handleEventSegments: function(dDataSave){
			//modifies the data by reading/updating/validating the segments observation, pot, and soil
			
			//observation tab
			if (dDataSave.segments.observation!=='cancel'){
				
				// if height or diameter are 0, reset them to undefined
				if(dDataSave.observation.height===0){
					dDataSave.observation.height = undefined;
				}
				if(dDataSave.observation.stem_max_diameter===0){
					dDataSave.observation.stem_max_diameter = undefined;
				}
			} else {
				delete dDataSave.observation;
			}
			
			//pot tab
			if (dDataSave.segments.pot!=='cancel'){
				// if width/diameter is 0, resetz it to undefined
				if(dDataSave.pot.diameter_width===0){
					dDataSave.pot.diameter_width = undefined;
				}
				
				dDataSave.pot_event_type = dDataSave.segments.pot;  //repot or status

				//pot shape properties can't be taken directly from model because of radiobutton handling without formal RadioGroup class
				if(this.byId('idPotHeight0').getSelected()){
					dDataSave.pot.shape_side = 'very flat';
				} else if(this.byId('idPotHeight1').getSelected()){
					dDataSave.pot.shape_side = 'flat';
				} else if(this.byId('idPotHeight2').getSelected()){
					dDataSave.pot.shape_side = 'high';
				} else if(this.byId('idPotHeight3').getSelected()){
					dDataSave.pot.shape_side = 'very high';	
				}
				
				if(this.byId('idPotShape0').getSelected()){
					dDataSave.pot.shape_top = 'square';
				} else if(this.byId('idPotShape1').getSelected()){
					dDataSave.pot.shape_top = 'round';
				} else if(this.byId('idPotShape2').getSelected()){
					dDataSave.pot.shape_top = 'oval';
				}
			} else {
				delete dDataSave.pot;
			}
			
			//soil tab
			if (dDataSave.segments.soil!=='cancel'){
				
				dDataSave.soil_event_type = dDataSave.segments.soil;  //change or status

				//make sure soil has a name and at least one component
				if(dDataSave.soil.soil_name===""){
					throw new Error('Enter soil mix name.');
				}
				if (dDataSave.soil.components.length === 0){
					throw new Error('Soil mix needs at least one soil component.');
				}
				this.EventsUtil.validateSoilSelection.call(this, dDataSave);	
			} else {
				delete dDataSave.soil;
			}			
		},
		
		validateSoilSelection: function(dDataSave){
			// if soil mix is exactly like one in list, then use it; otherwise check there is no name duplicate
			// in case of same mix, copy the id; otherwise remove id (so backend will know it's new)
			var aSoils = this._getDialogAddMeasurement().getModel('soils').getData().SoilsCollection;
			var existing_soil_found = aSoils.find(function(element) {
												return element.soil_name === dDataSave.soil.soil_name;
											});
			if(!existing_soil_found){
				// no existing soil mix with that name, so we make sure it does not have an id
				dDataSave.soil.id = undefined;
				return;
			}
			
			// compare components
			// simple case: different number of components
			if(existing_soil_found.components.length !== dDataSave.soil.components.length){
				throw new Error('Soil Mix with that name already exists with other components. Choose new name or soil from list.');
			}
			// compare each component name and portion
			dDataSave.soil.components.forEach(function(soil_component){
				var same_component = existing_soil_found.components.find(function(element){
					return (element.component_name === soil_component.component_name && element.portion === soil_component.portion);
				});
				if(!same_component){
					throw new Error('Soil Mix with that name already exists with other components. Choose new name or soil from list.');
				}
			}, this);
			
			// there is an existing soil with the same name and same components; we add the id so backend can identify it
			dDataSave.soil.id = existing_soil_found.id;
		},
		
    	addEvent: function(evt){
    		//triggered by button in add event dialog
    		//validates and filters data to be saved and triggers saving

    		// get new event data
       		var oDialog = this._getDialogAddMeasurement();
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			
			// trim date, e.g. from "2019-09-29 __:__" to "2019-09-29"
			while (dDataNew.date.endsWith('_') ||
			 	   dDataNew.date.endsWith(':')){
						dDataNew.date = dDataNew.date.slice(0, -1);  //remove last char
						dDataNew.date = dDataNew.date.trim();				 	 	
				 	 }

			// clone the data so we won't change the original new model
			var dDataSave = this.Util.getClonedObject(dDataNew);
			
			// general tab (always validate)
			if (dDataSave.date.length===0){
				MessageToast.show('Enter date.');
				return;
			}
			
			// treat data in observation, pot, and soil segments
			try{
				this.EventsUtil.handleEventSegments.call(this, dDataSave);	
			} catch (e){
				MessageToast.show(e);
				return;				
			}

			// no need to submit the segments selection to the backend
			delete dDataSave.segments;
			
			// actual saving is done upon hitting save button
			// here, we only update the events model
			// the plant's events have been loaded upon first visiting the plant's details view
			var oEventsModel = this.getOwnerComponent().getModel('events');
			var sPlantName = this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant].plant_name;
			var sPathEventsModel = '/PlantsEventsDict/'+sPlantName+'/';
			var aEventsCurrentPlant = oEventsModel.getProperty(sPathEventsModel);
			aEventsCurrentPlant.push(dDataSave);
			oEventsModel.updateBindings();
			
			oDialog.close();

        }		
		
   };
});