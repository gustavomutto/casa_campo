/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [1.0, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "02 flutter_bootstrap.js"], "isController": false}, {"data": [1.0, 500, 1500, "12 reservas.json"], "isController": false}, {"data": [1.0, 500, 1500, "Carga completa de la aplicación"], "isController": true}, {"data": [1.0, 500, 1500, "07 FontManifest"], "isController": false}, {"data": [1.0, 500, 1500, "09 MaterialIcons"], "isController": false}, {"data": [1.0, 500, 1500, "03 main.dart.js"], "isController": false}, {"data": [1.0, 500, 1500, "04 canvaskit.js"], "isController": false}, {"data": [1.0, 500, 1500, "06 AssetManifest"], "isController": false}, {"data": [1.0, 500, 1500, "08 Roboto-Regular.ttf"], "isController": false}, {"data": [1.0, 500, 1500, "11 clientes.json"], "isController": false}, {"data": [1.0, 500, 1500, "10 casas.json"], "isController": false}, {"data": [1.0, 500, 1500, "05 canvaskit.wasm"], "isController": false}, {"data": [1.0, 500, 1500, "01 index.html"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 7200, 0, 0.0, 0.7059722222222241, 0, 16, 0.0, 2.0, 4.0, 6.0, 192.62152545546965, 167851.3660327323, 28.592257684796277], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 600, 0, 0.0, 0.24500000000000022, 0, 4, 0.0, 1.0, 1.0, 1.0, 18.835938971557734, 245.97087492936524, 2.7039873328310415], "isController": false}, {"data": ["12 reservas.json", 600, 0, 0.0, 0.19833333333333344, 0, 4, 0.0, 1.0, 1.0, 1.990000000000009, 18.848957024377984, 54.11712270671023, 2.926742350464941], "isController": false}, {"data": ["Carga completa de la aplicación", 600, 0, 0.0, 8.47166666666668, 4, 40, 8.0, 11.0, 14.0, 20.99000000000001, 18.7952260125928, 196539.0536897378, 33.478996334930926], "isController": true}, {"data": ["07 FontManifest", 600, 0, 0.0, 0.19666666666666685, 0, 4, 0.0, 1.0, 1.0, 1.990000000000009, 18.84777282151159, 11.724639929006722, 2.7793102500471196], "isController": false}, {"data": ["09 MaterialIcons", 600, 0, 0.0, 0.16999999999999993, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.848957024377984, 229.90573558054788, 3.0371854580296556], "isController": false}, {"data": ["03 main.dart.js", 600, 0, 0.0, 1.821666666666667, 1, 10, 2.0, 3.0, 5.0, 7.0, 18.836530311116693, 51247.17206778011, 2.5569118293410353], "isController": false}, {"data": ["04 canvaskit.js", 600, 0, 0.0, 0.2600000000000003, 0, 3, 0.0, 1.0, 1.0, 2.0, 18.84007912833234, 1605.1232258925486, 2.7413787012905453], "isController": false}, {"data": ["06 AssetManifest", 600, 0, 0.0, 0.2266666666666667, 0, 3, 0.0, 1.0, 1.0, 1.0, 18.847180775875607, 17.577204727501176, 2.8712501963248], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 600, 0, 0.0, 0.43333333333333346, 0, 3, 0.0, 1.0, 1.0, 2.0, 18.848364904344546, 9485.734143813024, 3.0370900480633307], "isController": false}, {"data": ["11 clientes.json", 600, 0, 0.0, 0.18666666666666631, 0, 3, 0.0, 1.0, 1.0, 1.0, 18.84954918161541, 18.18686971819924, 2.926834296754736], "isController": false}, {"data": ["10 casas.json", 600, 0, 0.0, 0.18833333333333332, 0, 3, 0.0, 1.0, 1.0, 1.0, 18.84954918161541, 24.353470280544123, 2.871611008136722], "isController": false}, {"data": ["05 canvaskit.wasm", 600, 0, 0.0, 4.075000000000004, 3, 15, 4.0, 6.0, 7.0, 12.0, 18.838896040692017, 134022.07732189394, 2.7780012716254827], "isController": false}, {"data": ["01 index.html", 600, 0, 0.0, 0.47000000000000036, 0, 16, 0.0, 1.0, 1.0, 2.0, 18.82648258550361, 32.32124647003452, 2.3349250862880453], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 7200, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
