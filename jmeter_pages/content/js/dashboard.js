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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9923076923076923, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [1.0, 500, 1500, "02 flutter_bootstrap.js"], "isController": false}, {"data": [1.0, 500, 1500, "12 reservas.json"], "isController": false}, {"data": [0.925, 500, 1500, "Carga completa de la aplicación"], "isController": true}, {"data": [1.0, 500, 1500, "07 FontManifest"], "isController": false}, {"data": [1.0, 500, 1500, "09 MaterialIcons"], "isController": false}, {"data": [1.0, 500, 1500, "03 main.dart.js"], "isController": false}, {"data": [1.0, 500, 1500, "04 canvaskit.js"], "isController": false}, {"data": [1.0, 500, 1500, "06 AssetManifest"], "isController": false}, {"data": [1.0, 500, 1500, "08 Roboto-Regular.ttf"], "isController": false}, {"data": [1.0, 500, 1500, "11 clientes.json"], "isController": false}, {"data": [1.0, 500, 1500, "10 casas.json"], "isController": false}, {"data": [1.0, 500, 1500, "05 canvaskit.wasm"], "isController": false}, {"data": [0.975, 500, 1500, "01 index.html"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 240, 0, 0.0, 27.691666666666688, 9, 852, 10.0, 63.900000000000006, 89.79999999999995, 365.2600000000004, 11.536243030186503, 10058.221507132042, 1.8025379734666411], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 20, 0, 0.0, 15.900000000000002, 9, 122, 10.0, 13.0, 116.54999999999993, 122.0, 1.395381287936929, 18.88316080025117, 0.21121494104514058], "isController": false}, {"data": ["12 reservas.json", 20, 0, 0.0, 17.3, 9, 85, 10.0, 77.60000000000016, 85.0, 85.0, 1.5128593040847202, 5.060617790279879, 0.24672607791225415], "isController": false}, {"data": ["Carga completa de la aplicación", 20, 0, 0.0, 332.3, 126, 2161, 215.0, 1120.200000000002, 2113.749999999999, 2161.0, 1.3029315960912053, 13632.002621131922, 2.44299674267101], "isController": true}, {"data": ["07 FontManifest", 20, 0, 0.0, 13.7, 9, 78, 10.0, 22.700000000000028, 75.29999999999995, 78.0, 1.4685366032748366, 1.6397702658051252, 0.22802472648505764], "isController": false}, {"data": ["09 MaterialIcons", 20, 0, 0.0, 17.400000000000002, 9, 90, 10.0, 77.50000000000016, 89.75, 90.0, 1.4855529971031718, 18.799208943029043, 0.25097721533090694], "isController": false}, {"data": ["03 main.dart.js", 20, 0, 0.0, 63.700000000000024, 13, 412, 56.0, 151.9000000000002, 399.4499999999998, 412.0, 1.4060742407199098, 3826.098893705181, 0.20184854822834644], "isController": false}, {"data": ["04 canvaskit.js", 20, 0, 0.0, 14.050000000000002, 9, 91, 10.0, 12.900000000000002, 87.09999999999994, 91.0, 1.4232849416453175, 121.9345861576644, 0.21821849202960433], "isController": false}, {"data": ["06 AssetManifest", 20, 0, 0.0, 13.5, 9, 86, 10.0, 11.0, 82.24999999999994, 86.0, 1.4603870025556773, 2.054097070098576, 0.23389010587805767], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 20, 0, 0.0, 19.799999999999994, 10, 104, 11.0, 88.70000000000017, 103.64999999999999, 104.0, 1.4759058372075862, 743.4779807532655, 0.24934737288760978], "isController": false}, {"data": ["11 clientes.json", 20, 0, 0.0, 17.1, 9, 83, 9.5, 76.20000000000014, 83.0, 83.0, 1.504438092372499, 2.1646131478486534, 0.24535269670528057], "isController": false}, {"data": ["10 casas.json", 20, 0, 0.0, 18.25, 9, 96, 10.0, 87.50000000000018, 96.0, 96.0, 1.4947683109118086, 2.6397112060911807, 0.23939648729446936], "isController": false}, {"data": ["05 canvaskit.wasm", 20, 0, 0.0, 57.249999999999986, 19, 298, 29.5, 256.0000000000004, 296.84999999999997, 298.0, 1.4302059496567505, 10175.307005439252, 0.2220729941361556], "isController": false}, {"data": ["01 index.html", 20, 0, 0.0, 64.35, 9, 852, 22.5, 44.60000000000001, 811.6499999999994, 852.0, 1.3177834881728934, 2.8869624884693947, 0.17373122158529353], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 240, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
