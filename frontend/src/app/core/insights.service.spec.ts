import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InsightsService } from './insights.service';
import { CountrySalaryStats, DepartmentAverage, JobTitleAverage } from './models';

describe('InsightsService', () => {
  let service: InsightsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InsightsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the salary statistics for every country', () => {
    const stats: CountrySalaryStats[] = [
      { country: 'INDIA', currency: 'INR', minSalary: 612000, maxSalary: 2484000, avgSalary: 1288747.05, employeeCount: 3309 },
    ];
    let result: CountrySalaryStats[] = [];
    service.countryStats().subscribe((value) => (result = value));

    const request = http.expectOne('http://localhost:8080/api/insights/countries');
    expect(request.request.method).toBe('GET');
    request.flush(stats);

    expect(result).toEqual(stats);
  });

  it('loads the average salary per job title for one country', () => {
    const averages: JobTitleAverage[] = [{ jobTitle: 'Engineering Manager', avgSalary: 94051.86, employeeCount: 58 }];
    let result: JobTitleAverage[] = [];
    service.jobTitleAverages('UK').subscribe((value) => (result = value));

    const request = http.expectOne('http://localhost:8080/api/insights/countries/UK/job-titles');
    expect(request.request.method).toBe('GET');
    request.flush(averages);

    expect(result).toEqual(averages);
  });

  it('loads the average salary per department for one country', () => {
    const averages: DepartmentAverage[] = [{ department: 'Finance', avgSalary: 61000.5, employeeCount: 40 }];
    let result: DepartmentAverage[] = [];
    service.departmentAverages('INDIA').subscribe((value) => (result = value));

    const request = http.expectOne('http://localhost:8080/api/insights/countries/INDIA/departments');
    expect(request.request.method).toBe('GET');
    request.flush(averages);

    expect(result).toEqual(averages);
  });
});
