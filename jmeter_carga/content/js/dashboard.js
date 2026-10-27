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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 3000, 0, 0.0, 0.7709999999999999, 0, 31, 0.0, 2.0, 4.0, 6.0, 50.99699117752053, 44439.03459109975, 7.5698658779132035], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 250, 0, 0.0, 0.26, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.69175190015952, 61.26768203997373, 0.6735229778549311], "isController": false}, {"data": ["12 reservas.json", 250, 0, 0.0, 0.25200000000000017, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.693954187007135, 13.476782529102517, 0.7288464020841157], "isController": false}, {"data": ["Carga completa de la aplicación", 250, 0, 0.0, 9.25200000000001, 4, 59, 8.0, 13.0, 19.0, 27.49000000000001, 4.678318799356263, 48920.52636495799, 8.333255361353343], "isController": true}, {"data": ["07 FontManifest", 250, 0, 0.0, 0.25199999999999984, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.6935135642542, 2.9196954496385996, 0.6921099103538909], "isController": false}, {"data": ["09 MaterialIcons", 250, 0, 0.0, 0.2879999999999999, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.6937779279786715, 57.25125617231797, 0.7563216387856257], "isController": false}, {"data": ["03 main.dart.js", 250, 0, 0.0, 1.883999999999999, 1, 8, 2.0, 3.0, 5.0, 6.490000000000009, 4.69175190015952, 12764.506676949424, 0.6368686661349349], "isController": false}, {"data": ["04 canvaskit.js", 250, 0, 0.0, 0.29999999999999977, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.692544485321721, 399.7919589730835, 0.682801883118102], "isController": false}, {"data": ["06 AssetManifest", 250, 0, 0.0, 0.23999999999999994, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.6935135642542, 4.377251419787853, 0.7150274570543509], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 250, 0, 0.0, 0.4560000000000004, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.693601682186843, 2362.1283840868127, 0.7562932398054971], "isController": false}, {"data": ["11 clientes.json", 250, 0, 0.0, 0.3599999999999998, 0, 2, 0.0, 1.0, 1.0, 2.0, 4.693866055838231, 4.5288473273126675, 0.7288327176545689], "isController": false}, {"data": ["10 casas.json", 250, 0, 0.0, 0.244, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.6937779279786715, 6.064324412808381, 0.7150677312155007], "isController": false}, {"data": ["05 canvaskit.wasm", 250, 0, 0.0, 4.224000000000001, 3, 14, 4.0, 6.0, 9.449999999999989, 13.0, 4.6922802605154, 33381.4224852897, 0.691928046228345], "isController": false}, {"data": ["01 index.html", 250, 0, 0.0, 0.4920000000000003, 0, 31, 0.0, 1.0, 1.0, 2.0, 4.689023932778153, 8.050101634593743, 0.5815488666629154], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 3000, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
