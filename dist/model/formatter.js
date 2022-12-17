sap.ui.define(["plants/tagger/ui/customClasses/Util"],function(e){"use strict";return{activeInactive:function(e){switch(e){case true:return"";case false:return"Status: inactive";case null:return"Status: unknown";default:return e}},countPlants:function(e){if(e!==undefined){return e.length.toString()}},addDummyIfEmpty:function(e){if(e.length===0){return"_"}else{return e}},propertyStateByType:function(e){if(e==="plant"){return"Success"}else if(e==="taxon"){return"None"}else{return"Warning"}},colorByPreviewOrNot:function(e,t){if(!!e&&!!t){var n=t.indexOf("/")===-1?"\\":"/";var r=e.split(n)[e.split(n).length-1];var u=t.split(n)[t.split(n).length-1];var a=r.split(".");a.pop();var i=u.split(".");i.pop();if(i.length>=2){i.pop()}if(i.join(".")===a.join(".")){return"blue"}}return"#E69A17"},timestampToDate:function(e){if(e==="1900-01-01"){return""}else if(e!==undefined&&e!==null&&e.length>15){return e.substr(0,10)}else{return e}},timestampToDateShort:function(e){if(e==="1900-01-01"){return""}else if(e!==undefined&&e!==null&&e.length>15){return e.substr(2,8)}else{return e}},tokenFormat:function(e,t){if(e===t){return true}else{return false}},messageCount:function(e){if(e){return e.length}else{return 0}},btnEnabledUntagged:function(e,t){return e&&!t},hasArrayItemsOrEditable:function(e,t){if(t){return true}else if(e===undefined||e===null||e.length===0){return false}else{return e.find(e=>e.text!==undefined&&e.text!==null&&e.text!=="")!==undefined}},ipniOrCustomName:function(e,t){if(t){return"Custom Entry"}else{return e}},sourceAndCount:function(e,t,n){if(!t&&!n){return e}else if(!!t&&!!n){return e+" ("+t+" +"+n+" inactive )"}else if(!!t){return e+" ("+t+")"}else if(!!n){return e+" ("+n+" inactive )"}},existsAndNotEmpty:function(e){switch(typeof e){case"string":return e.length===0?false:true;case"object":if(Array.isArray(e)){return e.length===0?false:true}else if(e===null){return false}else{return Object.keys(e).length===0?false:true}break;case"undefined":return false;case"number":return e===0?false:true;default:var t=1}return true},last_image_warning:function(t){if(t==="1900-01-01"){return true}var n=e.getDaysFromToday(t);return n>380?true:false},visibleByPropagationType:function(e){switch(e){case"seed (purchased)":return true;case"seed (collected)":return true;default:return false}},show_parent_plant_pollen_by_propagation_type:function(e){switch(e){case"seed (collected)":return true;default:return false}},show_parent_plant_by_propagation_type:function(e){switch(e){case"acquired as plant":return false;case"seed (purchased)":return false;default:return true}},visibleByGeographicOrigin:function(e){if(!!e&&e.length>=3){return true}else{return false}},objectStatusStateByTraitStatus:function(e){if(e==="lit"){return"Information"}else if(e==="lit_observed"){return"Success"}else if(e==="observed_new"){return"Warning"}},hasTraitsInTraitCategories:function(e){return Boolean(e&&e.find(e=>e.traits.length>0))},addMouseOverDelegate:function(e){var t=this;var n=this.getParent().getParent().getParent().getParent().getController();var r=n.onHoverImage;var u=n.onHoverAwayFromImage;this.addEventDelegate({onmouseover:r.bind(n,t),onmouseout:u.bind(n,t)})},createDescendantParentPollenVisibleByPropagationType:function(e){if(!e||!e.length){return false}var e=this.getSuggestionItem("propagationTypeCollection",e);return e["hasParentPlantPollen"]===true},getSrcAvatarImageS:function(t){return e.getImageUrl(t,"rem",3,3)},getSrcAvatarImageL:function(t){return e.getImageUrl(t,"rem",5,5)},getSrcImageThumbnail:function(t){return e.getImageUrl(t,"px",288,288)},getSrcImage:function(t){return e.getImageUrl(t,undefined,undefined,undefined)},getSrcImage120px:function(t){return e.getImageUrl(t,"px",120,120)},getSrcImageOccurrenceThumbnail:function(t,n,r){var u="occurrence_thumbnail?gbif_id="+t+"&occurrence_id="+n+"&img_no="+r;return e.getServiceUrl(u)},getSrcMasterHoverImage:function(t){return e.getImageUrl(t,"px",1200,800)}}},true);