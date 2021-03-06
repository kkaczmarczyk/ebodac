(function () {
    'use strict';

    var directives = angular.module('bookingApp.directives', []);

    function handleUndefined(value) {
        if (value == undefined) {
            value = "";
        }
        return value;
    };

    directives.directive('gridReloadTrigger', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs) {
                scope.$watch("$parent." + attrs.ngModel, function () {
                    $(".booking-app-grid").jqGrid('setGridParam', {
                        datatype: 'json',
                        page: 1,
                        postData: {
                            fields: JSON.stringify(scope.lookupBy),
                            lookup: (scope.selectedLookup) ? scope.selectedLookup.lookupName : ""
                        }
                    }).trigger('reloadGrid');
                });
            }
        };
    });

    directives.directive('bookingAppDatePicker', ['$timeout', function($timeout) {

        return {
            restrict: 'A',
            scope: {
                min: '@',
                max: '@'
            },
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {
                var isReadOnly = scope.$eval(attr.ngReadonly);
                if(!isReadOnly) {
                    angular.element(element).datepicker({
                        changeYear: true,
                        showButtonPanel: true,
                        dateFormat: 'yy-mm-dd',
                        onSelect: function (dateTex) {
                            $timeout(function() {
                                ngModel.$setViewValue(dateTex);
                            })
                        },
                        onChangeMonthYear: function (year, month, inst) {
                            var curDate = $(this).datepicker("getDate");
                            if (curDate === null) {
                                return;
                            }
                            if (curDate.getFullYear() !== year || curDate.getMonth() !== month - 1) {
                                curDate.setYear(year);
                                curDate.setMonth(month - 1);
                                $(this).datepicker("setDate", curDate);
                            }
                        },
                        onClose: function (dateText, inst) {
                            var viewValue = element.val();
                            $timeout(function() {
                                ngModel.$setViewValue(viewValue);
                            })
                        }
                    });
                }

                scope.$watch("$parent." + scope.min, function(value) {
                    if (value !== undefined && value !== '') {
                        angular.element(element).datepicker('option', 'minDate', value);
                    }
                });

                scope.$watch("$parent." + scope.max, function(value) {
                    if (value !== undefined && value !== '') {
                        angular.element(element).datepicker('option', 'maxDate', value);
                    }
                });
            }
        };
    }]);

    directives.directive('screeningGrid', function ($compile) {

        function createButton(id) {
            return '<button type="button" class="btn btn-primary btn-sm ng-binding compileBtn" ng-click="printRow(' +
                               id + ')"><i class="fa fa-fw fa-print"></i></button>';
        };

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var elem = angular.element(element);

                elem.jqGrid({
                    url: "../booking-app/screenings",
                    datatype: "json",
                    mtype: "GET",
                    colNames: [
                        scope.msg("bookingApp.location"),
                        scope.msg("bookingApp.screening.bookingId"),
                        scope.msg("bookingApp.screening.status"),
                        scope.msg("bookingApp.screening.date"),
                        scope.msg("bookingApp.screening.time"),
                        "", ""],
                    colModel: [
                        { name: "clinic.location" },
                        { name: "volunteer.id" },
                        { name: "status" },
                        { name: "date" },
                        { name: "startTime" },
                        { name: "print", align: "center", sortable: false, width: 40 },
                        { name: "changeStatus", align: "center", sortable: false, width: 60,
                             formatter: function(cellValue, options, rowObject) {
                                 if (rowObject.status === 'Active') {
                                     return "<button ng-click='cancel(\"" + rowObject.id + "\")'" +
                                             " type='button' class='btn btn-danger compileBtn' ng-disabled='updateInProgress'>" +
                                             scope.msg('bookingApp.screening.btn.cancel') + "</button>";
                                 } else if (rowObject.status === 'Canceled') {
                                     return "<button ng-click='activate(\"" + rowObject.id + "\")'" +
                                             " type='button' class='btn btn-success compileBtn' ng-disabled='updateInProgress'>" +
                                             scope.msg('bookingApp.screening.btn.activate') + "</button>";
                                 }
                                 return '';
                             }
                        }
                    ],
                    gridComplete: function() {
                        var ids = elem.getDataIDs();
                        for(var i = 0; i < ids.length; i++){
                            elem.setRowData(ids[i], {print: createButton(ids[i])})
                        }
                        $compile($('.compileBtn'))(scope);
                        $('#screeningTable .ui-jqgrid-hdiv').addClass("table-lightblue");
                        $('#screeningTable .ui-jqgrid-btable').addClass("table-lightblue");
                    },
                    pager: "#pager",
                    rowNum: 50,
                    rowList: [10, 20, 50, 100],
                    prmNames: {
                        sort: 'sortColumn',
                        order: 'sortDirection'
                    },
                    sortname: null,
                    sortorder: "desc",
                    viewrecords: true,
                    gridview: true,
                    loadOnce: false,
                    postData: {
                        startDate: function() {
                            return handleUndefined(scope.selectedFilter.startDate);
                        },
                        endDate: function() {
                            return handleUndefined(scope.selectedFilter.endDate);
                        },
                        dateFilter: function() {
                            return handleUndefined(scope.selectedFilter.dateFilter);
                        }
                    },
                    beforeSelectRow: function() {
                        return false;
                    },
                    onCellSelect: function (id, iCol, cellContent, e) {
                        if (iCol !== 5 && iCol !== 6) {
                            scope.editScreening(id);
                        }
                    }
                });

                scope.$watch("lookupRefresh", function () {
                    $('#' + attrs.id).jqGrid('setGridParam', {
                        page: 1,
                        postData: {
                            fields: JSON.stringify(scope.lookupBy),
                            lookup: (scope.selectedLookup) ? scope.selectedLookup.lookupName : ""
                        }
                    }).trigger('reloadGrid');
                });

            }
        };
    });

    directives.directive('unscheduledVisitGrid', function ($compile) {

        var gridDataExtension;

        function extendGrid(cellValue, options, rowObject) {
            var rowExtraData = {};

            rowExtraData.id = rowObject.id;
            rowExtraData.siteId = rowObject.siteId;

            gridDataExtension[options.rowId] = rowExtraData;

            return cellValue;
        }

        function createButton(id) {
            return '<button type="button" class="btn btn-primary btn-sm ng-binding printBtn" ng-click="printFrom(' +
                               id + ')"><i class="fa fa-fw fa-print"></i></button>';
        };

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var elem = angular.element(element);

                elem.jqGrid({
                    url: "../booking-app/unscheduledVisits",
                    datatype: "json",
                    mtype: "GET",
                    colNames: [
                        scope.msg("bookingApp.uncheduledVisit.participantId"),
                        scope.msg("bookingApp.location"),
                        scope.msg("bookingApp.date"),
                        scope.msg("bookingApp.startTime"),
                        scope.msg("bookingApp.uncheduledVisit.purpose"),
                        ""],
                    colModel: [
                        {
                            name: "participantId",
                            formatter: extendGrid,
                            index: 'subject.subjectId'
                        },
                        {
                            name: "clinicName",
                            index: 'subject.siteName'
                        },
                        {
                            name: "date"
                        },
                        {
                            name: "startTime"
                        },
                        {
                            name: "purpose"
                        },
                        {
                            name: "print",
                            align: "center",
                            sortable: false,
                            hidden: true
                        }
                    ],
                    gridComplete: function() {
                        var ids = elem.getDataIDs();
                        for(var i = 0; i < ids.length; i++){
                            elem.setRowData(ids[i], {print: createButton(ids[i])})
                        }
                        $compile($('.printBtn'))(scope);
                        $('#unscheduledVisitTable .ui-jqgrid-hdiv').addClass("table-lightblue");
                        $('#unscheduledVisitTable .ui-jqgrid-btable').addClass("table-lightblue");
                    },
                    pager: "#pager",
                    rowNum: 50,
                    rowList: [10, 20, 50, 100],
                    prmNames: {
                        sort: 'sortColumn',
                        order: 'sortDirection'
                    },
                    sortname: null,
                    sortorder: "desc",
                    viewrecords: true,
                    gridview: true,
                    loadOnce: false,
                    beforeRequest: function() {
                        gridDataExtension = [];
                    },
                    onCellSelect: function(rowId, iCol, cellContent, e) {
                        if (iCol !== 5) {
                            var rowData = elem.getRowData(rowId),
                                extraRowData = gridDataExtension[rowId];

                            scope.newForm();
                            scope.form.dto.id = extraRowData.id;
                            scope.form.dto.participantId = rowData.participantId;
                            scope.form.dto.date = rowData.date;
                            scope.form.dto.startTime = rowData.startTime;
                            scope.form.dto.purpose = rowData.purpose;
                            scope.reloadSelects();
                            $('#unscheduledVisitModal').modal('show');
                        }
                    },
                    postData: {
                        startDate: function() {
                            return handleUndefined(scope.selectedFilter.startDate);
                        },
                        endDate: function() {
                            return handleUndefined(scope.selectedFilter.endDate);
                        },
                        dateFilter: function() {
                            return handleUndefined(scope.selectedFilter.dateFilter);
                        }
                    },
                    beforeSelectRow: function() {
                        return false;
                    }
                });

                scope.$watch("lookupRefresh", function () {
                    $('#' + attrs.id).jqGrid('setGridParam', {
                        page: 1,
                        postData: {
                            fields: JSON.stringify(scope.lookupBy),
                            lookup: (scope.selectedLookup) ? scope.selectedLookup.lookupName : ""
                        }
                    }).trigger('reloadGrid');
                });

            }
        };
    });

    directives.directive('primeVaccinationGrid', function ($compile) {

        var gridDataExtension;
        var rowsToColor = [];

        function createButton(rowId) {
            return '<button type="button" class="btn btn-primary btn-sm ng-binding printBtn" ng-click="printCardFrom(' +
            rowId + ')">' + '<i class="fa fa-fw fa-print"></i>' + '</button>'
        }

        function extendGrid(cellValue, options, rowObject) {
            var rowExtraData = {};

            rowExtraData.visitBookingDetailsId = rowObject.visitBookingDetailsId;
            rowExtraData.siteId = rowObject.siteId;
            rowExtraData.visitId = rowObject.visitId;
            rowExtraData.participantGender = rowObject.participantGender;
            rowExtraData.actualScreeningDate = rowObject.actualScreeningDate;
            rowExtraData.ignoreDateLimitation = rowObject.ignoreDateLimitation;

            gridDataExtension[options.rowId] = rowExtraData;

            return cellValue;
        }

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var elem = angular.element(element);

                elem.jqGrid({
                    url: "../booking-app/primeVaccinationSchedule",
                    datatype: "json",
                    mtype: "GET",
                    colNames: [
                        scope.msg("bookingApp.location"),
                        scope.msg("bookingApp.primeVaccination.participantId"),
                        scope.msg("bookingApp.primeVaccination.participantName"),
                        scope.msg("bookingApp.primeVaccination.femaleChildBearingAge"),
                        scope.msg("bookingApp.primeVaccination.screeningActualDate"),
                        scope.msg("bookingApp.primeVaccination.primeVacDate"),
                        scope.msg("bookingApp.primeVaccination.time"),
                        ""],
                    colModel: [
                        {
                            name: "location",
                            index: 'subject.siteName'
                        },
                        {
                            name: "participantId",
                            formatter: extendGrid,
                            index: 'subject.subjectId'
                        },
                        {
                            name: "participantName",
                            formatter: rowColorFormatter,
                            index: 'subject.name'
                        },
                        {
                            name: "femaleChildBearingAge",
                            index: 'subjectBookingDetails.femaleChildBearingAge'
                        },
                        {
                            name: "bookingScreeningActualDate",
                            sortable: false
                        },
                        {
                            name: "date",
                            index: 'bookingPlannedDate'
                        },
                        {
                            name: "startTime"
                        },
                        {
                            name: "print",
                            align: "center",
                            sortable: false,
                            width: 40
                        }
                    ],
                    gridComplete: function(){
                        var ids = elem.getDataIDs();
                            for(var i=0;i<ids.length;i++){
                                elem.setRowData(ids[i],{print: createButton(ids[i])})
                            }
                        $compile($('.printBtn'))(scope);
                        $('#primeVaccinationTable .ui-jqgrid-hdiv').addClass("table-lightblue");
                        $('#primeVaccinationTable .ui-jqgrid-btable').addClass("table-lightblue");
                        for (var i = 0; i < rowsToColor.length; i++) {
                            $("#" + rowsToColor[i]).find("td").css("color", "red");
                        }
                    },
                    pager: "#pager",
                    rowNum: 50,
                    rowList: [10, 20, 50, 100],
                    prmNames: {
                        sort: 'sortColumn',
                        order: 'sortDirection'
                    },
                    sortname: null,
                    sortorder: "desc",
                    viewrecords: true,
                    gridview: true,
                    loadOnce: false,
                    beforeSelectRow: function() {
                        return false;
                    },
                    beforeRequest: function() {
                        gridDataExtension = [];
                        rowsToColor = [];
                    },
                    onCellSelect: function(rowId, iCol, cellContent, e) {
                        if (iCol !== 7) {
                            var rowData = elem.getRowData(rowId),
                                extraRowData = gridDataExtension[rowId];
                            scope.newForm("edit");
                            scope.form.dto.visitBookingDetailsId = extraRowData.visitBookingDetailsId;
                            scope.form.dto.participantId = rowData.participantId;
                            scope.form.dto.participantName = rowData.participantName;
                            scope.form.dto.femaleChildBearingAge = rowData.femaleChildBearingAge;
                            scope.form.dto.actualScreeningDate = extraRowData.actualScreeningDate;
                            scope.form.dto.bookingScreeningActualDate = rowData.bookingScreeningActualDate;
                            scope.form.dto.date = rowData.date;
                            scope.form.dto.startTime = rowData.startTime;
                            scope.form.dto.visitId = extraRowData.visitId;
                            scope.form.dto.participantGender = extraRowData.participantGender;
                            scope.form.dto.ignoreDateLimitation = extraRowData.ignoreDateLimitation;
                            scope.form.range = scope.calculateRange(scope.form.dto.bookingScreeningActualDate,
                                scope.form.dto.femaleChildBearingAge, scope.form.dto.ignoreDateLimitation);
                            scope.reloadSelects();
                            $('#primeVaccinationScheduleModal').modal('show');
                        }
                    },
                    postData: {
                        startDate: function() {
                            return handleUndefined(scope.selectedFilter.startDate);
                        },
                        endDate: function() {
                            return handleUndefined(scope.selectedFilter.endDate);
                        },
                        dateFilter: function() {
                            return handleUndefined(scope.selectedFilter.dateFilter);
                        }
                    }
                });

                scope.$watch("lookupRefresh", function () {
                    $('#' + attrs.id).jqGrid('setGridParam', {
                        page: 1,
                        postData: {
                            fields: JSON.stringify(scope.lookupBy),
                            lookup: (scope.selectedLookup) ? scope.selectedLookup.lookupName : ""
                        }
                    }).trigger('reloadGrid');
                });

                function rowColorFormatter(cellValue, options, rowObject) {
                    var range = scope.calculateRangeForGrid(rowObject.bookingScreeningActualDate,
                        rowObject.femaleChildBearingAge, false);
                    range.min.setHours(0,0,0,0);
                    range.max.setHours(23,59,59,0);
                    var min = range.min.getTime();
                    var max = range.max.getTime();
                    var bookingDate = Date.parse(rowObject.date);
                    if ((max < bookingDate || min > bookingDate) && !rowObject.ignoreDateLimitation) {
                        rowsToColor[rowsToColor.length] = options.rowId;
                    }
                    return cellValue;
                }
            }
        };
    });

    directives.directive('visitRescheduleGrid', function ($compile) {

        var gridDataExtension;
        var rowsToColor = [];

        function createButton(id) {
            return '<button type="button" class="btn btn-primary btn-sm ng-binding printBtn" ng-click="print()"><i class="fa fa-fw fa-print"></i></button>';
        };

        function extendGrid(cellValue, options, rowObject) {
            var rowExtraData = {};

            rowExtraData.siteId = rowObject.siteId;
            rowExtraData.visitId = rowObject.visitId;
            rowExtraData.visitBookingDetailsId = rowObject.visitBookingDetailsId;
            rowExtraData.earliestDate = rowObject.earliestDate;
            rowExtraData.latestDate = rowObject.latestDate;
            rowExtraData.ignoreDateLimitation = rowObject.ignoreDateLimitation;

            gridDataExtension[options.rowId] = rowExtraData;

            return cellValue;
        }

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var elem = angular.element(element);

                elem.jqGrid({
                    url: "../booking-app/visitReschedule",
                    datatype: "json",
                    mtype: "GET",
                    colNames: [
                        scope.msg("bookingApp.location"),
                        scope.msg("bookingApp.visitReschedule.participantId"),
                        scope.msg("bookingApp.visitReschedule.participantName"),
                        scope.msg("bookingApp.visitReschedule.stageId"),
                        scope.msg("bookingApp.visitReschedule.visitType"),
                        scope.msg("bookingApp.visitReschedule.actualDate"),
                        scope.msg("bookingApp.visitReschedule.plannedDate"),
                        scope.msg("bookingApp.visitReschedule.time"),
                        ""],
                    colModel: [
                        {
                            name: "location",
                            index: 'subject.siteName'
                        },
                        {
                            name: "participantId",
                            formatter: extendGrid,
                            index: 'subject.subjectId'
                        },
                        {
                            name: "participantName",
                            index: 'subject.name'
                        },
                        {
                            name: "stageId",
                            index: 'subject.stageId'
                        },
                        {
                            name: "visitType",
                            index: 'visit.type'
                        },
                        {
                            name: "actualDate",
                            index: 'visit.date'
                        },
                        {
                            name: "plannedDate",
                            formatter: rowColorFormatter,
                            index: 'visit.motechProjectedDate'
                        },
                        {
                            name: "startTime"
                        },
                        {
                            name: "print", align: "center", sortable: false, width: 60
                        }
                        ],
                    gridComplete: function(){
                        var ids = elem.getDataIDs();
                        for(var i = 0; i < ids.length; i++){
                            elem.setRowData(ids[i], {print: createButton(ids[i])})
                        }
                        $compile($('.printBtn'))(scope);
                        $('#visitRescheduleTable .ui-jqgrid-hdiv').addClass("table-lightblue");
                        $('#visitRescheduleTable .ui-jqgrid-btable').addClass("table-lightblue");
                        for (var i = 0; i < rowsToColor.length; i++) {
                            $("#" + rowsToColor[i]).find("td").css("color", "red");
                        }
                    },
                    pager: "#pager",
                    rowNum: 50,
                    rowList: [10, 20, 50, 100],
                    prmNames: {
                        sort: 'sortColumn',
                        order: 'sortDirection'
                    },
                    sortname: null,
                    sortorder: "desc",
                    viewrecords: true,
                    gridview: true,
                    loadOnce: false,
                    beforeSelectRow: function() {
                        return false;
                    },
                    beforeRequest: function() {
                        gridDataExtension = [];
                        rowsToColor = [];
                    },
                    onCellSelect: function(rowId, iCol, cellContent, e) {
                        if (iCol !== 8) {
                            var rowData = elem.getRowData(rowId),
                                extraRowData = gridDataExtension[rowId];

                            if (rowData.actualDate !== undefined && rowData.actualDate !== null && rowData.actualDate !== '') {
                                scope.visitForPrint = elem.getRowData(rowId);
                                scope.form = null;
                                scope.showRescheduleModal(scope.msg('bookingApp.visitReschedule.cannotReschedule'), scope.msg('bookingApp.visitReschedule.visitWithActualDate'));
                            } else if (extraRowData.earliestDate === undefined || extraRowData.earliestDate === null || extraRowData.earliestDate === "") {
                                scope.visitForPrint = elem.getRowData(rowId);
                                scope.form = null;
                                scope.showRescheduleModal(scope.msg('bookingApp.visitReschedule.cannotReschedule'), scope.msg('bookingApp.visitReschedule.visitNotInRescheduleWindow'));
                            } else {
                                scope.newForm();
                                scope.form.dto.participantId = rowData.participantId;
                                scope.form.dto.participantName = rowData.participantName;
                                scope.form.dto.stageId = rowData.stageId;
                                scope.form.dto.visitType = rowData.visitType;
                                scope.form.dto.plannedDate = rowData.plannedDate;
                                scope.form.dto.startTime = rowData.startTime;
                                scope.form.dto.visitId = extraRowData.visitId;
                                scope.form.dto.visitBookingDetailsId = extraRowData.visitBookingDetailsId;
                                scope.form.dto.ignoreDateLimitation = extraRowData.ignoreDateLimitation;
                                scope.earliestDateToReturn = scope.parseDate(extraRowData.earliestDate);
                                scope.latestDateToReturn = scope.parseDate(extraRowData.latestDate);
                                if (!scope.form.dto.ignoreDateLimitation) {
                                    scope.form.dto.minDate = scope.earliestDateToReturn;
                                    scope.form.dto.maxDate = scope.latestDateToReturn;
                                } else {
                                    scope.form.dto.minDate = new Date();
                                    scope.form.dto.maxDate = null;
                                }
                                scope.showRescheduleModal(scope.msg('bookingApp.visitReschedule.update'), scope.msg('bookingApp.visitReschedule.updateSuccessful'));
                            }
                        } else {
                            scope.visitForPrint = elem.getRowData(rowId);
                        }
                    },
                    postData: {
                        startDate: function() {
                            return handleUndefined(scope.selectedFilter.startDate);
                        },
                        endDate: function() {
                            return handleUndefined(scope.selectedFilter.endDate);
                        },
                        dateFilter: function() {
                            return handleUndefined(scope.selectedFilter.dateFilter);
                        }
                    }
                });

                scope.$watch("lookupRefresh", function () {
                    $('#' + attrs.id).jqGrid('setGridParam', {
                        page: 1,
                        postData: {
                            fields: JSON.stringify(scope.lookupBy),
                            lookup: (scope.selectedLookup) ? scope.selectedLookup.lookupName : ""
                        }
                    }).trigger('reloadGrid');
                });

                function rowColorFormatter(cellValue, options, rowObject) {
                    var min = Date.parse(rowObject.earliestWindowDate);
                    var max = Date.parse(rowObject.latestDate);
                    var bookingDate = Date.parse(rowObject.plannedDate);
                    if (max !== null && max !== undefined && min !== null && min !== undefined &&
                          (max < bookingDate || min > bookingDate) && !rowObject.ignoreDateLimitation &&
                          (rowObject.actualDate === null || rowObject.actualDate === undefined || rowObject.actualDate === "")) {
                       rowsToColor[rowsToColor.length] = options.rowId;
                    }
                    return cellValue;
                }
            }
        };
    });

    directives.directive('capacityInfoGrid', function () {

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var elem = angular.element(element);

                elem.jqGrid({
                    url: "../booking-app/capacity/getCapacityInfo",
                    datatype: "json",
                    mtype: "GET",
                    colNames: [
                        scope.msg("bookingApp.capacityInfo.clinic"),
                        scope.msg("bookingApp.capacityInfo.maxCapacity"),
                        scope.msg("bookingApp.capacityInfo.availableCapacity"),
                        scope.msg("bookingApp.capacityInfo.screeningSlotRemaining"),
                        scope.msg("bookingApp.capacityInfo.vaccineSlotRemaining")],
                    colModel: [
                        {
                            name: "clinic",
                            index: 'location'
                        },
                        {
                            name: "maxCapacity",
                            index: 'maxCapacityByDay'
                        },
                        {
                            name: "availableCapacity",
                            sortable: false
                        },
                        {
                            name: "screeningSlotRemaining",
                            sortable: false
                        },
                        {
                            name: "vaccineSlotRemaining",
                            sortable: false
                        }
                    ],
                    gridComplete: function(){
                        $('#capacityInfoTable .ui-jqgrid-hdiv').addClass("table-lightblue");
                        $('#capacityInfoTable .ui-jqgrid-btable').addClass("table-lightblue");
                    },
                    pager: "#pager",
                    rowNum: 50,
                    rowList: [10, 20, 50, 100],
                    prmNames: {
                        sort: 'sortColumn',
                        order: 'sortDirection'
                    },
                    sortname: null,
                    sortorder: "desc",
                    viewrecords: true,
                    gridview: true,
                    loadOnce: false,
                    beforeSelectRow: function() {
                        return false;
                    },
                    postData: {
                        startDate: function() {
                            return handleUndefined(scope.selectedFilter.startDate);
                        },
                        endDate: function() {
                            return handleUndefined(scope.selectedFilter.endDate);
                        },
                        dateFilter: function() {
                            return handleUndefined(scope.selectedFilter.dateFilter);
                        }
                    }
                });

                scope.$watch("lookupRefresh", function () {
                    $('#' + attrs.id).jqGrid('setGridParam', {
                        page: 1
                    }).trigger('reloadGrid');
                });
            }
        };
    });

    directives.directive('capacityReportGrid', function () {

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var elem = angular.element(element);

                elem.jqGrid({
                    url: '../booking-app/getCapacityReports',
                    datatype: 'json',
                    mtype: 'GET',
                    prmNames: {
                        sort: 'sortColumn',
                        order: 'sortDirection'
                    },
                    rowNum: 50,
                    rowList: [10, 20, 50, 100],
                    colNames: [
                        scope.msg("bookingApp.capacityReport.date"),
                        scope.msg("bookingApp.capacityReport.clinic"),
                        scope.msg("bookingApp.capacityInfo.maxCapacity"),
                        scope.msg("bookingApp.capacityInfo.availableCapacity"),
                        scope.msg("bookingApp.capacityInfo.screeningSlotRemaining"),
                        scope.msg("bookingApp.capacityInfo.vaccineSlotRemaining")],
                    colModel: [
                        {
                            name: 'date',
                            index: 'date'
                        },
                        {
                            name: 'location',
                            index: 'location'
                        },
                        {
                            name: 'maxCapacity',
                            sorttype: 'int'
                        },
                        {
                            name: 'availableCapacity',
                            sorttype: 'int'
                        },
                        {
                            name: 'screeningSlotRemaining',
                            sorttype: 'int'
                        },
                        {
                            name: 'vaccineSlotRemaining',
                            sorttype: 'int'
                        }
                    ],
                    pager: '#pager',
                    sortname: null,
                    sortorder: 'asc',
                    viewrecords: true,
                    loadonce: true,
                    gridview: true,
                    gridComplete: function () {
                        $('#capacityReportTable .ui-jqgrid-hdiv').addClass("table-lightblue");
                        $('#capacityReportTable .ui-jqgrid-btable').addClass("table-lightblue");
                    },
                    postData: {
                        startDate: function() {
                            return handleUndefined(scope.selectedFilter.startDate);
                        },
                        endDate: function() {
                            return handleUndefined(scope.selectedFilter.endDate);
                        },
                        dateFilter: function() {
                            return handleUndefined(scope.selectedFilter.dateFilter);
                        }
                    }
                });

                scope.$watch("lookupRefresh", function () {
                    $('#' + attrs.id).jqGrid('setGridParam', {
                        datatype: 'json',
                        page: 1,
                        postData: {
                            fields: JSON.stringify(scope.lookupBy),
                            lookup: (scope.selectedLookup) ? scope.selectedLookup.lookupName : ""
                        }
                    }).trigger('reloadGrid');
                });
            }
        };
    });

}());