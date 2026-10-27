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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 8733, 0, 0.0, 0.7076605977327363, 0, 14, 0.0, 2.0, 4.0, 5.0, 48.664552835561395, 42695.89458029226, 7.219481519882644], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["02 flutter_bootstrap.js", 737, 0, 0.0, 0.3392130257801904, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.12545410782157, 53.87262922831058, 0.5922282752439169], "isController": false}, {"data": ["12 reservas.json", 715, 0, 0.0, 0.3188811188811189, 0, 6, 0.0, 1.0, 1.0, 1.0, 4.113379702340887, 11.809898754767781, 0.6386986061251962], "isController": false}, {"data": ["Carga completa de la aplicación", 717, 0, 0.0, 8.474198047419812, 4, 40, 8.0, 11.0, 12.0, 23.82000000000005, 4.110932097951414, 42987.409940100864, 7.320817273511722], "isController": true}, {"data": ["07 FontManifest", 727, 0, 0.0, 0.16368638239339747, 0, 6, 0.0, 1.0, 1.0, 1.0, 4.124986524287489, 2.5660316562218073, 0.6082743800462997], "isController": false}, {"data": ["09 MaterialIcons", 722, 0, 0.0, 0.22714681440443238, 0, 3, 0.0, 1.0, 1.0, 1.0, 4.116211716950583, 50.20652768038357, 0.6632567707977013], "isController": false}, {"data": ["03 main.dart.js", 736, 0, 0.0, 1.7853260869565215, 1, 7, 2.0, 2.0, 3.0, 6.0, 4.129148082695167, 11233.871567224887, 0.5604995932564728], "isController": false}, {"data": ["04 canvaskit.js", 735, 0, 0.0, 0.27482993197278993, 0, 3, 0.0, 1.0, 1.0, 1.0, 4.132719329318692, 352.09638645353647, 0.60134294928563], "isController": false}, {"data": ["06 AssetManifest", 729, 0, 0.0, 0.17969821673525388, 0, 2, 0.0, 1.0, 1.0, 1.0, 4.1262204612989954, 3.8481841216216215, 0.6286038984010188], "isController": false}, {"data": ["08 Roboto-Regular.ttf", 725, 0, 0.0, 0.387586206896552, 0, 4, 0.0, 1.0, 1.0, 1.740000000000009, 4.123277465293378, 2075.103810619288, 0.6643952947005932], "isController": false}, {"data": ["11 clientes.json", 717, 0, 0.0, 0.2412831241283125, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.11303090796448, 3.9684321651063534, 0.6386444476233909], "isController": false}, {"data": ["10 casas.json", 719, 0, 0.0, 0.20445062586926274, 0, 1, 0.0, 1.0, 1.0, 1.0, 4.1164043580069505, 5.318362271135933, 0.6271084764151214], "isController": false}, {"data": ["05 canvaskit.wasm", 732, 0, 0.0, 3.931693989071038, 3, 13, 4.0, 5.0, 6.0, 11.0, 4.1256869099619555, 29350.612098421865, 0.6083776595744681], "isController": false}, {"data": ["01 index.html", 739, 0, 0.0, 0.39648173207036524, 0, 14, 0.0, 1.0, 1.0, 1.0, 4.1181617061114855, 7.070047147796867, 0.5107485709728112], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 8733, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
