'use strict';

angular.module('chematicaD3jsApp')
  .controller('MainCtrl', function ($scope) {
//    $scope.awesomeThings = [
//      'HTML5 Boilerplate',
//      'AngularJS',
//      'Karma'
//    ];

        var makeGraphJson =  function(retroJson) {
            var idx = 0;
            var result = {
                "nodes" : [],
                "links" : []
            };

            retroJson.idx = idx;
            var currentNodes = [retroJson];

            while(currentNodes.length) {
                var newNodes = [];
                for( var j in currentNodes){
                    var node = currentNodes[j];
                    result.nodes[node.idx]= {
                        "name": node.smiles,
                        "nodeType": "chemical",
                        "idx": node.idx
                    };
                    if(node.syntheses)
                        for (var i in node.syntheses) {
                            var reactionIdx = (idx += 1);
                            result.nodes[reactionIdx]= {
                                "name": node.syntheses[i].rxid,
                                "nodeType": "reaction",
                                "idx": reactionIdx
                            };
                            result.links.push({"source": reactionIdx, "target": node.idx, "value": 1});
                            for (var k in node.syntheses[i].synthons) {
                                //console.log(node.sytheses[i].synthons[k]);
                                node.syntheses[i].synthons[k].idx = (idx += 1);
                                result.links.push({"source": idx, "target": reactionIdx, "value": 1});
                                newNodes.push(node.syntheses[i].synthons[k]);
                            }
                        }
                }
                currentNodes = newNodes;
            }
            return result;
        }

        var width = 960,
            height = 500;

        var color = d3.scale.category20();

        var force = d3.layout.force()
            .charge(-130)
            .linkDistance(30)
            .size([width, height]);

        var svg = d3.select("div").append("svg")
            .attr("width", width)
            .attr("height", height);


        d3.json("example_retro.json", function(error, algorithmResult) {
            var graph = makeGraphJson(algorithmResult);

            force.nodes(graph.nodes)
                .links(graph.links)
                .start();

            var chemicalNodes = graph.nodes.filter(function (d) { return d.nodeType === "chemical"});
            var reactionNodes = graph.nodes.filter(function (d) { return d.nodeType === "reaction"});

            // Define the arrows for the ends of edges
            svg.append("svg:defs")
                .append("svg:marker")
                .attr("id", "arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 15)
                .attr("refY", -1.5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");

            var link = svg.selectAll(".link")
                .data(graph.links)
                .enter().append("line")
                .attr("class", "link")
                .attr("marker-end", function(d) { return "url(#arrow)"; })
                .style("stroke-width", function(d) { return Math.sqrt(d.value); });

            // Format the chemical nodes
            var chemNode = svg.selectAll(".node")
                .data(chemicalNodes, function (d) {return d.idx;})
                .enter()
                .append("circle")
                .attr("r", 5)
                .attr("class", "node")
                .style("fill", function(d) { return color(d.group); })
                .call(force.drag);

            chemNode.append("title")
                .text(function(d) { return d.name; });

            // Format the reaction nodes
            console.log(reactionNodes);
            var rxNode = svg.selectAll(".node")
                .data(reactionNodes, function (d) {return d.idx;})
                .enter()
                .append("rect")
                .attr("class", "node")
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", function(d) { return color(d.group); })
                .call(force.drag);

            rxNode.append("title")
                .text(function(d) { return d.name; });

            force.on("tick", function() {
                link.attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });


                chemNode.attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; });

                rxNode.attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y; });

//            node.attr("cx", function(d) { return d.x; })
//                    .attr("cy", function(d) { return d.y; });

            });
        });
  });
