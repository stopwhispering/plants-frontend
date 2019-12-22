sap.ui.define(
	[
		'jquery.sap.global',
		'sap/ui/core/Control',
		'./library'
	],

	function(jQuery, Control, library) {
		"use strict";

		var LeafletMap = Control.extend('custom.map.LeafletMap', {

			// metadata section defines the API of the control (properties, events, aggregations; automatically
			// creates convenience functions)
			metadata: {
				library: 'custom.map',
				properties: {
					"width": {
						type: 'sap.ui.core.CSSSize',
						defaultValue: '800px'
					},
					"height": {
						type: 'sap.ui.core.CSSSize',
						defaultValue: '500px'
					},
					"geoJsonHighlights": {
						type: 'string[]'
					},
					"highlightColor": {
						type: 'string',
						defaultValue: '#ff7800'
					},
					"permanentTooltips": {
						type: 'boolean',
						defaultValue: true
					},
					"drawOpenStreetMap": {
						type: 'boolean',
						defaultValue: true
					},
					"drawGeoJsonMap": {
						type: 'boolean',
						defaultValue: false
					},
					"defaultZoomLevel": {
						type: 'int',
						defaultVlaue: 4
					},
					"autoZoom": {
						type: 'boolean',
						defaultValue: true
					},
					"autoPanToSelectedAreas": {
						type: 'boolean',
						defaultValue: true
					},
					"geoJsonUrl": {
						type: 'string',
						defaultValue: "./custom/map/level3.geojson"
					}
				}
			}
		});

		LeafletMap.prototype.setGeoJsonHighlights = function(aGeoJsonHighlights) {
			//we need this setter method as otherwise upon upbdate bindings nothing happens

			//we need to set this manually as we are overwriting the default setter method
			this.setProperty('geoJsonHighlights', aGeoJsonHighlights);

			//used as event handler when updating binding after initialization
			//called directly at first call
			if (this.geoJsonData) {
				this._resetGeoJsonLayers();
				this.highlightAreas(aGeoJsonHighlights, this.getPermanentTooltips);
			}
		};

		LeafletMap.prototype.setDrawGeoJsonMap = function(bDrawGeoJsonMap) {
			this.setProperty('drawGeoJsonMap', bDrawGeoJsonMap);
			if (this.geoJsonData) {
				this._drawGeoJson(bDrawGeoJsonMap);
			}
		};

		LeafletMap.prototype.onAfterRendering = function() {
			// initialize blank map
			this.map = L.map('map').setView([51.505, -0.09], this.getDefaultZoomLevel()); //pos, zoom-level;  store globally (there is probably a better way...)
			// load geojson data, optionally draw full map
			this._initTdwg(
				this.getDrawGeoJsonMap(),
				this.getGeoJsonHighlights()
			);

			// optionally draw openstreetmaps map of the world, 
			// enhanced with mapbox (requiring token)
			if (this.getDrawOpenStreetMap()) {
				this._drawGeoOpenStreetMaps();
			}

		};

		LeafletMap.prototype._initTdwg = function(bDrawGeoJsonMap, aGeoJsonHighlights) {
			// get Biodiversity Information Standards borders (level 3)
			// see https://en.wikipedia.org/wiki/List_of_codes_used_in_the_World_Geographical_Scheme_for_Recording_Plant_Distributions
			$.ajax({
				url: this.getGeoJsonUrl(),
				dataType: 'json',
				context: this,
				complete: function(data) {
					this.geoJsonData = data.responseJSON;
					if (bDrawGeoJsonMap) {
						this._drawGeoJson();
					}
					if (aGeoJsonHighlights) {
						//first binding
						this.setGeoJsonHighlights(aGeoJsonHighlights);
					}
				}
			});
		};

		LeafletMap.prototype._drawGeoOpenStreetMaps = function() {
			L.tileLayer(
				'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoic3RvcHdoaXNwZXJpbmciLCJhIjoiY2s0NndjMng3MGhldjNrbXRhamd5Mmx1cSJ9.Bv6oFVlzXQk23TGRmwqvFg', {
					attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
					maxZoom: 18,
					id: 'mapbox/streets-v11',
					accessToken: 'pk.eyJ1Ijoic3RvcHdoaXNwZXJpbmciLCJhIjoiY2s0NndjMng3MGhldjNrbXRhamd5Mmx1cSJ9.Bv6oFVlzXQk23TGRmwqvFg'
				}).addTo(this.map);
		};

		LeafletMap.prototype._drawGeoJson = function() {
			var myStyle = {
				"color": "#925522", //color of border
				"weight": 1, //thickness of border
				"opacity": 0.65, //opacity of border
				"fill": true, //fill area 
				"fillColor": "#ffffef", //default: border color
				"fillOpacity": 1.0
			};

			if (this.oGeoJson) {
				this.oGeoJson.removeFrom(this.map);
			}
			this.oGeoJson = L.geoJSON(this.geoJsonData, {
				style: myStyle
			}).addTo(this.map);
		};

		LeafletMap.prototype.highlightAreas = function(aAreas, bPermanentTooltips) {
			var myStyle = {
				"color": this.getHighlightColor(), //color of border
				"weight": 1, //thickness of border
				"opacity": 0.65, //opacity of border
				"fill": true, //fill area 
				// "fillColor": //default: border color
				"fillOpacity": 0.2
			};

			var aAreaGeoJson = this.geoJsonData.features.filter(function(element) {
				return aAreas.includes(element.properties.LEVEL3_COD);
			});
			if (!aAreaGeoJson.length) {
				return;
			}

			aAreaGeoJson.forEach(function(oAreaGeoJson) {
				L.geoJSON(oAreaGeoJson, {
						style: myStyle
					})
					.bindTooltip(oAreaGeoJson.properties.LEVEL3_NAM + ' (' + oAreaGeoJson.properties.LEVEL3_COD + ')', {
						permanent: bPermanentTooltips,
						offset: [0, 0]
					})
					.addTo(this.map);
			}, this);

			this._panToCenterAndSetZoom();
		};

		LeafletMap.prototype._getGeoJsonLayers = function(bIncludeTooltips) {
			var aLayerIds = Object.keys(this.map._layers);
			var aGeoJsonLayers = [];
			aLayerIds.forEach(function(iLayerId) {
				if (this.map._layers[iLayerId].feature) {
					aGeoJsonLayers.push(this.map._layers[iLayerId]);
				} else if (bIncludeTooltips && this.map._layers[iLayerId]._tooltip) {
					aGeoJsonLayers.push(this.map._layers[iLayerId]);
				}
			}, this);
			return aGeoJsonLayers;
		};

		LeafletMap.prototype._resetGeoJsonLayers = function() {
			var aGeoJsonLayers = this._getGeoJsonLayers(true);
			for (var i = 0; i < aGeoJsonLayers.length; i++) {
				aGeoJsonLayers[i].remove();
			}
		};

		LeafletMap.prototype._getMinOrMax = function(aMinMax, key, sign) {
			if (sign === 'min') {
				var oMin = aMinMax.reduce(function(p, v) {
					return (p[key] < v[key] ? p : v);
				});
				return oMin[key];
			} else if (sign === 'max') {
				var oMax = aMinMax.reduce(function(p, v) {
					return (p[key] > v[key] ? p : v);
				});
				return oMax[key];
			}
		};

		LeafletMap.prototype._panToCenterAndSetZoom = function() {

			var aGeoJsonLayers = this._getGeoJsonLayers(false);
			if (!aGeoJsonLayers) {
				return;
			}

			if (this.getAutoPanToSelectedAreas()) {
				// get min/max among all polygons
				var aMinMax = [];
				for (var i = 0; i < aGeoJsonLayers.length; i++) {
					//convert
					var aFlattened = aGeoJsonLayers[i]._latlngs.flat(2);
					for (var j = 0; j < aFlattened.length; j++) {
						aFlattened[j] = [aFlattened[j].lng, aFlattened[j].lat];
					}
					var aTransposed = this._transpose(aFlattened);
					aMinMax.push(this._getMinMaxOfPolygon(aTransposed));
				}
				// total min/max on x and y axis
				var min_x = this._getMinOrMax(aMinMax, 'min_x', 'min');
				var min_y = this._getMinOrMax(aMinMax, 'min_y', 'min');
				var max_x = this._getMinOrMax(aMinMax, 'max_x', 'max');
				var max_y = this._getMinOrMax(aMinMax, 'max_y', 'max');

				// pan to the center
				// to do in some spare time: consider that the earth is round
				var x_avg = (min_x + max_x) / 2;
				var y_avg = (min_y + max_y) / 2;

				if (this.getAutoZoom()) {
					// make sure zoom level hase everything in visible area
					var iSpanX = max_x - min_x;
					var iSpanY = max_y - min_y;
					var iCurrentSpanX = this.map.getBounds().getEast() - this.map.getBounds().getWest();
					var iCurrentSpanY = this.map.getBounds().getNorth() - this.map.getBounds().getSouth();

					if (iSpanX <= iCurrentSpanX && iSpanY <= iCurrentSpanY) {
						// default zoom level if that fits
						this.map.setView([y_avg, x_avg], this.getDefaultZoomLevel());
					} else {
						// zoom up if required
						var mLatLngCoveringAll = [
							[min_y, min_x],
							[max_y, max_x]
						];
						this.map.fitBounds(mLatLngCoveringAll);
					}
				} else {
					this.map.panTo({
						lng: x_avg,
						lat: y_avg
					});
				}
			}
		};

		// LeafletMap.prototype._getCenterOfPolygon = function(oFeature) {
		// 	// todo: asdf 
		// 	var aFlattened = oFeature.geometry.coordinates.flat(2);
		// 	var aTransposed = this._transpose(aFlattened);
		// 	var mMinMax = this._getMinMaxOfPolygon(aTransposed);
		// 	return {
		// 		x_center: (mMinMax.min_x + mMinMax.max_x) / 2,
		// 		y_center: (mMinMax.min_y + mMinMax.max_y) / 2
		// 	};
		// };

		LeafletMap.prototype._getMinMaxOfPolygon = function(aLatLng) {

			var arrayMin = function(arr) {
				return arr.reduce(function(p, v) {
					return (p < v ? p : v);
				});
			};

			var arrayMax = function(arr) {
				return arr.reduce(function(p, v) {
					return (p > v ? p : v);
				});
			};

			var mMinMax = {
				min_x: arrayMin(aLatLng[0]),
				max_x: arrayMax(aLatLng[0]),
				min_y: arrayMin(aLatLng[1]),
				max_y: arrayMax(aLatLng[1]),
			};

			// console.log('X: '+min_x+' to '+max_x+' y: '+min_y+' to '+max_y);
			return mMinMax;
		};

		LeafletMap.prototype._transpose = function(matrix) {
			// transpose 2-d array
			// no map functions in web ide
			var rows = matrix.length,
				cols = matrix[0].length;
			var grid = [];
			for (var j = 0; j < cols; j++) {
				grid[j] = Array(rows);
			}
			for (var i = 0; i < rows; i++) {
				for (j = 0; j < cols; j++) {
					grid[j][i] = matrix[i][j];
				}
			}
			return grid;
		};

		return LeafletMap;
	}, true);