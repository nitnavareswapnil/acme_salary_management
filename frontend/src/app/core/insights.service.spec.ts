import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InsightsService } from './insights.service';
import { CountrySalaryStats, DepartmentAverage, JobTitleAverage, JobTitleComparison } from './models';

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

  describe('comparing a job title across countries', () => {
    const base = 'http://localhost:8080/api/insights/countries';
    const row = (jobTitle: string, avgSalary: number): JobTitleAverage => ({ jobTitle, avgSalary, employeeCount: 10 });

    it('asks every supported country for its job title averages and picks the requested title from each', () => {
      let result: JobTitleComparison[] = [];
      service.compareJobTitle('Accountant').subscribe((value) => (result = value));

      http.expectOne(`${base}/US/job-titles`).flush([row('Recruiter', 50000), row('Accountant', 76000)]);
      http.expectOne(`${base}/INDIA/job-titles`).flush([row('Accountant', 1022734.78)]);
      http.expectOne(`${base}/UK/job-titles`).flush([row('Accountant', 45000)]);

      expect(result.map((entry) => entry.country)).toEqual(['US', 'INDIA', 'UK']);
      expect(result.map((entry) => entry.average?.avgSalary)).toEqual([76000, 1022734.78, 45000]);
    });

    it('reports a country that has nobody in that role with no average instead of failing', () => {
      let result: JobTitleComparison[] = [];
      service.compareJobTitle('Accountant').subscribe((value) => (result = value));

      http.expectOne(`${base}/US/job-titles`).flush([row('Accountant', 76000)]);
      http.expectOne(`${base}/INDIA/job-titles`).flush([row('Recruiter', 500000)]);
      http.expectOne(`${base}/UK/job-titles`).flush([]);

      expect(result.map((entry) => entry.average)).toEqual([row('Accountant', 76000), null, null]);
    });

    it('matches the whole title, not part of it', () => {
      let result: JobTitleComparison[] = [];
      service.compareJobTitle('Software Engineer').subscribe((value) => (result = value));

      http.expectOne(`${base}/US/job-titles`).flush([row('Senior Software Engineer', 140000)]);
      http.expectOne(`${base}/INDIA/job-titles`).flush([]);
      http.expectOne(`${base}/UK/job-titles`).flush([]);

      expect(result.every((entry) => entry.average === null)).toBe(true);
    });

    it('fails as a whole when any country cannot be loaded', () => {
      let failed = false;
      service.compareJobTitle('Accountant').subscribe({ error: () => (failed = true) });

      http.expectOne(`${base}/US/job-titles`).flush([row('Accountant', 76000)]);
      http.expectOne(`${base}/INDIA/job-titles`).flush('boom', { status: 500, statusText: 'Server Error' });
      http.match(`${base}/UK/job-titles`);

      expect(failed).toBe(true);
    });
  });
});
