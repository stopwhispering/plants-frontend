sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'plants/tagger/ui/model/formatter',
	'sap/m/MessageBox',
	"sap/base/Log",
	"sap/m/Token",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util",
	"plants/tagger/ui/customClasses/Navigation",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/model/ModelsHelper",
	'sap/ui/core/Fragment',
	"plants/tagger/ui/customClasses/EventsUtil"
], function (BaseController, JSONModel, Filter, FilterOperator, formatter, 
			MessageBox, Log, Token, MessageToast, Util, Navigation, MessageUtil, ModelsHelper, Fragment, EventsUtil) {
	"use strict";
	
	return BaseController.extend("plants.tagger.ui.controller.Detail", {
		formatter: formatter,
		EventsUtil: EventsUtil,

		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oLayoutModel = this.getOwnerComponent().getModel();
			
			// default: view mode for plants information
			var oStatusModel = new JSONModel();
			oStatusModel.setProperty('/details_editable', false);
			this.getView().setModel(oStatusModel, 'status');
			
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("untagged").attachPatternMatched(this._onProductMatched, this);
		},
		
		oModelPlants: null,
		
		filterSubitemsPlants: function(dictsPlants) {
			if (this.isDictKeyInArray({key: this.sCurrentPlant}, dictsPlants)){
				return true;
			} else {
				return false;
			}
		},
		
		onIconPressSetPreview: function(evt){
			
			// get selected image and current plant in model
			var sPathCurrentImage = evt.getSource().getBindingContext("images").getPath();
			var oCurrentImage = this.getOwnerComponent().getModel('images').getProperty(sPathCurrentImage);
			var sPathCurrentPlant = evt.getSource().getBindingContext("plants").getPath();
			var oCurrentPlant = this.getOwnerComponent().getModel('plants').getProperty(sPathCurrentPlant);
			
			
			// temporarily set original image as preview image
			// upon reloading plants model, a specific preview image will be generated 
			var sUrlOriginal = oCurrentImage['url_original'];
			var s = JSON.stringify(sUrlOriginal); // model stores backslash unescaped, so we need a workaround
			var s2 = s.substring(1, s.length-1);
			oCurrentPlant['url_preview'] = s2;
			oCurrentPlant['filename_previewimage'] = s2;
			
			this.getOwnerComponent().getModel('plants').updateBindings();
		},
		
		applyFilterToListImages: function(sPathCurrentPlant){
			// var oListImages = this.getView().byId('listImages');
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			
			//when first opening the site with details open, the plants model
			//may still be loading, so we can't resolve the plant id to a plant name
			//and, hence, can't apply an image filter
			//get the promies of the data loading (triggered from component via ModelsHelper)...
			var oPromise = oModelPlants.dataLoaded();
			
			//...and attach handlers to the promises, executed once data has been loaded
			//note: we can't just use an event handler as the component doesn't know this view at first...
			//(in case of error call the same function where NULL-filter is applied which is better than no filter
			this.sPathCurrentPlant = sPathCurrentPlant;
			oPromise.then(this.applyFilterToListImagesDeferred.bind(this), 
						  this.applyFilterToListImagesDeferred.bind(this));
		},

		applyFilterToListImagesDeferred: function(sPathCurrentPlant){
			sPathCurrentPlant = this.sPathCurrentPlant; 
			var oListImages = this.getView().byId('listImages');
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			
			//applying filter to the details vier to only display the plant's images
			//deferred as the plants list may not be loaded at the beginning; see promise above
			var oPlant = oModelPlants.getProperty(sPathCurrentPlant);
			if (oPlant === undefined){
				this.sCurrentPlant = 'NULL';
			} else {
				this.sCurrentPlant = oPlant.plant_name;
			}
			
			// create custom filter function
			var oFilter = new Filter({
			    path: 'plants',
			    test: this.filterSubitemsPlants.bind(this)
			});
			
			var aFilters = [oFilter];
			var oBinding = oListImages.getBinding("items");
			oBinding.filter(aFilters);
		},
		
		bindTaxonOfCurrentPlant: function(sPathCurrentPlant){
			//we need to set the taxon deferred as well as we might not have the taxon_id, yet
			//we need to wait for the plants model to be loaded
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			var oPromise = oModelPlants.dataLoaded();
			oPromise.then(this.bindTaxonOfCurrentPlantDeferred.bind(this, sPathCurrentPlant), 
						  this.bindTaxonOfCurrentPlantDeferred.bind(this, sPathCurrentPlant));	
		},
		
		bindTaxonOfCurrentPlantDeferred: function(sPathCurrentPlant){
			var oModelPlants = this.getOwnerComponent().getModel('plants');
			var oPlant = oModelPlants.getProperty(sPathCurrentPlant);
			this.getView().bindElement({
				path: "/TaxaDict/" + oPlant.taxon_id,
				model: "taxon"
			});					
		},
		
		onAfterRendering: function(evt){
			this.oBindingContext = evt.getSource().getBindingContext("plants");
		},
		
		handleItemPress: function (oEvent) {
			var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2),
				supplierPath = oEvent.getSource().getBindingContext("products").getPath(),
				supplier = supplierPath.split("/").slice(-1).pop();

			this.oRouter.navTo("detailDetail", {layout: oNextUIState.layout, supplier: supplier});
		},
		handleFullScreen: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._plant});
		},
		handleExitFullScreen: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
			this.oRouter.navTo("detail", {layout: sNextLayout, product: this._plant});
		},
		handleClose: function () {
			var sNextLayout = this.oLayoutModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
			this.oRouter.navTo("master", {layout: sNextLayout});
		},
		_onProductMatched: function (oEvent) {
			//bind current plant element to view 
			this._plant = oEvent.getParameter("arguments").product || this._plant || "0";
			this.getView().bindElement({
				path: "/PlantsCollection/" + this._plant,
				model: "plants"
			});
			
			var sPathCurrentPlant = "/PlantsCollection/" + this._plant;

			//bind taxon of current plant to view
			this.bindTaxonOfCurrentPlant(sPathCurrentPlant);

			//filter images on current plant
			this.applyFilterToListImages(sPathCurrentPlant);
		},
		
		_getPlantModelIndex: function(sPlant, oData){
			// search for a specific plant in plants model by plant_name 
			// return the index
			for (var i = 0; 1 < oData.PlantsCollection.length; i++) {
			    if(oData.PlantsCollection[i]['plant_name'] === sPlant){
			    	return i;
			    }
			}
		},
		
		onMotherPlantPress: function(sMotherPlant){
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			//find mother plant in model data array
			var oData = oPlantsModel.getData();
			var sIndexMotherPlant = this._getPlantModelIndex(sMotherPlant, oData);
			if (sIndexMotherPlant){
				//navigate to mother plant in current column
				Navigation.navToPlantDetails.call(this, sIndexMotherPlant);
			} else {
				this.handleErrorMessageBox("Can't get Mother Plant Index");
			}
		},
		
		onPressButtonDeletePlant: function(evt, sPlant){
			if(sPlant.length < 1){
				return;
			}

			//confirm dialog
			var oBindingContextPlants = evt.getSource().getBindingContext('plants');
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.confirm(
				"Delete plant "+sPlant+"?", {
					icon: MessageBox.Icon.WARNING,
					title: "Delete",
					stretch: false,
					onClose: this._confirmDeletePlant.bind(this, sPlant, oBindingContextPlants),
					actions: ['Delete', 'Cancel'],
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},
			
		_confirmDeletePlant: function(sPlant, oBindingContextPlants, sAction){
			// triggered by onIconPressDeleteImage's confirmation dialogue
			if(sAction !== 'Delete'){
				return;
			}		
			
			Util.startBusyDialog('Deleting', 'Deleting '+sPlant);
			$.ajax({
					  url: Util.getServiceUrl('/plants_tagger/backend/Plant'),
					  type: 'DELETE',
					  contentType: "application/json",
					  data: JSON.stringify({'plant': sPlant}),
					  context: this
					})
					.done(this._onPlantDeleted.bind(this, sPlant, oBindingContextPlants))
					.fail(this.onAjaxFailed);	
		},
		
		_onPlantDeleted: function(sPlant, oBindingContextPlants, oMsg, sStatus, oReturnData){
				Util.stopBusyDialog();
				this.onAjaxSimpleSuccess(oMsg, sStatus, oReturnData);
				
				//remove from plants model and plants model clone
				//find deleted image in model and remove there
				var aPlantsData = this.getView().getModel('plants').getData().PlantsCollection;
				var oPlant = oBindingContextPlants.getProperty();
				var iPosition = aPlantsData.indexOf(oPlant);
				aPlantsData.splice(iPosition, 1);
				this.getView().getModel('plants').refresh();
				
				//delete from model clone (used for tracking changes) as well
				var aPlantsDataClone = this.getOwnerComponent().oPlantsDataClone.PlantsCollection;
				//can't find position with object from above
				var oPlantClone = aPlantsDataClone.find(function(element){ 
					return element.plant_name === oPlant.plant_name; 
				});
				if(oPlantClone !== undefined){
					aPlantsDataClone.splice(aPlantsDataClone.indexOf(oPlantClone), 1);
				}
				
				//return to one-column-layout (plant in details view was deleted)
				this.handleClose();
		},

		onToggleEditMode: function(evt){
			var sCurrentType = evt.getSource().getType();
			if(sCurrentType === 'Transparent'){
				// set edit mode
				evt.getSource().setType('Emphasized');
				this.getView().getModel('status').setProperty('/details_editable', true);
			} else {
				// set view mode (default)
				evt.getSource().setType('Transparent');
				this.getView().getModel('status').setProperty('/details_editable', false);
			}
		},
		
		onInputImageNewPlantNameSubmit: function(evt){
			// on enter add new plant to image in model
			// called by either submitting input or selecting from suggestion table
			if(evt.getId() === 'suggestionItemSelected'){
				var sPlantName = evt.getParameter('selectedRow').getCells()[0].getText();
			} else {
				sPlantName = evt.getParameter('value');  //submit disabled
			}

			var dictPlant = {key: sPlantName, 
							 text: sPlantName};
			
			//check if new
			if(!this.isPlantNameInPlantsModel(sPlantName)){
				MessageToast.show('Plant Name does not exist.');
				return;
			}
			
			// cancel if emtpy
			if (sPlantName !== ''){ 
	
				//add to model
				var sPath = evt.getSource().getParent().getBindingContext("images").getPath();
				var oModel = this.getOwnerComponent().getModel('images');
				var aCurrentPlantNames = oModel.getProperty(sPath).plants;
				
				// check if already in list
				if (this.isDictKeyInArray(dictPlant, aCurrentPlantNames)){
					MessageToast.show('Plant Name already assigned. ');
				} else {
					oModel.getProperty(sPath).plants.push(dictPlant);
					Log.info('Assigned plant to image: '+ sPlantName + sPath);
					oModel.updateBindings();
				}		
			}
			
			evt.getSource().setValue('');
		},
		
		onInputImageNewKeywordSubmit: function(evt){
			var sKeyword = evt.getParameter('value');
			if (!sKeyword){
				return;
			}
			
			var dictKeyword = {keyword: sKeyword};

			//add to model
			var sPath = evt.getSource().getParent().getBindingContext("images").getPath();
			var oModel = this.getOwnerComponent().getModel('images');
			oModel.getProperty(sPath).keywords.push(dictKeyword);
			oModel.updateBindings();
			
			evt.getSource().setValue('');
		},
		
		onTokenizerTokenChange: function(evt){
			if(evt.getParameter('type') === 'removed'){
				
				var sType = evt.getSource().data('type'); // plant|keyword
				if(sType==='keyword'){
					var dictRecord = {keyword: evt.getParameter('token').getProperty('key')};
				} else {
						dictRecord = {key: evt.getParameter('token').getProperty('key'), 
									  text: evt.getParameter('token').getProperty('text')};
				}
				var sPath = evt.getSource().getParent().getBindingContext("images").getPath();
				var oModel = this.getOwnerComponent().getModel('images');
				var aListDicts = sType === 'plant' ? oModel.getProperty(sPath).plants : oModel.getProperty(sPath).keywords;
				
				// find dict in array
				var index = -1;
				var i;
				for (i = 0; i < aListDicts.length; i++) { 
					if(aListDicts[i].key === dictRecord.key){
						index = i;
						break;
					}
				}
				// delete
				if (index >= 0){
					aListDicts.splice(index, 1);
				}
				oModel.updateBindings();
				
			}
			
		},
		
		onPressImagePlantToken: function(evt){
			// get plant name
			var sImagePlantPath = evt.getSource().getBindingContext("images").getPath();
			var sPlant = this.getOwnerComponent().getModel('images').getProperty(sImagePlantPath).key;
			
			// get plant path in plants model
			var oPlantsModel = this.getOwnerComponent().getModel('plants');
			var oData = oPlantsModel.getData();
			var iIndexPlant = this._getPlantModelIndex(sPlant, oData);
			
			if (iIndexPlant){
			 	//navigate to plant in layout's current column (i.e. middle column)
			 	Navigation.navToPlantDetails.call(this, iIndexPlant);
			 } else {
			 	this.handleErrorMessageBox("Can't find selected Plant");
			 }
		},
		
		handleMeasurementPress: function(evt){
			MessageToast('Nothing happening here, yet');
		},
		
		_getDialogAddMeasurement : function() {
			var oView = this.getView();
			var oDialog = oView.byId('dialogMeasurement');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.AddMeasurement", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
        },
        
    	addMeasurement: function(evt){
    		// get new data
       		var oDialog = this._getDialogAddMeasurement();
			var oModel = oDialog.getModel("new");
			var dDataNew = oModel.getData();
			
			if (!dDataNew['measurement_date']){
				MessageToast.show('Enter date.');
				return;
			}
			
			// get current measurements in plants model
			var sPath = evt.getSource().getBindingContext("plants").getPath();
			var aMeasurements = this.getView().getModel('plants').getProperty(sPath).measurements;
			if(!aMeasurements){
				this.getView().getModel('plants').getProperty(sPath)['measurements'] = [];
				aMeasurements = this.getView().getModel('plants').getProperty(sPath).measurements;
			}
			
			// make sure it's not a duplicate
			for (var i = 0; i < aMeasurements.length; i++) { 
				if (aMeasurements[i]['measurement_date'] === dDataNew['measurement_date']){
		  			MessageToast.show('Duplicate (date already exists for this plant).');
			  		return;
				}
			}

			aMeasurements.push(dDataNew);
			this.getOwnerComponent().getModel('plants').updateBindings();
			oDialog.close();

        },
        
        closeDialogAddMeasurement: function() {
            this._getDialogAddMeasurement().close();
		},

		getToday: function(){
			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
			var yyyy = today.getFullYear();
			today = yyyy + '-' + mm + '-' + dd;
			return today;
		},

		openDialogAddMeasurement: function() {
			var oDialog = this._getDialogAddMeasurement();
			var dNewMeasurement = {'plant_name': this.sCurrentPlant,
								   'measurement_date': this.getToday()
									};
			var oPlantsModel = new JSONModel(dNewMeasurement);
			oDialog.setModel(oPlantsModel, "new");
			this._getDialogAddMeasurement().open();
		},
		
		onOpenFindSpeciesDialog: function(){
			this._getDialogFindSpecies().open();
		},
		
		onFindSpeciesCancelButton: function(){
			this._getDialogFindSpecies().close();
		},

		_getDialogFindSpecies : function() {
			var oView = this.getView();
			var oDialog = oView.byId('dialogFindSpecies');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.FindSpecies", this);
				oView.addDependent(oDialog);
			}
			var oKewResultsModel = new JSONModel();
			this.getView().setModel(oKewResultsModel, 'kewSearchResults');
			return oDialog;
        },

		onButtonFindSpecies: function(evt){
			var sSpecies = this.byId('inputFindSpecies').getValue();
			if(sSpecies.length === 0){
				MessageToast.show('Enter species first.');
			}
			var bIncludeKew = this.byId('cbFindSpeciesIncludeKew').getSelected(); 
			var bSearchForGenus = this.byId('cbGenus').getSelected();
			
			Util.startBusyDialog('Retrieving results from species search...');
			$.ajax({
				url: Util.getServiceUrl('/plants_tagger/backend/SpeciesDatabase'),
				data: {'species': sSpecies,
					   'includeKew': bIncludeKew,
					   'searchForGenus': bSearchForGenus	
					},
				context: this,
				async: true
			})
			.done(this._onReceivingSpeciesDatabase)
			.fail(ModelsHelper.getInstance()._onReceiveError);					
		},
		
		_onReceivingSpeciesDatabase: function(data, _, infos){
			Util.stopBusyDialog();
			var oKewResultsModel = this.getView().getModel('kewSearchResults'); 
			oKewResultsModel.setData(data);
			MessageUtil.getInstance().addMessageFromBackend(data.message);
		},
		
		onFindSpeciesChoose: function(evt){
			var oSelectedItem = this.byId('tableFindSpeciesResults').getSelectedItem();
			if(!oSelectedItem){
				MessageToast.show('Select item from results list first.');
				return;
			}
			var sSelectedPath = oSelectedItem.getBindingContextPath();
			var oSelectedRowData = this.getView().getModel('kewSearchResults').getProperty(sSelectedPath);
			var fqId = oSelectedRowData.fqId;
			
			// optionally, use has set a custom additional name. send full name then.
			var sCustomName = this.byId('textFindSpeciesAdditionalName').getText().trim();
			if(sCustomName.startsWith('Error')){
				var nameInclAddition = '';
			} else if(sCustomName === oSelectedRowData.name.trim()){
				nameInclAddition = '';
			} else {
				nameInclAddition = sCustomName;
			}
			
			var dPayload = {'fqId': fqId, 
							'hasCustomName': (nameInclAddition.length === 0) ? false : true,
							'nameInclAddition': nameInclAddition,
							'source': oSelectedRowData.source,
							'id': oSelectedRowData.id,
							'plant': this.sCurrentPlant
							};
							
			Util.startBusyDialog('Retrieving additional species information and saving them to Plants database...');
			var sServiceUrl = Util.getServiceUrl('/plants_tagger/backend/SpeciesDatabase');
			
			$.ajax({
				  url: sServiceUrl,
				  context: this,
				  type: 'POST',
				  data: dPayload
				})
			.done(this._onReceivingAdditionalSpeciesInformationSaved)
			.fail(ModelsHelper.getInstance()._onReceiveError);		
		},
		
		_onReceivingAdditionalSpeciesInformationSaved: function(data, _, infos){
			//taxon was saved in database and the taxon id is returned here
			//we assign that taxon id to the plant; this is persisted only upon saving
			//the whole new taxon dictionary is added to the taxon model and it's clone
			Util.stopBusyDialog();
			MessageToast.show(data.toast);
			MessageUtil.getInstance().addMessageFromBackend(data.message);
			this._getDialogFindSpecies().close();
			
			this.getView().getBindingContext('plants').getObject().botanical_name = data.botanical_name;
			this.getView().getBindingContext('plants').getObject().taxon_id = data.taxon_data.id;
			this.getView().getModel('plants').updateBindings();
			
			// add taxon to model if new 
			var oModelTaxon = this.getView().getModel('taxon');
			var sPathTaxon = '/TaxaDict/'+data.taxon_data.id;
			if (oModelTaxon.getProperty(sPathTaxon) === undefined){
				oModelTaxon.setProperty(sPathTaxon, data.taxon_data);
			}
			
			//add taxon to model's clone if new
			var oTaxonDataClone = this.getOwnerComponent().oTaxonDataClone;
			if(oTaxonDataClone.TaxaDict[data.taxon_data.id] === undefined){
				oTaxonDataClone.TaxaDict[data.taxon_data.id] = data.taxon_data;
			}

			// bind received taxon to view (otherwise applied upon switching plant in detail view)
			this.getView().bindElement({
				path: "/TaxaDict/" + data.taxon_data.id,
				model: "taxon"
			});	
		},
		
		onFindSpeciesTableSelectedOrDataUpdated: function(evt){
			var oText = this.byId('textFindSpeciesAdditionalName');
			var oInputAdditionalName = this.byId('inputFindSpeciesAdditionalName');
			
			var oSelectedItem = this.byId('tableFindSpeciesResults').getSelectedItem();
			if (oSelectedItem === undefined || oSelectedItem === null){
				oText.setText('');
				oInputAdditionalName.setEditable(false);
				oInputAdditionalName.setValue('');
				return;
			}
			var sSelectedPath = oSelectedItem.getBindingContextPath();
			var oSelectedRowData = this.getView().getModel('kewSearchResults').getProperty(sSelectedPath);
			
			//reset additional name
			if (oSelectedRowData.is_custom){
				// if selected botanical name is a custom one, adding a(nother) suffix is forbidden
				oInputAdditionalName.setValue('');
				oInputAdditionalName.setEditable(false);
				var sNewValueAdditionalName = '';
				
			} else if(oSelectedRowData.species === null || oSelectedRowData.species === undefined){
				// if a genus is selected, not a (sub)species, we add a 'spec.' as a default
				oInputAdditionalName.setValue('spec.');
				sNewValueAdditionalName = 'spec.';
				oInputAdditionalName.setEditable(true);

			} else {
				//default case: selected a species with an official taxon name
				if(sNewValueAdditionalName==='spec.'){
					oInputAdditionalName.setValue('');
					sNewValueAdditionalName='';
				} else {
					sNewValueAdditionalName = oInputAdditionalName.getValue();
				} 
				oInputAdditionalName.setEditable(true);	
			}	
			
			oText.setText(oSelectedRowData.name + ' ' + sNewValueAdditionalName);
		},
		
		onFindSpeciesAdditionalNameLiveChange: function(evt){
			var oSelectedItem = this.byId('tableFindSpeciesResults').getSelectedItem();
			var sSelectedPath = oSelectedItem.getBindingContextPath();
			var oSelectedRowData = this.getView().getModel('kewSearchResults').getProperty(sSelectedPath);
			var oText = this.byId('textFindSpeciesAdditionalName');
			var sNewValueAdditionalName = this.byId('inputFindSpeciesAdditionalName').getValue();

			if(!oSelectedItem){
				oText.setText('Error: Select item from table first.');
				return;
			}

			oText.setText(oSelectedRowData.name + ' ' + sNewValueAdditionalName);
		},
		
		onDialogFindSpeciesBeforeOpen: function(evt){
			//default plant search name is the current one (if available)
			if(this.getView().getBindingContext('taxon') === undefined || 
				this.getView().getBindingContext('taxon').getObject() === undefined){
				var sCurrentBotanicalName = '';	
			} else {			
				sCurrentBotanicalName = this.getView().getBindingContext('taxon').getObject().name;
			}
			this.byId('inputFindSpecies').setValue(sCurrentBotanicalName);
			
			// clear additional name
			this.byId('inputFindSpeciesAdditionalName').setValue('');
		},
		
		onPressTag: function(evt){
			// create delete dialog
			var oTag = evt.getSource();  // for closure
			var sPathTag = oTag.getBindingContext('plants').getPath();
			if (!this._oDeleteTagFragment) {
				Fragment.load({
					name: "plants.tagger.ui.view.fragments.DetailTagDelete",
					controller: this
				}).then(function(oFragment) {
					this._oDeleteTagFragment = oFragment;
					this.getView().addDependent(this._oDeleteTagFragment);
					this._oDeleteTagFragment.bindElement({ path: sPathTag,
														   model: "plants" });	
					this._oDeleteTagFragment.openBy(oTag);
				}.bind(this));
			} else {
				this._oDeleteTagFragment.bindElement({ path: sPathTag,
												       model: "plants" });				
				this._oDeleteTagFragment.openBy(oTag);
			}			
		},
		
		pressDeleteTag: function(evt){
			var oContext = evt.getSource().getBindingContext('plants');
			// get position in tags array
			var sPathItem = oContext.getPath();
			var iIndex = sPathItem.substr(sPathItem.lastIndexOf('/')+1);
			// remove item from array
			// var sPathArray = sPathItem.substr(0,sPathItem.lastIndexOf('/'));
			this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant].tags.splice(iIndex, 1);
			// oContext.getModel().getProperty(sPathArray).splice(iIndex, 1);
			this.getOwnerComponent().getModel('plants').refresh();
		},
		
		onOpenAddTagDialog: function(evt){
			// create add tag dialog
			var oButton = evt.getSource();
			var oView = this.getView();
			var oDialog = oView.byId('dialogAddTag');

			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.DetailTagAdd", this);
				oView.addDependent(oDialog);				
				var dObjectStatusSelection = {ObjectStatusCollection: [
																	{'selected': false, 'text': 'None', 'state': 'None', 'icon': ''},
																	{'selected': false, 'text': 'Indication01', 'state': 'Indication01', 'icon': ''},
																	{'selected': false, 'text': 'Success', 'state': 'Success', 'icon': ''},
																	{'selected': true, 'text': 'Information', 'state': 'Information', 'icon': ''},
																	{'selected': false, 'text': 'Error', 'state': 'Error', 'icon': ''},
																	{'selected': false, 'text': 'Warning', 'state': 'Warning', 'icon': ''}
																	],
											  Value: 'dfs'
				};
				var oTagTypesModel = new sap.ui.model.json.JSONModel(dObjectStatusSelection);
				oDialog.setModel(oTagTypesModel, 'tagTypes');
			}
			oDialog.openBy(oButton);
		},
		
		onAddTag: function(evt){
			// create a new tag inside the plant's object in the plants model
			// it will be saved in backend when saving the plant
			// new/deleted tags are within scope of the plants model modification tracking
			var dDialogData = this.byId('dialogAddTag').getModel('tagTypes').getData();
			dDialogData.Value = dDialogData.Value.trim();
			
			// check if empty 
			if(dDialogData.Value.length === 0){
				MessageToast.show('Enter text first.');
				return;
			}

			// get selected ObjectStatus template
			var oSelectedElement = dDialogData.ObjectStatusCollection.find(function(element) {
				return element.selected;
			});
			
			// check if same-text tag already exists for plant
			var oPlant = this.getOwnerComponent().getModel('plants').getData().PlantsCollection[this._plant]; 
			if(oPlant.tags){
				var bFound = oPlant.tags.find(function(oTag){
					return oTag.text === dDialogData.Value;	
				});
				if(bFound){
					MessageToast.show('Tag already exists.');
					return;				
				}
			}
			
			
			// create new token object in plants model
			var dNewTag = {
								// id is determined upon saving to db
								text: dDialogData.Value,
								icon: oSelectedElement.icon,
								state: oSelectedElement.state,
								// last_update is determined upon saving to db
								plant_name: oPlant.plant_name
							};
			if (oPlant.tags){
				oPlant.tags.push(dNewTag);	
			} else {
				oPlant.tags = [dNewTag];
			}
			
			this.getOwnerComponent().getModel('plants').updateBindings();
			this.byId('dialogAddTag').close();
		},
		
		onCloseAddTagDialog: function(evt){
			this.byId('dialogAddTag').close();
		}

	});
}, true);