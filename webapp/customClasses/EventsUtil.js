//static utility functions

sap.ui.define([
	"plants/tagger/ui/customClasses/Util",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"sap/ui/layout/Grid",
	"sap/ui/layout/GridData",
	"sap/m/CustomListItem",
], 
	
	function(Util, MessageToast, JSONModel, Grid, GridData, CustomListItem) {
   "use strict";

    return {

		openDialogAddEvent: function() {
			this._applyToFragment('dialogEvent', _openDialogAddEvent.bind(this));
			
			function _openDialogAddEvent(oDialog){

				// get soils collection from backend proposals resource
				this.EventsUtil._loadSoils(oDialog);

				// if dialog was used for editing an event before, then destroy it first
				if(!!oDialog.getModel("new") && oDialog.getModel("new").getProperty('/mode') !== 'new'){
					oDialog.getModel("new").destroy();
					oDialog.setModel(null, "new");

					// set header and button to add instead of edit
					oDialog.setTitle(this.getView().getModel("i18n").getResourceBundle().getText("header_event"));
					this.byId('btnEventUpdateSave').setText('Add');			
				}

				// set defaults for new event
				if (!oDialog.getModel("new")){
					var dNewEvent = this.EventsUtil._getInitialEvent.apply(this);
					dNewEvent.mode = 'new';
					var oPlantsModel = new JSONModel(dNewEvent);
					oDialog.setModel(oPlantsModel, "new");
				}
				
				oDialog.open();

			}
		},
		
		eventsListFactory: function(sId, oContext){
			var sContextPath = oContext.getPath();
			var oContextObject = oContext.getObject();
			var oListItem = new CustomListItem({});
			oListItem.addStyleClass('sapUiTinyMarginBottom');
			var oGrid = new Grid({defaultSpan: "XL3 L3 M6 S12"
			});
			oListItem.addContent(oGrid);

			var oFragmentHeader = this.byId("eventHeader").clone(sId);
			oGrid.addContent(oFragmentHeader);

			if(!!oContextObject.observation){
				var oContainerObservation = this.byId("eventObservation").clone(sId);
				oGrid.addContent(oContainerObservation);
			}
			
			if(!!oContextObject.pot){
				var oContainerPot = this.byId("eventPot").clone(sId);
				oGrid.addContent(oContainerPot);
			}

			if(!!oContextObject.soil){
				var oContainerSoil = this.byId("eventSoil").clone(sId);
				oGrid.addContent(oContainerSoil);
			}
			
			// we want the images item to get the rest of the row or the whole next row if current row is almost full 
			// calculate number of cols in grid layout for images container in screen sizes xl/l
			// todo: switch from grid layout to the new (with 1.60) gridlist, where the following is probably
			// not required
			var iCols = (oGrid.getContent().length * 3) - 1;
			if((12-iCols) < 3){
				var sColsImageContainerL = "XL12 L12";
			} else{
				sColsImageContainerL = "XL"+(12 - iCols)+" L"+(12 - iCols);
			}
			var sColsContainer = sColsImageContainerL+" M6 S12";
			
			var oContainerOneImage = this.byId("eventImageListItem").clone(sId);

			// add items aggregation binding
			var oContainerImages = this.byId("eventImageContainer").clone(sId);
			oContainerImages.bindAggregation('items', 
				{	path:"events>"+sContextPath+"/images", 
					template: oContainerOneImage,
					templateShareable: false});
			
			// add layoutData aggregation binding to set number of columns in outer grid
			oContainerImages.setLayoutData(new GridData({span: sColsContainer}));
			oGrid.addContent(oContainerImages);	
							
    		return oListItem;
		},

        closeDialogAddEvent: function() {
			this._applyToFragment('dialogEvent',(o)=>o.close());
		},

		onDeleteEventsTableRow: function(evt){
			// deleting row from events table
			// get event object to be deleted
			var oEvent = evt.getParameter('listItem').getBindingContext('events').getObject();
			
			// get events model events array for current plant	
			var oEventsModel = this.getOwnerComponent().getModel('events');
			var oPlant = this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant]; 
			var aEvents = oEventsModel.getProperty('/PlantsEventsDict/'+oPlant.id);
			
			// delete the item from array
			var iIndex = aEvents.indexOf(oEvent);
			if(iIndex < 0){
				MessageToast.show('An error happended in internal processing of deletion.');
				return;
			}
			aEvents.splice(iIndex, 1);
			oEventsModel.refresh();
		},

		activateRadioButton: function(oRadioButton) {
			oRadioButton.setSelected(true);
		},
		
		onSoilMixSelect: function(evt){
			// get selected data from proposal model
			var sPath = evt.getSource().getSelectedContexts()[0].sPath;
			this._applyToFragment('dialogEvent',(o)=>{
				var oSelectedData = o.getModel('soils').getProperty(sPath);
				var oModelNewEvent = o.getModel("new");
				
				var oSelectedDataNew = Util.getClonedObject(oSelectedData); 
				oModelNewEvent.setProperty('/soil', oSelectedDataNew);
			});
		},
		
		onChangeNewSoilMixName: function(evt){
			// on all changes to the mix, deselect the chosen item (if any) from the soil mixes list
			this.byId('soilList').removeSelections();
			
		},
		
		onPressAddComponentToSoilMix: function(evt){
			// add entry to new soil mix components list or update existing one
			var sNewComponentName = this.byId('cbNewMixComponent').getValue().trim();
			var iPortion = this.byId('stepComponentPortion').getValue();
			var oModelNewEvent = this._getFragment('dialogEvent').getModel("new");
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
			var oModelNewEvent = this._getFragment('dialogEvent').getModel("new");
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
				} else if(this.byId('idPotShape3').getSelected()){
					dDataSave.pot.shape_top = 'hexagonal';
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
			var aSoils = this._getFragment('dialogEvent').getModel('soils').getData().SoilsCollection;
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
		
		_loadSoils: function(oDialog){
			// triggered when opening dialog to add/edit event
			// get soils collection from backend proposals resource
			var sUrl = Util.getServiceUrl('/plants_tagger/backend/proposals/SoilProposals');
			var oModel = oDialog.getModel('soils');
			if (!oModel){
				oModel = new JSONModel(sUrl);
				oDialog.setModel(oModel, 'soils');
			} else {
				oModel.loadData(sUrl); 
			}			
		},
		
		_addEvent: function(oEventsModel, aEventsCurrentPlant){
			//triggered by addOrEditEvent
    		//triggered by button in add/edit event dialog
    		//validates and filters data to be saved and triggers saving

    		// get new event data
       		var oDialog = this._getFragment('dialogEvent');
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			
			// trim date, e.g. from "2019-09-29 __:__" to "2019-09-29"
			while (dDataNew.date.endsWith('_') ||
			 	   dDataNew.date.endsWith(':')){
						dDataNew.date = dDataNew.date.slice(0, -1);  //remove last char
						dDataNew.date = dDataNew.date.trim();				 	 	
				 	 }

			// make sure there's only one event per day and plant (otherwise backend problems would occur)
			var found = aEventsCurrentPlant.find(function(element) {
				return element.date === dDataNew.date;
			});
			if(!!found){
				MessageToast.show('Duplicate event on that date.');
				return;	
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
			delete dDataSave.mode;
			aEventsCurrentPlant.push(dDataSave);
			oEventsModel.updateBindings();
			oDialog.close();			
		},
		
		_editEvent: function(oEventsModel, aEventsCurrentPlant){
			//triggered by addOrEditEvent
    		//triggered by button in add/edit event dialog
    		//validates and filters data to be saved and triggers saving

    		// get new event data
       		var oDialog = this._getFragment('dialogEvent')
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			
			// old record (which we are updating as it is a pointer to the events model itself) is hidden as a property in the new model
			if(!dDataNew.old_event){
				MessageToast.show("Can't determine old record. Aborting.");
				return;
			}
			var dDataOld = dDataNew.old_event;
			
			// trim date, e.g. from "2019-09-29 __:__" to "2019-09-29"
			while (dDataNew.date.endsWith('_') ||
			 	   dDataNew.date.endsWith(':')){
						dDataNew.date = dDataNew.date.slice(0, -1);  //remove last char
						dDataNew.date = dDataNew.date.trim();				 	 	
				 	 }
				 	 
			// general tab (always validate)
			if (dDataNew.date.length===0){
				MessageToast.show('Enter date.');
				return;
			}

			// make sure there's only one event per day and plant; here: there may not be an existing event on that date except for
			// the event updated itself
			var found = aEventsCurrentPlant.find(function(element) {
				return (element.date === dDataNew.date && element !== dDataOld);
			});
			if(!!found){
				MessageToast.show('Duplicate event on that date.');
				return;	
			}

			// update each attribute from the new model into the event
			Object.keys(dDataNew).forEach(function(key) {
				dDataOld[key] =Util.getClonedObject(dDataNew[key]);
			});	

			// treat data in observation, pot, and soil segments
			try{
				this.EventsUtil.handleEventSegments.call(this, dDataOld);	
			} catch (e){
				MessageToast.show(e);
				return;				
			}

			// tidy up
			delete dDataOld.segments;
			delete dDataOld.mode;
			delete dDataOld.old_event; // this is strange; it deletes the property which is the object itself without deleting itself
			
			// have events factory function in details controller regenerate the events list
			oEventsModel.updateBindings();  // we updated a proprety of that model
			oEventsModel.refresh(true);
			// this.byId('eventsList').getBinding('items').refresh();
			oDialog.close();
		},		
		
    	addOrEditEvent: function(evt){
    		var oDialog = this._getFragment('dialogEvent');
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			var sMode = dDataNew.mode; //edit or new
			
			var oEventsModel = this.getOwnerComponent().getModel('events');
			var sPlantName = this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant].id;
			var sPathEventsModel = '/PlantsEventsDict/'+sPlantName+'/';
			var aEventsCurrentPlant = oEventsModel.getProperty(sPathEventsModel);			
			
			if(sMode==='edit'){
				this.EventsUtil._editEvent.apply(this, [oEventsModel, aEventsCurrentPlant]);
			} else {  //'new'
				this.EventsUtil._addEvent.apply(this, [oEventsModel, aEventsCurrentPlant]);
			}
		},
		
		onEditEvent: function(evt){
        	// triggered by edit button in a custom list item header in events list
        	var dEventLoad = evt.getSource().getBindingContext('events').getObject();
			this._applyToFragment('dialogEvent', this.EventsUtil._onEditEvent.bind(this, dEventLoad));
		},
        
        _onEditEvent: function(dEventLoad, oDialog){
        	// get soils collection from backend proposals resource
			this.EventsUtil._loadSoils(oDialog);
        	
        	// update dialog title and save/update button
        	oDialog.setTitle('Edit Event ('+dEventLoad.date+')');
        	this.byId('btnEventUpdateSave').setText('Update');
        	
        	// there is some logic involved in mapping the dialog controls and the events model, additionally
        	// we don't want to update the events model entity immediately from the dialog but only upon
        	// hitting update button, therefore we generate a edit model, fill it with our event's data,
        	// and, upon hitting update button, do it the other way around
			var dEventEdit = this.EventsUtil._getInitialEvent.apply(this);
			dEventEdit.mode = 'edit';
			dEventEdit.date = dEventLoad.date;
			dEventEdit.event_notes = dEventLoad.event_notes;
			
			// we need to remember the old record
			dEventEdit.old_event = dEventLoad;
			if(dEventLoad.pot && dEventLoad.pot.id){
				dEventEdit.pot.id = dEventLoad.pot.id;
			}
			if(dEventLoad.observation && dEventLoad.observation.id){
				dEventEdit.observation.id = dEventLoad.observation.id;
			}			
			
			// observation segment
			if (!!dEventLoad.observation){
			// switch on start tab
				dEventEdit.segments.observation = 'status';
				dEventEdit.observation.diseases = dEventLoad.observation.diseases;
				dEventEdit.observation.height = dEventLoad.observation.height;
				dEventEdit.observation.observation_notes = dEventLoad.observation.observation_notes;
				dEventEdit.observation.stem_max_diameter = dEventLoad.observation.stem_max_diameter;
			} else {
				dEventEdit.segments.observation = 'cancel';
			}
			
			// pot segment
			if (!!dEventLoad.pot){
				dEventEdit.segments.pot = dEventLoad.pot_event_type;
				dEventEdit.pot.diameter_width = dEventLoad.pot.diameter_width;
				dEventEdit.pot.material = dEventLoad.pot.material;
				// the shape attributes are not set via model
				switch(dEventLoad.pot.shape_side){
					case 'very flat':
						this.byId('idPotHeight0').setSelected(true); break;
					case 'flat':
						this.byId('idPotHeight1').setSelected(true); break;
					case 'high':
						this.byId('idPotHeight2').setSelected(true); break;
					case 'very high':
						this.byId('idPotHeight3').setSelected(true); break;
				} 
				
				switch(dEventLoad.pot.shape_top){
					case 'square':
						this.byId('idPotShape0').setSelected(true); break;
					case 'round':
						this.byId('idPotShape1').setSelected(true); break;
					case 'oval':
						this.byId('idPotShape2').setSelected(true); break;
					case 'hexagonal':
						this.byId('idPotShape3').setSelected(true); break;
				}
			} else {
				dEventEdit.segments.pot = 'cancel';
			}
			
			// soil segment
			if (!!dEventLoad.soil){
				dEventEdit.segments.soil = dEventLoad.soil_event_type;
				dEventEdit.soil = Util.getClonedObject(dEventLoad.soil); 
			} else {
				dEventEdit.segments.soil = 'cancel';
			}
			
			// set model and open dialog
			if (oDialog.getModel("new")){
				oDialog.getModel("new").destroy();
			}
			var oModel = new JSONModel(dEventEdit);
			oDialog.setModel(oModel, "new");
        	oDialog.open();
        },
        
        _getInitialEvent: function(){
        	// called by both function to add and to edit event
        	var dEvent = { 'date': Util.getToday(),
						   'event_notes': '',
						   'pot': {	'diameter_width': 10,
									'material': this.getOwnerComponent().getModel('suggestions').getData()['potMaterialCollection'][0]
									},
						   'observation': { 'height': 0,
											'stem_max_diameter': 0,
											'diseases': '',
						   					'observation_notes': ''
											},
							'soil': {	'soil_name': '',
										'components': []
									},
							// defaults as to whether segments are active (and what to save in backend)
							'segments': {	'observation': 'cancel',
											'pot': 'cancel',
											'soil': 'cancel'
										}
							};
			return dEvent;
        }
		
   };
});