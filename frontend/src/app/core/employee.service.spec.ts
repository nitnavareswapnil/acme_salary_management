import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EmployeeService } from './employee.service';
import { Employee, EmployeeRequest, PageResponse } from './models';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EmployeeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a page without filters when none are set', () => {
    service.list({ page: 0, size: 20 }).subscribe();

    const request = http.expectOne((r) => r.url === 'http://localhost:8080/api/employees');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size']);
    request.flush(emptyPage());
  });

  it('sends search, country and department when they are set', () => {
    service
      .list({ search: 'asha', country: 'INDIA', department: 'Engineering', page: 2, size: 50 })
      .subscribe();

    const request = http.expectOne((r) => r.url === 'http://localhost:8080/api/employees');
    expect(request.request.params.get('search')).toBe('asha');
    expect(request.request.params.get('country')).toBe('INDIA');
    expect(request.request.params.get('department')).toBe('Engineering');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    request.flush(emptyPage());
  });

  it('leaves out blank filters', () => {
    service.list({ search: '', country: '', department: '', page: 0, size: 20 }).subscribe();

    const request = http.expectOne((r) => r.url === 'http://localhost:8080/api/employees');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size']);
    request.flush(emptyPage());
  });

  it('returns the page from the response body', () => {
    let result: PageResponse<Employee> | undefined;
    service.list({ page: 0, size: 20 }).subscribe((page) => (result = page));

    http.expectOne((r) => r.url.endsWith('/employees')).flush({ ...emptyPage(), totalElements: 7 });

    expect(result?.totalElements).toBe(7);
  });

  it('loads the department names', () => {
    let result: string[] = [];
    service.departments().subscribe((departments) => (result = departments));

    const request = http.expectOne('http://localhost:8080/api/employees/departments');
    expect(request.request.method).toBe('GET');
    request.flush(['Engineering', 'Sales']);

    expect(result).toEqual(['Engineering', 'Sales']);
  });

  it('loads one employee by id', () => {
    let result: Employee | undefined;
    service.get(5).subscribe((employee) => (result = employee));

    const request = http.expectOne('http://localhost:8080/api/employees/5');
    expect(request.request.method).toBe('GET');
    request.flush(sampleEmployee());

    expect(result?.name).toBe('Asha Rao');
  });

  it('creates an employee with POST', () => {
    service.create(sampleRequest()).subscribe();

    const request = http.expectOne('http://localhost:8080/api/employees');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(sampleRequest());
    request.flush(sampleEmployee());
  });

  it('updates an employee with PUT', () => {
    service.update(5, sampleRequest()).subscribe();

    const request = http.expectOne('http://localhost:8080/api/employees/5');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(sampleRequest());
    request.flush(sampleEmployee());
  });

  it('deletes an employee with DELETE', () => {
    service.delete(5).subscribe();

    const request = http.expectOne('http://localhost:8080/api/employees/5');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  function sampleRequest(): EmployeeRequest {
    return {
      name: 'Asha Rao',
      email: 'asha@acme.com',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      country: 'INDIA',
      baseSalary: 55000,
    };
  }

  function sampleEmployee(): Employee {
    return { ...sampleRequest(), id: 5, currency: 'INR' };
  }

  function emptyPage(): PageResponse<Employee> {
    return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
  }

  it('loads job titles for suggestions', () => {
    let result: string[] = [];
    service.jobTitles().subscribe((titles) => (result = titles));

    const request = http.expectOne('http://localhost:8080/api/employees/job-titles');
    expect(request.request.method).toBe('GET');
    request.flush(['Account Manager', 'Software Engineer']);

    expect(result).toEqual(['Account Manager', 'Software Engineer']);
  });
});
