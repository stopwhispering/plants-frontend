sap.ui.define([],
    function() {
        'use strict';

        // we want to make this work both in dev environment and in production
        if ((window.location.hostname === "localhost") && (window.location.port === "8080")){
            // in dev environment (serving via ui5 cli as localhost:8080), we usually run the backend on localhost:5000 via pycharm
            var base_url = 'http://localhost:5000/api/';
        } else if ((window.location.hostname === "localhost") && (window.location.port !== "8080")){
            // in dev environment (testing dockerized backend as jwt-tests.localhost:80), we usually run the backend on jwt-tests.localhost:80 via traefik
            base_url = '/api/';
        } else {
            // in prod environment, we usually run the backend on any-nonlocal-host:80/443
            base_url = '/api/';
        }
    
        var constants = {
            BASE_URL: base_url
        };
    
        return constants;
    });