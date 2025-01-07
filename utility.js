var schemaJson = {};
var portfolioItemTypes = [];
var scheduleStates = []; 

const loadSchema = () => {
    var schemaUrl = `${$RallyContext.Url.origin}/slm/schema/v2.0/workspace/${$RallyContext.GlobalScope.Workspace.OID}?pageSize=2000`;
    return fetch(schemaUrl)
    .then(response => response.json())
    .then(schema => {
        scheduleStates = getScheduleStates(schema);
        portfolioItemTypes = getPortfolioItemTypeDefinitions(schema);
    });
}

const getScheduleStates = (schema) => {
    return getAllowedValues(schema,"SchedulableArtifact","ScheduleState","StringValue");
}

const getPortfolioItemTypeDefinitions = (schema) => {
    var portfolioItemTypes =  schema && schema.QueryResult && schema.QueryResult.Results && schema.QueryResult.Results
        .reduce((types,t) => {
            if (t.TypePath.includes('PortfolioItem/')){
                types.push(t);
            }            
            return types;
        },[]) || null;
    return portfolioItemTypes;
}

const getAllowedValues = (schema, typeDef, fieldName, fieldAttribute) => {
    var allowedValues =  schema && schema.QueryResult && schema.QueryResult.Results && 
    schema.QueryResult.Results.find((type) => type.TypePath == typeDef).Attributes
        .find((attr) => attr.ElementName == fieldName).AllowedValues
        .reduce((vals,v) => {
            if (fieldAttribute){
                vals.push(v[fieldAttribute]);
            } else {
                vals.push(v);
            }
            return vals;
        },[]) || null;
    return allowedValues;
}

const loadWsapiData = (type,params) => {
    var url = `${$RallyContext.Url.origin}/slm/webservice/v2.0/${type}`;
    var paramDelimiter = "?";
    for (const p in params) {
        url = `${url}${paramDelimiter}${p}=${params[p]}`;
        paramDelimiter = "&";
    }
    return fetch(url)
        .then(response => response.json())
        .then(results => {
            if (!results || !results.QueryResult || !results.QueryResult.Results || (results.QueryResult.Errors && results.QueryResult.Errors.length > 0)){
                var errorMsg = results; //prob need to do something better here 
                if (results && results.QueryResult  && results.QueryResult.Errors){
                    errorMsg = results.QueryResult.Errors.join(", ");
                }
                Promise.reject(`Error loading WSAPI data from ${url}:  ${errorMsg}`)
            } else {
                console.log('resolve',results.QueryResult.Results)
                return Promise.resolve(results.QueryResult.Results);
            }
        });
}

const loadCapacityByProjectFromCapacityPlan = (capacityPlanName) => {
    const capacityPlanQuery = `((CapacityPlan.Name = "${capacityPlanName}") AND (Assignments.CapacityPlanItem.PortfolioItem.InvestmentCategory = "Defects"))`;
    const capacityPlanFetch = "PlannedCapacityPoints,Project,Name,CapacityPlan"; //todo, do we also get count? 
    var cpUrl = `${$RallyContext.Url.origin}/slm/webservice/v2.0/capacityplanproject?workspace=${$RallyContext.GlobalScope.Workspace._ref}&project=${$RallyContext.GlobalScope.Project._ref}&query=${capacityPlanQuery}&fetch=${capacityPlanFetch}`

    return fetch(cpUrl)
        .then(response => response.json())
        .then(results => {
            console.log('results cp', results)
            var capacityPlanProjects = results.QueryResult.Results
            .reduce((cppBreakdown,cpp) => {
                if (cpp._objectVersion != 0){
                    cppBreakdown[cpp.Project.Name] = cpp.PlannedCapacityPoints;
                }
                return cppBreakdown;
            },{});
            return Promise.resolve(capacityPlanProjects);
        })
}

 const getCapacityByProjectFromRelease = (releaseName) => {
//TODO
 }   

 const getTimeboxProgress = (timebox) =>{

    if (!timebox) { return 0; }
    var startDate = timebox.StartDate || timebox.ReleaseStartDate,
        endDate = timebox.EndDate || timebox.ReleaseDate,
        current = new Date().getTime(); 

    if (!startDate || !endDate || endDate == startDate) { return 0; }
    startDate = new Date(startDate).getTime();
    endDate = new Date(endDate).getTime();

    if (current > endDate) { return 100;} 
    if (current < startDate) { return 0; }
  
    return (current - startDate)/(endDate - startDate);
 }