'use strict';

var App = angular.module('chematicaD3jsApp');

App.controller('MainCtrl', function ($scope, $http) {

    // FIXME: localize this to the d3 directive somehow?
    $scope.graphTransform = {"scale" : 1, "offset" : [0,0]};

    $scope.mousewheel =  function(event) {
        var s = (1+event.deltaY),
            newscale = $scope.graphTransform.scale * s;
        if (newscale >= 0.1) {
            $scope.graphTransform.scale = newscale;
            $scope.graphTransform.offset[0] = $scope.graphTransform.offset[0] * s + event.originalEvent.offsetX * event.deltaY;
            $scope.graphTransform.offset[1] = $scope.graphTransform.offset[1] * s + event.originalEvent.offsetY * event.deltaY;
        }
        event.preventDefault();
    }

    // Get the graph model ($scope.graph)
    $http.get('example_retro.json').success(function (data) {
        // Process the data into something we can draw:
        var idx = 0;
        var result = {
            "nodes": [],
            "links": []
        };

        data.idx = idx;
        var currentNodes = [data];

        while (currentNodes.length) {
            var newNodes = [];
            currentNodes.forEach(function (node) {
                result.nodes[node.idx] = {
                    "name": node.smiles,
                    "nodeType": "chemical",
                    "idx": node.idx
                };
                (node.syntheses || []).forEach(function (child) {
                    var reactionIdx = (idx += 1);
                    result.nodes[reactionIdx] = {
                        "name": child.rxid,
                        "nodeType": "reaction",
                        "idx": reactionIdx
                    };
                    result.links.push({"source": reactionIdx, "target": node.idx, "value": 1 });
                    child.synthons.forEach(function (synthon) {
                        synthon.idx = (idx += 1);
                        result.links.push({"source": idx, "target": reactionIdx, "value": 1 });
                        newNodes.push(synthon);
                    });
                });
            });
            currentNodes = newNodes;
        }
        $scope.graph = result;
    });
});

App.directive('d3graph', function () {
    return {
        restrict: 'E',
        replace: true,
        // FIXME: This does not make a uniquely selectable element :(
        template: '<div id="chart"></div>',
        link: function (scope, element, attrs) {
            // Initialize our graph state
            var width = scope.$eval(attrs.width),
                height = scope.$eval(attrs.height);

            // FIXME: Does nothing
            var color = d3.scale.category20();

            var force = d3.layout.force()
                .charge(-130)
                .linkDistance(30)
                .size([width, height]);

            var svg = d3.select("div#chart")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g");

            // Rescale the graph based on the scale set by the view
            // Rescales based on the center of the graph
            scope.$watch('graphTransform', function () {
                svg.attr("transform",
                  "scale(" + scope.graphTransform.scale + ") "
                  + "translate(" + scope.graphTransform.offset + ") "
                );
            });

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

            scope.$watch('graph', function () {
                if (typeof scope.graph === 'undefined') return;

                force.nodes(scope.graph.nodes)
                    .links(scope.graph.links)
                    .start();

                var chemicalNodes = scope.graph.nodes.filter(function (d) {
                    return d.nodeType === "chemical"
                });
                var reactionNodes = scope.graph.nodes.filter(function (d) {
                    return d.nodeType === "reaction"
                });

                // Format the chemical nodes
                var chemNode = svg.selectAll(".node")
                    .data(chemicalNodes, function (d) {
                        return d.idx;
                    })
                    .enter()
                    .append("circle")
                    .attr("r", 5)
                    .attr("class", "node")
                    .style("fill", function (d) {
                        return color(d.group);
                    })
                    .call(force.drag);

                chemNode.append("title")
                    .text(function (d) {
                        return d.name;
                    });

                // Format the reaction nodes
                var rxNode = svg.selectAll(".node")
                    .data(reactionNodes, function (d) {
                        return d.idx;
                    })
                    .enter()
                    .append("rect")
                    .attr("class", "node")
                    .attr("width", 10)
                    .attr("height", 10)
                    .style("fill", function (d) {
                        return color(d.group);
                    })
                    .call(force.drag);

                rxNode.append("title")
                    .text(function (d) {
                        return d.name;
                    });

                // FIXME: link start and end points are ugly ~Ling
                var link = svg.selectAll(".link")
                    .data(scope.graph.links)
                    .enter().append("line")
                    .attr("class", "link")
                    .attr("marker-end", function () {
                        return "url(#arrow)";
                    })
                    .style("stroke-width", function (d) {
                        return Math.sqrt(d.value);
                    });

                var updateForceGraph = function () {
                    link.attr("x1", function (d) {
                        return (d.source.x - width / 2) + width / 2;
                    })
                        .attr("y1", function (d) {
                            return (d.source.y - height / 2) + height / 2;
                        })
                        .attr("x2", function (d) {
                            return (d.target.x - width / 2) + width / 2;
                        })
                        .attr("y2", function (d) {
                            return (d.target.y - height / 2) + height / 2;
                        });


                    chemNode.attr("cx", function (d) {
                        return (d.x - width / 2) + width / 2;
                    })
                        .attr("cy", function (d) {
                            return (d.y - height / 2) + height / 2;
                        });

                    rxNode.attr("x", function (d) {
                        return (d.x - 5 - width / 2) + width / 2;
                    })
                        .attr("y", function (d) {
                            return (d.y - 5 - height / 2) + height / 2;
                        });
                };

                force.on('tick', updateForceGraph);
            });
        }
    };
});

App.directive('slider', function () {
        return {
            restrict: 'E',
            replace: true,
            template: '<div id="slider"></div>',
            link: function ($scope) {
                d3.select('#slider').call(
                    d3.slider(d3.slider().axis(true).step(1)).on("slide", function (evt, value) {
                        $scope.$apply(function () {
                            $scope.scale = .7 + (value + 20) / 50;
                        });
                    })
                );
            }
        };
    });
