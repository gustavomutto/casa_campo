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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 7200, 0, 0.0, 1.0143055555555518, 0, 23, 0.0, 3.0, 5.0, 8.0, 192.683383734311, 167905.28532863222, 28.97777450691787], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 600, 0, 0.0, 0.3133333333333334, 0, 6, 0.0, 1.0, 1.0, 1.0, 18.848957024377984, 246.15927957715505, 2.74267050452375], "isController": false}, {"data": ["12 reservas.json", 600, 0, 0.0, 0.2916666666666672, 0, 4, 0.0, 1.0, 1.0, 2.0, 18.8655515029556, 54.16476701043894, 2.9661658124764183], "isController": false}, {"data": ["Carga completa de la aplicación", 600, 0, 0.0, 12.17166666666666, 6, 59, 11.0, 16.0, 17.949999999999932, 26.99000000000001, 18.788163457022076, 196465.21988022546, 33.90676373884453], "isController": true}, {"data": ["07 FontManifest", 600, 0, 0.0, 0.3433333333333338, 0, 5, 0.0, 1.0, 1.0, 2.0, 18.863772125632725, 11.734592621121138, 2.8185128273650455], "isController": false}, {"data": ["09 MaterialIcons", 600, 0, 0.0, 0.2866666666666669, 0, 3, 0.0, 1.0, 1.0, 2.0, 18.863772125632725, 230.0864393058132, 3.0764159618951803], "isController": false}, {"data": ["03 main.dart.js", 600, 0, 0.0, 2.6866666666666696, 2, 12, 2.0, 3.0, 6.0, 8.0, 18.84777282151159, 51277.75874458127, 2.595249968587045], "isController": false}, {"data": ["04 canvaskit.js", 600, 0, 0.0, 0.37, 0, 3, 0.0, 1.0, 1.0, 2.0, 18.85369532428356, 1606.2832885558068, 2.78018358785822], "isController": false}, {"data": ["06 AssetManifest", 600, 0, 0.0, 0.31333333333333363, 0, 4, 0.0, 1.0, 1.0, 2.0, 18.8625860605489, 17.59157196076582, 2.910438083561256], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 600, 0, 0.0, 0.6216666666666669, 0, 4, 1.0, 1.0, 1.0, 2.0, 18.863772125632725, 9493.488068664132, 3.0764159618951803], "isController": false}, {"data": ["11 clientes.json", 600, 0, 0.0, 0.2849999999999996, 0, 4, 0.0, 1.0, 1.0, 2.0, 18.864958339883668, 18.20173714824713, 2.9660725514856154], "isController": false}, {"data": ["10 casas.json", 600, 0, 0.0, 0.2583333333333331, 0, 2, 0.0, 1.0, 1.0, 2.0, 18.864958339883668, 24.373378792642665, 2.9108041188492377], "isController": false}, {"data": ["05 canvaskit.wasm", 600, 0, 0.0, 5.908333333333334, 4, 19, 5.0, 8.0, 10.0, 14.990000000000009, 18.851325876586653, 134110.50460679276, 2.8166531827321855], "isController": false}, {"data": ["01 index.html", 600, 0, 0.0, 0.49333333333333385, 0, 23, 0.0, 1.0, 1.0, 2.0, 18.835347669125724, 32.33646601789358, 2.3728123528488463], "isController": false}]}, function(index, item){
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
