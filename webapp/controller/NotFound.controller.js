sap.ui.define([
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("com.sap.ca.myfilemanager.Z00_FILE_MANAGER.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);