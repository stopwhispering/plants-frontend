sap.ui.define([
	"plants/tagger/ui/customClasses/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	'plants/tagger/ui/model/formatter',
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Label",
	"sap/m/Input",
	"plants/tagger/ui/customClasses/MessageUtil",
	"sap/m/MessageToast",
	"plants/tagger/ui/customClasses/Util",
	"plants/tagger/ui/customClasses/Navigation"
], function (BaseController, JSONModel, Controller, Filter, FilterOperator, FilterType,
Sorter, MessageBox, formatter, Button, Dialog, Label, Input, MessageUtil, MessageToast, Util, Navigation) {
	"use strict";

	return BaseController.extend("plants.tagger.ui.controller.Master", {
		formatter: formatter,
		Util: Util,  // make module available in formatter via this.Util
		
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
		},

		onAfterRendering: function(){
			// we need to update the plants display counter in table title 
			// (when data was loaded, the view was not existing, yet)
			var oTable = this.byId('productsTable');
			oTable.attachUpdateFinished(this.updateTableHeaderPlantsCount.bind(this));
		},
		
		onListItemPress: function (oEvent) {
			// get selected plant
			var	sPlantPath = oEvent.getSource().getBindingContext("plants").getPath();
			// "/PlantsCollection/71" --> "71"
			var	iPlant = sPlantPath.split("/").slice(-1).pop();
			Navigation.navToPlantDetails.call(this, iPlant);
		},
		
		onSearch: function (oEvent) {
			// filter logic: active AND (plant_name OR botanical_name)
			// therefore, we are going to nest the filters:
			// AND( filter_active, OR( filter_plant_name, filter_botanical_name))
			var sQuery = oEvent.getParameter("query");
			
			//check for  filter on active plants
			var aActiveFilters = this.getView().byId("productsTable").getBinding('items').aApplicationFilters;
			
			//modify filters only on fields plant_name and botanical_name
			//leave active state filter (and possible others) as is
			//therefore collect other filters
			var aNewFilters = [];
			for (var i = 0; i < aActiveFilters.length; i++){
				if (!['plant_name', 'botanical_name', undefined].includes(aActiveFilters[i]['sPath'])){
					aNewFilters.push(aActiveFilters[i]);  //and	
				}
			}
			
			// create new filters for plant_name and botanical_name (linked with OR)
			var aNestedFilters = [new Filter("plant_name", FilterOperator.Contains, sQuery),
								  new Filter("botanical_name", FilterOperator.Contains, sQuery)];
			var oFilterOr = new Filter({filters: aNestedFilters,
										and: false});
			aNewFilters.push(oFilterOr);
			
			//attach both filters (default: AND)
			//update the aggregation binding's filter
			this.getView().byId("productsTable").getBinding("items").filter(aNewFilters, FilterType.Application);
			
			// update count in table header
			this.updateTableHeaderPlantsCount();
		},
		
		_getDistinctTagsFromPlants: function(aPlants){
			// collect distinct tags assigned to any plant
			var aTagsAll = [];
			for (var i = 0; i < aPlants.length; i++) {
				var aTagObjects = aPlants[i].tags;
				if (!!aTagObjects){
					// get tag texts from tag object list
					var aTags = aTagObjects.map(function(tag_obj) {return tag_obj.text;});
					aTagsAll = aTagsAll.concat(aTags);
				}
			}
			return Array.from(new Set(aTagsAll));
		},
		
		onShowFilterDialog: function(evt){
			// triggered by show-filters-dialog button; displays filter settings dialog

			// (re-)fill filter values model with distinct values for tags and soil names
			var oModelFilterValues = this.getOwnerComponent().getModel('filterValues');
			
			// soil names
			var oBinding = this.byId('productsTable').getBinding('items');
			var aSoilNames = oBinding.getDistinctValues('current_soil/soil_name');
			oModelFilterValues.setProperty('/soilNames', aSoilNames);
			
			// tags is a list for each plant, so we can't use getDistinctValues on the binding here
			var aPlants = this.getOwnerComponent().getModel('plants').getData().PlantsCollection;
			var aTags = this._getDistinctTagsFromPlants(aPlants);
			oModelFilterValues.setProperty('/tags', aTags);
			
			this._getDialogFilter().open();
		},
		
		onConfirmFilters: function(evt){
			var oTable = this.byId("productsTable"),
				mParams = evt.getParameters(),
				oBinding = oTable.getBinding("items"),
				aFilters = [];

			//get currently active filters on plant/botanical name (set via search function)
			//and add them to the new filter list
			var aActiveFilters = oBinding.aApplicationFilters;
			for (var i = 0; i < aActiveFilters.length; i++){
				if (['plant_name', 'botanical_name'].includes(aActiveFilters[i]['sPath'])){
					aFilters.push(aActiveFilters[i]);  //and	
				}
			}			
			
			// filters from the settings dialog filter tab:
			// see fragment for the ___ convention to make this as easy as below
			// we have one exceptional case - tags: a plant has 0..n tags and if
			// at least one of them is selected as filter, the plant should be shown
			// the ordinary filter operators do not cover that scenario, so we will
			// generate a custom filter
			// here, we collect the tags for the tags filter and collect the other
			// filters directly
			var aTagsInFilter = [];
			mParams.filterItems.forEach(function(oItem) {
				var aSplit = oItem.getKey().split("___"),
					sPath = aSplit[0],
					sOperator = aSplit[1],
					sValue1 = aSplit[2],
					sValue2 = aSplit[3];
				switch(sPath){
					case 'tags/text':
						aTagsInFilter.push(sValue1);
						break;
					default:
						var oFilter = new Filter(sPath, sOperator, sValue1, sValue2);
						aFilters.push(oFilter);
						break;
				}
			});

			// generate the tags custom filter
			if(aTagsInFilter.length > 0){
				var oTagsFilter = new sap.ui.model.Filter({
				    path: 'tags',
				    value1: aTagsInFilter,
				    comparator: function(aTagsPlant, aTagsInFilter_) {
				        var bTagInFilter = aTagsPlant.some(function(item){
				        	return aTagsInFilter_.includes(item.text);
				        });
				        // Comparator function returns 0, 1 or -1 as the result, which means 
				        // equal, larger than or less than; as we're using EQ, we will 
				        // return 0 if filter is matched, otherwise something else
				        return bTagInFilter ? 0 : -1;
				    },
				    operator: sap.ui.model.FilterOperator.EQ
				});	
				aFilters.push(oTagsFilter);
			}			
			
			// update filter bar
			this.byId("tableFilterBar").setVisible(aFilters.length > 0);
			this.byId("tableFilterLabel").setText(mParams.filterString);			
			
			// filter on hidden tag: this is set in the settings dialog's settings tab
			// via segmented button
			// after updating filter bar as this filter is a defaule one
			var oFilterHiddenPlants = this._getHiddenPlantsFilter();
			if(oFilterHiddenPlants){
				aFilters.push(oFilterHiddenPlants);
			}

			// apply filter settings
			oBinding.filter(aFilters);
			this.updateTableHeaderPlantsCount();
		},

		_getDialogFilter : function() {
			var oSettingsDialog = this.getView().byId('settingsDialogFilter');
			if(!oSettingsDialog){
				oSettingsDialog = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.fragments.MasterFilter", this);
				this.getView().addDependent(oSettingsDialog);
			}
			return oSettingsDialog;
        },
        
        _getHiddenPlantsFilter: function(){
        	// triggered by filter/settings dialog confirm handler
        	// generates a filter on plant's active property
        	var sHiddenPlantSettingsSelectedKey = this.byId('sbtnHiddenPlants').getSelectedKey();
        	switch(sHiddenPlantSettingsSelectedKey){
        		case 'both':
					return undefined;        			
        		case 'only_hidden':
        			return new Filter("active", FilterOperator.EQ, false);
        		default:  // only_active or undefined (settings tab not initialized, set)
        			return new Filter("active", FilterOperator.EQ, true);
        	}
        },
		
		// onFilterActive: function(evt){
		// 	// filter on plant_name and botanical_name is a multi-filter (linked with or)
		// 	// we need to keep this as is if it exists
		// 	var aFiltersNew = [];
		// 	var aActiveFilters = this.getView().byId("productsTable").getBinding('items').aApplicationFilters;
			
		// 	//find out whether we already have a multifilter on plant_name and botanical_name
		// 	for (var i = 0; i < aActiveFilters.length; i++) {
		// 	    if(aActiveFilters[i]['sPath'] === undefined){
		// 	    	//remember plant_name filter
		// 	    	var oFilterName = aActiveFilters[i];
		// 	    } else if (aActiveFilters[i]['sPath'] === "active")
		// 	    	//remember to delete current active-filter
		// 	    	var oFilterActive = aActiveFilters[i];
		// 	}
			
		// 	if(oFilterActive === undefined){
		// 		//add filter on active plants
		// 		aFiltersNew.push(new Filter("active", FilterOperator.EQ, true));
		// 		this.getView().byId('btnToggleHideInactive').setType('Transparent');
		// 	} else {
		// 		this.getView().byId('btnToggleHideInactive').setType('Emphasized');
		// 	}

		// 	if(oFilterName){
		// 		aFiltersNew.push(oFilterName);
		// 	}

		// 	//update the aggregation binding's filter
		// 	// update count in table header
		// 	this.getView().byId("productsTable").getBinding("items").filter(aFiltersNew, "Application");
		// 	this.updateTableHeaderPlantsCount();
		// },

		onAdd: function (oEvent) {
			//show the add dialog
			this._getDialogNewPlant().open();
		},
		
		_getDialogNewPlant : function() {
			var oView = this.getView();
			var oDialog = oView.byId('dialogNewPlant');
			if(!oDialog){
				oDialog = sap.ui.xmlfragment(oView.getId(), "plants.tagger.ui.view.fragments.MasterNewPlant", this);
				oView.addDependent(oDialog);
			}
			return oDialog;
        },

		onAddCancelButton: function(evt){
			this._getDialogNewPlant().close();
		},
		
		onAddSaveButton: function(evt){
			var sPlantName = this.byId("inputCreateNewPlantName").getValue();
			this._getDialogNewPlant().close();
			//check and not empty
			if (sPlantName === ''){
				MessageToast.show('Empty not allowed.');
				return;
			}
			
			//check if new
			if(this.isPlantNameInPlantsModel(sPlantName)){
				MessageToast.show('Plant Name already exists.');
				return;
			}
			
			var oModel = this.getOwnerComponent().getModel('plants');
			var aPlants = oModel.getProperty('/PlantsCollection');
			var oNewPlant = {'plant_name': sPlantName,
							 'active': true
			};
			aPlants.push(oNewPlant);  // append at end to preserve change tracking with clone 
			oModel.setProperty('/PlantsCollection', aPlants);
			// activate changes in controls
			oModel.updateBindings();
		},

		onShowSortDialog: function(evt){
			var oSortDialog = this._getFragmentSort();
			oSortDialog.open();
		},
		
		_getFragmentSort: function() {
			// shellbar menu as singleton
			if(!this._oSortDialog){
				this._oSortDialog = sap.ui.xmlfragment(this.getView().getId(), "plants.tagger.ui.view.fragments.MasterSort", this);
				this.getView().addDependent(this._oSortDialog);
			}
			return this._oSortDialog;
		},

		handleSortDialogConfirm: function (evt) {
			var oTable = this.byId("productsTable");
			var	mParams = evt.getParameters();
			var	oBinding = oTable.getBinding("items");
			var	sPath;
			var	bDescending;
			var	aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));

			// apply the selected sort and group settings
			oBinding.sort(aSorters);
		}
	});
}, true);