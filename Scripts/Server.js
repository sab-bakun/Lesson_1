$(document).ready(function () {
    var fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function (e) {
        var file = fileInput.files[0];
        var textType = /text.*/;

        if (file.type.match(textType)) {
            var reader = new FileReader();
            reader.onload = function (e) {
                
                /* Read data */
                var data = reader.result.split('\n');
                data = data.slice(1, data.length);
                for (var i = 0; i < data.length; ++i) {
                    data[i] = data[i].split(",").map(Number);;
                }
                data = Transpose(data);
                var number_ = data[0];
                var week_ = data[1];
                var sale = data[2].slice(0, 200);
                var price = data[3].slice(0, 200);
                var number = number_.slice(0, 200);
                var week = week_.slice(0, 200);

                /* Create pages */
                createTable("table1", Transpose([number, week, price, sale]), ["№", "Неделя", "Средняя цена", "Продажи"]);
                initPage2(number, number_, price);
                var trend_seasonality = initPage3(number, week, sale);
                var trend_influence = initPage4(number, week, sale, trend_seasonality[0]);
                var price_influence = initPage5(week.slice(52, week.length), sale.slice(52, sale.length), price.slice(52, price.length));
                initPage6(week.slice(52, week.length), sale.slice(52, sale.length), trend_seasonality[1].slice(52, week.length), trend_influence.slice(52, week.length), price_influence);
            }
            reader.readAsText(file);
        } else {
            alert("File not supported!");
        }
    });
});

/* Initialization functions */

function initPage2(number, number_, price) {
    var X = Transpose([Array.apply(null, Array(number.length)).map(Number.prototype.valueOf, 1), number]);
    var koef = OLS(price, X);
    var trend = [];
    for (var i = 0; i < number_.length; ++i) {
        trend[i] = +(koef[0] + koef[1] * number_[i]).toFixed(5);
    }

    koef.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });

    var Y = [{
        name: "Тренд",
        data: trend
    }, {
        name: "Средняя цена",
        data: price
    }];

    koef.unshift("y = a*x + b");
    createTable("table2", Transpose([number_, price, trend]), ["№", "Средняя цена", "Тренд"]);
    createTable("table2_1", Transpose(koef), ["Коеф. тренда", "b", "a"]);
    createChart("chart2", number_, Y);
}

function initPage3(number, week, sale) {
    var average = Array.apply(null, Array(sale.length));
    var growth = Array.apply(null, Array(sale.length));
    for (var i = 26; i < sale.length - 26; ++i) {
        var sale_ = sale.slice(i - 26, i + 26);
        sale_[0] = (sale[i - 26] + sale[i + 26]) / 2;
        average[i] = +Mean(sale_).toFixed(5);
        growth[i] = +(sale[i] - average[i]).toFixed(5);
    }

    var seasonality = Array.apply(null, Array(sale.length));
    for (var i = 0; i < 52; ++i) {
        var sum = 0;
        var n = 0;
        for (var j = i; j < growth.length; j += 52) {
            if (growth[j]) {
                sum += growth[j];
                ++n;
            }
        }
        seasonality[i] = +(sum / n).toFixed(5);
    }

    for (var i = 0; i < 52; ++i) {
        for (var j = i + 52; j < growth.length; j += 52) {
            seasonality[j] = +seasonality[i].toFixed(5);
        }
    }

    var sale_clean = [];
    for (var i = 0; i < sale.length; ++i) {
        sale_clean[i] = (sale[i] - seasonality[i]) > 0 ? +(sale[i] - seasonality[i]).toFixed(5) : 0;
    }

    var X = Transpose([Array.apply(null, Array(number.length)).map(Number.prototype.valueOf, 1), number]);
    var koef = OLS(sale_clean, X);
    var trend = [];
    for (var i = 0; i < number.length; ++i) {
        trend[i] = +(koef[0] + koef[1] * number[i]).toFixed(5);
    }

    koef.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });

    var Y = [{
        name: "Тренд",
        data: trend
    }, {
        name: "Продажи",
        data: sale
    }, {
        name: "Продажи очищенные от сезонности",
        data: sale_clean
    }, {
        name: "Сезонный прирост усредненный",
        data: seasonality
    }];

    koef.unshift("y = a*x + b");
    createTable("table3", Transpose([number, week, sale, seasonality, sale_clean, trend]), ["№", "Неделя", "Продажи", "Сезонный прирост усредненный", "Продажи очищенные от сезонности", "Тренд"]);
    createTable("table3_1", Transpose(koef), ["Коеф. тренда", "b", "a"]);
    createChart("chart3", number, Y);

    return [trend, seasonality];

}

function initPage4(number, week, sale, trend) {
    var trend_influence = [];
    var sale_mean = Mean(sale);

    for (var i = 0; i < trend.length; ++i) {
        trend_influence[i] = +(trend[i] - sale_mean).toFixed(5);
    }

    var Y = [{
        name: "Тренд",
        data: trend
    }, {
        name: "Влияние тренда",
        data: trend_influence
    }, {
        name: "Продажи",
        data: sale
    }];

    createTable("table4", Transpose([number, week, sale, trend_influence, [sale_mean]]), ["N", "Неделя", "Продажи", "Влияние тренда", "Ср.знач. продаж"]);
    createChart("chart4", number, Y);

    return trend_influence;
}

function initPage5(week, sale, price) {
    var price_ln = [];
    var sale_ln = [];
    for (var i = 0; i < price.length; ++i) {
        price_ln[i] = Math.log(price[i]);
        sale_ln[i] = Math.log(sale[i]);
    }
    var X = Transpose([Array.apply(null, Array(week.length)).map(Number.prototype.valueOf, 1), price]);
    var X_ln = Transpose([Array.apply(null, Array(week.length)).map(Number.prototype.valueOf, 1), price_ln]);
    var koef1 = OLS(sale, X);
    var koef2 = OLS(sale_ln, X);
    var koef3 = OLS(sale, X_ln);
    var regr1 = [];
    var regr2 = [];
    var regr3 = [];
    for (var i = 0; i < week.length; ++i) {
        regr1[i] = +(koef1[0] + koef1[1] * price[i]).toFixed(5);
        regr2[i] = +(Math.exp(koef2[0] + koef2[1] * price[i])).toFixed(5);
        regr3[i] = +(koef3[0] + koef3[1] * price_ln[i]).toFixed(5);
    }

    var rmse1 = +RMSE(sale, regr1).toFixed(5);
    var rmse2 = +RMSE(sale, regr2).toFixed(5);
    var rmse3 = +RMSE(sale, regr3).toFixed(5);

    var Y = [{
        name: "Продажи",
        data: sale
    }, {
        name: "Линейная регр.",
        data: regr1
    }, {
        name: "Экспоненц. регр.",
        data: regr2
    }, {
        name: "Логарифм. регр.",
        data: regr3
    }];

    koef1.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });
    koef2.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });
    koef3.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });

    koef1.unshift("y = a*x + b");
    koef2.unshift("y = exp(a*x + b)");
    koef3.unshift("y = a*lnx + b");
    koef1.push(rmse1);
    koef2.push(rmse2);
    koef3.push(rmse3);
    createTable("table5", Transpose([week, price, sale, regr1, regr2, regr3]), ["Неделя", "Средняя цена", "Продажи", "Линейная регр.", "Экспоненц. регр.", "Логарифм. регр."]);
    createTable("table5_1", [koef1, koef2, koef3], ["Коеф. тренда", "b", "a", "RMSE"]);
    createChart("chart5", price, Y);

    if ((rmse1 > rmse2) && (rmse1 > rmse3))
        return regr1;
    if ((rmse2 > rmse1) && (rmse2 > rmse3))
        return regr2;
    return regr3;
}

function initPage6(week, sale, seasonality, trend_influence, price_influence) {
    var sale_mean = Mean(sale);
    var X1 = Transpose([Array.apply(null, Array(week.length)).map(Number.prototype.valueOf, sale_mean), seasonality, trend_influence]);
    var X2 = Transpose([Array.apply(null, Array(week.length)).map(Number.prototype.valueOf, sale_mean), seasonality, price_influence]);
    var koef1 = OLS(sale, X1);
    var koef2 = OLS(sale, X2);
    var regr1 = [];
    var regr2 = [];
    for (var i = 0; i < week.length; ++i) {
        regr1[i] = +(koef1[0] * sale_mean + koef1[1] * seasonality[i] + koef1[2] * trend_influence[i]).toFixed(5);
        regr2[i] = +(koef2[0] * sale_mean + koef2[1] * seasonality[i] + koef2[2] * price_influence[i]).toFixed(5);
    }

    var rmse1 = +RMSE(sale, regr1).toFixed(5);
    var rmse2 = +RMSE(sale, regr2).toFixed(5);

    var Y = [{
        name: "Продажи",
        data: sale
    }, {
        name: "Множ. регрессия (влияние тренда)",
        data: regr1
    }, {
        name: "Множ. регрессия (влияние цены)",
        data: regr2
    }];

    koef1.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });
    koef2.forEach(function (item, i, arr) {
        arr[i] = +item.toFixed(7);
    });

    koef1.unshift("y = X*b");
    koef2.unshift("y = X*b");
    koef1.push(rmse1);
    koef2.push(rmse2);
    createTable("table6", Transpose([week, sale, regr1, regr2]), ["Неделя", "Продажи", "Множ. регрессия (влияние тренда)", "Множ. регрессия (влияние цены)"]);
    createTable("table6_1", [koef1, koef2], ["Коеф. множ. регр.", "b1", "b2", "b3", "RMSE"]);
    createChart("chart6", week, Y);
}

/* Creation functions */

function createTable(id, data, names) {
    if (data[0].length != names.length) {
        return;
    }

    var table = document.getElementById(id);
    for (var i = 0; i < data.length; ++i) {
        var row = table.insertRow(i);
        for (var j = 0; j < data[i].length; ++j) {
            var cell = row.insertCell(j);
            cell.innerHTML = (!data[i][j] && data[i][j] != 0) ? "" : data[i][j];
        }
    }

    var header = table.createTHead();
    var row = header.insertRow(0);
    for (var i = 0; i < names.length; ++i) {
        var cell = row.insertCell(0);
        cell.innerHTML = "<b>" + names[names.length - 1 - i] + "</b>";
    }
}

function createChart(id, x, Y) {
    Highcharts.chart(id, {
        chart: {
            width: 555
        },
        title: {
            text: " "
        },
        xAxis: {
            categories: x
        },
        plotOptions: {
            series: {
                marker: {
                    enabled: false
                }
            }
        },
        series: Y
    });
}

/* Math functions */

function OLS(y, X) {
    if (y.length != X.length) {
        return [];
    }
    return Mult(Invert(Mult(Transpose(X), X)), Mult(Transpose(X), y));
}

function Transpose(X) {

    var X_transp = [];
    var rows = X.length ? X.length : 0;
    var cols = X[0] instanceof Array ? X[0].length : 1;

    if (cols == 0 || rows == 0) {
        return [];
    }

    for (var i = 0; i < cols; ++i) {
        if (rows == 1) {
            X_transp[i] = X[0][i];
        } else {
            X_transp[i] = [];

            for (var j = 0; j < rows; ++j) {
                if (cols == 1) {
                    X_transp[i][j] = X[j];
                } else {
                    X_transp[i][j] = X[j][i];
                }
            }
        }
    }

    return X_transp;
}

function Mult(A, B) {

    var rows_A = A.length ? A.length : 0;
    var rows_B = B.length ? B.length : 0;
    var cols_A = A[0] instanceof Array ? A[0].length : 1;
    var cols_B = B[0] instanceof Array ? B[0].length : 1;

    if (cols_A != rows_B) {
        return [];
    }

    var result = new Array(rows_A);
    for (var i = 0; i < rows_A; ++i) {
        if (cols_B == 1) {
            result[i] = 0;
            for (var k = 0; k < cols_A; ++k) {
                result[i] += A[i][k] * B[k];
            }
        } else {
            result[i] = new Array(cols_B);
            for (var j = 0; j < cols_B; ++j) {
                result[i][j] = 0;
                for (var k = 0; k < cols_A; ++k) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
    }
    return result;
}

function Invert(X) {

    if (X.length !== X[0].length) { return []; }

    var i = 0, ii = 0, j = 0, dim = X.length, e = 0, t = 0;
    var I = [], C = [];
    for (i = 0; i < dim; i += 1) {
        I[I.length] = [];
        C[C.length] = [];
        for (j = 0; j < dim; j += 1) {

            if (i == j) { I[i][j] = 1; }
            else { I[i][j] = 0; }
            C[i][j] = X[i][j];
        }
    }

    for (i = 0; i < dim; i += 1) {
        e = C[i][i];
        if (e == 0) {
            for (ii = i + 1; ii < dim; ii += 1) {
                if (C[ii][i] != 0) {
                    for (j = 0; j < dim; j++) {
                        e = C[i][j];
                        C[i][j] = C[ii][j];
                        C[ii][j] = e;
                        e = I[i][j];
                        I[i][j] = I[ii][j];
                        I[ii][j] = e;
                    }
                    break;
                }
            }
            e = C[i][i];
            if (e == 0) { return }
        }
        for (j = 0; j < dim; j++) {
            C[i][j] = C[i][j] / e;
            I[i][j] = I[i][j] / e;
        }
        for (ii = 0; ii < dim; ii++) {
            if (ii == i) { continue; }
            e = C[ii][i];
            for (j = 0; j < dim; j++) {
                C[ii][j] -= e * C[i][j];
                I[ii][j] -= e * I[i][j];
            }
        }
    }
    return I;
}

function RMSE(y, pred) {
    if ((y.length != pred.length) || (y.length == 0)) {
        return null;
    }
    var rmse = 0;
    for (var i = 0; i < y.length; ++i) {
        rmse += Math.pow(y[i] - pred[i], 2);
    }
    rmse = Math.sqrt(rmse / y.length);
    return rmse;
}

function Mean(x) {
    if (x.length == 0) {
        return null;
    }
    var mean = 0;
    for (var i = 0; i < x.length; ++i) {
        mean += x[i];
    }
    mean /= x.length;
    return mean;
}





