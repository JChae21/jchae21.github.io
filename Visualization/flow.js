

//// frame setup

// const height = 1500
const height = 1000
// const height = 3000
// const width = height * (3725.12/9087.88)    // Apply the actual ratio
const width = height * (38486.86/42638.65)    // Apply the actual ratio
const shift_h = -30
const shift_v = -120

let canvas = document.getElementsByTagName('canvas')[0];
let ctx = d3.select("#flow").node().getContext("2d"); // initialize a "canvas" element
ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // for fading curves
ctx.lineWidth = 1.7;
ctx.strokeStyle = "#FF8000"; // html color code

//// mapping from vfield coords to web page coords
// DFW2.net.xml
// let xMap = d3.scaleLinear()
//     .domain([0, 3275.12])
//     .range([shift_h, width + shift_h])
// let yMap = d3.scaleLinear()
//     .domain([0, 9087.88])
//     .range([height + shift_v, shift_v]);

// raw.net.xml
let xMap = d3.scaleLinear()
    .domain([0, 38486.86])
    .range([shift_h, width + shift_h])
let yMap = d3.scaleLinear()
    .domain([0, 42638.65])
    .range([height + shift_v, shift_v]);

let frameRate = 100
let frameRate_max = 200
let drawFlag = true

let data
let speedColorScale = d3.scaleSequential(d3.interpolateBlues)
let interval
let busSpeedColorScale = d3.scaleSequential(d3.interpolateInferno)

let diff_color_scale

let agents = []
let selected_agents = []

d3.select("#flow")
    .on("click", function() {drawFlag = (drawFlag) ? false : true;})
    
function randage() {
    // to randomize starting ages for each curve
    return Math.round(Math.random()*100);
}
// for info on the global canvas operations see
// http://bucephalus.org/text/CanvasHandbook/CanvasHandbook.html#globalcompositeoperation
ctx.globalCompositeOperation = "source-over";

let curTimestep = 1    // Start from 1
let maxTimestep = 0

let chartAvgSpeed
let chartStopVechicles
let chartVehicles
let chartWaitingTime

const colorThreshold = d3.scaleThreshold()
  .domain([100, 500, 1000, 5000, 10000, 20000, 30000])
  .range(['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#b10026'])

const colorScale = d3.scaleLinear()
                    .domain([0,42]) // congestion (sumo uses m/s)
                    // .domain([0, 150]) // comparison (INRIX uses km/h)
                    .range([0,1])

let mapData = []
let sumoData = [], inrixData = [], diffData = []

const mode = "edge"
const analysis = "comparison"
// const analysis = "congestion"
const speedScaleFactor = analysis === "comparison" ? 0.28 : 1
const kmh2mph_scale_factor = 0.621371
const mps2mph_scale_factor = 2.23694

function drawSpeedOverTime(){
    // INRIX data
    let inrix_time_nest = []
    let time_nest_data = d3.nest().key( d => d.time ).entries(inrixData)
    time_nest_data.forEach(d=>{
        let id_nest_data = d3.nest().key(k => k.id).entries(d.values)
        let edges = {}
        id_nest_data.forEach(e=>{
            let weighted_sum = 0
            let sum_count = 0
            e.values.forEach(x=>{
                weighted_sum += x.count * x.speed
                sum_count += x.count
            })
            edges[e.key] = weighted_sum / sum_count
        })

        let sum = 0, count = 0
        for (const [key, value] of Object.entries(edges)) {
            sum += value
            count += 1
        }

        inrix_time_nest.push({time: +d.key, edges: edges, avg: sum/count})
    })

    // maxTimestep = inrixData.length - 1
    // document.getElementById("slider-time").max = maxTimestep;

    
    // SUMO edge data
    let edge_time_nest = []
    time_nest_data = d3.nest().key( d => d.time ).entries(sumoData)
    time_nest_data.forEach(d=>{
        let id_nest_data = d3.nest().key(k => {
            let sp = k.id.charAt(0) == '-' ? 1 : 0
            let idx = k.id.indexOf('#')
            if( idx > 0 )
                return k.id.slice(sp, idx)
            else
                return k.id.slice(sp)                     
        }).entries(d.values)
        let edges = {}
        id_nest_data.forEach(e=>{
            let weighted_sum = 0
            let sum_count = 0
            e.values.forEach(x=>{
                weighted_sum += x.count * x.speed
                sum_count += x.count
            })
            if( sum_count > 0 ){
                edges[e.key] = weighted_sum / sum_count
            }else{
                edges[e.key] = 0
            }
        })
        let sum = 0, count = 0
        for (const [key, value] of Object.entries(edges)) {
            if( value > 0){
                sum += value
                count += 1
            }
        }                        
        edge_time_nest.push({time: +d.key, edges: edges, avg: sum/count})
    })

    let _diff = inrix_time_nest.map( (d,i) => {
        return {time: +d.time, avg: edge_time_nest[i].avg - d.avg}
    })    

    // let diffData = inrix_time_nest.map( (d,i) => {
    //     let edges = {}
    //     for (const [key, value] of Object.entries(d.edges)) {
    //         if( typeof edge_time_nest[i].edges[key] != 'undefined' )
    //             edges[key] = value - edge_time_nest[i].edges[key]
    //     }
    //     let sum = 0, count = 0
    //     for (const [key, value] of Object.entries(edges)) {
    //         sum += value
    //         count += 1
    //     }
    //     return {time: +d.time, edges: edges, avg: sum/count}
    // })

    const inrix = inrix_time_nest.map(d=>{
        return {x: d.time, y: d.avg}
    })
    const edge = edge_time_nest.map(d=>{
        return {x: d.time, y: d.avg}
    })
    const diff = _diff.map(d=>{
        return {x: d.time, y: d.avg}
    })                        
    
    MultiScaleLineGraph("multi-scale-plot")
        .addSeries("INRIX", inrix, 1)
        .addSeries("SUMO", edge, 1)
        .addSeries("Diff", diff, 1)
        .render()
}

function drawDiffSpeedofEdges(){

    // INRIX data
    let inrix_id_nest = {}
    let id_nest_data = d3.nest().key( d => d.id ).entries(inrixData)
    id_nest_data.forEach(d=>{
        let time_nest_data = d3.nest().key(k => k.time).entries(d.values)
        let times = {}
        time_nest_data.forEach(e=>{
            let weighted_mean = 0
            let sum_count = 0
            e.values.forEach(x=>{
                weighted_mean += x.count * x.speed
                sum_count += x.count
            })
            times[e.key] = weighted_mean / sum_count
        })

        inrix_id_nest[d.key] = times
    })
    
    // SUMO edge data
    let sumo_id_nest = {}
    id_nest_data = d3.nest().key(k => {
        let sp = k.id.charAt(0) == '-' ? 1 : 0
        let idx = k.id.indexOf('#')
        if( idx > 0 )
            return k.id.slice(sp, idx)
        else
            return k.id.slice(sp)
    }).entries(sumoData)
    id_nest_data.forEach(d=>{
        let time_nest_data = d3.nest().key(k => k.time).entries(d.values)
        let times = {}
        time_nest_data.forEach(e=>{
            let weighted_mean = 0
            let sum_count = 0
            e.values.forEach(x=>{
                weighted_mean += x.count * x.speed
                sum_count += x.count
            })
            if( sum_count > 0 ){
                times[e.key] = weighted_mean / sum_count
            }else{
                times[e.key] = 0
            }
        })
        sumo_id_nest[d.key] = times
    })

    for (const [key, value] of Object.entries(inrix_id_nest)) {
        let items = []
        let edge = key
        let times = value
        if( typeof sumo_id_nest[edge] != 'undefined' ){
            for (const [key, value] of Object.entries(times)) {
                if( typeof sumo_id_nest[edge][key] != 'undefined' )
                    items.push(sumo_id_nest[edge][key] - value)
            }
            if( items.length > 0 ){
                items.sort( (a,b)=>{
                    return a - b
                })
                let median = d3.median(items)
                diffData.push({edge: edge, items: items, median: median})
            }
        }
    }

    diffData.sort(function(a, b){
        return b.median - a.median
    })

    drawBoxPlot(diffData, 50)

    drawDiffMap(diffData)
}

function drawDiffMap(data){
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, width, height); // Clear the previous state

    diff_color_scale = d3.scaleLinear().domain(d3.extent(data, d=>d.median)).range([0,1])

    data.forEach(d=>{
        let edges = mapData.filter(e=>{
            return e.edge === d.edge
        })

        edges.forEach(edge=>{
            ctx.beginPath();
            for(let i=0; i < edge.shape.length-1; i++){
                ctx.moveTo(xMap(edge.shape[i].x), yMap(edge.shape[i].y)); // the start point of the path
                ctx.lineTo(xMap(edge.shape[i+1].x), yMap(edge.shape[i+1].y)); // the end point of the path
            }
            ctx.strokeStyle = d3.interpolateRdYlBu(diff_color_scale(d.median))
            ctx.stroke(); // final draw command            
        })
    })    

    drawColorLegend()
}

function  drawBoxPlot(data, num_boxes){
    let boxes = [], outliers = [], edges = []
    data.slice(0, num_boxes).forEach((d,i)=>{
        const min = d.items[0];
        const max = d.items[d.items.length - 1];
        const q1 = d3.quantile(d.items, 0.25);
        const q2 = d3.quantile(d.items, 0.50);
        const q3 = d3.quantile(d.items, 0.75);
        const iqr = q3 - q1; // interquartile range
        const r0 = Math.max(min, q1 - iqr * 1.5);
        const r1 = Math.min(max, q3 + iqr * 1.5);
    
        let ol = d.items.filter(v => v.y < r0 || v.y > r1).map(d=>[i, d])
        outliers.push(ol)

        boxes.push({x: i, low: min, q1: q1, median: q2, q3: q3, high: max, name: d.edge})
        edges.push(d.edge)
    })
    
    data.slice(data.length - num_boxes, data.length - 1).forEach((d,i)=>{
        const min = d.items[0];
        const max = d.items[d.items.length - 1];
        const q1 = d3.quantile(d.items, 0.25);
        const q2 = d3.quantile(d.items, 0.50);
        const q3 = d3.quantile(d.items, 0.75);
        const iqr = q3 - q1; // interquartile range
        const r0 = Math.max(min, q1 - iqr * 1.5);
        const r1 = Math.min(max, q3 + iqr * 1.5);
    
        let ol = d.items.filter(v => v.y < r0 || v.y > r1).map(d=>[i, d])
        outliers.push(ol)

        boxes.push({x: i + num_boxes, low: min, q1: q1, median: q2, q3: q3, high: max, name: d.edge})
        edges.push(d.edge)
    })    

    Highcharts.chart('boxplot', {
        credits: {
            enabled: false
          },
        chart: {
            type: 'boxplot',
            backgroundColor: "#000",
            inverted: true
        },
        title: {
            text: 'Edge speed differences between SUMO vs INRIX',
            style: {
                color: '#F0F0E0'
            }
        },
        legend: {
            enabled: false
        },
        xAxis: {
            categories: edges,
            // categories: ['10', '2'],
            title: {
                text: 'Edges IDs'
            }
        },
    
        yAxis: {
            title: {
                text: 'Speed'
            },
            opposite:true
            //,
            // plotLines: [{
            //     value: 932,
            //     color: 'red',
            //     width: 1,
            //     label: {
            //         text: 'Theoretical mean: 932',
            //         align: 'center',
            //         style: {
            //             color: 'gray'
            //         }
            //     }
            // }]
        },
        plotOptions:{
            series: {
                point: {
                    stickyTracking: false,
                    cursor: 'pointer',
                    connectNulls: true,
                    events: {
                        // click: function (event) {
                        //     alert(this.name + ' click');
                        // },
                        mouseOver: function (event) {
                            let edges = mapData.filter(e=>{
                                return e.edge === this.name
                            })

                            let median = diffData.find(d=>{
                                return d.edge === this.name
                            }).median
                    
                            edges.forEach(edge=>{
                                ctx.beginPath();
                                for(let i=0; i < edge.shape.length-1; i++){
                                    ctx.moveTo(xMap(edge.shape[i].x), yMap(edge.shape[i].y)); // the start point of the path
                                    ctx.lineTo(xMap(edge.shape[i+1].x), yMap(edge.shape[i+1].y)); // the end point of the path
                                }
                                // ctx.strokeStyle = d3.interpolateRdYlBu(diff_color_scale(median))
                                ctx.strokeStyle = median > 0 ? "#4dac26" : "#d01c8b"
                                ctx.lineWidth = 15
                                ctx.stroke(); // final draw command     
                            })

                            // console.log(this.name)
                            // $report.html('Moused over ' + this.name)
                            //     .css('color', 'green');
                        },
                        mouseOut: function (event) {
                            ctx.lineWidth = 1.7
                            // drawDiffMap(diffData)
                            // alert(this.name + ' click');
                            // $report.html('Moused out ' + this.name)
                            //     .css('color', 'red');
                        }
                    }
                }
            }
        },
    
        series: [{
            name: 'Differences',
            data: boxes,
            tooltip: {
                headerFormat: '<em>Edge ID {point.key}</em><br/>'
            }}
            ,{
            name: 'Outliers',
            color: Highcharts.getOptions().colors[0],
            type: 'scatter',
            data: outliers,
            // data: [ // x, y positions where 0 is the first category
            //     [0, 14],
            //     [0, 18],
            //     [1, 1],
            //     [1, 19]
            // ],
            marker: {
                fillColor: 'white',
                lineWidth: 1,
                lineColor: Highcharts.getOptions().colors[0]
            },
            tooltip: {
                pointFormat: 'Observation: {point.y}'
            }}
        ]
    
    });    
}

function drawColorLegend(){
    legend({
        div: 'color-legend',
        width: 600,
        color: d3.scaleSequential(diff_color_scale.domain(), d3.interpolateRdYlBu),
        title: "Difference SUMO vs INRIX (miles/hour)"
      })
}

function loadData(){
    if( mode == "edge" && analysis == "comparison"){
        let proms  = []
        proms.push(d3.xml("data/SUMO DFW Freight 201207/raw.net.xml"))
        proms.push(d3.csv("data/INRIX/noweight_classspeed_noclass_2018-07-28_weekday.csv", d =>{
            let items = d.TimeOfDay.split(':')
            return {
                id: d.wayID.slice(0, -2),
                count: +d.count,
                speed: +d.mean * kmh2mph_scale_factor,
                time: +items[0] * 3600 + +items[1] * 60,
                weekday: d.weekday
            }
        }))
        proms.push(d3.dsv(";","./data/SUMO DFW Freight 201207/EdgeInfo_Tue_signal.csv", d=>{
        // proms.push(d3.dsv(";","./data/SUMO DFW Freight 201207/EdgeInfo_Tue.csv", d=>{
            return {
                id: d.edge_id,
                time: +d.interval_begin,
                waiting_time: +d.edge_waitingTime,
                speed: +d.edge_speed * mps2mph_scale_factor,
                count: +d.edge_entered
            }
        }))

        Promise.all(proms).then(values => {
            values.forEach( (v,i) =>{
                if( i == 0 ){ // network xml file
                    v.querySelectorAll("edge").forEach(d=>{ 
                        if( d.hasAttribute("shape") && d.hasAttribute("function") !== "internal" ){
                            let child = d.firstElementChild
                            let shape
                            if( typeof child != 'undefined'){
                                shape = child.getAttribute("shape").split(' ').map(d=>{
                                    let items = d.split(',')
                                    return {x:items[0], y:items[1]}
                                })
                            }

                            // const id = d.getAttribute("id")
                            // let sp = id.charAt(0) == '-' ? 1 : 0
                            // let idx = id.indexOf('#')
                            // let edge
                            // if( idx > 0 )
                            //     edge = id.slice(sp, idx)
                            // else
                            //     edge = id.slice(sp)
                            // mapData.push({id:id, edge: edge, shape: shape})

                            const id = d.getAttribute("id")
                            let sp = id.charAt(0) == '-' ? 1 : 0
                            let idx = id.indexOf('#')
                            let edge
                            if( idx > 0 )
                                edge = id.slice(sp, idx)
                            else
                                edge = id.slice(sp)                            
                            let seg = 0
                            if( idx > 0 )
                                seg = +id.slice(idx)

                            mapData.push({id:id, edge: edge, seg: seg, neg: sp == 1 ? true : false, shape: shape})
                        }
                    })

                    
                }

                if( i == 1) inrixData = v.slice()
                if( i == 2) sumoData = v.slice()
            })

            console.log("Load Data Done")
            
            drawSpeedOverTime()
            console.log("drawSpeedOverTime")
            drawDiffSpeedofEdges()
            console.log("drawDiffSpeedofEdges")

        })
    }
    if( mode == "edge" && analysis == "congestion"){
        // d3.dsv(";","./data/year_14_edges_out.csv", (d,i) =>{
        d3.dsv(";","./data/SUMO DFW Freight 201207/edges_out.csv", (d,i) =>{
            return {
                id: d.edge_id,
                time: +d.interval_begin,
                waiting_time: +d.edge_waitingTime,
                speed: +d.edge_speed
            }
        }).then(d=>{
            // console.log(d)
            // draw(d.filter(a=> a.time > 150))
            sumoData = d3.nest()
            .key(function(d){
                return d.time;
            })
            .entries(d)

            maxTimestep = sumoData.length - 1
            document.getElementById("slider-time").max = maxTimestep;

            // d3.xml("data/DFW2.net.xml").then(function(xml){
            d3.xml("data/SUMO DFW Freight 201207/raw.net.xml").then(function(xml){	                
                xml.querySelectorAll("edge").forEach(d=>{ 
                    if( d.hasAttribute("shape") && d.hasAttribute("function") !== "internal" ){
                        let shape = d.getAttribute("shape").split(' ').map(d=>{
                            let items = d.split(',')
                            return {x:items[0], y:items[1]}
                        })
                        mapData.push({id:d.getAttribute("id"), shape: shape})
                    }
                })

                start()
            })
        })        
    }

    if( mode == "flow"){
        d3.xml("data/2018-3-16-fcd-output.xml").then(function(xml){
            let maxSpeed = 0, maxX = 0, maxY = 0, minX = 10000, minY = 10000
            let root_vehicle = {title: "Vehicle", folder: true, type: "vehicle", children: []}
            let root_person = {title: "Pedestrian", folder: true, type: "person", children: []}
            agents.push(root_vehicle)
            agents.push(root_person)
        
            data = [].map.call(xml.querySelectorAll("timestep"), function(timestep) {
                let vehicles = []
                let v = timestep.querySelectorAll("vehicle")
                v.forEach( d => {
                    
                    let vehicle = {
                        id: d.getAttribute("id"),
                        x: +d.getAttribute("x"),
                        y: +d.getAttribute("y"),
                        type: d.getAttribute("type"),
                        speed: +d.getAttribute("speed")
                    }
                    vehicles.push( vehicle )
        
                    if( maxSpeed < vehicle.speed)
                        maxSpeed = vehicle.speed
        
                    if( minX > vehicle.x)
                        minX = vehicle.x
                    if( minY > vehicle.y)
                        minY = vehicle.y
        
                    if( maxX < vehicle.x)
                        maxX = vehicle.x
                    if( maxY < vehicle.y)
                        maxY = vehicle.y            
        
                    let group = root_vehicle.children.find( function(d) {
                        return d.title == vehicle.type
                    })
        
                    if( group ){
                        let isIn = group.children.findIndex( function(p) {
                            return p.title == vehicle.id
                        })
                        if( isIn < 0 ){
                            group.children.push({title: vehicle.id})
                        }
                    }else{
                        root_vehicle.children.push({title: vehicle.type, folder: true, children: [{title: vehicle.id}]})
                    }
                })
        
                let persons = []
                let p = timestep.querySelectorAll("person")
                p.forEach( d => {
                    persons.push({
                        id: d.getAttribute("id"),
                        x: +d.getAttribute("x"),
                        y: +d.getAttribute("y"),
                        speed: +d.getAttribute("speed")
                    })
                    let id = d.getAttribute("id")
        
                    let isIn = root_person.children.findIndex( function(p) {
                        return p.title == id
                    })
        
                    if( isIn < 0 ){
                        root_person.children.push({title: d.getAttribute("id")})
                    }
                })
        
                return {
                    timestep: timestep.getAttribute("time"),
                    vehicles: vehicles,
                    persons: persons
                };
        
                console.log("Done")
            });
        
            speedColorScale.domain([0, maxSpeed])
            // xMap.domain([minX, maxX])
            // yMap.domain([minY, maxY])
        
            maxTimestep = data.length - 1
            document.getElementById("slider-time").max = maxTimestep;
        
            start()
        });
    }
}

function recvSelectedNodes(node){
    if( node.selected ){
        if( node.children == null ){
            return node.title
        }else if( node.children != null ){
            let ret = ""
            node.children.forEach( d=> {
                ret += recvSelectedNodes(d) + ","
            })
            return ret
        }
    }
}

function recvDeSelectedNodes(node){
    if( !node.selected ){
        if( node.children == null ){
            return node.title
        }else if( node.children != null ){
            let ret = ""
            node.children.forEach( d=> {
                ret += recvDeSelectedNodes(d) + ","
            })
            return ret
        }
    }
}

function renderAnimatedVerticalLine(){
    if( chartAvgSpeed )
        chartAvgSpeed.renderAnimatedVerticalLine(curTimestep)

    if( chartVehicles )
        chartVehicles.renderAnimatedVerticalLine(curTimestep)

    if( chartStopVechicles )
        chartStopVechicles.renderAnimatedVerticalLine(curTimestep)

    if( chartWaitingTime )
        chartWaitingTime.renderAnimatedVerticalLine(curTimestep)
}

function drawGeoTraffic() {
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
	ctx.fillRect(0, 0, width, height); // Clear the previous state

	sumoData[curTimestep].values.forEach(d=>{
		let edge = mapData.find(e=>{
			return e.id === d.id
		})

		if(typeof edge !== 'undefined'){
            ctx.beginPath();
			for(let i=0; i < edge.shape.length-1; i++){
				// ctx.beginPath();
				ctx.moveTo(xMap(edge.shape[i].x), yMap(edge.shape[i].y)); // the start point of the path
				ctx.lineTo(xMap(edge.shape[i+1].x), yMap(edge.shape[i+1].y)); // the end point of the path
                // ctx.strokeStyle = colorThreshold(d.waiting_time)
                // ctx.strokeStyle = d3.interpolateReds(colorScale(d.meanSpeed))
				// ctx.stroke(); // final draw command
            }
            ctx.strokeStyle = d3.interpolateRdYlBu(colorScale(d.speed * speedScaleFactor))
            ctx.stroke(); // final draw command            
		}
    })
}

function start(){
    if( mode === "edge" && analysis === "comparison"){
        renderEdgeSpeedPlot()
    }else if( mode === "edge" && analysis === "congestion"){
        renderEdgeSpeedPlot()
        // renderEdgeWaitingTimePlot()
    }else if( mode === "flow" ){
        $("#agents").fancytree({
            checkbox: true,
            selectMode: 3,
            source: agents,
            activate: function(event, data){
                $("#status").text("Activate: " + data.node);
            },
            icon: false,
            select: function(event, data) {
                if( data.node.selected ){
                    let agents = recvSelectedNodes(data.node).split(",")
                    agents.pop()    // remove the last empty element
                    selected_agents = selected_agents.concat(agents)
                }else{
                    let agents = recvDeSelectedNodes(data.node).split(",")
                    agents.pop()    // remove the last empty element
                    selected_agents = selected_agents.filter(function(s) {
                        let isIn = agents.findIndex( function(d) {
                            return d == s
                        })
                        return isIn < 0 ? true : false
                    })
                }
                selected_agents.forEach( d=>{
                    console.log(d)
                } )
            }
            // icon: function(event, data){
            //     if( data.node.type == "vehicle"){
            //       return "https://ornl.sharepoint.com/SiteAssets/PortalHomePage/home-icon.jpg"
            //   }else if( data.node.type == "person"){
            //        return "https://ornl.sharepoint.com/SiteAssets/PortalHomePage/ORNL-Logo.jpg"
            //   }
            // }
        });

        renderAvgSpeedPlots()
        // renderPeakPlot()
        renderStopCountPlot()
        renderCountPlot()
    }

    interval = setInterval(function () {
        if (drawFlag) {
            if( mode === "flow" ){
                draw();
            }else if( mode === "edge" ){
                drawGeoTraffic()
            }
            renderAnimatedVerticalLine()
        }

        if (++curTimestep > maxTimestep) {
            curTimestep = 1;
        }        
    }, frameRate);    
}

function renderEdgeSpeedPlot() {
    let dt = []  
    sumoData.forEach( (t,i)=>{
        let sum = 0
        t.values.forEach(e=>{
            sum += e.speed * speedScaleFactor
        })
        let avg = sum / t.values.length
        dt.push({x: i, y: avg})
    })

    let selection = d3.select("#avg-speed-plot")
    chartAvgSpeed = lineChart(selection)
      .addSeries("average speed", dt)
      .xLabel('Time', function (width, height, margins) {
        return {x:50, y:(height-20)}
      })
      .yLabel('Average Speed')
      .title('Average Speed')
      .ID('avg_speed')
      .render()
}

function renderEdgeWaitingTimePlot() {
    let selection = d3.select("#waiting-time-plot")
    let dt = []  
    sumoData.forEach( (t,i)=>{
        let sum = 0
        t.values.forEach(e=>{
            sum += e.waiting_time
        })
        let avg = sum / t.values.length
        dt.push({x: i, y: avg})
    })

    chartWaitingTime = lineChart(selection)
      .addSeries("average waiting time", dt)
      .xLabel('Time', function (width, height, margins) {
        return {x:50, y:(height-20)}
      })
      .yLabel('Average Waiting Time')
      .title('Average Waiting Time')
      .ID('avg_waiting_time')
      .render()
}

function renderStopCountPlot() {
    let selection = d3.select("#stop-plot")
    let car = []
    car.push({x: 0, y: 0})
    for( let k=1; k < data.length-1; k++){
        let vehicles = data[k].vehicles
        let stops = 0
        for (var i=0; i < vehicles.length; i++) {
        // for (var i=0; i < 2; i++) {
            let sp, ep
            // Get the previous point
            for (var j=0; j < data[k-1].vehicles.length; j++) {
                if( data[k-1].vehicles[j].id === vehicles[i].id ){
                    sp = data[k-1].vehicles[j]
                    break
                }
            }
            if(sp==null){
                sp = vehicles[i]
            }
            ep = vehicles[i]

            if( sp.x == ep.x && sp.y == ep.y ){
                stops++;
            }
        }

        car.push({x: k, y: stops})

    }

    chartStopVechicles = lineChart(selection)
      .addSeries("passenger", car)
      // .addSeries("Bus", bus)
      // .addSeries("Pedestrian", pedestrian)
      .xLabel('Time', function (width, height, margins) {
        return {x:50, y:(height-20)}
      })
      .yLabel('Vehicles')
      .title('Number of Stop Vehicles')
      .ID('number_stops')
      .render()
}

function renderCountPlot() {
    let selection = d3.select("#count-plot")
    // Setting up data series
    let car = data.map( (d, i) => {
        let cars = d.vehicles.filter( v => {
            return v.type == "passenger" ? true : false
            // return v.type != "bus" ? true : false
        })
        return {x: i, y: cars.length}
    })

    // let bus = data.map( (d, i) => {
    //     let buses = d.vehicles.filter( v => {
    //         return v.type == "bus" ? true : false
    //     })
    //     return {x: i, y: buses.length}
    // })

    // let pedestrian = data.map( (d, i) => {
    //     return {x: i, y: d.persons.length}
    // })

    chartVehicles = lineChart(selection)
      .addSeries("passenger", car)
      // .addSeries("Bus", bus)
      // .addSeries("Pedestrian", pedestrian)
      .xLabel('Time', function (width, height, margins) {
        return {x:50, y:(height-20)}
      })
      .yLabel('Vehicles')
      .title('Number of vehicles')
      .ID('number_vehicle')
      .render()    
}

function renderAvgSpeedPlots(){

    let selection = d3.select("#avg-speed-plot")
    // Setting up data series
    let car = data.map( (d, i) => {
        let sum = 0, count = 0
        d.vehicles.forEach( v => {
            if( v.type == "passenger"){
                sum += v.speed
                count++
            }
        })
        let avg = count == 0 ? 0 : sum / count
        return {x: i, y: avg}
    })

    // let bus = data.map( (d, i) => {
    //     let sum = 0, count = 0
    //     d.vehicles.forEach( v => {
    //         if( v.type == "bus"){
    //             sum += v.speed
    //             count++
    //         }
    //     })
    //     let avg = sum / count
    //     return {x: i, y: avg}
    // })

    // let pedestrian = data.map( (d, i) => {
    //     let sum = 0, count = 0
    //     d.persons.forEach( p => {
    //         sum += p.speed
    //     })
    //     let avg = sum / d.persons.length
    //     return {x: i, y: avg}
    // })

    chartAvgSpeed = lineChart(selection)
      .addSeries("passenger", car)
      // .addSeries("Bus", bus)
      // .addSeries("Pedestrian", pedestrian)
      .xLabel('Time', function (width, height, margins) {
        return {x:50, y:(height-20)}
      })
      .yLabel('Speed')
      .title('Average Speed')
      .ID('avg_speed')
      .render()
}

function renderPeakPlot() {

    let selection = d3.select("#peak-speed-plot")
    // Setting up data series
    let car = data.map( (d, i) => {
        let max = 0
        d.vehicles.forEach( v => {
            if( v.type != "bus" && max < v.speed){
                max = v.speed
            }
        })
        return {x: i, y: max}
    })

    // let bus = data.map( (d, i) => {
    //     let max = 0
    //     d.vehicles.forEach( v => {
    //         if( v.type == "bus" && max < v.speed){
    //             max = v.speed
    //         }
    //     })
    //     return {x: i, y: max}
    // })

    // let pedestrian = data.map( (d, i) => {
    //     let max = 0
    //     d.persons.forEach( p => {
    //         if( max < p.speed )
    //             max = p.speed
    //     })
    //     return {x: i, y: max}
    // })

    lineChart(selection)
      .addSeries("passenger", car)
      // .addSeries("Bus", bus)
      // .addSeries("Pedestrian", pedestrian)
      .xLabel('Time', function (width, height, margins) {
        return {x:50, y:(height-20)}
      })
      .yLabel('Speed')
      .title('Peak Speed')
      .render()
}

function rateUpdate(value){

    if( interval )
        clearInterval(interval)

    frameRate = frameRate_max - value
    interval = setInterval(function () {
        if (drawFlag) {
            if( mode === "flow" ){
                draw();
            }else if( mode === "edge" ){
                drawGeoTraffic()
            }
        }
        
        if (++curTimestep > maxTimestep) {
            curTimestep = 1;
        }        
    }, frameRate);
}

function timeUpdate(value){
    ctx.fillStyle = "rgba(0, 0, 0, 1)"; // for fading curves
    ctx.fillRect(0, 0, width, height); // fades all existing curves by a set amount determined by fillStyle (above), which 

    if( mode == "flow"){
        maxTimestep = value
        curTimestep = value - 10

        if( interval )
            clearInterval(interval)    

        drawFlag = true;
        interval = setInterval(function () {
            if (drawFlag) {
                draw();
            }

            if (++curTimestep > maxTimestep) {
                drawFlag = false;
            }        
        }, frameRate);
    }else if( mode == "edge" ){
        if( interval )
            clearInterval(interval)    

        curTimestep = value
        drawGeoTraffic()
        renderAnimatedVerticalLine()
    }

    let div = document.getElementById('time-value')
    div.innerHTML = "Time: " + value;
}

function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // for fading curves
    ctx.fillRect(0, 0, width, height); // fades all existing curves by a set amount determined by fillStyle (above), which sets opacity using rgba

    let vehicles = data[curTimestep].vehicles
    
    for (var i=0; i < vehicles.length; i++) {
    // for (var i=0; i < 2; i++) {
        let sp, ep
        // Get the previous point
        for (var j=0; j < data[curTimestep-1].vehicles.length; j++) {
            if( data[curTimestep-1].vehicles[j].id === vehicles[i].id ){
                sp = data[curTimestep-1].vehicles[j]
                break
            }
        }
        if(sp==null){
            sp = vehicles[i]
        }
        ep = vehicles[i]

        if( sp.x == ep.x && sp.y == ep.y ){    // Is it Stop?
            ctx.beginPath();
            ctx.arc(xMap(sp.x), yMap(sp.y), 3, 0, 2 * Math.PI);
            if( sp.type == "bus" ){
                ctx.fillStyle = "rgba(168,221,181, 0.5)";
            }else{
                ctx.fillStyle = "rgba(240,59,32, 0.2)";
            }
            ctx.fill();
            ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // for fading curves
        }else{
            if( sp.type == "bus" ){
                ctx.strokeStyle = busSpeedColorScale(vehicles[i].speed)
            }else{
                ctx.strokeStyle = speedColorScale(vehicles[i].speed)
            }
            ctx.beginPath();
            ctx.moveTo(xMap(sp.x), yMap(sp.y)); // the start point of the path
            ctx.lineTo(xMap(ep.x), yMap(ep.y)); // the end point
            ctx.stroke(); // final draw command            
        }

        if( selected_agents.includes(vehicles[i].id) ){
            ctx.beginPath();
            ctx.arc(xMap(ep.x), yMap(ep.y), 6, 0, 2 * Math.PI);
            ctx.strokeStyle = "#fff"
            ctx.stroke()
        }
    }

    ctx.strokeStyle = "#fee0d2"; // html color code
    let persons = data[curTimestep].persons
    
    for (var i=0; i < persons.length; i++) {
        let sp, ep
        // Get the previous point
        for (var j=0; j < data[curTimestep-1].persons.length; j++) {
            if( data[curTimestep-1].persons[j].id === persons[i].id ){
                sp = data[curTimestep-1].persons[j]
                break
            }
        }
        if(sp==null){
            sp = persons[i]
        }
        ep = persons[i]
        
        ctx.beginPath();
        ctx.moveTo(xMap(sp.x), yMap(sp.y)); // the start point of the path
        ctx.lineTo(xMap(ep.x), yMap(ep.y)); // the end point
        ctx.stroke(); // final draw command

        if( selected_agents.includes(persons[i].id) ){
            ctx.beginPath();
            ctx.arc(xMap(ep.x), yMap(ep.y), 6, 0, 2 * Math.PI);
            ctx.strokeStyle = "#fff"
            ctx.stroke()
        }
    }

    let scale = 0.9
    var img = new Image();
    img.src = "./data/DFW_With_Ids.svg";
    img.onload = function() {
        ctx.rotate(-1 * Math.PI / 180);
        ctx.drawImage(img, 35 + shift_h, 110 + shift_v, 800*scale, 1479*scale);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}


document.addEventListener( "DOMContentLoaded", function() {
    loadData()

    var lastX=canvas.width/2, lastY=canvas.height/2;
    var dragStart,dragged;
    canvas.addEventListener('mousedown',function(evt){
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
        dragStart = {x:lastX, y:lastY}
        // dragStart = ctx.transformedPoint(lastX,lastY);
        dragged = false;
    },false);

    canvas.addEventListener('mousemove',function(evt){
        lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
        dragged = true;
        if (dragStart){
            // var pt = ctx.transformedPoint(lastX,lastY);
            ctx.translate(lastX-dragStart.x, lastY-dragStart.y);
            // ctx.translate(pt.x-dragStart.x,pt.y-dragStart.y);
            // drawGeoTraffic()
            drawDiffMap(diffData)
            dragStart = {x:lastX, y:lastY}
        }
    },false);

    canvas.addEventListener('mouseup',function(evt){
        dragStart = null;
        // if (!dragged) zoom(evt.shiftKey ? -1 : 1 );
    },false);

    var scaleFactor = 1.1;
    var zoom = function(clicks, pt){
        ctx.fillStyle = "rgba(0, 0, 0, 1)"; // for fading curves
        ctx.fillRect(0, 0, width, height); // fades all existing curves by a set amount determined by fillStyle (above), which sets opacity using rgba
    
        ctx.translate(pt.x,pt.y);
        var factor = Math.pow(scaleFactor,clicks);
        ctx.scale(factor,factor);
        ctx.translate(-pt.x,-pt.y);
        // drawGeoTraffic()
        drawDiffMap(diffData)
    }

    var handleScroll = function(evt){
        lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
        lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
        var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
        if (delta) zoom(delta, {x:lastX, y:lastY});
        return evt.preventDefault() && false;
    };
    canvas.addEventListener('DOMMouseScroll',handleScroll,false);
    canvas.addEventListener('mousewheel',handleScroll,false);    
})

    // function draw() {
    //     g.fillRect(0, 0, width, height); // fades all existing curves by a set amount determined by fillStyle (above), which sets opacity using rgba
    //     for (var i=0; i<M; i++) { // draw a single timestep for every curve
    //         var dr = F(X[i], Y[i]);
    //         g.beginPath();
    //         g.moveTo(xMap(X[i]), yMap(Y[i])); // the start point of the path
    //         g.lineTo(xMap(X[i]+=dr[0]*dt), yMap(Y[i]+=dr[1]*dt)); // the end point
    //         g.stroke(); // final draw command
    //         if (age[i]++ > MaxAge) {
    //             // incriment age of each curve, restart if MaxAge is reached
    //             age[i] = 0;
    //             // age[i] = randage();
    //             X[i] = X0[i], Y[i] = Y0[i];
    //         }
    //     }
    // }
