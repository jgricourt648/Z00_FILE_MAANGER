onInit: function() {
    var oModel = new sap.ui.model.json.JSONModel({
        bIsFileSelected: false,
        // other properties...
    });
    this.getView().setModel(oModel);
},

onSelectionChange: function(oEvent) {
    var oSelectedItem = oEvent.getParameter("listItem");
    if (oSelectedItem) {
        var isFile = !oSelectedItem.getBindingContext().getProperty("isDirectory");
        this.getView().getModel().setProperty("/bIsFileSelected", isFile);
    }
}