'use strict';

var App = angular.module('chematicaD3jsApp');
App.controller('MainCtrl', function ($scope, $http) {
//    $scope.awesomeThings = [
//      'HTML5 Boilerplate',
//      'AngularJS',
//      'Karma'
//    ];
    $scope.scale = 1;
    $scope.xoffset = 10;
    $scope.yoffset = 50;
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
        template: '<div id="chart"></div>',
        link: function ($scope) {
            var width = 960,
                height = 300;

            // FIXME: Does nothing
            var color = d3.scale.category20();

            var force = d3.layout.force()
                .charge(-130)
                .linkDistance(30)
                .size([width, height]);

            var svg = d3.select("div")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

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

            $scope.$watch('graph', function () {
                if (typeof $scope.graph === 'undefined') return;

                force.nodes($scope.graph.nodes)
                    .links($scope.graph.links)
                    .start();

                var chemicalNodes = $scope.graph.nodes.filter(function (d) {
                    return d.nodeType === "chemical"
                });
                var reactionNodes = $scope.graph.nodes.filter(function (d) {
                    return d.nodeType === "reaction"
                });

                var link = svg.selectAll(".link")
                    .data($scope.graph.links)
                    .enter().append("line")
                    .attr("class", "link")
                    .attr("marker-end", function () {
                        return "url(#arrow)";
                    })
                    .style("stroke-width", function (d) {
                        return Math.sqrt(d.value);
                    });

                // Format the chemical nodes
                var chemNode = svg.selectAll(".node")
                    .data(chemicalNodes, function (d) {
                        return d.idx;
                    })
                    .enter()
                    .append("circle")
                    .attr("r", 5 * $scope.scale)
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
                    .attr("width", 10 * $scope.scale)
                    .attr("height", 10 * $scope.scale)
                    .style("fill", function (d) {
                        return color(d.group);
                    })
                    .call(force.drag);

                rxNode.append("title")
                    .text(function (d) {
                        return d.name;
                    });

                var updateForceGraphNodes = function(){
                    svg.selectAll("rect.node")
                        .attr("width", 10 * $scope.scale)
                        .attr("height", 10 * $scope.scale);
                    svg.selectAll("circle.node")
                        .attr("r", 5 * $scope.scale);
                }

                var updateForceGraph = function () {
                    link.attr("x1", function (d) {
                        return d.source.x * $scope.scale - $scope.xoffset;
                    })
                        .attr("y1", function (d) {
                            return d.source.y * $scope.scale - $scope.yoffset;
                        })
                        .attr("x2", function (d) {
                            return d.target.x * $scope.scale - $scope.xoffset;
                        })
                        .attr("y2", function (d) {
                            return d.target.y * $scope.scale - $scope.yoffset;
                        });


                    chemNode.attr("cx", function (d) {
                        return d.x * $scope.scale - $scope.xoffset;
                    })
                        .attr("cy", function (d) {
                            return d.y * $scope.scale - $scope.yoffset;
                        });

                    rxNode.attr("x", function (d) {
                        return d.x * $scope.scale - $scope.xoffset;
                    })
                        .attr("y", function (d) {
                            return d.y * $scope.scale - $scope.yoffset;
                        });
                };

                force.on('tick', updateForceGraph);

                $scope.$watch('scale', function() {
                    updateForceGraph();
                    updateForceGraphNodes();
                });
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
                        $scope.$apply(function() {
                            $scope.scale = .7 + (value + 20)/100;
                        });
                    })
                );
            }
        };
    }
);