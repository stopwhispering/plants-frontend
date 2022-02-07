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

			
			var oView = this.getView();

			this.applyToFragment('dialogEvent', _openDialogAddEvent.bind(this));
			
			function _openDialogAddEvent(oDialog){

				// get soils collection from backend proposals resource
				this.EventsUtil._loadSoils.call(this, oDialog);

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
				
				oView.addDependent(oDialog);
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

		onDeleteEventsTableRow: function(evt){
			// deleting row from events table
			// get event object to be deleted
			var oEvent = evt.getParameter('listItem').getBindingContext('events').getObject();
			
			// get events model events array for current plant	
			var oEventsModel = this.getOwnerComponent().getModel('events');
			var aEvents = oEventsModel.getProperty('/PlantsEventsDict/'+this._oCurrentPlant.id);
			
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
			// transfer selected soil from soils model to new-event model (which has only one entry)
			var sPath = evt.getSource().getSelectedContexts()[0].sPath;
			this.applyToFragment('dialogEvent',(o)=>{
				var oSelectedData = o.getModel('soils').getProperty(sPath);
				var oModelNewEvent = o.getModel("new");
				
				var oSelectedDataNew = Util.getClonedObject(oSelectedData); 
				oModelNewEvent.setProperty('/soil', oSelectedDataNew);
			});
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

				//make sure soil was seleccted
				//note: we submit the whole soil object to the backend, but the backend does only care about the id
				//for modifying or creating a soil, there's a separate service
				if(!dDataSave.soil.id){
					throw new Error('Choose soil.');
				}
				// this.EventsUtil.validateSoilSelection.call(this, dDataSave);	
			} else {
				delete dDataSave.soil;
			}			
		},

		_loadSoils: function(oDialog){
			// triggered when opening dialog to add/edit event
			// get soils collection from backend proposals resource
			var sUrl = Util.getServiceUrl('/plants_tagger/backend/events/soils');
			var oModel = this.getView().getModel('soils');
			if (!oModel){
				oModel = new JSONModel(sUrl);
				this.getView().setModel(oModel, 'soils');
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
			var dDataSave = Util.getClonedObject(dDataNew);
			
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
			oDialog.close();
		},		
		
    	addOrEditEvent: function(evt){
    		var oDialog = this._getFragment('dialogEvent');
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			var sMode = dDataNew.mode; //edit or new
			
			var oEventsModel = this.getOwnerComponent().getModel('events');
			var sPathEventsModel = '/PlantsEventsDict/'+this._oCurrentPlant.id+'/';
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
			this.applyToFragment('dialogEvent', this.EventsUtil._onEditEvent.bind(this, dEventLoad));
		},
        
        _onEditEvent: function(dEventLoad, oDialog){
        	// get soils collection from backend proposals resource
			this.EventsUtil._loadSoils.call(this, oDialog);
        	
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
						   'pot': {	'diameter_width': 4,
									'material': this.getOwnerComponent().getModel('suggestions').getData()['potMaterialCollection'][0]
									},
						   'observation': { 'height': 0,
											'stem_max_diameter': 0,
											'diseases': '',
						   					'observation_notes': ''
											},
							'soil': {	'id': undefined,		
										'soil_name': '',
										'mix': '',
										'description': ''
									},
							// defaults as to whether segments are active (and what to save in backend)
							'segments': {	'observation': 'cancel',
											'pot': 'cancel',
											'soil': 'cancel'
										}
							};
			return dEvent;
        },

		openDialogEditSoil: function(oEvent){
			var oSoil = oEvent.getSource().getBindingContext('soils').getObject();
			
			var dEditedSoil = {
				dialog_title: 'Edit Soil (ID '+oSoil.id+')',
				btn_text: 'Update',
				new: false,
				id: oSoil.id,
				soil_name: oSoil.soil_name,
				description: oSoil.description,
				mix: oSoil.mix
			}		
			var oEditedSoilModel = new JSONModel(dEditedSoil);	
			
			var oView = this.getView();

			this.applyToFragment('dialogEditSoil', (o)=>{
				o.setModel(oEditedSoilModel, 'editedSoil');
				o.bindElement({ 
					path: '/',
					model: "editedSoil" });	
				oView.addDependent(o);
				o.open();
			});
		},

		openDialogNewSoil: function(oEvent){
			var oView = this.getView();


			var dNewSoil = {
				title: 'New Soil',
				btn_text: 'Create',
				new: true,
				id: undefined,
				soil_name: '',
				description: '',
				mix: ''
			}
			var oNewSoilModel = new JSONModel(dNewSoil);

			this.applyToFragment('dialogEditSoil', (o)=>{
				o.setModel(oNewSoilModel, 'editedSoil');
				o.bindElement({ 
					path: '/',
					model: "editedSoil" });	
				oView.addDependent(o);
				o.open();
			});
		},

		saveNewSoil: function(oSoilData){

			// check if there's already a same-named soil
			var oSoilsModel = this._getFragment('dialogEvent').getModel('soils');
			var aSoils = oSoilsModel.getData().SoilsCollection;
			var existing_soil_found = aSoils.find(function(element) {
												return element.soil_name === oSoilData.soil_name;
											});
			if (existing_soil_found){
				MessageToast.show("Soil name already exists.")
				return;
			}

			var newSoil = {
				id: undefined,
				soil_name: oSoilData.soil_name,
				description: oSoilData.description,
				mix: oSoilData.mix
			}

			Util.startBusyDialog('Saving new soil...');
			$.ajax({
				url: Util.getServiceUrl('/plants_tagger/backend/events/soils'),
				type: 'POST',
				contentType: "application/json",
			    data: JSON.stringify(newSoil),
				context: this
			  })
			  .done(this.EventsUtil._onSavedNewSoil.bind(this))
			  .fail(this.modelsHelper.onReceiveErrorGeneric.bind(this,'Save New Soil'));	
		},

		updateExistingSoil: function(oSoilData){

			var updatedSoil = {
				id: oSoilData.id,
				soil_name: oSoilData.soil_name,
				description: oSoilData.description,
				mix: oSoilData.mix
			}

			Util.startBusyDialog('Saving updated soil...');
			$.ajax({
				url: Util.getServiceUrl('/plants_tagger/backend/events/soils'),
				type: 'PUT',
				contentType: "application/json",
			    data: JSON.stringify(updatedSoil),
				context: this
			  })
			  .done(this.EventsUtil._onUpdatedExistingSoil.bind(this))
			  .fail(this.modelsHelper.onReceiveErrorGeneric.bind(this,'Save New Soil'));	
		},

		updateOrCreateSoil: function(oEvent){
			var oSoilData = oEvent.getSource().getBindingContext('editedSoil').getObject();
			
			//make sure soil has a name and a mix
			if(oSoilData.soil_name==="" || oSoilData.mix===""){
				MessageToast.show('Enter soil mix name and mix ingredients.');
				return;
			}

			// new soil
			if (oSoilData.new){
				if (oSoilData.id){
					MessageToast.show("Unexpected ID found.")
					return;
				}
				// _onSavedNewSoil will be called asynchronously, closing dialogue
				this.EventsUtil.saveNewSoil.call(this, oSoilData);

			// update existing soil
			} else {
				// _onUpdatedExistingSoil will be called asynchronously, closing dialogue
				this.EventsUtil.updateExistingSoil.call(this, oSoilData);
			}

		},

		_onUpdatedExistingSoil: function(data, textStats, jqXHR){
			// callback for request updating existing soil 
			if (!data.soil.id){
				MessageToast.show("Unexpected backend error - No Soil ID")
				return;
			}

			var oSoilsModel = this.getView().getModel('soils');
			var aSoils = oSoilsModel.getData().SoilsCollection;
			var oSOil = aSoils.find(function(element) {
				return element.id === data.soil.id;
			});
			if (!oSOil){
				MessageToast.show("Updated soil not found in Model")
				return;
			}

			oSOil.soil_name = data.soil.soil_name
			oSOil.description = data.soil.description
			oSOil.mix = data.soil.mix

			oSoilsModel.updateBindings();

			// busy dialog was started before ajax call
			Util.stopBusyDialog();
			this.applyToFragment('dialogEditSoil', (o)=>o.close(),);
		},

		_onSavedNewSoil: function(data, textStats, jqXHR){
			// callback for request saving new soil 
			if (!data.soil.id){
				MessageToast.show("Unexpected backend error - No Soil ID")
				return;
			}

			var oSoilsModel = this.getView().getModel('soils');
			var aSoils = oSoilsModel.getData().SoilsCollection;
			
			var oNewSoil = {
				id: data.soil.id,
				soil_name: data.soil.soil_name,
				description: data.soil.description,
				mix: data.soil.mix
			}
			aSoils.push(oNewSoil);
			oSoilsModel.updateBindings();

			// busy dialog was started before ajax call
			Util.stopBusyDialog();
			this.applyToFragment('dialogEditSoil', (o)=>o.close(),);
		},

		cancelEditSoil: function(oEvent){
			this.applyToFragment('dialogEditSoil', (o)=>o.close(),);
		}

   };
});