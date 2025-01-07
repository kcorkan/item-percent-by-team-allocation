// *****  BEGIN App Configuration *****

const allocationThreshhold = 10;  

var config = {
    itemType:  'Defect',
    itemQuery:  `(((${$RallyContext.ViewFilter.Type}.Name = "${$RallyContext.ViewFilter.Value.Name}") AND (ScheduleState > "Accepted")) AND ((Tags.Name = "Customer Voice") OR (c_NumberOfCases > 0)))`,
    itemFetch: "Project,Name,Requirement,Feature,InvestmentCategory,PlanEstimate"
}
const GREEN = "#3BA164";
const YELLOW = "#AB8507";


// *****  END App Configuration *****

var teamData = {};

console.log('$RallyContext', $RallyContext);

loadSchema().then(() => {
    console.log('scheduleStates',scheduleStates);
    console.log('types',portfolioItemTypes);
});

Promise.all([loadWsapiData(config.itemType, {query: config.itemQuery, fetch: config.itemFetch, pagesize: 2000}),
        loadCapacityByProjectFromCapacityPlan($RallyContext.ViewFilter.Value.Name)])
.then(results => {
    console.log('results',results)
    var chartData = transformData(results);
    console.log('chartData',chartData)
    buildChart(chartData);

});

const transformData = (results) => {
    console.log('transformData',results)
    var defectData = results[0],
        capacityPlanData = results[1];  

    var totalByProject = {};  
    defectData.forEach(d => {
        if (d.Requirement && d.Requirement.Feature && d.Requirement.Feature.InvestmentCategory == "Defects"){
            if ((!totalByProject[d.Project.Name])){
                totalByProject[d.Project.Name] = 0;
            }
            totalByProject[d.Project.Name] += d.PlanEstimate;  
        }
    });

    var categories = Object.keys(capacityPlanData).sort(),
        series = [];
    categories.forEach(project => {
        var pct = 0;
        console.log(project, capacityPlanData[project])
        if (capacityPlanData[project]){
            pct = Math.ceil((totalByProject[project] || 0)/capacityPlanData[project] * 100);
        }
        series.push(pct);
    }); 
    return {categories: categories, series: series}
}

const buildChart = (chartData) => {
    var timeboxProgress = getTimeboxProgress($RallyContext.ViewFilter.Value);
    console.log('buildChart',timeboxProgress, chartData)
    Highcharts.chart('wrapper', {
        chart: {
            height: 300,
            type: 'column'
        },  
    title: null,
    subtitle: null,
    yAxis: {
        title: {
            text: 'Percentage'
        },
        plotLines: [{
            color: GREEN,
            width: 2,
            value: allocationThreshhold
        },{
            color: '#58606E',
            width: 2,
            dashStyle: 'Dash',
            value: timeboxProgress * allocationThreshhold
        }],
        softMax: allocationThreshhold + 1
    },
    xAxis: {
        categories: chartData.categories
    },
    legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle'
    },
    series: [{
        name: 'Defects',
        data: chartData.series
    }],
    legend: {
        enabled: false
    },
    plotOptions: {
        column: {
            dataLabels: {
                enabled: true,
                format: '{y}%'
            }
        },
       
    }

    });
}