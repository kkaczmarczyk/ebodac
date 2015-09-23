package org.motechproject.ebodac.web;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.type.TypeReference;
import org.joda.time.LocalDate;
import org.joda.time.format.DateTimeFormat;
import org.motechproject.ebodac.constants.EbodacConstants;
import org.motechproject.ebodac.domain.MissedVisitsReportDto;
import org.motechproject.ebodac.domain.Visit;
import org.motechproject.ebodac.exception.EbodacLookupException;
import org.motechproject.ebodac.service.ConfigService;
import org.motechproject.ebodac.service.LookupService;
import org.motechproject.ebodac.service.ReportService;
import org.motechproject.ebodac.helper.DtoLookupHelper;
import org.motechproject.ebodac.web.domain.GridSettings;
import org.motechproject.ebodac.web.domain.Records;
import org.motechproject.mds.dto.LookupDto;
import org.motechproject.mds.query.QueryParams;
import org.motechproject.mds.util.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class ReportController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ReportController.class);

    @Autowired
    private LookupService lookupService;

    @Autowired
    private ReportService reportService;

    @Autowired
    private ConfigService configService;

    private ObjectMapper objectMapper = new ObjectMapper();

    @RequestMapping(value = "/generateReports", method = RequestMethod.POST)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public ResponseEntity<String> generateReports(@RequestBody String startDate) {

        try {
            LocalDate date = LocalDate.parse(startDate, DateTimeFormat.forPattern(EbodacConstants.REPORT_DATE_FORMAT));
            reportService.generateDailyReportsFromDate(date);
            LOGGER.info("Reports generated by custom request from date: {}",
                    date.toString(DateTimeFormat.forPattern(EbodacConstants.REPORT_DATE_FORMAT)));
        } catch (IllegalArgumentException e) {
            LOGGER.error("Invalid date format", e);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            LOGGER.error("Fatal error raised during creating reports", e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return new ResponseEntity<>(HttpStatus.OK);
    }

    @RequestMapping(value = "/getReport/{reportType}", method = RequestMethod.POST)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public Records<?> getReport(@PathVariable String reportType, GridSettings settings) throws NoSuchMethodException, InstantiationException, IllegalAccessException, IOException, InvocationTargetException {
        switch (reportType) {
            case "dailyClinicVisitScheduleReport" :
                return getDailyClinicVisitScheduleReport(settings);
            case "followupsAfterPrimeInjectionReport" :
                return getFollowupsAfterPrimeInjectionReport(settings);
            case "followupsMissedClinicVisitsReport" :
                return getFollowupsMissedClinicVisitsReport(settings);
            default:
                return null;
        }
    }

    @RequestMapping(value = "/getReportModel/{reportType}", method = RequestMethod.GET)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public String getReportModel(@PathVariable String reportType) throws IOException {
        String json = IOUtils.toString(getClass().getResourceAsStream("/reportModels.json"), "UTF-8");
        Map<String, Object> modelsMap = getFields(json);
        return objectMapper.writeValueAsString(modelsMap.get(reportType));
    }

    @RequestMapping(value = "/getLookupsForDailyClinicVisitScheduleReport", method = RequestMethod.GET)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public List<LookupDto> getLookupsForDailyClinicVisitScheduleReport() {
        List<LookupDto> ret = new ArrayList<>();
        List<LookupDto> availableLookupas;
        try {
            availableLookupas = lookupService.getAvailableLookups(Visit.class.getName());
        } catch (EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return null;
        }
        List<String> lookupList = configService.getConfig().getAvailableLookupsForDailyClinicVisitScheduleReport();
        for(LookupDto lookupDto : availableLookupas) {
            if(lookupList.contains(lookupDto.getLookupName())) {
                ret.add(lookupDto);
            }
        }
        return ret;
    }

    @RequestMapping(value = "/getLookupsForFollowupsAfterPrimeInjectionReport", method = RequestMethod.GET)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public List<LookupDto> getLookupsForFollowupsAfterPrimeInjectionReport() {
        List<LookupDto> ret = new ArrayList<>();
        List<LookupDto> availableLookupas;
        try {
            availableLookupas = lookupService.getAvailableLookups(Visit.class.getName());
        } catch (EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return null;
        }
        List<String> lookupList = configService.getConfig().getAvailableLookupsForFollowupsAfterPrimeInjectionReport();
        for(LookupDto lookupDto : availableLookupas) {
            if(lookupList.contains(lookupDto.getLookupName())) {
                ret.add(lookupDto);
            }
        }
        return ret;
    }

    @RequestMapping(value = "/getLookupsForFollowupsMissedClinicVisitsReport", method = RequestMethod.GET)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public List<LookupDto> getLookupsForFollowupsMissedClinicVisitsReport() {
        List<LookupDto> ret = new ArrayList<>();
        List<LookupDto> availableLookupas;
        try {
            availableLookupas = lookupService.getAvailableLookups(Visit.class.getName());
        } catch (EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return null;
        }
        List<String> lookupList = configService.getConfig().getAvailableLookupsForFollowupsMissedClinicVisitsReport();
        for(LookupDto lookupDto : availableLookupas) {
            if(lookupList.contains(lookupDto.getLookupName())) {
                ret.add(lookupDto);
            }
        }
        return ret;
    }

    @RequestMapping(value = "/getLookupsForVisits", method = RequestMethod.GET)
    @PreAuthorize("hasAnyRole('mdsDataAccess', 'manageEbodac')")
    @ResponseBody
    public List<LookupDto> getLookupsForVisits() {
        List<LookupDto> ret = new ArrayList<>();
        List<LookupDto> availableLookupas;
        try {
            availableLookupas = lookupService.getAvailableLookups(Visit.class.getName());
        } catch (EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return null;
        }
        List<String> lookupList = configService.getConfig().getAvailableLookupsForVisits();
        for(LookupDto lookupDto : availableLookupas) {
            if(lookupList.contains(lookupDto.getLookupName())) {
                ret.add(lookupDto);
            }
        }
        return ret;
    }

    private Records<?> getDailyClinicVisitScheduleReport(GridSettings settings) {
        Order order = null;
        if (StringUtils.isNotBlank(settings.getSortColumn())) {
            order = new Order(settings.getSortColumn(), settings.getSortDirection());
        }
        QueryParams queryParams = new QueryParams(settings.getPage(), settings.getRows(), order);
        try {
            return lookupService.getEntities(Visit.class, settings.getLookup(), settings.getFields(), queryParams);
        } catch (EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return new Records<Object>(null);
        }
    }

    private Records<?> getFollowupsAfterPrimeInjectionReport(GridSettings settings) {
        Order order = null;
        if (StringUtils.isNotBlank(settings.getSortColumn())) {
            order = new Order(settings.getSortColumn(), settings.getSortDirection());
        }
        QueryParams queryParams = new QueryParams(settings.getPage(), settings.getRows(), order);
        try {
            settings = DtoLookupHelper.changeLookupForFollowupsAfterPrimeInjectionReport(settings);
            if(settings == null) {
                return new Records<Object>(null);
            }
            return lookupService.getEntities(Visit.class, settings.getLookup(), settings.getFields(), queryParams);
        } catch (IOException | EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return new Records<Object>(null);
        }
    }

    private Records<?> getFollowupsMissedClinicVisitsReport(GridSettings settings) {
        try {
            settings = DtoLookupHelper.changeLookupAndOrderForFollowupsMissedClinicVisitsReport(settings);
            if(settings == null) {
                return new Records<Object>(null);
            }
            Order order = null;
            if (StringUtils.isNotBlank(settings.getSortColumn())) {
                order = new Order(settings.getSortColumn(), settings.getSortDirection());
            }
            QueryParams queryParams = new QueryParams(settings.getPage(), settings.getRows(), order);
            return lookupService.getEntities(MissedVisitsReportDto.class, Visit.class, settings.getLookup(), settings.getFields(), queryParams);
        } catch (IOException | EbodacLookupException e) {
            LOGGER.error(e.getMessage(), e);
            return new Records<Object>(null);
        }
    }

    private Map<String, Object> getFields(String json) throws IOException {
        return objectMapper.readValue(json, new TypeReference<HashMap>() {});
    }
}
