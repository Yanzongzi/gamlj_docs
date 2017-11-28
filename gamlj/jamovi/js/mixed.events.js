var rtermFormat = require('./rtermFormat');

const events = {
    update: function(ui) {
        calcModelTerms(ui, this);
        filterModelTerms(ui, this);
        updatePostHocSupplier(ui, this);
        updateSimpleSupplier(ui, this);
        updateRandomSupplier(ui,this);

    },

    onChange_factors: function(ui) {
        calcModelTerms(ui, this);
        updateRandomSupplier(ui,this);
 
    },

    onChange_covariates: function(ui) {
        calcModelTerms(ui, this);
        updateRandomSupplier(ui,this);

    },
    onChange_cluster: function(ui) {
        updateRandomSupplier(ui,this);

    },

    onChange_randomSupplier: function(ui){
        let supplierList = this.itemsToValues(ui.randomSupplier.value());
        this.checkValue(ui.randomTerms, true, supplierList, rtermFormat);
        return;
    },
    onChange_modelTerms: function(ui) {
        filterModelTerms(ui, this);
        updatePostHocSupplier(ui, this);
        updateSimpleSupplier(ui, this);

    },

    onChange_plotsSupplier: function(ui) {
        let values = this.itemsToValues(ui.plotsSupplier.value());
        this.checkValue(ui.plotHAxis, false, values, FormatDef.variable);
        this.checkValue(ui.plotSepLines, false, values, FormatDef.variable);
        this.checkValue(ui.plotSepPlots, false, values, FormatDef.variable);
    },
    
        onChange_simpleSupplier: function(ui) {
          console.log("updating simple");
        let values = this.itemsToValues(ui.simpleSupplier.value());
        this.checkValue(ui.simpleVariable, false, values, FormatDef.variable);
        this.checkValue(ui.simpleModerator, false, values, FormatDef.variable);
        this.checkValue(ui.simple3way, false, values, FormatDef.variable);
    },

 
    onChange_postHocSupplier: function(ui) {
        let values = this.itemsToValues(ui.postHocSupplier.value());
        this.checkValue(ui.postHoc, true, values, FormatDef.term);
    },
    onChange_randomTerms: function(ui) {
 //       randomTerms(ui,this);
 //       filterRandomTerms(ui, this);
    },
    onEvent_randomTerms_preprocess: function(ui, data) {
 //       for(var j = 0; j < data.items.length; j++) {
//          data.items[j].value.raw=data.items[j].value.toString();
//      }
    }    
};

var calcModelTerms = function(ui, context) {
    var variableList = context.cloneArray(ui.factors.value(), []);
    var covariatesList = context.cloneArray(ui.covs.value(), []);
    var combinedList = variableList.concat(covariatesList);
    ui.modelSupplier.setValue(context.valuesToItems(combinedList, FormatDef.variable));
    ui.plotsSupplier.setValue(context.valuesToItems(combinedList, FormatDef.variable));
    ui.simpleSupplier.setValue(context.valuesToItems(combinedList, FormatDef.variable));
 
    var diff = context.findChanges("variableList", variableList, true, FormatDef.variable);
    var diff2 = context.findChanges("covariatesList", covariatesList, true, FormatDef.variable);
    var combinedDiff = context.findChanges("combinedList", combinedList, true, FormatDef.variable);


    var termsList = context.cloneArray(ui.modelTerms.value(), []);
    var termsChanged = false;

    for (var i = 0; i < combinedDiff.removed.length; i++) {
        for (var j = 0; j < termsList.length; j++) {
            if (FormatDef.term.contains(termsList[j], combinedDiff.removed[i])) {
                termsList.splice(j, 1);
                termsChanged = true;
                j -= 1;
            }
        }
    }

    for (let i = 0; i < termsList.length; i++) {
        if (termsList[i].length > 1 && containsCovariate(termsList[i], covariatesList)) {
            termsList.splice(i, 1);
            i -= 1;
            termsChanged = true;
        }
    }

    for (var a = 0; a < diff.added.length; a++) {
        let item = diff.added[a];
        var listLength = termsList.length;
        for (var j = 0; j < listLength; j++) {
            var newTerm = context.clone(termsList[j]);
            if (containsCovariate(newTerm, covariatesList) === false) {
                if (context.listContains(newTerm, item, FormatDef.variable) === false) {
                    newTerm.push(item)
                    if (context.listContains(termsList, newTerm , FormatDef.term) === false) {
                        termsList.push(newTerm);
                        termsChanged = true;
                    }
                }
            }
        }
        if (context.listContains(termsList, [item] , FormatDef.term) === false) {
            termsList.push([item]);
            termsChanged = true;
        }
    }

    for (var a = 0; a < diff2.added.length; a++) {
        let item = diff2.added[a];
        if (context.listContains(termsList, [item] , FormatDef.term) === false) {
            termsList.push([item]);
            termsChanged = true;
        }
    }

    if (termsChanged)
        ui.modelTerms.setValue(termsList);

    updateContrasts(ui, variableList, context);
    updateScaling(ui, covariatesList, context);
};

var updateSimpleSupplier = function(ui, context) {
        var termsList = context.cloneArray(ui.modelTerms.value(), []);
        var varList=[];
        for (var j = 0; j < termsList.length; j++) {
            var newTerm=context.clone(termsList[j]);
            if (newTerm.length==1) {
                  varList.push(newTerm[0]); // was varList.push(newTerm);
            }
        }
        varList=context.valuesToItems(varList, FormatDef.variable);
        ui.simpleSupplier.setValue(varList);
        ui.plotsSupplier.setValue(varList);

    };



var updatePostHocSupplier = function(ui, context) {
    var termsList = context.cloneArray(ui.modelTerms.value(), []);
    var covariatesList = context.cloneArray(ui.covs.value(), []);
    var list = [];
    for (var j = 0; j < termsList.length; j++) {
        var term = termsList[j];
        if (containsCovariate(term, covariatesList) === false)
            list.push(term);
    }
    ui.postHocSupplier.setValue(context.valuesToItems(list, FormatDef.term));
};

var filterModelTerms = function(ui, context) {
    var termsList = context.cloneArray(ui.modelTerms.value(), []);
    var diff = context.findChanges("termsList", termsList, true, FormatDef.term);

    var changed = false;
    if (diff.removed.length > 0) {
        var itemsRemoved = false;
        for (var i = 0; i < diff.removed.length; i++) {
            var item = diff.removed[i];
            for (var j = 0; j < termsList.length; j++) {
                if (FormatDef.term.contains(termsList[j], item)) {
                    termsList.splice(j, 1);
                    j -= 1;
                    itemsRemoved = true;
                }
            }
        }

        if (itemsRemoved)
            changed = true;
    }

    if (context.sortArraysByLength(termsList))
        changed = true;

    if (changed)
        ui.modelTerms.setValue(termsList);
};

var updateContrasts = function(ui, variableList, context) {
    var currentList = context.cloneArray(ui.contrasts.value(), []);

    var list3 = [];
    for (let i = 0; i < variableList.length; i++) {
        let found = null;
        for (let j = 0; j < currentList.length; j++) {
            if (currentList[j].var === variableList[i]) {
                found = currentList[j];
                break;
            }
        }
        if (found === null)
            list3.push({ var: variableList[i], type: "deviation" });
        else
            list3.push(found);
    }

    ui.contrasts.setValue(list3);
};

var updateScaling = function(ui, variableList, context) {
    var currentList = context.cloneArray(ui.contrasts.value(), []);

    var list3 = [];
    for (let i = 0; i < variableList.length; i++) {
        let found = null;
        for (let j = 0; j < currentList.length; j++) {
            if (currentList[j].var === variableList[i]) {
                found = currentList[j];
                break;
            }
        }
        if (found === null)
            list3.push({ var: variableList[i], type: "centered" });
        else
            list3.push(found);
    }

    ui.scaling.setValue(list3);
};

var containsCovariate = function(value, covariates) {
    for (var i = 0; i < covariates.length; i++) {
        if (FormatDef.term.contains(value, covariates[i]))
            return true;
    }

    return false;
};


var updateRandomSupplier = function(ui, context) {
    var factorList = context.cloneArray(ui.factors.value(), []);
    var covariatesList = context.cloneArray(ui.covs.value(), []);
    var variableList = factorList.concat(covariatesList);
    var termsList=[];
    termsList = context.getCombinations(variableList);
    context.sortArraysByLength(termsList);
//    ui.randomSupplier.setValue(context.valuesToItems(termsList, FormatDef.term));
    var clusterList = context.cloneArray(ui.cluster.value(), []);
    if (clusterList.length<1) {
                ui.randomSupplier.setValue(context.valuesToItems([], rtermFormat));                  return;
    }
    termsList.unshift(["Intercept"]);
    var alist=[];
    for (var i=0; i < clusterList.length; i++) {
     for (var j = 0; j < termsList.length; j++) {
       var item=context.cloneArray(termsList[j]);
       item[item.length]=clusterList[i];
       alist.push(item);
//       console.log(item);
     }
    }
    context.sortArraysByLength(alist);

      var formatted=context.valuesToItems(alist, rtermFormat);
//    var busyList = context.cloneArray(ui.randomTerms.value(), []);
//    var busyForm = context.valuesToItems(busyList, rtermFormat);
//    var xunique = formatted.filter(function(val) {
//         return busyForm.indexOf(val) == -1;
//            });    
    ui.randomSupplier.setValue(formatted);
};


var filterRandomTerms = function(ui, context) {
  
    var termsList = context.cloneArray(ui.randomTerms.value(), []);
    var unique = termsList.filter((v, i, a) => a.indexOf(v) === i); 
    if (unique.length!=termsList.length)
      ui.randomTerms.setValue(unique);
  
};


module.exports = events;

