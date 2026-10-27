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

    var data = {"OkPercent": 0.0, "KoPercent": 100.0};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.0, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "02 flutter_bootstrap.js"], "isController": false}, {"data": [0.0, 500, 1500, "12 reservas.json"], "isController": false}, {"data": [0.0, 500, 1500, "Carga completa de la aplicación"], "isController": true}, {"data": [0.0, 500, 1500, "07 FontManifest"], "isController": false}, {"data": [0.0, 500, 1500, "09 MaterialIcons"], "isController": false}, {"data": [0.0, 500, 1500, "03 main.dart.js"], "isController": false}, {"data": [0.0, 500, 1500, "04 canvaskit.js"], "isController": false}, {"data": [0.0, 500, 1500, "06 AssetManifest"], "isController": false}, {"data": [0.0, 500, 1500, "08 Roboto-Regular.ttf"], "isController": false}, {"data": [0.0, 500, 1500, "11 clientes.json"], "isController": false}, {"data": [0.0, 500, 1500, "10 casas.json"], "isController": false}, {"data": [0.0, 500, 1500, "05 canvaskit.wasm"], "isController": false}, {"data": [0.0, 500, 1500, "01 index.html"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 7200, 7200, 100.0, 0.2541666666666667, 0, 24, 0.0, 1.0, 1.0, 1.0, 192.81238283969793, 57.99434952600289, 28.997174763001446], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 600, 600, 100.0, 0.2983333333333334, 0, 12, 0.0, 1.0, 1.0, 1.990000000000009, 18.86140014460407, 5.673155512244192, 2.7444810757285216], "isController": false}, {"data": ["12 reservas.json", 600, 600, 100.0, 0.21166666666666667, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.866144703329876, 5.674582586548438, 2.9662590793321386], "isController": false}, {"data": ["Carga completa de la aplicación", 600, 600, 100.0, 3.0499999999999976, 0, 32, 3.0, 5.0, 6.0, 9.0, 18.803472374565168, 67.86878310194616, 33.93439155097308], "isController": true}, {"data": ["07 FontManifest", 600, 600, 100.0, 0.23833333333333329, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.863772125632725, 5.6738689596629674, 2.8185128273650455], "isController": false}, {"data": ["09 MaterialIcons", 600, 600, 100.0, 0.23500000000000007, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.864958339883668, 5.674225750668134, 3.0766094167583713], "isController": false}, {"data": ["03 main.dart.js", 600, 600, 100.0, 0.23999999999999988, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.861993083935868, 5.673333857277586, 2.5972080320653883], "isController": false}, {"data": ["04 canvaskit.js", 600, 600, 100.0, 0.24166666666666667, 0, 12, 0.0, 1.0, 1.0, 1.0, 18.8625860605489, 5.673512213524474, 2.7814946241629728], "isController": false}, {"data": ["06 AssetManifest", 600, 600, 100.0, 0.23833333333333342, 0, 3, 0.0, 1.0, 1.0, 1.0, 18.863179074446677, 5.673690580985916, 2.910529583752515], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 600, 600, 100.0, 0.23500000000000001, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.864958339883668, 5.674225750668134, 3.0766094167583713], "isController": false}, {"data": ["11 clientes.json", 600, 600, 100.0, 0.25333333333333347, 0, 4, 0.0, 1.0, 1.0, 1.0, 18.8655515029556, 5.674404162998365, 2.9661658124764183], "isController": false}, {"data": ["10 casas.json", 600, 600, 100.0, 0.19333333333333333, 0, 1, 0.0, 1.0, 1.0, 1.0, 18.866144703329876, 5.674582586548438, 2.9109871710216018], "isController": false}, {"data": ["05 canvaskit.wasm", 600, 600, 100.0, 0.25333333333333313, 0, 2, 0.0, 1.0, 1.0, 1.0, 18.863179074446677, 5.673690580985916, 2.8184242171780682], "isController": false}, {"data": ["01 index.html", 600, 600, 100.0, 0.41166666666666646, 0, 24, 0.0, 1.0, 1.0, 2.0, 18.845404862114457, 5.668344431182863, 2.3740793234499655], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["404/Not Found", 7200, 100.0, 100.0], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 7200, 7200, "404/Not Found", 7200, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["02 flutter_bootstrap.js", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["12 reservas.json", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["07 FontManifest", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["09 MaterialIcons", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["03 main.dart.js", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["04 canvaskit.js", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["06 AssetManifest", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11 clientes.json", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10 casas.json", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["05 canvaskit.wasm", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["01 index.html", 600, 600, "404/Not Found", 600, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
