var makeGraph = function() {console.log("makeGraph not loaded yet")};
var loadGraphDatatypes = function() {console.log("makeGraphParticipant not loaded yet")};

(function makeGraphClosure() {
	var datatypes_loaded = false;
	var datatypes = {}
	var loaded_datatypes = {}; // datatype_id: data  pairs

	var created_graph = false;
	// graph variables:
	var x,y, xAxis, yAxis, line, width, height;
	var participant_id = null;
	makeGraph = function (selector, participant_id_passed_id, datatype_id, width, height) {
		participant_id = participant_id_passed_id;

		Promise.all([
			load_datatypes(participant_id),
			setup_graph(selector, width, height)
			]).then(
				() => {
					console.log("loaded and setup_graph", datatypes)
					var datatype_id = null;
					for (var key in datatypes) {
						console.log(key, datatypes[key])
						if (datatypes[key]=='acceleration') {
							datatype_id = key;
							break
						}
					}
					if (datatype_id!=null) {
						console.log("datatype_id",  datatype_id)
						return load_datapoints(participant_id, datatype_id)	
					}
				}
			).then((data) => {
				console.log("now rendering:", data);
				drawGraph(data)
				drawGraphDatatypes()
			})
			// .catch((e) => {console.log("error in graphing:", e)})


	}
	function setup_graph(selector) {
		return new Promise((resolve) => {

			console.log("setting up graph")
			if (!width) width = $(window).width()-201;
			if (!height) height = 200;

			// Set the dimensions of the canvas / graph
			var margin = {top: 30, right: 20, bottom: 30, left: 50};
			width = width - margin.left - margin.right,
			height = height - margin.top - margin.bottom;

			// Set the range
			x = d3.time.scale()
			    .range([0, width])//.nice(d3.time.minute)

			y = d3.scale.linear()
			    .range([height, 0]);


			xAxis = d3.svg.axis()
			    .scale(x)
			    .orient("bottom");

			yAxis = d3.svg.axis()
			    .scale(y)
			    .orient("left");

			var svg = d3.select(".graph").append("svg")
			    .attr("width", width + margin.left + margin.right)
			    .attr("height", height + margin.top + margin.bottom)
			   .append("g")
			    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			// AXES
			svg.append("g")
			  .attr("class", "x axis")
			  .attr("transform", "translate(0," + height + ")")

			svg.append("g")
			   .attr("class", "y axis")
			   .append("text")
			     .attr("transform", "rotate(-90)")
			     .attr("y", 6)
			     .attr("dy", ".71em")

			created_graph = true;
			resolve("created_graph");
		})
	}


	function drawGraph() {
		svg = d3.select(".graph").select("g")

		var data = loaded_datatypes;
		console.log("drawGraph data:", data)
		// find the domain based on all the available data
		x.domain([
			d3.min(d3.values(loaded_datatypes), (d) => {return d3.min(d, (r) => r.time)}),
			d3.max(d3.values(loaded_datatypes), (d) => {return d3.max(d, (r) => r.time)})
		])
		console.log("x.domain()", x.domain())
		// // hack to make sure not too big!
		// 	// limit to start + 1day
		// 	x.domain([
		// 		x.domain()[0],
		// 		Math.min(x.domain()[1], x.domain()[0].setDate(x.domain()[0].getDate()+1))
		// 	])
		// 	// x.domain([
		// 	// 	Math.max(x.domain()[0], x.domain()[1].setDate(x.domain()[1].getDate()-1)),
		// 	// 	x.domain()[1]
		// 	// ])

		y.domain([
			d3.min(d3.values(loaded_datatypes), (d) => {return d3.min(d, (r) => r.value)}),
			d3.max(d3.values(loaded_datatypes), (d) => {return d3.max(d, (r) => r.value)})
		])
		console.log("x.domain()", x.domain())
		console.log("y.domain()",y.domain())

		line = d3.svg.line()
		    .x(function(d) { return x(d.time); })
		    .y(function(d) { return y(d.value); });

	    // x.domain(d3.extent(data, (d) => { return d.time; }));
	    // y.domain(d3.extent(data, (d) => { return d.value; }));

		// console.log(svg.select(".x-axis")[0][0])
		svg.select(".x.axis")
		  .call(xAxis);
		// console.log(svg.select(".x-axis")[0][0])

		svg.select(".y.axis")
		  .call(yAxis)
		
		console.log("datatype.keys:", d3.keys(loaded_datatypes))
		svg.selectAll(".path").data(d3.keys(loaded_datatypes))
			.enter()
			.append("path")
			.attr("class", "path")
			.attr("d", function(d) {console.log("D:", d); return line(loaded_datatypes[d]); })
		
	}

	function drawGraphDatatypes() {
		var legend = d3.select(".graph").select("g")
			.append("g")
				.attr("class", "legend")
				.style("font-size","12px")
		legend
			.append("rect")
				.style("fill","white")
				.style("stroke","black")
				.style("opactiy","0.8")


		console.log("creating legend:", datatypes)
		var box = legend.append("g")
					.attr("class", "legend-items")
		var items = box.selectAll("text")
						.data(d3.entries(datatypes))
						// .data(datatypes)
		items.enter().append("text")
			.attr("class", "item")
			.attr("y", (d, i) => i * 10)
			.attr("dy", ".35em")
			.text((d) => d.value)
				.on("click", (d) => {
					load_datapoints(participant_id, d.key)
						.then((data) => {
							drawGraph(data)
						})
				})

		items.exit()

	}

	function load_datapoints(participant_id, datatype_id) { 
		console.log("load_datapoints(",participant_id, datatype_id,")")
		if (datatype_id in loaded_datatypes) return Promise.resolve(loaded_datatypes[datatype_id]) // return existing data
		return Datapoints.get_datapoints(participant_id, datatype_id).then(function(response) {
			console.log("Datapoints.get_datapoints", response)

			// parse the data
			function type(d) {
			  return {value: +d[0], time: new Date(d[1])};
			}

			var data = response.data.map(type)

			loaded_datatypes[datatype_id] = data
			return data;
		});
	}


	load_datatypes = function(participant_id) {
		if (datatypes_loaded) return false;
		else {
			console.log("loading datatype");
			return Datapoints.get_datatypes(participant_id).then(function(data) {
						console.log("Datapoints.get_datatypes(participant_id)", data)
						datatypes_loaded = true;
						datatypes = data

						return true;
					})
		}
	}

})();
