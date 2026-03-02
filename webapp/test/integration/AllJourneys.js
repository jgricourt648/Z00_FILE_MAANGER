/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/pages/Worklist",
	"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/pages/Object",
	"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/pages/NotFound",
	"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/pages/Browser",
	"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/pages/App"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.sap.ca.myfilemanager.Z00_FILE_MANAGER.view."
	});

	sap.ui.require([
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/WorklistJourney",
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/ObjectJourney",
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/NavigationJourney",
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/NotFoundJourney",
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});