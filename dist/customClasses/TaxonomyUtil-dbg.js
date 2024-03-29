sap.ui.define([
    "sap/ui/base/Object",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util",
	"plants/tagger/ui/customClasses/MessageUtil",
	"plants/tagger/ui/model/ModelsHelper",
  
  ], function(Object, JSONModel, MessageToast, Util, MessageUtil, ModelsHelper) {
        "use strict";
        
    var _instance;
    var services= Object.extend("plants.tagger.ui.customClasses.TaxonomyUtil",{
    
        constructor: function(){
        },
		
		onOpenFindSpeciesDialog: function(){
			this.applyToFragment('dialogFindSpecies', 
				(o)=>o.open(),
				(o)=>{
					var oKewResultsModel = new JSONModel();
					this.getView().setModel(oKewResultsModel, 'kewSearchResults');
				});
		},
		
		onButtonFindSpecies: function(evt){
			var sSpecies = this.byId('inputFindSpecies').getValue();
			if(sSpecies.length === 0){
				MessageToast.show('Enter species first.');
			}
			var bIncludeKew = this.byId('cbFindSpeciesIncludeKew').getSelected(); 
			var bSearchForGenus = this.byId('cbGenus').getSelected();
			
			Util.startBusyDialog('Retrieving results from species search...');
			var dPayload = {
				// 'args': {
					'species': sSpecies,
					'includeKew': bIncludeKew,
					'searchForGenus': bSearchForGenus
				// }
			};
			$.ajax({
				url: Util.getServiceUrl('search_external_biodiversity'),
				type: 'POST',
				contentType: "application/json",
				data: JSON.stringify(dPayload),
				context: this,
				// async: true
			})
			.done(this.TaxonomyUtil._onReceivingSpeciesDatabase)
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'search_external_biodiversity (POST)'));
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
							// in py interface, null is resolved to empty str in py, undefined is resolved to None
							'id': oSelectedRowData.id ? oSelectedRowData.id : undefined,  
							'plant_id': this._oCurrentPlant.id
							};
							
			Util.startBusyDialog('Retrieving additional species information and saving them to Plants database...');
			var sServiceUrl = Util.getServiceUrl('download_taxon_details');
			
			$.ajax({
				  url: sServiceUrl,
				  context: this,
				  contentType: "application/json",
				  type: 'POST',
				  data: JSON.stringify(dPayload)
				})
			.done(this.TaxonomyUtil._onReceivingAdditionalSpeciesInformationSaved)
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(this,'download_taxon_details (POST)'));	
		},
		
		_onReceivingAdditionalSpeciesInformationSaved: function(data, _, infos){
			//taxon was saved in database and the taxon id is returned here
			//we assign that taxon id to the plant; this is persisted only upon saving
			//the whole new taxon dictionary is added to the taxon model and it's clone
			Util.stopBusyDialog();
			MessageToast.show(data.message.message);
			MessageUtil.getInstance().addMessageFromBackend(data.message);
			
			this.applyToFragment('dialogFindSpecies', (o)=>o.close(),);
			
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
				oTaxonDataClone.TaxaDict[data.taxon_data.id] = Util.getClonedObject(data.taxon_data);
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

		onShowMap: function(evt){
			// var oSource = evt.getSource();
			this.applyToFragment('dialogLeafletMap', 
				(o)=>o.open());
		},

		onRefetchGbifImages: function(gbif_id, controller){
			Util.startBusyDialog('Refetching Taxon Images from GBIF for GBIF ID ...' + gbif_id);
			var dPayload = {
					'gbif_id': gbif_id
			};
			$.ajax({
				url: Util.getServiceUrl('fetch_taxon_images'),
				type: 'POST',
				contentType: "application/json",
				data: JSON.stringify(dPayload),
				context: this,
				// async: true
			})
			.done(controller.TaxonomyUtil._onReceivingRefetchdeGbifImages.bind(controller))
			.fail(ModelsHelper.getInstance().onReceiveErrorGeneric.bind(controller,'search_external_bifetch_taxon_imagesodiversity (POST)'));
		},
		
		_onReceivingRefetchdeGbifImages: function(data, _, infos){
			// display newly fetched taxon images from gbif occurrences
			// (no need for caring about the serialized clone model as occurrences are read-only)
			Util.stopBusyDialog();
			var current_taxon = this.getView().getModel('taxon').getProperty("/TaxaDict/" + this._oCurrentPlant.taxon_id)
			current_taxon.occurrenceImages = data.occurrenceImages;
			this.getView().getModel('taxon').updateBindings();
			MessageUtil.getInstance().addMessageFromBackend(data.message);
		},

		onCloseLeafletMap: function(evt){
			this._getFragment('dialogLeafletMap').close();
		},

		afterCloseLeafletMap: function(evt){
			this._getFragment('dialogLeafletMap').destroy();
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