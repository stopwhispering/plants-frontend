sap.ui.define([
	"plants/tagger/ui/customClasses/Util"

	], function(Util) {
	"use strict";
	return {
		activeInactive: function(active) {
			switch (active) {
				case true:
					return '';
				case false:
					return 'Status: inactive';
				case null:
					return 'Status: unknown';
				default:
					return active;
			}
		},
		
		countPlants: function(plants){
			if(plants!==undefined){
				return plants.length.toString();
			}
		},
		
		addDummyIfEmpty: function(s){
			if (s.length === 0){
				return '_';
			} else {
				return s;
			}
		},
		
		propertyStateByType: function(propertyType){
			// returns an objecte status state (e.g. success for green) based on 
			// the supplied trait status; used for traits display
			if(propertyType === 'plant'){
				return 'Success';  // green
			} else if(propertyType === 'taxon'){
				return 'None';
			} else {
				return 'Warning';  //orange
			}
		},
		
		// propertyDesignByType: function(propertyType){
		// 	switch (propertyType){
		// 		case 'plant':
		// 			return 'Success';
		// 		case 'taxon':
		// 			return 'None';
		// 		default:
		// 			return 'Error';
		// 	}	
		// },
		
		colorByPreviewOrNot: function(sImage, sPlantPreviewImage){
			// if(sPlantPreviewImage !== null && sPlantPreviewImage !== undefined){
			if(!!sImage && !!sPlantPreviewImage){
				// uri may be split via forward or backward slashes
				var sSplit = (sPlantPreviewImage.indexOf('/') === -1) ? '\\' : '/';
				
				var sImageFilename = sImage.split(sSplit)[sImage.split(sSplit).length-1];
				var sPlantPreviewImageFilename = sPlantPreviewImage.split(sSplit)[sPlantPreviewImage.split(sSplit).length-1];
				// # sPlantPreviewImage has a suffix before the file type (e.g. 300_300), except temporily set
				// # just get the base filenames without suffix and file type
				var aImage = sImageFilename.split('.');
				aImage.pop();
				var aPreview = sPlantPreviewImageFilename.split('.');
				aPreview.pop();
				if (aPreview.length >= 2){
					aPreview.pop();
				}
				//if image is current preview image, then return blue, otherwise yellow
				if(aPreview.join('.') === aImage.join('.')){
					return 'blue';
				}
			}
			return '#E69A17';
		},
		
		// timestampToDateHour: function(ts){
		// 	if (!(ts === null) && ts.length > 15){
		// 		return ts.substr(0,10) + ' ' + ts.substr(11,5);  // "2018-11-10 00:35"
		// 	} else {
		// 		return ts;
		// 	}
		// },
		
		timestampToDate: function(ts){
			if (ts === '1900-01-01'){
				// dummy date if no image at all; required for correct sorting
				return '';
			} else if (ts !== undefined && ts !== null && ts.length > 15){
				return ts.substr(0,10);  // "2018-11-10"
			} else {
				return ts;
			}
		},

		timestampToDateShort: function(ts){
			if (ts === '1900-01-01'){
				// dummy date if no image at all; required for correct sorting
				return '';
			} else if (ts !== undefined && ts !== null && ts.length > 15){
				return ts.substr(2,8);  // "2018-11-10"
			} else {
				return ts;
			}
		},
		
		tokenFormat: function(key, plant_name){
			if(key===plant_name){
				return true;
			} else {
				return false;
			}
		},
		
		messageCount: function(aMessages){
			if(aMessages){
				return aMessages.length;
			} else {
				return 0;
			}
		},
		
		btnEnabledUntagged: function(midColumnVisible, endColumnVisible){
			return (midColumnVisible && !endColumnVisible);
		},
		
		hasArrayItemsOrEditable: function(aData, bEditable){
		// expects array as input; returns true if at least oneo item is not null;
		// if bEditable, then return true
			if(bEditable){
				return true;
			} else if (aData === undefined || aData === null || aData.length === 0){
				return false;
			} else {
				return (aData.find(ele => (ele.text !== undefined && ele.text !== null && ele.text !== '')) !== undefined)
				// for (var i = 0; i < aData.length; i++){
				// 	if (aData[i].text !== undefined && aData[i].text !== null && aData[i].text !== ''){
				// 		return true;
				// 	}
				// }
				// return false;
			}
		},
				
		ipniOrCustomName: function(fqId, is_custom){
			if(is_custom){
				return 'Custom Entry';
			} else {
				return fqId;
			}
		},
		
		sourceAndCount: function(sSource, iCount, iCountInactive){
			if (!iCount && !iCountInactive){
				return sSource;
			} else if (!!iCount && !!iCountInactive){
				return sSource + ' (' +  iCount + ' +' + iCountInactive + ' inactive )';
			} else if (!!iCount){
				return sSource + ' (' + iCount + ')';
			} else if (!!iCountInactive){
				return sSource + ' (' + iCountInactive + ' inactive )';
			}
		},
		
		existsAndNotEmpty: function(obj){
			switch (typeof(obj)){
				case 'string':
					return (obj.length === 0) ? false : true;

				// object might be an array, dict or null object
				case 'object':
					if(Array.isArray(obj)){
						return (obj.length === 0) ? false : true;
					} else if (obj === null){
						return false;	
					} else {
						// probably dict
						return (Object.keys(obj).length === 0) ? false : true;
					}
					break;
					
				case 'undefined':
					return false;

				case 'number':
					return (obj === 0) ? false : true;
					
				 default:
					var a = 1;
			}
			return true;
		},
		
		// ArrayLength: function(aArray){
		// 	if(aArray === null || aArray === undefined){
		// 		return 0;
		// 	}
		// 	return aArray.length;
		// },
		
		last_image_warning: function(sLastImageDate){
			//we always get a day; if we don't have one, backend supplies "1900-01-01"
			if(sLastImageDate==="1900-01-01"){
				return true;
			}
			var iDaysSince = Util.getDaysFromToday(sLastImageDate);
			return (iDaysSince > 380) ? true : false;
		},

		// // todo redo this functionality or remove it
		// avatarSrc: function(oPlant, sPreviewImage){
		// 	// updated when filter/settings confirmed, sets chosen preview image in plants table
		// 	// default: favourite image; set in component
		// 	switch (sPreviewImage){
		// 		case 'favourite_image':
		// 			return oPlant.url_preview;
		// 		case 'latest_image':
		// 			try{
		// 				return oPlant.latest_image.path_thumb;
		// 			} catch(e) {
		// 				return undefined;	
		// 			}
		// 	}
		// },
		
		visibleByPropagationType: function(sPropagationType){
			switch (sPropagationType){
				case 'seed (purchased)':
					return true;
				case 'seed (collected)':
					return true;
				default:
					return false;
			}		
		},

		// todo replace
		show_parent_plant_pollen_by_propagation_type: function(sPropagationType){
			switch (sPropagationType){
				case 'seed (collected)':
					return true;
				default:
					return false;
			}
		},

		// todo replace
		show_parent_plant_by_propagation_type: function(sPropagationType){
			switch (sPropagationType){
				case 'acquired as plant':
					return false;
				case 'seed (purchased)':
					return false;
				default:
					return true;
			}
		},
		
		visibleByGeographicOrigin: function(sGeographicOrigin){
			if (!!sGeographicOrigin && sGeographicOrigin.length >= 3){
				return true;
			} else {
				return false;
			}
		},
		
		// showHideLastImageDateCol: function(iLayoutBeginColumnSize, bDeviceTablet){
		// 	return (iLayoutBeginColumnSize >= 33 && !bDeviceTablet) ? true : false;
		// },

		objectStatusStateByTraitStatus: function(sStatus){
			// returns an objecte status state (e.g. success for green) based on 
			// the supplied trait status; used for traits display
			if(sStatus === 'lit'){
				return 'Information';  //dark blue
			} else if(sStatus === 'lit_observed'){
				return 'Success';
			} else if(sStatus === 'observed_new') {
				return 'Warning';  //orange
			}
		},

		hasTraitsInTraitCategories: function(trait_categories){
			return Boolean(trait_categories && trait_categories.find(c => c.traits.length > 0));
		},
		
		addMouseOverDelegate: function(sDummy){
			// to get <<this>> to be the control itself, add the <<true>> at the very bottom and make
			// sure to declare the formatter function with full namespace, not with .Formatter...
			
			// this still is a disgusting piece of code
			var oControl = this;
			var oController = this.getParent().getParent().getParent().getParent().getController();
			var fn_open = oController.onHoverImage;
			var fn_close = oController.onHoverAwayFromImage;
			this.addEventDelegate({
			  onmouseover: fn_open.bind(oController, oControl),
			  onmouseout: fn_close.bind(oController, oControl)
			});
		},

		createDescendantParentPollenVisibleByPropagationType: function(propagationType){
			if (!propagationType || !propagationType.length){
				// undefined or empty string
				return false;
			}

			var propagationType = this.getSuggestionItem('propagationTypeCollection', propagationType);
			return propagationType['hasParentPlantPollen'] === true;
		},

		getSrcAvatarImageS: function(filename_previewimage){
			// get url for image in avatar size s (default), i.e. 3 rem
			return Util.getImageUrl(filename_previewimage, 'rem', 3, undefined);
		},

		getSrcAvatarImageL: function(filename_previewimage){
		// get url for image in avatar size l, i.e. 5 rem{
			return Util.getImageUrl(filename_previewimage, 'rem', 5, undefined);
		},

		getSrcImageThumbnail: function(filename){
			// get url for image in thumbnail size for details images list
			return Util.getImageUrl(filename, 'px', 288, 288);
		},

		getSrcImage: function(filename){
			// get url for image in full size
			return Util.getImageUrl(filename, undefined, undefined, undefined);
		},

		getSrcImage120px: function(filename){
			// get url for thumbnail image in taxon images list
			return Util.getImageUrl(filename, 'px', 120, 120);
		},

		getSrcImageOccurrenceThumbnail: function(gbif_id, occurrence_id, img_no){
			// get url for thumbnail image in taxon images list for occurrences
			var path = 'occurrence_thumbnail?gbif_id=' + gbif_id + '&occurrence_id=' + occurrence_id + '&img_no=' + img_no;
			return Util.getServiceUrl(path);
		},

		getSrcMasterHoverImage: function(filename){
			// get url for image in preview popup openened when hovering in master list
			return Util.getImageUrl(filename, 'px', 1200, 800);
		}

	};
}, true);