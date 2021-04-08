function MultiScaleLineGraph(div) {
    let data = []
    let data_title = []
  
    const margins = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = 600;
    const height = 200;    
    const selection = d3.select('#'+div)
    const svg = selection.append('svg')
        .attr("width", width)
        .attr("height", height)

    const chart_area = svg.append("g")
        .attr("class", "chart")
        .attr("transform", "translate(" + margins.left  + "," + margins.top + ")")    
  
    // Make our SVG responsive.
    // svg.attr('viewBox', `0 0 ${width} ${height}`)
    // svg.attr('preserveAspectRatio', 'xMidYMid meet')
    // svg.style('max-width', '100%').style('height', 'auto')

    const color = ['#0868ac', '#43a2ca', '#c51b8a']

    let xScale, yScale, yScale2

    const xGrid = (g) => g
        .attr('class', 'grid-lines')
        .selectAll('line')
        .data(xScale.ticks())
        .join('line')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', 0)
        .attr('y2', height - margins.bottom - margins.top)

    const yGrid = (g) => g
        .attr('class', 'grid-lines')
        .selectAll('line')
        .data(yScale.ticks())
        .join('line')
        .attr('x1', 0)
        .attr('x2', width - margins.left - margins.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))        

    function setScale(){
        let accum_data = []
        data.forEach( d=> {
            if( d.axis == 1)
                accum_data = accum_data.concat(d.values);
        });

        xScale = d3.scaleLinear()
          .range([0, width - margins.left - margins.right])
          .domain(d3.extent(accum_data, function (d) { return d.x }));
    
        yScale = d3.scaleLinear()
          .range([height - margins.top - margins.bottom, 0])
          .domain(d3.extent(accum_data, function (d) { return d.y }));
    
        // For data using the second axis
        accum_data = []
        data.forEach( d=> {
            if( d.axis == 2)
                accum_data = accum_data.concat(d.values);
        });
        yScale2 = d3.scaleLinear()
          .range([height - margins.top - margins.bottom, 0])
          .domain(d3.extent(accum_data, function (d) { return d.y }));
    }

    function renderAxes(){
        svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(" + margins.left + "," + (height - margins.bottom) + ")")
        .call(d3.axisBottom(xScale))

        // xAxis = (label) => (g) => g
        // .attr('class', 'x-axis')
        // .attr('transform', `translate(0,${height - margin.bottom})`)
        // .call(d3.axisBottom(xScale).ticks().tickFormat(d3.timeFormat('%m/%d')))
        // // Add label
        // .append('text')
        // .attr('class', 'axis-label')
        // .text(label)
        // .attr('x', margin.left + (width - margin.left - margin.right) / 2)
        // .attr('y', 50) // Relative to the x axis.

  
        svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", "translate(" + margins.left + "," + margins.top + ")")
        .call(d3.axisLeft(yScale))

        // svg.append("g")
        // .attr("class", "y-axis-2")
        // .attr("transform", "translate(" + (width - margins.right) + "," + margins.top + ")")
        // .call(d3.axisRight(yScale2))
    }

    function render(){        
        // Draw the grid lines.
        chart_area.append('g').call(xGrid)
        chart_area.append('g').call(yGrid)

        data.forEach((dt,i)=>{
            let lineFun = d3.line()
            .defined(d => !isNaN(d.y))
            .x(d => xScale(d.x))
            .y(d => dt.axis == 1 ? yScale(d.y) : yScale2(d.y))
    
            chart_area.append('g')
                .selectAll('path')
                .data([dt.values])
                .join('path')
                .attr('d', lineFun)
                .attr("fill", "none")
                .attr("stroke-width", "2")
                .attr("stroke", color[i])
            
            chart_area.append('g')
                .selectAll('circle')
                // .data(dt.values.filter(({value}) => !isNaN(value)))
                .data(dt.values)
                .join('circle')
                .style('pointer-events', 'none')
                .style('fill', color[i])
                .attr('r', 3)
                .attr('cx', d => xScale(d.x))
                .attr('cy', d => dt.axis == 1 ? yScale(d.y) : yScale2(d.y));
        })
    }

    // Returned object containing public API 
    let chart = {};

    chart.addSeries = function (t, v, axis) {
        data.push({title:t, values: v, axis: axis});
        return chart;
    }
    
    chart.render = function(){
        if ( typeof data != 'undefined'){
            setScale()
            render()
            renderAxes()
        }
        return chart
    }

    // const showDailyCases = selectedType.includes('daily');
    // const showTotalCases = selectedType.includes('total');
    
    // svg.append('g').call(title('Coronavirus (Covid-19) Total vs Daily Cases of Each County in the US'))
   


    return chart
}