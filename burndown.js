var g_bLoaded = false; //needed because DOMContentLoaded gets called again when we modify the page
var g_marginLabelChart = 35;
var g_heightBarUser = 30;
var g_colorRemaining = "#519B51";
var g_colorRemainingDark = "#346334";
var g_data = null;
var g_chartUser = null;
var g_dataUser = null;
var g_userTrello = null;
var g_colorTrelloBlack = "#4D4D4D";
var g_tl = {
    container: null,
    chartBottom: null,
    xAxisBottom: null,
    redrawAnnotations: null,
    pointer: null
};
var g_bUniqueBoard = false;
var g_TimelineColors = ["#D25656", "#6F83AD", g_colorRemaining, "black"]; //red, blue, green (spent, estimate, remaining, annotation)

setTimeout(loadBurndown, 500);

function checkHideTimelineSpark() {
    if (g_tl.chartBottom && g_tl.chartBottom.height() < 12) {
        g_tl.container.remove(g_tl.chartBottom);
        g_tl.container.remove(g_tl.xAxisBottom);
        g_tl.container.computeLayout();
        g_tl.container.redraw();
    }
}

function redrawCharts(bDontRedrawUser) {

    if (g_tl.crosshair)
        g_tl.crosshair.hide(); //could reposition (like annotations) but not worth it

    if (g_tl.projectionLine)
        g_tl.projectionLine.hide();

    if (g_tl.container) {
        //add in case it was removed by a previous resize (in checkHideTimelineSpark)
        if (g_tl.chartBottom)
            g_tl.container.add(g_tl.chartBottom, 2, 1);

        if (g_tl.xAxisBottom)
            g_tl.container.add(g_tl.xAxisBottom, 3, 1);

        var elemContainerTL = $("#timeline");
        var position = elemContainerTL.offset();
        var heightBody = window.innerHeight;
        var height = Math.max(heightBody - position.top, Math.max(heightBody / 2, 200));
        elemContainerTL.height(height);
        g_tl.container.computeLayout();
        g_tl.container.redraw();
        checkHideTimelineSpark();
        if (g_tl.redrawAnnotations)
            g_tl.redrawAnnotations();
    }
}

window.addEventListener('resize', function () {
    redrawCharts();
});

function showError(strError) {
    alert(strError);
}

function loadBurndown() {
    resetChartline();
    console.log("loading");
    fixSeries(g_series);
    loadTimeline(g_series);
}

function fixSeries(series) {
    //my sample data comes from a JSON.stringify which loses the date objects
    for (s in series) {
        var sCur=series[s];
        for (var i = 0; i < sCur.length; i++)
            sCur[i].x = new Date(sCur[i].x);
    }
}

function resetChartline() {
    if (g_tl.pointer) {
        if (g_tl.plot)
            g_tl.pointer.detachFrom(g_tl.plot);
        g_tl.pointer = null;
    }
    g_tl.plot = null;
    g_tl.crosshair = null;
    g_tl.projectionLine = null;
    g_tl.chartBottom = null;
    g_tl.xAxisBottom = null;
    g_tl.redrawAnnotations = null;
    if (g_tl.container)
        g_tl.container.destroy();
    g_tl.container = null;
    resetTDOutput(d3.select("#timelineDetail"));
}

function resetTDOutput(output) {
    output.html("");
}

function makeDateCustomString(x) {
    return "" + x;
}

function getCurrentWeekNum(x) {
    return "" + x;
}

function loadTimeline(series) {

    var xScale = new Plottable.Scales.Time();
    var xAxis = new Plottable.Axes.Numeric(xScale, "bottom");
    var xFormatter = Plottable.Formatters.multiTime();
    xAxis.formatter(xFormatter);
    var yScale = new Plottable.Scales.Linear();
    var yAxis = new Plottable.Axes.Numeric(yScale, "left");

    var series1 = new Plottable.Dataset(series.spent, {
        name: "Spent"
    });
    var series2 = new Plottable.Dataset(series.est, {
        name: "Estimate"
    });
    var series3 = new Plottable.Dataset(series.remain, {
        name: "Remain"
    });
    var seriesAnnotation = new Plottable.Dataset(series.annotation, {
        name: "Annotation"
    });

    var bandPlotS = new Plottable.Plots.Area();
    bandPlotS.addDataset(series1);
    bandPlotS.x(function (d) {
        return d.x;
    }, xScale).
    y(function (d) {
        return d.y;
    }, yScale).
    attr("fill", "#ffcdd2").
    attr("stroke-width", 0);


    var plot = new Plottable.Plots.Line(xScale, yScale);
    plot.x(function (d) {
        return d.x;
    }, xScale).y(function (d) {
        return d.y;
    }, yScale);
    plot.attr("stroke", function (d, i, dataset) {
        return d.stroke;
    });
    plot.addDataset(series1).addDataset(series2).addDataset(series3);
    plot.autorangeMode("y");

    var plotAnnotations = new Plottable.Plots.Scatter(xScale, yScale);
    plotAnnotations.addClass("tooltipped");
    plotAnnotations.attr("title", function (d) {
        return '<div>' + d.tooltip + '</div><div>' + makeDateCustomString(d.x) + ' (' + getCurrentWeekNum(d.x) + ')</div><div>Total S:' + d.sumSpent + '&nbsp;&nbsp;E:' + d.y + '&nbsp;&nbsp;R:' + d.sumR + '</div>';
    });
    plotAnnotations.size(13);
    plotAnnotations.attr("fill", "black");
    plotAnnotations.x(function (d) {
        return d.x;
    }, xScale).y(function (d) {
        return d.y;
    }, yScale);
    plotAnnotations.addDataset(seriesAnnotation);
    plotAnnotations.autorangeMode("y");

    var sparklineXScale = new Plottable.Scales.Time();
    var sparklineXAxis = new Plottable.Axes.Time(sparklineXScale, "bottom");
    sparklineXAxis.addClass("minichartBurndownXLine");
    var sparklineYScale = new Plottable.Scales.Linear();
    var sparkline = new Plottable.Plots.Line(xScale, sparklineYScale);
    sparkline.x(function (d) {
        return d.x;
    }, sparklineXScale).y(function (d) {
        return d.y;
    }, sparklineYScale);
    sparkline.attr("stroke", function (d, i, dataset) {
        return d.stroke;
    });
    sparkline.addDataset(series1).addDataset(series2).addDataset(series3);

    var sparklineAnnotations = new Plottable.Plots.Scatter(xScale, sparklineYScale);
    sparklineAnnotations.size(8);
    sparklineAnnotations.attr("fill", "black");
    sparklineAnnotations.x(function (d) {
        return d.x;
    }, sparklineXScale).y(function (d) {
        return d.y;
    }, sparklineYScale);
    sparklineAnnotations.addDataset(seriesAnnotation);

    var dragBox = new Plottable.Components.XDragBoxLayer();
    dragBox.resizable(true);
    dragBox.onDrag(function (bounds) {
        var min = sparklineXScale.invert(bounds.topLeft.x);
        var max = sparklineXScale.invert(bounds.bottomRight.x);
        xScale.domain([min, max]);
    });
    dragBox.onDragEnd(function (bounds) {
        if (bounds.topLeft.x === bounds.bottomRight.x) {
            xScale.domain(sparklineXScale.domain());
        }
    });

    var txtAnnotations = [];

    function addAnnotationText(annotation, x, y) {
        var txt = plotAnnotations.foreground().append("text");
        txt.attr({
            "text-anchor": "right",
            "font-size": "0.7em",
            "font-weight": "bold",
            "dx": "0em", //use if you want to offset x
            "dy": "1.5em", //offset y relative to text-anchor
            "fill": g_colorTrelloBlack,
            "writing-mode": "vertical-rl"
        });
        txt.text(annotation);
        txtAnnotations.push({
            txt: txt,
            x: x,
            y: y
        });
    }

    function redrawAnnotations() {
        txtAnnotations.forEach(function (elem) {
            elem.txt.attr({
                "x": xScale.scale(elem.x),
                "y": yScale.scale(elem.y)
            });
        });
    }


    function onUpdateXScale() {

        //could reposition these (like annotations) but not worth it
        if (g_tl.crosshair)
            g_tl.crosshair.hide();

        if (g_tl.projectionLine)
            g_tl.projectionLine.hide();

        dragBox.boxVisible(true);
        var xDomain = xScale.domain();
        dragBox.bounds({
            topLeft: {
                x: sparklineXScale.scale(xDomain[0]),
                y: null
            },
            bottomRight: {
                x: sparklineXScale.scale(xDomain[1]),
                y: null
            }
        });
        redrawAnnotations();
    }

    xScale.onUpdate(onUpdateXScale);

    yScale.onUpdate(function () {
        redrawAnnotations();
    });
    var miniChart = new Plottable.Components.Group([sparkline, sparklineAnnotations, dragBox]);
    var pzi = new Plottable.Interactions.PanZoom(xScale, null);
    pzi.attachTo(plot);

    var output = d3.select("#timelineDetail");
    resetTDOutput(output);

    var colorScale = new Plottable.Scales.Color().range(g_TimelineColors).domain(["Spent", "Estimate", "Remain", "Annotation"]);
    var legend = new Plottable.Components.Legend(colorScale).xAlignment("center").yAlignment("center");
    var gridline = new Plottable.Components.Gridlines(xScale, yScale);
    gridline.addClass("timelineGridline");
    resetChartline();
    g_tl.plot = plot;
    g_tl.chartBottom = miniChart;
    g_tl.xAxisBottom = sparklineXAxis;
    g_tl.container = new Plottable.Components.Table([ //ALERT: resize code assumes table positions
        [yAxis, new Plottable.Components.Group([bandPlotS, plot, plotAnnotations, gridline]), legend],
        [null, xAxis],
        [null, miniChart],
        [null, sparklineXAxis]
    ]);
    g_tl.container.rowWeight(2, 0.2);
    g_tl.container.renderTo("#timeline");
    onUpdateXScale(); //causes the gray selection on bottom chart to show all range selected

    checkHideTimelineSpark(); //this before annotations, top chart height could change
    series.annotation.forEach(function (annotation) {
        addAnnotationText(annotation.text, annotation.x, annotation.y);
    });

    g_tl.redrawAnnotations = redrawAnnotations;
    redrawAnnotations();
    if (false) {
        $($(".tooltipped")[0].getElementsByTagName("path")).qtip({
            position: {
                my: "bottom middle",
                at: "top middle"
            },
            hide: {
                delay: 400 //stay up a little so its harder to accidentally move a little the mouse and close it
            },
            style: {
                classes: "qtip-dark"
            }
        });
    }
    var crosshair = createCrosshair(plot, yScale);
    var projectionLine = createProjectionLine(plot, xFormatter, xScale, yScale);
    g_tl.crosshair = crosshair;
    g_tl.projectionLine = projectionLine;
    var pointer = new Plottable.Interactions.Click();
    var entityLast = null;

    g_tl.pointer = pointer;

    pointer.onClick(function (p) {
        var event = window.event;

        if (event && (event.ctrlKey || event.shiftKey)) {
            projectionLine.drawAt(p);
            return;
        }
        var nearestEntity = plot.entityNearest(p);
        if (!nearestEntity || nearestEntity.datum == null) {
            return;
        }
        crosshair.drawAt(nearestEntity.position);
        entityLast = nearestEntity;
        var datum = nearestEntity.datum;
        if (!datum)
            return; //for future
        var d = datum.drill;
        var html = getHtmlBurndownTooltip(d.user, d.card, d.date, d.spent, d.est, d.spentSum, d.estSum, d.remainSum, d.idCard, d.note);
        output.html(html);
    });

    pointer.attachTo(plot);
    redrawCharts(); //recalculate heights and redraw
}

var g_projectionData = {
    x1: 0,
    y1: 0
};

function createProjectionLine(plot, xFormatter, xScale, yScale) {
    var projection = {};
    var container = plot.foreground().append("g").style("visibility", "hidden");
    projection.lineDom = container.append("line").attr("stroke", g_colorRemaining).attr("stroke-width", 1).attr("stroke-dasharray", "5,5");
    projection.circleStart = container.append("circle").attr("stroke", g_colorRemaining).attr("fill", "white").attr("r", 6);
    projection.circleMid = container.append("circle").attr("stroke", g_colorRemaining).attr("fill", "black").attr("r", 3);
    projection.circleEnd = container.append("circle").attr("stroke", g_colorRemaining).attr("fill", g_colorRemaining).attr("r", 6).style("visibility", "hidden");
    projection.labelBackground = container.append("rect").attr("width", 0).attr("height", 0).attr("fill", "white").attr("rx", 3).attr("ry", 3).attr("stroke", g_colorRemainingDark).attr("stroke-width", 1).style("visibility", "hidden");
    projection.labelEnd = container.append("text").attr("stroke", g_colorRemainingDark).attr("stroke-width", 1).attr("stroke-opacity", 1);
    projection.bProjectionFirstClick = true;

    //plot.height()
    projection.drawAt = function (p) {
        var attr = {};
        container.style("visibility", "visible");
        if (projection.bProjectionFirstClick) {
            if (p.y >= yScale.scale(0)) {
                sendDesktopNotification("Click on a point above the zero line.", 5000);
                return;
            }
            projection.labelEnd.text("");
            projection.labelBackground.style("visibility", "hidden");
            projection.circleEnd.style("visibility", "hidden");
            projection.circleMid.style("visibility", "hidden");
            attr.x1 = p.x;
            attr.x2 = p.x;
            attr.y1 = p.y;
            attr.y2 = p.y;
            g_projectionData.x1 = attr.x1;
            g_projectionData.y1 = attr.y1;
            projection.circleStart.attr({
                cx: p.x,
                cy: p.y
            });
            projection.circleStart.style("visibility", "visible");
        } else {
            attr.y2 = yScale.scale(0);
            if (p.y <= g_projectionData.y1) {
                sendDesktopNotification("Click on a point to the right and below the first point.", 5000);
                return;
            }
            attr.x2 = ((p.x - g_projectionData.x1) / (p.y - g_projectionData.y1)) * (attr.y2 - g_projectionData.y1) + g_projectionData.x1;

            if (attr.x2 <= g_projectionData.x1) {
                sendDesktopNotification("Click on a point to the right of the first point.", 5000);
                return;
            }
            projection.circleStart.style("visibility", "visible");
            projection.labelEnd.attr({
                x: attr.x2 + 13,
                y: attr.y2 - 13
            });
            var widthLabel = 150;
            if (attr.x2 + widthLabel > plot.width())
                projection.labelEnd.attr({
                    x: attr.x2 - widthLabel,
                    y: attr.y2 - 13
                });
            var dateEnd = xScale.invert(attr.x2);
            var labelEnd = "";
            if (dateEnd) {
                labelEnd = dateEnd.toDateString(); //review couldnt use xFormatter(dateEnd)
            }



            projection.labelEnd.text(labelEnd);
            projection.circleEnd.attr({
                cx: attr.x2,
                cy: attr.y2
            });

            projection.circleMid.attr({
                cx: p.x,
                cy: p.y
            });
            projection.circleEnd.style("visibility", "visible");
            projection.circleMid.style("visibility", "visible");
            projection.labelEnd.style("visibility", "visible");
            var bbox = projection.labelEnd[0][0].getBBox();
            var pxBorder = 5;
            projection.labelBackground.attr({
                x: bbox.x - pxBorder,
                y: bbox.y - pxBorder,
                width: bbox.width + 2 * pxBorder,
                height: bbox.height + 2 * pxBorder
            });
            projection.labelBackground.style("visibility", "visible");
            projection.lineDom.style("visibility", "visible");
        }
        projection.bProjectionFirstClick = !projection.bProjectionFirstClick;
        projection.lineDom.attr(attr);

    };
    projection.hide = function () {
        container.style("visibility", "hidden");
        projection.circleStart.style("visibility", "hidden");
        projection.labelBackground.style("visibility", "hidden");
        projection.circleEnd.style("visibility", "hidden");
        projection.circleMid.style("visibility", "hidden");
        projection.labelEnd.style("visibility", "hidden");
        projection.lineDom.style("visibility", "hidden");
        projection.bProjectionFirstClick = true;
    };
    return projection;
}

function createCrosshair(plot, yScale) {
    var crosshair = {};
    var crosshairContainer = plot.foreground().append("g").style("visibility", "hidden");
    crosshair.vLine = crosshairContainer.append("line").attr("stroke", g_colorTrelloBlack).attr("y1", yScale.domainMin()).attr("y2", plot.height()).attr("stroke-dasharray", "2,4");
    crosshair.circle = crosshairContainer.append("circle").attr("stroke", g_colorTrelloBlack).attr("fill", "white").attr("r", 3);
    crosshair.drawAt = function (p) {
        crosshair.vLine.attr({
            x1: p.x,
            x2: p.x
        });
        crosshair.circle.attr({
            cx: p.x,
            cy: p.y
        });
        crosshairContainer.style("visibility", "visible");
    };
    crosshair.hide = function () {
        crosshairContainer.style("visibility", "hidden");
    };
    return crosshair;
}

function sendDesktopNotification(str) {
    alert(str);
}

function getHtmlBurndownTooltip(user, card, date, spent, est, sTotal, eTotal, rTotal, idCard, comment) {
    var html = "";
    var url = "";

    if (idCard.indexOf("https://") == 0)
        url = idCard; //old-style card URLs. Could be on old historical data from a previous Spent version
    else
        url = "https://trello.com/c/" + idCard;

    html += makeDateCustomString(date, true) + " (" + getCurrentWeekNum(date) + ") ";
    html += '<A target="_blank" href="' + url + '">' + card + '</A> ';
    if (user)
        html += 'by ' + user;
    html += '. ';
    if (spent != 0 || est != 0)
        html += 'S:' + spent + '  E:' + est + ".";
    if (comment != "")
        html += " " + comment;
    html += '<br>Total S:' + sTotal + '&nbsp; E:' + eTotal + '&nbsp; R:' + rTotal;
    return html;
}

var g_series = {
    "spent":
        [   { "x": "2016-11-27T17:14:31.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:14:31.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 100, "remainSum": 100, "idCard": "sJeMEMM9", "note": "[by zmandel] " } },
            { "x": "2016-11-27T17:44:42.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:44:42.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 200, "remainSum": 200, "idCard": "sJeMEMM9", "note": "" } },
            { "x": "2016-11-27T17:45:44.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:45:44.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 300, "remainSum": 300, "idCard": "sJeMEMM9", "note": "" } },
            { "x": "2016-11-27T17:47:29.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:47:29.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 400, "remainSum": 400, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:37.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:47:37.000Z", "spent": 0, "est": 120, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:51.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:47:51.000Z", "spent": 0, "est": -50, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to camille] [by zmandel] " } }, { "x": "2016-11-27T17:47:51.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T17:47:51.000Z", "spent": 0, "est": 50, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:48:48.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:48:48.000Z", "spent": 0, "est": -20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to camille] [by zmandel] " } }, { "x": "2016-11-27T17:48:48.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T17:48:48.000Z", "spent": 0, "est": 20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:50:49.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:50:49.000Z", "spent": 0, "est": -20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to john] [by zmandel] " } }, { "x": "2016-11-27T17:50:49.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "john", "card": "card 1 #arq", "date": "2016-11-27T17:50:49.000Z", "spent": 0, "est": 20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:51:19.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:51:19.000Z", "spent": 0, "est": -10, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T17:51:48.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 0, "est": -200, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[^etransfer to mark] inmediate200" } }, { "x": "2016-11-27T17:51:48.000Z", "y": 0, "stroke": "#D25656", "drill": { "user": "mark", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 0, "est": 200, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[^etransfer from zmandel] [by zmandel] inmediate200" } }, { "x": "2016-11-27T17:51:48.000Z", "y": 200, "stroke": "#D25656", "drill": { "user": "mark", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 200, "est": 0, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[by zmandel] inmediate200" } }, { "x": "2016-11-27T18:04:45.000Z", "y": 200, "stroke": "#D25656", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T18:04:45.000Z", "spent": 0, "est": -5, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[^etransfer to aaaa] [by zmandel] " } }, { "x": "2016-11-27T18:04:45.000Z", "y": 200, "stroke": "#D25656", "drill": { "user": "aaaa", "card": "card 1 #arq", "date": "2016-11-27T18:04:45.000Z", "spent": 0, "est": 5, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[^etransfer from camille] [by zmandel] " } }, { "x": "2016-11-27T18:04:46.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "aaaa", "card": "card 1 #arq", "date": "2016-11-27T18:04:46.000Z", "spent": 5, "est": 0, "spentSum": 205, "estSum": 510, "remainSum": 305, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:45:54.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T22:45:54.000Z", "spent": 0, "est": 0, "spentSum": 205, "estSum": 510, "remainSum": 305, "idCard": "sJeMEMM9", "note": "[by zmandel] a" } }, { "x": "2016-11-27T22:46:07.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T22:46:07.000Z", "spent": 0, "est": 6, "spentSum": 205, "estSum": 516, "remainSum": 311, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:53:34.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:53:34.000Z", "spent": 0, "est": 0, "spentSum": 205, "estSum": 516, "remainSum": 311, "idCard": "NULMOHl6", "note": "ss" } }, { "x": "2016-11-27T22:55:31.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:31.000Z", "spent": 0, "est": 6, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "" } }, { "x": "2016-11-27T22:55:37.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:37.000Z", "spent": 0, "est": -5, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer to camille] " } }, { "x": "2016-11-27T22:55:37.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "camille", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:37.000Z", "spent": 0, "est": 5, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 0, "est": -1, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer to john] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 205, "stroke": "#D25656", "drill": { "user": "john", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 0, "est": 1, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "john", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 1, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:56:16.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "camille", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:16.000Z", "spent": 0, "est": -5, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[^etransfer to zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:16.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:16.000Z", "spent": 0, "est": 5, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[^etransfer from camille] " } }, { "x": "2016-11-27T22:56:44.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:44.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[error: bad command format] @john 0/1 ^fdg" } }, { "x": "2016-11-27T22:57:09.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:57:09.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[error: bad command format] @camille 0/10 ^etransfer" } }, { "x": "2016-11-27T23:05:22.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:22.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "LQHmdl5z", "note": "7" } }, { "x": "2016-11-27T23:05:32.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:32.000Z", "spent": 0, "est": 7, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "" } }, { "x": "2016-11-27T23:05:41.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:41.000Z", "spent": 0, "est": -4, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer to camille] " } }, { "x": "2016-11-27T23:05:41.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "camille", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:41.000Z", "spent": 0, "est": 4, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 0, "est": -3, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer to john] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 206, "stroke": "#D25656", "drill": { "user": "john", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 0, "est": 3, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 209, "stroke": "#D25656", "drill": { "user": "john", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 3, "est": 0, "spentSum": 209, "estSum": 529, "remainSum": 320, "idCard": "LQHmdl5z", "note": "[by zmandel] " } }, { "x": "2016-11-27T23:26:48.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "Publish on web #1", "date": "2016-11-27T23:26:48.000Z", "spent": -399, "est": -399, "spentSum": -190, "estSum": 130, "remainSum": 320, "idCard": "gsrQHa8q", "note": "" } }, { "x": "2016-11-28T22:09:06.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:09:06.000Z", "spent": 0, "est": 100, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "" } }, { "x": "2016-11-28T22:09:27.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:09:27.000Z", "spent": 0, "est": -6, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to camille] " } }, { "x": "2016-11-28T22:09:27.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "camille", "card": "copy test from zigcw", "date": "2016-11-28T22:09:27.000Z", "spent": 0, "est": 6, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-28T22:10:53.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:10:53.000Z", "spent": 0, "est": -11, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to zmandel] " } }, { "x": "2016-11-28T22:10:53.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:10:53.000Z", "spent": 0, "est": 11, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "camille", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 0, "est": -5, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to john] [by zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": -190, "stroke": "#D25656", "drill": { "user": "john", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 0, "est": 5, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from camille] [by zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": -185, "stroke": "#D25656", "drill": { "user": "john", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 5, "est": 0, "spentSum": -185, "estSum": 230, "remainSum": 415, "idCard": "jVJQx4HN", "note": "[by zmandel] " } }, { "x": "2016-11-29T14:57:05.000Z", "y": -185, "stroke": "#D25656", "drill": { "user": "global", "card": "copy test from zigcw", "date": "2016-11-29T14:57:05.000Z", "spent": 0, "est": 12, "spentSum": -185, "estSum": 242, "remainSum": 427, "idCard": "jVJQx4HN", "note": "[by zmandel] " } }],
    "est": [{ "x": "2016-11-27T17:00:00.000Z", "y": 0, "stroke": "#6F83AD", "drill": { "user": "", "card": "hello #14001", "date": "2016-11-27T17:00:00.000Z", "spent": 0, "est": 0, "spentSum": 0, "estSum": 0, "remainSum": 0, "idCard": "yp2p7qEM", "note": "Card with due date." } }, { "x": "2016-11-27T17:14:31.000Z", "y": 100, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:14:31.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 100, "remainSum": 100, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T17:44:42.000Z", "y": 200, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:44:42.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 200, "remainSum": 200, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:45:44.000Z", "y": 300, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:45:44.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 300, "remainSum": 300, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:29.000Z", "y": 400, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:47:29.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 400, "remainSum": 400, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:37.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:47:37.000Z", "spent": 0, "est": 120, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:51.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:47:51.000Z", "spent": 0, "est": -50, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to camille] [by zmandel] " } }, { "x": "2016-11-27T17:47:51.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T17:47:51.000Z", "spent": 0, "est": 50, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:48:48.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:48:48.000Z", "spent": 0, "est": -20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to camille] [by zmandel] " } }, { "x": "2016-11-27T17:48:48.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T17:48:48.000Z", "spent": 0, "est": 20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:50:49.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:50:49.000Z", "spent": 0, "est": -20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to john] [by zmandel] " } }, { "x": "2016-11-27T17:50:49.000Z", "y": 520, "stroke": "#6F83AD", "drill": { "user": "john", "card": "card 1 #arq", "date": "2016-11-27T17:50:49.000Z", "spent": 0, "est": 20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:51:19.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:51:19.000Z", "spent": 0, "est": -10, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T17:51:48.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 0, "est": -200, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[^etransfer to mark] inmediate200" } }, { "x": "2016-11-27T17:51:48.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "mark", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 0, "est": 200, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[^etransfer from zmandel] [by zmandel] inmediate200" } }, { "x": "2016-11-27T17:51:48.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "mark", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 200, "est": 0, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[by zmandel] inmediate200" } }, { "x": "2016-11-27T18:04:45.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T18:04:45.000Z", "spent": 0, "est": -5, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[^etransfer to aaaa] [by zmandel] " } }, { "x": "2016-11-27T18:04:45.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "aaaa", "card": "card 1 #arq", "date": "2016-11-27T18:04:45.000Z", "spent": 0, "est": 5, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[^etransfer from camille] [by zmandel] " } }, { "x": "2016-11-27T18:04:46.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "aaaa", "card": "card 1 #arq", "date": "2016-11-27T18:04:46.000Z", "spent": 5, "est": 0, "spentSum": 205, "estSum": 510, "remainSum": 305, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:45:54.000Z", "y": 510, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T22:45:54.000Z", "spent": 0, "est": 0, "spentSum": 205, "estSum": 510, "remainSum": 305, "idCard": "sJeMEMM9", "note": "[by zmandel] a" } }, { "x": "2016-11-27T22:46:07.000Z", "y": 516, "stroke": "#6F83AD", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T22:46:07.000Z", "spent": 0, "est": 6, "spentSum": 205, "estSum": 516, "remainSum": 311, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:53:34.000Z", "y": 516, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:53:34.000Z", "spent": 0, "est": 0, "spentSum": 205, "estSum": 516, "remainSum": 311, "idCard": "NULMOHl6", "note": "ss" } }, { "x": "2016-11-27T22:55:31.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:31.000Z", "spent": 0, "est": 6, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "" } }, { "x": "2016-11-27T22:55:37.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:37.000Z", "spent": 0, "est": -5, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer to camille] " } }, { "x": "2016-11-27T22:55:37.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:37.000Z", "spent": 0, "est": 5, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 0, "est": -1, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer to john] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "john", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 0, "est": 1, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "john", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 1, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:56:16.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:16.000Z", "spent": 0, "est": -5, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[^etransfer to zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:16.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:16.000Z", "spent": 0, "est": 5, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[^etransfer from camille] " } }, { "x": "2016-11-27T22:56:44.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:44.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[error: bad command format] @john 0/1 ^fdg" } }, { "x": "2016-11-27T22:57:09.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:57:09.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[error: bad command format] @camille 0/10 ^etransfer" } }, { "x": "2016-11-27T23:05:22.000Z", "y": 522, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:22.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "LQHmdl5z", "note": "7" } }, { "x": "2016-11-27T23:05:32.000Z", "y": 529, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:32.000Z", "spent": 0, "est": 7, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "" } }, { "x": "2016-11-27T23:05:41.000Z", "y": 529, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:41.000Z", "spent": 0, "est": -4, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer to camille] " } }, { "x": "2016-11-27T23:05:41.000Z", "y": 529, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:41.000Z", "spent": 0, "est": 4, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 529, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 0, "est": -3, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer to john] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 529, "stroke": "#6F83AD", "drill": { "user": "john", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 0, "est": 3, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 529, "stroke": "#6F83AD", "drill": { "user": "john", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 3, "est": 0, "spentSum": 209, "estSum": 529, "remainSum": 320, "idCard": "LQHmdl5z", "note": "[by zmandel] " } }, { "x": "2016-11-27T23:26:48.000Z", "y": 130, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "Publish on web #1", "date": "2016-11-27T23:26:48.000Z", "spent": -399, "est": -399, "spentSum": -190, "estSum": 130, "remainSum": 320, "idCard": "gsrQHa8q", "note": "" } }, { "x": "2016-11-28T22:09:06.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:09:06.000Z", "spent": 0, "est": 100, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "" } }, { "x": "2016-11-28T22:09:27.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:09:27.000Z", "spent": 0, "est": -6, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to camille] " } }, { "x": "2016-11-28T22:09:27.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "copy test from zigcw", "date": "2016-11-28T22:09:27.000Z", "spent": 0, "est": 6, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-28T22:10:53.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:10:53.000Z", "spent": 0, "est": -11, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to zmandel] " } }, { "x": "2016-11-28T22:10:53.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:10:53.000Z", "spent": 0, "est": 11, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "camille", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 0, "est": -5, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to john] [by zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "john", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 0, "est": 5, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from camille] [by zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": 230, "stroke": "#6F83AD", "drill": { "user": "john", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 5, "est": 0, "spentSum": -185, "estSum": 230, "remainSum": 415, "idCard": "jVJQx4HN", "note": "[by zmandel] " } }, { "x": "2016-11-29T14:57:05.000Z", "y": 242, "stroke": "#6F83AD", "drill": { "user": "global", "card": "copy test from zigcw", "date": "2016-11-29T14:57:05.000Z", "spent": 0, "est": 12, "spentSum": -185, "estSum": 242, "remainSum": 427, "idCard": "jVJQx4HN", "note": "[by zmandel] " } }],
    "remain": [{ "x": "2016-11-27T17:14:31.000Z", "y": 100, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:14:31.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 100, "remainSum": 100, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T17:44:42.000Z", "y": 200, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:44:42.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 200, "remainSum": 200, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:45:44.000Z", "y": 300, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:45:44.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 300, "remainSum": 300, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:29.000Z", "y": 400, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:47:29.000Z", "spent": 0, "est": 100, "spentSum": 0, "estSum": 400, "remainSum": 400, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:37.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:47:37.000Z", "spent": 0, "est": 120, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "" } }, { "x": "2016-11-27T17:47:51.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:47:51.000Z", "spent": 0, "est": -50, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to camille] [by zmandel] " } }, { "x": "2016-11-27T17:47:51.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T17:47:51.000Z", "spent": 0, "est": 50, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:48:48.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:48:48.000Z", "spent": 0, "est": -20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to camille] [by zmandel] " } }, { "x": "2016-11-27T17:48:48.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T17:48:48.000Z", "spent": 0, "est": 20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:50:49.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:50:49.000Z", "spent": 0, "est": -20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer to john] [by zmandel] " } }, { "x": "2016-11-27T17:50:49.000Z", "y": 520, "stroke": "#519B51", "drill": { "user": "john", "card": "card 1 #arq", "date": "2016-11-27T17:50:49.000Z", "spent": 0, "est": 20, "spentSum": 0, "estSum": 520, "remainSum": 520, "idCard": "sJeMEMM9", "note": "[^etransfer from global] [by zmandel] " } }, { "x": "2016-11-27T17:51:19.000Z", "y": 510, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T17:51:19.000Z", "spent": 0, "est": -10, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T17:51:48.000Z", "y": 510, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 0, "est": -200, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[^etransfer to mark] inmediate200" } }, { "x": "2016-11-27T17:51:48.000Z", "y": 510, "stroke": "#519B51", "drill": { "user": "mark", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 0, "est": 200, "spentSum": 0, "estSum": 510, "remainSum": 510, "idCard": "sJeMEMM9", "note": "[^etransfer from zmandel] [by zmandel] inmediate200" } }, { "x": "2016-11-27T17:51:48.000Z", "y": 310, "stroke": "#519B51", "drill": { "user": "mark", "card": "card 1 #arq", "date": "2016-11-27T17:51:48.000Z", "spent": 200, "est": 0, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[by zmandel] inmediate200" } }, { "x": "2016-11-27T18:04:45.000Z", "y": 310, "stroke": "#519B51", "drill": { "user": "camille", "card": "card 1 #arq", "date": "2016-11-27T18:04:45.000Z", "spent": 0, "est": -5, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[^etransfer to aaaa] [by zmandel] " } }, { "x": "2016-11-27T18:04:45.000Z", "y": 310, "stroke": "#519B51", "drill": { "user": "aaaa", "card": "card 1 #arq", "date": "2016-11-27T18:04:45.000Z", "spent": 0, "est": 5, "spentSum": 200, "estSum": 510, "remainSum": 310, "idCard": "sJeMEMM9", "note": "[^etransfer from camille] [by zmandel] " } }, { "x": "2016-11-27T18:04:46.000Z", "y": 305, "stroke": "#519B51", "drill": { "user": "aaaa", "card": "card 1 #arq", "date": "2016-11-27T18:04:46.000Z", "spent": 5, "est": 0, "spentSum": 205, "estSum": 510, "remainSum": 305, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:45:54.000Z", "y": 305, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T22:45:54.000Z", "spent": 0, "est": 0, "spentSum": 205, "estSum": 510, "remainSum": 305, "idCard": "sJeMEMM9", "note": "[by zmandel] a" } }, { "x": "2016-11-27T22:46:07.000Z", "y": 311, "stroke": "#519B51", "drill": { "user": "global", "card": "card 1 #arq", "date": "2016-11-27T22:46:07.000Z", "spent": 0, "est": 6, "spentSum": 205, "estSum": 516, "remainSum": 311, "idCard": "sJeMEMM9", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:53:34.000Z", "y": 311, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:53:34.000Z", "spent": 0, "est": 0, "spentSum": 205, "estSum": 516, "remainSum": 311, "idCard": "NULMOHl6", "note": "ss" } }, { "x": "2016-11-27T22:55:31.000Z", "y": 317, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:31.000Z", "spent": 0, "est": 6, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "" } }, { "x": "2016-11-27T22:55:37.000Z", "y": 317, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:37.000Z", "spent": 0, "est": -5, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer to camille] " } }, { "x": "2016-11-27T22:55:37.000Z", "y": 317, "stroke": "#519B51", "drill": { "user": "camille", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:55:37.000Z", "spent": 0, "est": 5, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 317, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 0, "est": -1, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer to john] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 317, "stroke": "#519B51", "drill": { "user": "john", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 0, "est": 1, "spentSum": 205, "estSum": 522, "remainSum": 317, "idCard": "NULMOHl6", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:02.000Z", "y": 316, "stroke": "#519B51", "drill": { "user": "john", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:02.000Z", "spent": 1, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[by zmandel] " } }, { "x": "2016-11-27T22:56:16.000Z", "y": 316, "stroke": "#519B51", "drill": { "user": "camille", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:16.000Z", "spent": 0, "est": -5, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[^etransfer to zmandel] [by zmandel] " } }, { "x": "2016-11-27T22:56:16.000Z", "y": 316, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:16.000Z", "spent": 0, "est": 5, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[^etransfer from camille] " } }, { "x": "2016-11-27T22:56:44.000Z", "y": 316, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:56:44.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[error: bad command format] @john 0/1 ^fdg" } }, { "x": "2016-11-27T22:57:09.000Z", "y": 316, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aa #muahaha #trubu #pende #hohoh #27001 #lalala #!kooiop #DESARROLLO #!ALTA", "date": "2016-11-27T22:57:09.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "NULMOHl6", "note": "[error: bad command format] @camille 0/10 ^etransfer" } }, { "x": "2016-11-27T23:05:22.000Z", "y": 316, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:22.000Z", "spent": 0, "est": 0, "spentSum": 206, "estSum": 522, "remainSum": 316, "idCard": "LQHmdl5z", "note": "7" } }, { "x": "2016-11-27T23:05:32.000Z", "y": 323, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:32.000Z", "spent": 0, "est": 7, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "" } }, { "x": "2016-11-27T23:05:41.000Z", "y": 323, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:41.000Z", "spent": 0, "est": -4, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer to camille] " } }, { "x": "2016-11-27T23:05:41.000Z", "y": 323, "stroke": "#519B51", "drill": { "user": "camille", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:41.000Z", "spent": 0, "est": 4, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 323, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 0, "est": -3, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer to john] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 323, "stroke": "#519B51", "drill": { "user": "john", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 0, "est": 3, "spentSum": 206, "estSum": 529, "remainSum": 323, "idCard": "LQHmdl5z", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-27T23:05:50.000Z", "y": 320, "stroke": "#519B51", "drill": { "user": "john", "card": "aaaaa #lalalala #XXXXXX", "date": "2016-11-27T23:05:50.000Z", "spent": 3, "est": 0, "spentSum": 209, "estSum": 529, "remainSum": 320, "idCard": "LQHmdl5z", "note": "[by zmandel] " } }, { "x": "2016-11-27T23:26:48.000Z", "y": 320, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "Publish on web #1", "date": "2016-11-27T23:26:48.000Z", "spent": -399, "est": -399, "spentSum": -190, "estSum": 130, "remainSum": 320, "idCard": "gsrQHa8q", "note": "" } }, { "x": "2016-11-28T22:09:06.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:09:06.000Z", "spent": 0, "est": 100, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "" } }, { "x": "2016-11-28T22:09:27.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:09:27.000Z", "spent": 0, "est": -6, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to camille] " } }, { "x": "2016-11-28T22:09:27.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "camille", "card": "copy test from zigcw", "date": "2016-11-28T22:09:27.000Z", "spent": 0, "est": 6, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from zmandel] [by zmandel] " } }, { "x": "2016-11-28T22:10:53.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:10:53.000Z", "spent": 0, "est": -11, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to zmandel] " } }, { "x": "2016-11-28T22:10:53.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "zmandel", "card": "copy test from zigcw", "date": "2016-11-28T22:10:53.000Z", "spent": 0, "est": 11, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "camille", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 0, "est": -5, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer to john] [by zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": 420, "stroke": "#519B51", "drill": { "user": "john", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 0, "est": 5, "spentSum": -190, "estSum": 230, "remainSum": 420, "idCard": "jVJQx4HN", "note": "[^etransfer from camille] [by zmandel] " } }, { "x": "2016-11-28T22:12:31.000Z", "y": 415, "stroke": "#519B51", "drill": { "user": "john", "card": "copy test from zigcw", "date": "2016-11-28T22:12:31.000Z", "spent": 5, "est": 0, "spentSum": -185, "estSum": 230, "remainSum": 415, "idCard": "jVJQx4HN", "note": "[by zmandel] " } }, { "x": "2016-11-29T14:57:05.000Z", "y": 427, "stroke": "#519B51", "drill": { "user": "global", "card": "copy test from zigcw", "date": "2016-11-29T14:57:05.000Z", "spent": 0, "est": 12, "spentSum": -185, "estSum": 242, "remainSum": 427, "idCard": "jVJQx4HN", "note": "[by zmandel] " } }],
    "annotation": [{ "x": "2016-11-27T17:00:00.000Z", "y": 0, "stroke": "black", "text": "Due: hello #14001", "tooltip": "Due: hello #14001", "sumSpent": 0, "sumR": 0, "isDue": true }]
};

