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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 240, 240, 100.0, 24.63333333333333, 13, 523, 17.0, 52.0, 57.0, 88.36000000000001, 11.464055409601148, 109.1903230982804, 1.8136493909720566], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 20, 20, 100.0, 21.05, 13, 77, 17.0, 40.90000000000005, 75.29999999999998, 77.0, 1.3572204125950054, 12.915396923350977, 0.20808945779044516], "isController": false}, {"data": ["12 reservas.json", 20, 20, 100.0, 22.799999999999997, 14, 62, 17.0, 59.20000000000002, 61.9, 62.0, 1.4044943820224718, 13.382883821980338, 0.23179643609550563], "isController": false}, {"data": ["Carga completa de la aplicación", 20, 20, 100.0, 295.6, 164, 1248, 216.0, 551.5000000000006, 1214.4499999999994, 1248.0, 1.290822253775655, 147.5344916782303, 2.45054537240222], "isController": true}, {"data": ["07 FontManifest", 20, 20, 100.0, 20.65, 13, 54, 16.5, 45.30000000000004, 53.64999999999999, 54.0, 1.3853293620558287, 13.205611557976034, 0.2178105735263559], "isController": false}, {"data": ["09 MaterialIcons", 20, 20, 100.0, 19.799999999999997, 13, 57, 17.0, 39.700000000000045, 56.249999999999986, 57.0, 1.392563709789723, 13.273756810506892, 0.23798696212226708], "isController": false}, {"data": ["03 main.dart.js", 20, 20, 100.0, 21.049999999999994, 14, 54, 18.5, 38.800000000000026, 53.29999999999999, 54.0, 1.362954886193267, 12.992593724444596, 0.19832058402616873], "isController": false}, {"data": ["04 canvaskit.js", 20, 20, 100.0, 22.649999999999995, 14, 86, 17.5, 50.60000000000005, 84.34999999999998, 86.0, 1.3664935774801859, 12.998369815864992, 0.21218015509702107], "isController": false}, {"data": ["06 AssetManifest", 20, 20, 100.0, 21.099999999999998, 14, 90, 16.0, 36.10000000000004, 87.39999999999996, 90.0, 1.3782647646612916, 13.115925526324858, 0.22342963958376405], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 20, 20, 100.0, 20.150000000000002, 13, 55, 17.0, 38.70000000000003, 54.249999999999986, 55.0, 1.3887924449690994, 13.236724554718423, 0.23734245885702382], "isController": false}, {"data": ["11 clientes.json", 20, 20, 100.0, 23.3, 13, 60, 17.0, 57.900000000000006, 59.9, 60.0, 1.4006583094054206, 13.346399761012677, 0.23116333426710553], "isController": false}, {"data": ["10 casas.json", 20, 20, 100.0, 21.1, 13, 60, 17.0, 39.0, 58.94999999999999, 60.0, 1.3965505202150688, 13.312917874100972, 0.22639393198798968], "isController": false}, {"data": ["05 canvaskit.wasm", 20, 20, 100.0, 21.550000000000004, 13, 75, 17.0, 50.60000000000007, 73.94999999999999, 75.0, 1.3729662936774902, 13.065235742603145, 0.21586677078327726], "isController": false}, {"data": ["01 index.html", 20, 20, 100.0, 60.39999999999998, 14, 523, 45.5, 67.80000000000003, 500.29999999999967, 523.0, 1.3119916032537393, 12.485252906881396, 0.17553012660718972], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["404/Not Found", 240, 100.0, 100.0], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 240, 240, "404/Not Found", 240, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["02 flutter_bootstrap.js", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["12 reservas.json", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["07 FontManifest", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["09 MaterialIcons", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["03 main.dart.js", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["04 canvaskit.js", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["06 AssetManifest", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11 clientes.json", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10 casas.json", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["05 canvaskit.wasm", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["01 index.html", 20, 20, "404/Not Found", 20, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
