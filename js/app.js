function formatNumber(num) {
  if (num < 1000) {
    return num.toString(); // For numbers less than 1000, return the number itself
  } else if (num < 100000) {
    return (num / 1000).toFixed(1) + 'K'; // For thousands
  } else if (num < 1000000) {
    return Math.round(num / 1000) + 'K'; // For numbers in the hundred thousands
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + 'M'; // For millions
  } else {
    return (num / 1000000000).toFixed(1) + 'B'; // For billions
  }
}

function onResize(svg, x, margin, height, inflation, yInflation, line, amount) {
  // Update width
  const newWidth = d3.select("#chart").node().getBoundingClientRect().width - margin.left - margin.right;
  svg.attr("width", newWidth + margin.left + margin.right);

  // Update x scale
  x.range([0, newWidth]);

  // Update 0x axis
  svg.select(".x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Redraw bars
  svg.selectAll("rect")
    .attr("x", d => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", d => inflation(d.inflation))
    .attr("height", d => height - inflation(d.inflation));

  // Redraw line
  svg.select(".line")
    .attr("d", line);
  svg.select(".line.future")
    .attr("d", line);

  //redraw circles
  svg.selectAll(".dot")
    .attr("cx", d => x(d.year))
    .attr("cy", d => amount(d.amount));

  // Update the right y-axis position and scale
  yInflation.range([height, 0]); // Update the range if the height changes
  svg.select(".y-axis-inflation")
    .attr("transform", `translate(${newWidth}, 0)`) // Move the axis to the new right side
    .call(d3.axisRight(yInflation)); // Redraw the right y-axis
}

function createChart(data) {
  // Set the dimensions and margins of the graph
  const margin = {top: 10, right: 30, bottom: 30, left: 50},
    width = d3.select("#chart").node().getBoundingClientRect().width - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  // Append the svg object to the body of the page
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Find the maximum value in your data for the inflation and amount values
  const maxAmount = d3.max(data, d => d.amount);
  const maxInflation = d3.max(data, d => d.inflation);

  // Define the y-axis scales
  const amountScale = d3.scaleLinear()
    .domain([0, maxAmount]) // Domain from 0 to max amount
    .range([height, 0]);     // The range is typically the height of the chart, inverted

  const yInflation = d3.scaleLinear()
    .domain([0, maxInflation * 5]) // Domain from 0 to max inflation
    .range([height, 0]);       // The range is typically the height of the chart, inverted

  // Append the y-axis to the SVG
  svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(amountScale).tickFormat(function(d) {
      return formatNumber(d);
    })); // Create a left y-axis based on the scale
  svg.append("g")
    .attr("class", "y-axis-inflation")
    .attr("transform", `translate(${width}, 0)`)
    .call(d3.axisRight(yInflation)); // Create a right y-axis based on the scale

  // X scale and Axis
  const x = d3.scaleBand()
    .range([0, width])
    .domain(data.map(d => d.year))
    .padding(0.2);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .attr("class", "x-axis")
    .call(d3.axisBottom(x));

  // Find the maximum value in the data
  const maxValue = d3.max(data, d => d.inflation);

  // Add Y scale for the bar chart
  const inflation = d3.scaleLinear()
    .domain([0, maxValue * 5]) //20% of the height of the chart. A way of making the bars look smaller.
    .range([height, 0])
    .nice();

  // 20% = max_inflation.

  // Y scale for the line chart
  const amount = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.amount)])
    .range([height, 0])
    .nice();

  // Bars
  svg.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.year))
    .attr("y", d => inflation(d.inflation))
    .attr("width", x.bandwidth())
    .attr("height", d => height - inflation(d.inflation))
    .attr("class", d => d.year > 2023 ? "bar future" : "bar");

  // Line
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => amount(d.amount));

  const realised = data.filter(d => parseInt(d.year) <= 2023);
  const simulated = data.filter(d => parseInt(d.year) >= 2023);

  svg.append("path")
    .datum(realised)
    .attr("fill", "none")
    .attr("class", "line")
    .attr("d", line);

  svg.append("path")
    .datum(simulated)
    .attr("fill", "none")
    .attr("class", "line future")
    .attr("d", line);

  // Draw circles for easier selection
  svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.year))
    .attr("cy", d => amount(d.amount))
    .attr("r", 3)
    .on("mouseover", function (event, d) {
      // Show the tooltip on mouseover
      d3.select("#tooltip")
        .classed("hidden", false)
        .html("Year: " + d.year + "<br>Value: " + formatNumber(d.amount.toFixed(2)))
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      // Hide the tooltip when the mouse moves away
      d3.select("#tooltip").classed("hidden", true);
    });

  // Handle window resize
  window.addEventListener('resize', () => onResize(svg, x, margin, height, inflation, yInflation, line, amount));

  return svg;
}

function redrawChart(svg, data) {
  window.removeEventListener('resize', onResize)

  // Set the dimensions and margins of the graph
  const margin = {top: 10, right: 30, bottom: 30, left: 50},
    width = d3.select("#chart").node().getBoundingClientRect().width - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  // X scale and Axis
  const x = d3.scaleBand()
    .range([0, width])
    .domain(data.map(d => d.year))
    .padding(0.2);

  // Find the maximum value in the data
  const maxValue = d3.max(data, d => d.inflation);

  // Add Y scale for the bar chart
  const inflation = d3.scaleLinear()
    .domain([0, maxValue * 5])
    .range([height, 0])
    .nice();

  // Y scale for the line chart
  const amount = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.amount)])
    .range([height, 0])
    .nice();

  // Bars
  const bars = svg.selectAll(".bar")
    .data(data);

  bars.enter().append("rect")
    // Set initial attributes for new bars if needed
    .merge(bars) // Merge enter and update selections
    .transition() // Optional: smooth transition
    .attr("x", d => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", d => inflation(d.inflation))
    .attr("height", d => height - inflation(d.inflation))
    .attr("class", d => d.year > 2023 ? "bar future" : "bar");;
  bars.exit().remove();

  // Redraw lines
  const realised = data.filter(d => parseInt(d.year) <= 2023);
  const simulated = data.filter(d => parseInt(d.year) >= 2023);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => amount(d.amount));

  svg.select(".line")
    .datum(realised)
    .transition()
    .attr("d", line);

  svg.select(".line.future")
    .datum(simulated)
    .transition()
    .attr("d", line);

  // Redraw axes
  svg.select(".x-axis").call(d3.axisBottom(x));
  svg.select(".y-axis").call(d3.axisLeft(amount).tickFormat(function(d) {
    return formatNumber(d);
  }));
  svg.select(".y-axis-inflation").call(d3.axisRight(inflation));

  //Redraw circles
  const circles = svg.selectAll(".dot")
    .data(data);

  // Handle entering circles
  circles.enter().append("circle")
    .attr("class", "dot")
    .attr("r", 3) // Radius of the circle
    // Set initial attributes for new circles if needed
    .merge(circles) // Merge entering and updating circles
    .transition() // Optional: smooth transition
    .attr("cx", d => x(d.year))
    .attr("cy", d => amount(d.amount));

  // Handle exiting circles
  circles.exit().remove();


  const maxInflation = d3.max(data, d => d.inflation);
  const yInflation = d3.scaleLinear()
    .domain([0, maxInflation]) // Domain from 0 to max inflation
    .range([height, 0]);       // The range is typically the height of the chart, inverted

  window.addEventListener('resize', () => onResize(svg, x, margin, height, inflation, yInflation, line, amount));
}

function computePurchasePower(initialAmount, yearlyInflation, numberOfYears, projectedInflation) {
  const data = [];
  let amount = initialAmount;

  for (let i = 0; i < yearlyInflation.length; i++) {
    const yearInflation = yearlyInflation[i];
    if (data.length > 0) {
      const year = yearInflation.year;
      const inflation = yearInflation.inflation;
      amount -= amount * (inflation / 100);
      data.push({year, inflation, amount});

      if (i === yearlyInflation.length - 1) { //we reach the end, need to add simulated data.
        const year = yearInflation.year + 1
        for (let j = 0; j < numberOfYears; j++) {
          amount -= amount * (projectedInflation / 100);
          data.push({year: year + j, inflation: projectedInflation, amount});
        }
      }
    } else {
      // initial year.
      data.push({year: yearInflation.year, inflation: yearInflation.inflation, amount: amount});
    }
  }

  //sort data by year
  data.sort((a, b) => a.year - b.year);

  return data;
}

function extractParams() {
  return {
    initialAmount: document.getElementById("initialAmount").value,
    numberOfYears: document.getElementById("numberOfYears").value,
    projectedInflation: document.getElementById("futureInflation").value,
  }
}

function updateChart(svg) {
  const yearlyInflation = [
    {year: 2019, inflation: 3.2},
    {year: 2020, inflation: 2.7},
    {year: 2021, inflation: 3.4},
    {year: 2022, inflation: 4.5},
    {year: 2023, inflation: 12.1},
  ]
  const params = extractParams();
  const data = computePurchasePower(params.initialAmount, yearlyInflation, params.numberOfYears, params.projectedInflation)
  redrawChart(svg, data)
}

// Call the createChart function when the page loads
window.addEventListener('load', () => {
  const yearlyInflation = [
    {year: 2019, inflation: 3.2},
    {year: 2020, inflation: 2.7},
    {year: 2021, inflation: 3.4},
    {year: 2022, inflation: 4.5},
    {year: 2023, inflation: 12.1},
  ]
  const params = extractParams();
  // check if chart has any children
  if (!document.getElementById('chart').hasChildNodes()) {
    const data = computePurchasePower(params.initialAmount, yearlyInflation, params.numberOfYears, params.projectedInflation)
    const svg = createChart(data)

    document.getElementById('btnSubmit').addEventListener('click', () => {
      updateChart(svg)
    })
  }
});
