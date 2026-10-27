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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 3000, 3000, 100.0, 0.317666666666667, 0, 26, 0.0, 1.0, 1.0, 1.0, 50.97446179464089, 15.33216233666933, 7.666081168334665], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 250, 250, 100.0, 0.3639999999999998, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.6885842351043685, 1.4102382269649858, 0.6822256357720223], "isController": false}, {"data": ["12 reservas.json", 250, 250, 100.0, 0.264, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.689287790970308, 1.4104498433777877, 0.73728059994748], "isController": false}, {"data": ["Carga completa de la aplicación", 250, 250, 100.0, 3.812000000000001, 1, 31, 3.0, 6.0, 7.0, 12.490000000000009, 4.679719965557261, 16.89086425068324, 8.44543212534162], "isController": true}, {"data": ["07 FontManifest", 250, 250, 100.0, 0.3119999999999996, 0, 3, 0.0, 1.0, 1.0, 1.0, 4.68893598664591, 1.4103440272333403, 0.7005929745672113], "isController": false}, {"data": ["09 MaterialIcons", 250, 250, 100.0, 0.24400000000000008, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.6891118822095095, 1.410396933320829, 0.7647282073525274], "isController": false}, {"data": ["03 main.dart.js", 250, 250, 100.0, 0.27999999999999997, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.688760104278025, 1.4102911251148746, 0.6456202877960951], "isController": false}, {"data": ["04 canvaskit.js", 250, 250, 100.0, 0.3480000000000001, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.688760104278025, 1.4102911251148746, 0.6914089606894352], "isController": false}, {"data": ["06 AssetManifest", 250, 250, 100.0, 0.30799999999999983, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.68893598664591, 1.4103440272333403, 0.7234881698145057], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 250, 250, 100.0, 0.2800000000000001, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.6891118822095095, 1.410396933320829, 0.7647282073525274], "isController": false}, {"data": ["11 clientes.json", 250, 250, 100.0, 0.29200000000000004, 0, 3, 0.0, 1.0, 1.0, 1.490000000000009, 4.689199834940165, 1.4104233878530967, 0.7372667709232097], "isController": false}, {"data": ["10 casas.json", 250, 250, 100.0, 0.2960000000000002, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.689199834940165, 1.4104233878530967, 0.7235288807817833], "isController": false}, {"data": ["05 canvaskit.wasm", 250, 250, 100.0, 0.32000000000000006, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.6888480438125955, 1.4103175756780075, 0.700579834671218], "isController": false}, {"data": ["01 index.html", 250, 250, 100.0, 0.5040000000000004, 0, 26, 0.0, 1.0, 1.0, 1.0, 4.68629913584644, 1.4095509119538119, 0.590363855980655], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["404/Not Found", 3000, 100.0, 100.0], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 3000, 3000, "404/Not Found", 3000, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["02 flutter_bootstrap.js", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["12 reservas.json", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["07 FontManifest", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["09 MaterialIcons", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["03 main.dart.js", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["04 canvaskit.js", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["06 AssetManifest", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11 clientes.json", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10 casas.json", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["05 canvaskit.wasm", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["01 index.html", 250, 250, "404/Not Found", 250, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
