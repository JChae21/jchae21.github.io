function lineChart(selection) {
  // Private variables
  var selection = selection;
  var data = [];
  var all_data = [];
  var colours = d3.schemeCategory10;

  var svg, chart_area;
  var scaleX, scaleY, line;

  var margins = { top: 40, right: 30, bottom: 50, left: 50 };
  var width = 600;
  var height = 300;
  var chart_width, chart_height;

  var title = { text:"" };
  var x_label = { text:"" };
  var y_label = { text:"" };

  let data_title = []

  let animatedVerticalLine
  let chart_id

  // Generates the titles xy position
  title.position = function (width, height, margins) {
    var x_pos = (width)/2;
    var y_pos = margins.top/1.4;
    return {x: x_pos, y: y_pos}
  }

  // Generates the x-axis label position
  x_label.position = function (width, height, margins) {
    var x_pos = (width)/2;
    var y_pos = height - (margins.bottom/5);
    return {x: x_pos, y: y_pos}
  }

  // Generates the y-axis label position
  y_label.position = function (width, height, margins) {
    var x_pos = (-height)/2;
    var y_pos = margins.left/3;
    return {x: x_pos, y: y_pos}
  }

  function scale() {
    all_data = []
    data.forEach(function (series) {
      all_data = all_data.concat(series);
    });

    scaleY = d3.scaleLinear()
      .range([height - margins.top - margins.bottom, 0])
      .domain(d3.extent(all_data, function (d) { return d.y }));

    scaleX = d3.scaleLinear()
      .range([0, width - margins.left - margins.right])
      .domain(d3.extent(all_data, function (d) { return d.x }));
  }

  function renderBody() {
    // console.log(height + margins.top + margins.bottom)
    svg = selection.append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "chart-container")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("viewBox", "0 0 " + (width) + " " + (height))
      // .style("background", "#eee")

    chart_area = svg.append("g")
      .attr("class", "chart")
      .attr("transform", "translate(" + margins.left  + "," + margins.top + ")")
  }

  function renderLines() {
    // Create line generator
    line = d3.line()
      .x(function (d) {
        return scaleX(d.x)
      })
      .y(function (d) {
        return scaleY(d.y)
      });

    // Add line for each data series
    chart_area.selectAll("path.line")
      .data(data)
      .enter()
      .append("path")
      .attr("class", "line")
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", function (d, i) {
        return colours[i];
      })
      .attr("stroke-width", "2");
  }

  function renderPoints() {
    // Render data points using flattened array
    chart_area.selectAll(".datum")
    .data(all_data)
    .enter()
      .append("circle")
        .attr("class", ".datum")
        .attr("cx", function (d, i) {
          return scaleX(d.x);
        })
        .attr("cy", function (d) {
          return scaleY(d.y);
        })
        .attr("r", 3)
        .attr("fill", "#000")
  }

  function renderAxes() {
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(" + margins.left + "," + (height - margins.bottom) + ")")
      .call(d3.axisBottom(scaleX))

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", "translate(" + margins.left + "," + margins.top + ")")
      .call(d3.axisLeft(scaleY))
  }

  function renderLabels() {
    var position
    if (x_label.text) {
      position = x_label.position(width, height, margins);
      svg.append("text")
        .attr("class", "x-label")
        .text(x_label.text)
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + position.x + "," + position.y + ")")
    }

    if (y_label.text) {
      position = y_label.position(width, height, margins);
      svg.append("text")
        .attr("class", "y-label")
        .text(y_label.text)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90) translate(" + position.x + "," + position.y + ")")
    }

    if (title.text) {
      position = title.position(width, height, margins);
      svg.append("text")
        .attr("class", "title")
        .text(title.text)
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + position.x + "," + position.y + ")")
    }
  }

  function renderLegends() {

    let legends = data_title.map( (d, i) => {
      return {name: d, color: colours[i]}
    })

    var legend = svg.append("g")
        .attr('class', 'legend')
        .attr("transform", "translate(" + (margins.left + 50) + "," + (height - 18) + ")")
        .selectAll('g')
        .data(legends)
        .enter().append('g')

    legend.append('rect')
        .attr('y', 5)
        .attr('x', function(d, i) {
            return i * 100;
        })
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', function(d) {
            return d.color;
        });

    legend.append('text')
        .attr('y', 15)
        .attr('x', function(d, i) {
            return (i * 100) + 15;
        })
        .text(function(d) {
            return d.name;
        });
  }

  // Returned object containing public API 
  var chart = {};

  // Getter/setter methods for configuring chart
  chart.width = function (w) {
    if (!arguments.length) return width;
    width = w;
    return chart;
  }

  chart.height = function (h) {
    if (!arguments.length) return height;
    height = h;
    return chart;
  }

  chart.margins = function (m) {
    if (!arguments.length) return margins;
    margins = m;
    return chart;
  }

  chart.addSeries = function (t, s) {
    data_title.push(t)
    data.push(s);
    return chart;
  }

  chart.selection = function (sel) {
    if (!arguments.length) return selection;
    selection = sel;
  }

  chart.title = function (text, pos) {
    if (!arguments.length) return title;
    title.text = text;

    if(pos) {
      title.position = pos;
    }
    return chart;
  }

  chart.xLabel = function (text, pos) {
    if (!arguments.length) return x_label;
    x_label.text = text;

    if(pos) {
      x_label.position = pos;
    }
    return chart;
  }

  chart.yLabel = function (text, pos) {
    if (!arguments.length) return y_label;
    y_label.text = text;

    if(pos) {
      y_label.position = pos;
    }
    return chart;
  }

  // Renders the chart to screen
  chart.render = function () {
    if (data.length) {
      scale();
      renderBody();
      // renderPoints();
      renderLines();
      renderAxes();
      renderLabels();
      renderLegends();
      return chart;
    }
  }

  chart.ID = function (id) {
    chart_id = id
    return chart
  }

  chart.renderAnimatedVerticalLine = function(curPoint) {

    if( !animatedVerticalLine ){
      animatedVerticalLine = chart_area.append('line')
         .attr("x1", 0)
         .attr("y1", 0)
         .attr("x2", 0)
         .attr("y2", height - margins.top - margins.bottom)
      .style("stroke", "#a1d99b")
      .style("stroke-width", 2)
      .attr('class', 'animatedVerticalLine-' + chart_id);
    }

    d3.select('.animatedVerticalLine-' + chart_id).attr("transform", function () {
        return "translate(" + scaleX(curPoint) + ",0)";
    });
  }  

  return chart;
}