sap.ui.define([
    "sap/ui/base/Object",
	"sap/m/MessageToast",
	"sap/ui/model/FilterType",
	'sap/ui/model/Filter',
	"sap/ui/model/FilterOperator",
  
  ], function(Object, MessageToast, FilterType, Filter, FilterOperator) {
        "use strict";
        
    var _instance;
    var services= Object.extend("plants.tagger.ui.customClasses.TraitUtil",{
    
        constructor: function(){
        },		
		
		onEditTraitPressRemoveTrait: function(evt){
			// triggered in fragment to eddit or delete trait
			// removes the trait from plant's taxon in the taxon model

			// get the trait's category
			this._applyToFragment('dialogEditTrait', (o)=>{
				var sPathTrait = o.getBindingContext('taxon').getPath();
				var sPathCategory = sPathTrait.substr(0, sPathTrait.indexOf('/traits/'));
				var oModel = o.getModel('taxon');
				var oCategory = oModel.getProperty(sPathCategory);
				
				// get index of the trait to be deleted among the category's traits
				var oTrait = o.getBindingContext('taxon').getObject();
				var iIndex = oCategory.traits.indexOf(oTrait);
				
				// remove the trait from the lits of the category's traits
				oCategory.traits.splice(iIndex, 1);
				oModel.updateBindings();
				
				o.close();
			});
		},
		
		onBtnChangeTraitType: function(sStatus, evt){
			// triggered by selecting one of the trait type buttons in the trait edit popover
			var oTrait = this._oEditTraitFragment.getBindingContext('taxon').getObject();
			oTrait.status = sStatus;
			// re-apply formatter function to trait's objectstatus 
			this._applyToFragment('dialogEditTrait', (o)=>{
				o.getModel('taxon').updateBindings();				
				o.close();
			});
		},
		
		onPressTrait: function(evt){
			// show fragment to edit or delete trait
			var oTrait = evt.getSource();  // for closure
			var sPathTrait = oTrait.getBindingContext('taxon').getPath();
			
			this._applyToFragment('dialogEditTrait', (o)=>{
				o.bindElement({ path: sPathTrait,
							    model: "taxon" });				
				o.openBy(oTrait);
			});	
		},
		
		onPressAddTrait: function(evt){
			// triggered by add button for new trait in traits fragment
			// after validation, add trait to internal model
			// trait is added to db in backend only upon saving
			// additionally, we add the trait to the proposals model
			
			var sTraitCategoryKey = this.byId('newTraitCategory').getSelectedKey();
			var sTraitCategory = this.byId('newTraitCategory')._getSelectedItemText();
			var sTrait = this.byId('newTraitTrait').getValue().trim();
			// var bObserved = this.byId('newTraitObserved').getSelected();
			var sStatus = this.byId('newTraitStatus').getSelectedKey();
			
			
			// check if empty 
			if(sTrait.length === 0){
				MessageToast.show('Enter trait first.');
				return;
			}

			// check if same-text trait already exists for that taxon
			var oTaxon = this.getView().getBindingContext('taxon').getObject();
			
			if(oTaxon.trait_categories){
				var oCatFound = oTaxon.trait_categories.find(function(oCatSearch){
					return oCatSearch.id.toString() === sTraitCategoryKey;
				});
				
				if (oCatFound){
					var oTraitFound = oCatFound.traits.find(function(oTraitSearch){
						return oTraitSearch.trait === sTrait;
					});
					
					if(oTraitFound){
						MessageToast.show('Trait already assigned.');
						return;			
					}
				}
			}
			
			// create trait category object within taxon if required
			if (!oTaxon.trait_categories){
				oTaxon.trait_categories = [];
			}

			if (!oCatFound){
				oCatFound = {
					id: sTraitCategoryKey,
					category_name: sTraitCategory
				};
				oTaxon.trait_categories.push(oCatFound);
			}
			
			// create new trait object in taxon model
			var dNewTrait = {
					id: undefined,
					status: sStatus,
					// observed: bObserved,
					trait: sTrait };
			if (oCatFound.traits){
				oCatFound.traits.push(dNewTrait);	
			} else {
				oCatFound.traits = [dNewTrait];
			}
			
			this.getView().getBindingContext('taxon').getModel().updateBindings();
		},

		onLiveChangeNewTraitTrait: function(evt){
			// as we set the filter on the trait proposals in the category change event (see
			// onChangeNewTraitCategory), we have a problem with the initially selected category;
			// we can't set the filter in this controller's initialization as the proposals are
			// loaded async. we could use a promise, but we're going the easy way here and set the
			// initial filter upon entering something in the traits input for the first time
			var oInput = evt.getSource();
			var aFilters = oInput.getBinding("suggestionItems").aApplicationFilters;
			var sSelectedCategoryKey = this.byId('newTraitCategory').getSelectedKey();
			
			if(aFilters.length === 0 && !!sSelectedCategoryKey){
				this.TraitUtil._filterNewTraitInputPropopsalsByTraitCategory(sSelectedCategoryKey);
			}
		},
		
		onChangeNewTraitCategory: function(evt){
			// triggered by selecting/chaning category for new trait in traits fragment
			// here, we filter the proposals in the traits input on the selected category's traits
			// get category selectd
			var oSelectedItem = evt.getParameter('selectedItem');
			var sSelectedCategoryKey = oSelectedItem.getProperty('key');
			this.TraitUtil._filterNewTraitInputPropopsalsByTraitCategory(sSelectedCategoryKey);
		},
		
		_filterNewTraitInputPropopsalsByTraitCategory: function(sTraitCategoryId){
			// filter suggestion items for trait input on selected category 
			var aFilters = [
			  new Filter({
			    path: "trait_category_id",
			    operator: FilterOperator.EQ,
			    value1: sTraitCategoryId
			  })
			];
			var oBinding = this.getView().byId("newTraitTrait").getBinding("suggestionItems");
			oBinding.filter(aFilters, FilterType.Application);				
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