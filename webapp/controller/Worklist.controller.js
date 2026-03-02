/*global location history */
sap.ui.define([
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"com/sap/ca/myfilemanager/Z00_FILE_MANAGER/model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/core/Fragment"
	], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, Fragment) {
		"use strict";

		return BaseController.extend("com.sap.ca.myfilemanager.Z00_FILE_MANAGER.controller.Worklist", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit : function () {
				var oViewModel,
					iOriginalBusyDelay,
					oTable = this.byId("table");

				// Put down worklist table's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the table is
				// taken care of by the table itself.
				
//				iOriginalBusyDelay = oTable.getBusyIndicatorDelay();

				// keeps the search state
				this._aTableSearchState = [];
				
				this._oTreeTable = this.byId("idDirectoryTable");

                this.getOwnerComponent().getModel().metadataLoaded().then(
                    function() {
                         this._onObjectMatched();
                    }.bind(this)
                ); 				
				

				// Model used to manipulate control states
				oViewModel = new JSONModel({
					worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
					saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
					shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
					shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
					shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
					tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
					tableBusyDelay : 0,
					busy: false,
    			    delay: 0,					
					sDetailWidth: "0%",
					sMainWidth: "100%",
					bResizable: false,
					showFiles: false,
				});
				this.setModel(oViewModel, "worklistView");

				// Make sure, busy indication is showing immediately so there is no
				// break after the busy indication for loading the view's meta data is
				// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
/*				oTable.attachEventOnce("updateFinished", function(){
					// Restore original busy indicator delay for worklist's table
					oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
				});*/
				// Add the worklist page to the flp routing history
				this.addHistoryEntry({
					title: this.getResourceBundle().getText("worklistViewTitle"),
					icon: "sap-icon://table-view",
					intent: "#MyFileManager-display"
				}, true);
			},
		
		
		_onObjectMatched : function () {
//            var sObjectId =  this.getModel("detailView").getProperty("/requestID");
 //           sObjectId = "2025-03-000002";
			var sObjectId = "/usr/sap/";
  

            this.getOwnerComponent().getModel().metadataLoaded().then( function() {

                if( sObjectId ){
                    var sObjectPath = this.getOwnerComponent().getModel().createKey("FileSet", {
                                          NodeID :  sObjectId
                                    });
                    this._bindView("/" + sObjectPath);
                } 
            }.bind(this));
       },
       
        _bindView : function (sObjectPath) {
        		
        		var that = this;
        		var oViewModel = this.getModel("worklistView");
				oViewModel.setProperty("/busy", true);   
				
		        this.getOwnerComponent().getModel().read("/FileSet", {
		        success: function(oData) {
		            // 2. Création d'un modèle JSON avec les résultats
		            var oJsonModel = new sap.ui.model.json.JSONModel();
		            
		            var aTreeData = that._transformFlatToHierarchy(oData.results);
		            
		            // UI5 a besoin d'une structure hiérarchique pour le JSONModel Tree
		            // Ou alors, on utilise un Flat-to-Hierarchy si nécessaire.
		            // Mais le plus simple pour une TreeTable JSON est de passer par le format attendu :
		            oJsonModel.setData({
		                FileTree: aTreeData
		            });
		            
		            that.getView().setModel(oJsonModel, "dataModel");
		            oViewModel.setProperty("/busy", false);
		        },
		        error: function(oError) {
		        	oViewModel.setProperty("/busy", false);
		            console.error("Erreur de chargement", oError);
		        }
		    });	
        },
        
		_transformFlatToHierarchy: function(aFlatData) {
		    var nodes = [];
		    var map = {};
		    
		    // 1. Nettoyage et Map
		    aFlatData.forEach(function(node, index) {
		        node.nodes = []; 
		        // Nettoyage crucial : suppression des espaces et normalisation
		        var sId = node.NodeID ? node.NodeID.trim() : "";
		        map[sId] = index;
		    });
		
		    // 2. Construction de l'arbre
		    aFlatData.forEach(function(node) {
		        var sParent = node.ParentID ? node.ParentID.trim() : "";
		        node.Size = parseInt(node.Size, 10);
		        
		        // ATTENTION : Si le ParentID est le même que le NodeID, on ignore pour éviter l'infini
		        if (sParent !== "" && sParent !== node.NodeID.trim() && map[sParent] !== undefined) {
		            aFlatData[map[sParent]].nodes.push(node);
		        } else {
		            // Si c'est un nœud racine
		            nodes.push(node);
		        }
		    });
		
		    console.log("Arbre construit :", nodes);
		    return nodes;
		} ,  
       
			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */
			
			onOpenFileViewer: function (oEvent) {
				var oTable = this.byId("idDetailTable");
				    var iSelectedIndex = oTable.getSelectedIndex();
				    var oViewModel = this.getModel("worklistView");
				
				    // 1. Vérifier si une ligne est sélectionnée
				    if (iSelectedIndex === -1) {
				        sap.m.MessageToast.show("Veuillez sélectionner un fichier dans la liste.");
				        return;
				    }
				
				    // 2. Récupérer les données de la ligne
				    var oContext = oTable.getContextByIndex(iSelectedIndex);
				    var oData = oContext.getObject();
				
				    // 3. Contrôler le type : On ne peut pas ouvrir un répertoire ("D")
				    if (oData.Type === "D") {
				        sap.m.MessageBox.warning(
				            "L'aperçu n'est pas disponible pour les répertoires. Veuillez sélectionner un fichier."
				        );
				        return;
				    }
				
				    // 4. Si c'est bien un fichier, on lance le viewer (méthode Media Stream définie précédemment)
				    // On utilise le NodeID et le Name issus de votre modèle
				    this._loadFileViaMediaStream(oData.NodeID, oData.Name);				
			},
			
			_loadFileViaMediaStream: function (sNodeID, sFileName) {
			    var oModel = this.getOwnerComponent().getModel();
			    var oViewModel = this.getModel("worklistView");
			
			    oViewModel.setProperty("/busy", true);
			    
			    // Construction de l'URL Media Stream ($value) basée sur le NodeID
			    var sKey = oModel.createKey("/FileContentSet", {
			        FileName: sNodeID
			    });
			    var sMediaUrl = oModel.sServiceUrl + sKey + "/$value";
			
			    jQuery.ajax({
			        url: sMediaUrl,
			        method: "GET",
			        dataType: "text",
			        success: function (sRawText) {
					    this._openViewerPopup(sRawText, sFileName);
			            oViewModel.setProperty("/busy", false);
			        }.bind(this),
			        error: function (oError) {
			            oViewModel.setProperty("/busy", false);
			            sap.m.MessageBox.error("Impossible de charger le contenu du fichier.");
			        }
			    });
			},	
			
			_openViewerPopup: function (sContent, sFileName) {
				var oView = this.getView();
				    
				    if (!this._pViewerDialog) {
				        this._pViewerDialog = Fragment.load({
				            id: oView.getId(),
				            name: "com.sap.ca.myfilemanager.Z00_FILE_MANAGER.view.fragment.FileViewer",
				            controller: this
				        }).then(function (oDialog) {
				            oView.addDependent(oDialog);
				            oDialog.setModel(new sap.ui.model.json.JSONModel(), "viewer");
				            return oDialog;
				        });
				    }
				
				    this._pViewerDialog.then(function (oDialog) {
				        var sExtension = sFileName.split('.').pop().toLowerCase();
				        var sEditorType = this._getEditorType(sExtension);
				        var oModel = oDialog.getModel("viewer"); // On récupère bien le modèle ici
				
				        // Mise à jour des données
				        oModel.setData({
				            title: "Aperçu : " + sFileName,
				            content: sContent,
				            type: sEditorType
				        });
				        
				        oDialog.open();
				
				        // ASTUCE : Le CodeEditor a besoin d'un rafraîchissement manuel 
				        // une fois que le DOM de la popup est réellement prêt.
				        setTimeout(function() {
				            var oEditor = oView.byId("myCodeEditor"); // Ajoute un ID dans le fragment
				            if (oEditor) {
				                oEditor.focus(); // Force le focus pour réveiller l'éditeur
				            }
				        }, 200);
				
				    }.bind(this));
			},
			
			_getEditorType: function(sExt) {
			    var mTypes = { "xml": "xml", "js": "javascript", "abap": "abap", "json": "json" };
			    return mTypes[sExt] || "text";
			},
			
			onCloseViewer: function () {
			    this._pViewerDialog.then(function (oDialog) {
			        // Nettoyage immédiat du contenu pour libérer la mémoire
			        oDialog.getModel("viewer").setProperty("/content", "");
			        oDialog.close();
			    });
			},			
			

			onToggleFiles: function (oEvent) {
				var bShowFiles = oEvent.getParameter("pressed"); // true si on veut voir les fichiers
				    var oTable = this.byId("idDirectoryTable");
				    var oBinding = oTable.getBinding("rows");
				    var aFilters = [];
				
				    if (!bShowFiles) {
				        // L'utilisateur ne veut voir QUE les répertoires
				        // On crée un filtre : Type égal à "D"
				        var oDirectoryFilter = new sap.ui.model.Filter("Type", sap.ui.model.FilterOperator.EQ, "D");
				        aFilters.push(oDirectoryFilter);
				    }
				
				    // On applique le tableau de filtres (vide si on affiche tout)
				    oBinding.filter(aFilters, "Application");
			},

			/**
			 * Triggered by the table's 'updateFinished' event: after new table
			 * data is available, this handler method updates the table counter.
			 * This should only happen if the update was successful, which is
			 * why this handler is attached to 'updateFinished' and not to the
			 * table's list binding's 'dataReceived' method.
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */
			onUpdateFinished : function (oEvent) {
				// update the worklist's object counter after the table update
				var sTitle,
					oTable = oEvent.getSource(),
					iTotalItems = oEvent.getParameter("total");
				// only update the counter if the length is final and
				// the table is not empty
				if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
					sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
				} else {
					sTitle = this.getResourceBundle().getText("worklistTableTitle");
				}
				this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
			},

			/**
			 * Event handler when a table item gets pressed
			 * @param {sap.ui.base.Event} oEvent the table selectionChange event
			 * @public
			 */
			 
			onSelectionChange: function (oEvent) {
				// 1. Récupérer l'index de la ligne sélectionnée via les paramètres de l'événement
				    // var iSelectedIndex = oEvent.getParameter("rowIndex");
				    var oTable = oEvent.getSource();
				    var iSelectedIndex = oTable.getSelectedIndex();
				    var oViewModel = this.getView().getModel("worklistView");
				
				    // 2. Vérifier si une ligne est réellement sélectionnée
				    // (iSelectedIndex est -1 si l'utilisateur désélectionne ou clique dans le vide)
				    if (iSelectedIndex === -1 || iSelectedIndex === undefined) {
				        oViewModel.setProperty("/sDetailWidth", "0%");
				        oViewModel.setProperty("/sMainWidth", "100%");	
				        oViewModel.setProperty("/bResizable", false);
				        return;
				    }
				
				    // 3. Récupérer le contexte de données (le "binding context") à cet index
				    var oContext = oTable.getContextByIndex(iSelectedIndex);
				    if (!oContext) return;
				
				    var oData = oContext.getObject();
				
				    // 3. Si c'est un dossier (Type "D"), on le déplie
				    if (oData.Type === "D") {
				        // La méthode expand prend l'index de la ligne
				        oTable.expand(iSelectedIndex);
				    }				    
				    
				
				    if (oContext) {
				        // 5. Afficher le panneau de droite
				        oViewModel.setProperty("/sDetailWidth", "67%");
				        oViewModel.setProperty("/sMainWidth", "33%");
				        oViewModel.setProperty("/bResizable", true);
				        
					    this.byId("idDetailTable").setBindingContext(oContext, "dataModel");				        
				        
				    } else {
				        // Si aucun contexte n'est trouvé, on cache le panneau
				        oViewModel.setProperty("/sDetailWidth", "0%");
				        oViewModel.setProperty("/sMainWidth", "100%");	
				        oViewModel.setProperty("/bResizable", false);
				    }
			},
			

			onSearchDetail: function (oEvent) {
			    // 1. Récupérer la valeur saisie (query)
			    var sQuery = oEvent.getParameter("query");
			    if (!sQuery) {
			        // Si le champ est vide (croix cliquée), on récupère la valeur via newValue
			        sQuery = oEvent.getParameter("newValue");
			    }
			
			    // 2. Récupérer le binding de la table de détail
			    var oTable = this.byId("idDetailTable");
			    var oBinding = oTable.getBinding("rows");
			    
			    var aFilters = [];
			
			    if (sQuery && sQuery.length > 0) {
			        // 3. Créer les filtres (Recherche insensible à la casse par défaut)
			        var oFilterName = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sQuery);


			
			        // On regroupe les deux filtres avec un "OU" (OR)
			        var oCombinedFilter = new sap.ui.model.Filter({ filters: [oFilterName]});
			        
			        aFilters.push(oCombinedFilter);
			    }
			
			    // 4. Appliquer le filtre au binding
			    oBinding.filter(aFilters, "Application");
			},		
			
			onCloseDetail: function () {
			    // Masquer le panneau (le Tree repassera à 100% automatiquement)
				        oViewModel.setProperty("/sDetailWidth", "0%");
				        oViewModel.setProperty("/sMainWidth", "100%");	
				        oViewModel.setProperty("/bResizable", false);
			},			 
			 
			onPress : function (oEvent) {
				// The source is the list item that got pressed
				this._showObject(oEvent.getSource());
			},

			onAnalyseSpace: function() {
				var oTable = this.byId("idDirectoryTable");
				    var iIndex = oTable.getSelectedIndex();
				    
				    if (iIndex === -1) {
				        sap.m.MessageToast.show("Veuillez sélectionner un dossier");
				        return;
				    }
				
				    var oSelectedNode = oTable.getContextByIndex(iIndex).getObject();
				
				    // 1. Initialisation propre du modèle s'il n'existe pas
				    if (!this.getView().getModel("analysisModel")) {
				        var oAnalysisModel = new sap.ui.model.json.JSONModel({
				            items: [],
				            title: "",
				            totalSize: ""
				        });
				        this.getView().setModel(oAnalysisModel, "analysisModel");
				    }
				
				    // 2. Appel de la mise à jour (C'est ici que originalNode est injecté)
				    this._updateAnalysisModel(oSelectedNode);
				
				    // Ouverture du fragment...
				    if (!this._pAnalyseDialog) {
				        this._pAnalyseDialog = sap.ui.xmlfragment("com.sap.ca.myfilemanager.Z00_FILE_MANAGER.view.fragment.AnalyseSpace", this);
				        this.getView().addDependent(this._pAnalyseDialog);
				    }
					setTimeout(function() {
					    this._pAnalyseDialog.open();
					}.bind(this), 50);
				    

			},
			
			// Fonction appelée lors du clic sur un segment du graphique
			onChartSelection: function(oEvent) {
			    var oSegment = oEvent.getParameter("segment");
			    var bSelected = oEvent.getParameter("selected");
			
			    if (bSelected && oSegment) {
			        // 1. Récupérer les données du segment cliqué
			        var oSelectedData = oSegment.getBindingContext("analysisModel").getObject();
			        
			        // 2. Retrouver l'objet complet dans l'arborescence originale
			        // Note : On a besoin que l'objet original soit passé au modèle de l'analyse
			        if (oSelectedData.originalNode && oSelectedData.originalNode.nodes && oSelectedData.originalNode.nodes.length > 0) {
			            this._updateAnalysisModel(oSelectedData.originalNode);
			        } else {
			            sap.m.MessageToast.show("Ce répertoire est vide ou est un fichier.");
			            oSegment.setSelected(false); // Déselectionne si on ne peut pas descendre
			        }
			    }
				var oVizFrame = oEvent.getSource(); // Récupère le graphique qui a émis l'événement
				    oVizFrame.setSelectedSegments([]);			    
			},
			
			// Fonction interne pour mettre à jour le graphique avec un nouveau noeud
			_updateAnalysisModel: function(oNode) {
				if (!oNode || !oNode.nodes) return;
				
				    var iTotalSize = Number(oNode.Size || oNode.len || 0);
				    
				    var aChildren = oNode.nodes.map(function(child) {
				        var iChildSize = Number(child.Size || child.len || 0);
				        // Sécurité ABSOLUE contre le NaN ou Infinity
				        var fPercent = (iTotalSize > 0 && isFinite(iChildSize)) ? (iChildSize / iTotalSize) * 100 : 0;
				
				        return {
				            Name: child.Name,
				            FormattedSize: child.FormattedSize || "0 Ko",
				            SizePercentage: parseFloat(fPercent.toFixed(2)),
				            originalNode: child 
				        };
				    }).filter(item => item.SizePercentage > 0); // On ne garde que ce qui est visible
				
				    aChildren.sort((a, b) => b.SizePercentage - a.SizePercentage);
				    
				    // Mise à jour du modèle existant (ne pas en créer un nouveau à chaque fois)
				    var oModel = this.getView().getModel("analysisModel");
				    oModel.setData({
				        items: aChildren.slice(0, 6),
				        title: "Analyse de : " + oNode.Name,
				        totalSize: oNode.FormattedSize
				    });				
				
/*				if (!oNode || !oNode.nodes) {
				        return;
				    }
				
				    var iTotalSize = Number(oNode.Size || oNode.len || 0);
				    
				    // On mappe les enfants en incluant la référence vers l'objet complet
				    var aChildren = oNode.nodes.map(function(child) {
				        var iChildSize = Number(child.Size || child.len || 0);
				        var fPercent = (iTotalSize > 0) ? (iChildSize / iTotalSize) * 100 : 0;
				
				        return {
				            Name: child.Name,
						    FormattedSize: child.FormattedSize || "0 Ko",
                            SizePercentage: parseFloat(fPercent.toFixed(2)) || 0,
				            originalNode: child 
				        };
				    }).sort((a, b) => b.SizePercentage - a.SizePercentage).slice(0, 6);
				
				    // Mise à jour des propriétés du modèle
				    var oModel = this.getView().getModel("analysisModel");
				    oModel.setProperty("/items", aChildren);
				    oModel.setProperty("/title", "Analyse de : " + oNode.Name);
				    oModel.setProperty("/totalSize", oNode.FormattedSize);*/
			},
			
/*			// Modifier ton bouton "Analyse" initial pour utiliser la nouvelle fonction
			onAnalyseSpace: function() {
			    var oTable = this.byId("idDirectoryTable");
			    var iIndex = oTable.getSelectedIndex();
			    if (iIndex === -1) return;
			
			    var oSelectedNode = oTable.getContextByIndex(iIndex).getObject();
			
			    // Initialisation du modèle avec une structure d'objet pour le titre et les items
			    var oAnalysisModel = new sap.ui.model.json.JSONModel({
			        items: [],
			        title: "",
			        totalSize: ""
			    });
			    this.getView().setModel(oAnalysisModel, "analysisModel");
			
			    this._updateAnalysisModel(oSelectedNode);
			
			    if (!this._pAnalyseDialog) {
			        this._pAnalyseDialog = sap.ui.xmlfragment("com.sap.ca.myfilemanager.Z00_FILE_MANAGER.view.fragment.AnalyseSpace", this);
			        this.getView().addDependent(this._pAnalyseDialog);
			    }
			    this._pAnalyseDialog.open();
			},		*/	
			
			onCloseAnalysis: function() {
			    this._pAnalyseDialog.close();
			},

			/**
			 * Event handler when the share in JAM button has been clicked
			 * @public
			 */
			onShareInJamPress : function () {
				var oViewModel = this.getModel("worklistView"),
					oShareDialog = sap.ui.getCore().createComponent({
						name: "sap.collaboration.components.fiori.sharing.dialog",
						settings: {
							object:{
								id: location.href,
								share: oViewModel.getProperty("/shareOnJamTitle")
							}
						}
					});
				oShareDialog.open();
			},

			onSearch : function (oEvent) {
				if (oEvent.getParameters().refreshButtonPressed) {
					// Search field's 'refresh' button has been pressed.
					// This is visible if you select any master list item.
					// In this case no new search is triggered, we only
					// refresh the list binding.
					this.onRefresh();
				} else {
					var aTableSearchState = [];
					var sQuery = oEvent.getParameter("query");

					if (sQuery && sQuery.length > 0) {
						aTableSearchState = [new Filter("Name", FilterOperator.Contains, sQuery)];
					}
					this._applySearch(aTableSearchState);
				}

			},

			/**
			 * Event handler for refresh event. Keeps filter, sort
			 * and group settings and refreshes the list binding.
			 * @public
			 */
			onRefresh : function () {
				var oTable = this.byId("table");
				oTable.getBinding("items").refresh();
			},

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

			/**
			 * Shows the selected item on the object page
			 * On phones a additional history entry is created
			 * @param {sap.m.ObjectListItem} oItem selected Item
			 * @private
			 */
			_showObject : function (oItem) {
				this.getRouter().navTo("object", {
					objectId: oItem.getBindingContext().getProperty("Name")
				});
			},

			/**
			 * Internal helper method to apply both filter and search state together on the list binding
			 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
			 * @private
			 */
			_applySearch: function(aTableSearchState) {
				var oTable = this.byId("table"),
					oViewModel = this.getModel("worklistView");
				oTable.getBinding("items").filter(aTableSearchState, "Application");
				// changes the noDataText of the list in case there are no filter results
				if (aTableSearchState.length !== 0) {
					oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
				}
			}

		});
	}
);
