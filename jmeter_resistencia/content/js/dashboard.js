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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 8738, 8738, 100.0, 0.365873197528037, 0, 22, 0.0, 1.0, 1.0, 1.0, 48.69567155778223, 14.646744960739184, 7.319290794049297], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 738, 738, 100.0, 0.38753387533875333, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.12481765287815, 1.240667809654756, 0.600193193631684], "isController": false}, {"data": ["12 reservas.json", 715, 715, 100.0, 0.3860139860139862, 0, 3, 0.0, 1.0, 1.0, 1.0, 4.116245063384417, 1.2380893354710942, 0.6471830617235265], "isController": false}, {"data": ["Carga completa de la aplicación", 717, 717, 100.0, 4.403068340306834, 0, 30, 4.0, 6.0, 7.0, 9.0, 4.113502845603084, 14.843723107329723, 7.421783116709886], "isController": true}, {"data": ["07 FontManifest", 727, 727, 100.0, 0.3535075653370014, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.1280079948215365, 1.2416274046924152, 0.6167824445387646], "isController": false}, {"data": ["09 MaterialIcons", 723, 723, 100.0, 0.325034578146611, 0, 4, 0.0, 1.0, 1.0, 1.0, 4.124170032171949, 1.2404730174892191, 0.6725941361061675], "isController": false}, {"data": ["03 main.dart.js", 736, 736, 100.0, 0.3410326086956521, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.132069010043847, 1.242848881927251, 0.5689665336095532], "isController": false}, {"data": ["04 canvaskit.js", 735, 735, 100.0, 0.3959183673469389, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.135905284955434, 1.2440027614905016, 0.6098844707307329], "isController": false}, {"data": ["06 AssetManifest", 730, 730, 100.0, 0.3835616438356168, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.126368626032299, 1.2411343132987773, 0.6366857840948273], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 725, 725, 100.0, 0.3696551724137933, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.126210829453747, 1.2410868510466349, 0.6729269614441169], "isController": false}, {"data": ["11 clientes.json", 717, 717, 100.0, 0.33891213389121344, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.115887786088643, 1.237981873159475, 0.6471268882424528], "isController": false}, {"data": ["10 casas.json", 720, 720, 100.0, 0.4013888888888891, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.116496861171143, 1.238165071524133, 0.6351626016260162], "isController": false}, {"data": ["05 canvaskit.wasm", 733, 733, 100.0, 0.32060027285129616, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.133932650172294, 1.2434094299346354, 0.6176676713636339], "isController": false}, {"data": ["01 index.html", 739, 739, 100.0, 0.38700947225981114, 0, 22, 0.0, 1.0, 1.0, 1.6000000000000227, 4.120641682604647, 1.239411756095929, 0.5191042744687494], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["404/Not Found", 8738, 100.0, 100.0], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 8738, 8738, "404/Not Found", 8738, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["02 flutter_bootstrap.js", 738, 738, "404/Not Found", 738, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["12 reservas.json", 715, 715, "404/Not Found", 715, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["07 FontManifest", 727, 727, "404/Not Found", 727, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["09 MaterialIcons", 723, 723, "404/Not Found", 723, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["03 main.dart.js", 736, 736, "404/Not Found", 736, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["04 canvaskit.js", 735, 735, "404/Not Found", 735, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["06 AssetManifest", 730, 730, "404/Not Found", 730, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 725, 725, "404/Not Found", 725, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["11 clientes.json", 717, 717, "404/Not Found", 717, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["10 casas.json", 720, 720, "404/Not Found", 720, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["05 canvaskit.wasm", 733, 733, "404/Not Found", 733, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["01 index.html", 739, 739, "404/Not Found", 739, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
